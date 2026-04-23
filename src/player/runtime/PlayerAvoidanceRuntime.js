/**
 * Responsibility:
 * - 自動回避アシストの状態機械、planner、assist 出力制御を担当する。
 *
 * Rules:
 * - 自動回避は入力補助に限定し、入力変更や急旋回直後は介入しない。
 * - 回避 plan の保持条件と assist 適用条件は同じ gate を共有し、stale plan を残さない。
 * - planner の speed は前フレーム速度ではなく motionIntent.commandSpeed を正として扱う。
 * - blocked 判定は衝突後速度を見ず、attempted/actual の前進量比較だけで行う。
 * - camera yaw は reset 直後の最初の 1 サンプルでは prime のみ行い、誤 TURNING 遷移を起こさない。
 * - shape ごとの差は world 側で bake 済みの playerAvoidanceDiscs に寄せ、この runtime は world 展開だけを行う。
 * - 縦方向の proxy 無視条件は PlayerCollisionRuntime と同じ shared gate を使う。
 */
import * as THREE from 'three';
import { PLAYER_AVOIDANCE, PLAYER_BASE } from '../../data/balance.js';
import { angleDiff, clamp, lerp } from '../../utils/math.js';
import { shouldSkipPlayerVerticalOverlap } from '../shared/PlayerVerticalOverlapGate.js';

const ASSISTED_MOVE = new THREE.Vector3();
const AVOIDANCE_PROXY_WORLD = new THREE.Vector3();
const AVOIDANCE_CANDIDATES = [];
const AVOIDANCE_PROXIES = [];

function clamp01(value) {
  return clamp(value, 0, 1);
}

function lengthSq2(x, z) {
  return x * x + z * z;
}

function length2(x, z) {
  return Math.sqrt(lengthSq2(x, z));
}

function normalize2(x, z, fallbackX = 0, fallbackZ = 1) {
  const len = length2(x, z);
  if (len <= 0.000001) return { x: fallbackX, z: fallbackZ };
  return { x: x / len, z: z / len };
}

function rotateDirTowards(currentX, currentZ, targetX, targetZ, maxStep) {
  const current = normalize2(currentX, currentZ, targetX, targetZ);
  const target = normalize2(targetX, targetZ, current.x, current.z);
  const currentHeading = Math.atan2(current.x, current.z);
  const targetHeading = Math.atan2(target.x, target.z);
  const delta = angleDiff(currentHeading, targetHeading);
  const step = clamp(delta, -maxStep, maxStep);
  const nextHeading = currentHeading + step;
  return {
    x: Math.sin(nextHeading),
    z: Math.cos(nextHeading),
  };
}

function clampDirToInputCone(rawX, rawZ, candidateX, candidateZ, halfAngle) {
  const raw = normalize2(rawX, rawZ, 0, 1);
  const candidate = normalize2(candidateX, candidateZ, raw.x, raw.z);
  if (raw.x * candidate.x + raw.z * candidate.z <= 0) return raw;
  const rawHeading = Math.atan2(raw.x, raw.z);
  const candidateHeading = Math.atan2(candidate.x, candidate.z);
  const delta = angleDiff(rawHeading, candidateHeading);
  if (Math.abs(delta) <= halfAngle) return candidate;
  return rotateDirTowards(raw.x, raw.z, candidate.x, candidate.z, halfAngle);
}

function distancePointToSegmentSq(px, pz, ax, az, bx, bz) {
  const abX = bx - ax;
  const abZ = bz - az;
  const abLenSq = abX * abX + abZ * abZ;
  if (abLenSq <= 0.000001) {
    const dx = px - ax;
    const dz = pz - az;
    return dx * dx + dz * dz;
  }
  const t = clamp(((px - ax) * abX + (pz - az) * abZ) / abLenSq, 0, 1);
  const closestX = ax + abX * t;
  const closestZ = az + abZ * t;
  const dx = px - closestX;
  const dz = pz - closestZ;
  return dx * dx + dz * dz;
}

function makeAvoidanceState() {
  return {
    time: 0,
    mode: 'STRAIGHT',
    lastCameraHeading: 0,
    cameraHeadingPrimed: false,
    cameraYawRate: 0,
    lastTurningAt: -Infinity,
    lastStraightAt: 0,
    nextPlannerAt: 0,
    intentShiftTimer: 0,
    filteredIntentX: 0,
    filteredIntentZ: 1,
    lastMoveInputMask: 0,
    assistSuppressedUntil: 0,
    lastInputChangeAt: -Infinity,
    blockedFrames: 0,
    plan: null,
  };
}

export function installPlayerAvoidanceRuntime(PlayerSystem) {
  PlayerSystem.prototype.ensureAvoidanceState = function ensureAvoidanceState() {
    if (!this.avoidanceState) this.avoidanceState = makeAvoidanceState();
    return this.avoidanceState;
  };

  PlayerSystem.prototype.resetAvoidanceState = function resetAvoidanceState() {
    this.avoidanceState = makeAvoidanceState();
    return this.avoidanceState;
  };

  PlayerSystem.prototype.clearAvoidancePlan = function clearAvoidancePlan(reason = '') {
    const state = this.ensureAvoidanceState();
    state.plan = null;
    state.intentShiftTimer = 0;
    state.blockedFrames = 0;
    if (reason === 'immediate') state.nextPlannerAt = state.time;
  };

  PlayerSystem.prototype.syncFilteredIntent = function syncFilteredIntent(rawMoveDir) {
    const state = this.ensureAvoidanceState();
    if (rawMoveDir.lengthSq() <= 0.000001) {
      state.filteredIntentX = 0;
      state.filteredIntentZ = 1;
      return state;
    }
    state.filteredIntentX = rawMoveDir.x;
    state.filteredIntentZ = rawMoveDir.z;
    return state;
  };

  PlayerSystem.prototype.isAvoidanceSuppressed = function isAvoidanceSuppressed() {
    const state = this.ensureAvoidanceState();
    return state.time < state.assistSuppressedUntil;
  };

  PlayerSystem.prototype.clampVelocityToInputHalfPlane = function clampVelocityToInputHalfPlane(player, rawMoveDir) {
    if (rawMoveDir.lengthSq() <= 0.000001) return;
    const inputDir = normalize2(rawMoveDir.x, rawMoveDir.z, 0, 1);
    const alongInput = player.vx * inputDir.x + player.vz * inputDir.z;
    if (alongInput >= 0) return;
    player.vx -= inputDir.x * alongInput;
    player.vz -= inputDir.z * alongInput;
  };

  PlayerSystem.prototype.sanitizeVelocityForInputChange = function sanitizeVelocityForInputChange(player, rawMoveDir) {
    if (rawMoveDir.lengthSq() <= 0.000001) {
      player.vx = 0;
      player.vz = 0;
      return;
    }
    const inputDir = normalize2(rawMoveDir.x, rawMoveDir.z, 0, 1);
    const alongInput = player.vx * inputDir.x + player.vz * inputDir.z;
    const keptForward = Math.max(0, alongInput);
    player.vx = inputDir.x * keptForward;
    player.vz = inputDir.z * keptForward;
  };

  PlayerSystem.prototype.handleMoveInputChange = function handleMoveInputChange(player, rawMoveDir, moveInputMask) {
    const state = this.ensureAvoidanceState();
    if (state.lastMoveInputMask === moveInputMask) return;

    this.clearAvoidancePlan('immediate');
    state.assistSuppressedUntil = state.time + PLAYER_AVOIDANCE.inputChangeSuppressTime;
    state.lastInputChangeAt = state.time;
    this.syncFilteredIntent(rawMoveDir);
    this.sanitizeVelocityForInputChange(player, rawMoveDir);
    state.lastMoveInputMask = moveInputMask;
  };

  // 更新ルール:
  // - reset 直後の最初の camera heading は差分計算に使わず、prime のみ行う。
  // - これにより spawn/title 復帰直後の誤 TURNING / MANUAL_OVERRIDE 遷移を防ぐ。
  PlayerSystem.prototype.updateAvoidanceMode = function updateAvoidanceMode(cameraForward, dt) {
    const state = this.ensureAvoidanceState();
    const heading = Math.atan2(cameraForward.x, cameraForward.z);
    if (!state.cameraHeadingPrimed) {
      state.lastCameraHeading = heading;
      state.cameraYawRate = 0;
      state.cameraHeadingPrimed = true;
      return state.mode;
    }
    const yawRate = Math.abs(angleDiff(state.lastCameraHeading, heading)) / Math.max(dt, 0.0001);
    state.lastCameraHeading = heading;
    state.cameraYawRate = yawRate;

    let nextMode = state.mode;
    if (state.mode === 'STRAIGHT') {
      if (yawRate >= PLAYER_AVOIDANCE.manualEnterYawRate) nextMode = 'MANUAL_OVERRIDE';
      else if (yawRate >= PLAYER_AVOIDANCE.straightExitYawRate) nextMode = 'TURNING';
    } else if (state.mode === 'TURNING') {
      if (yawRate >= PLAYER_AVOIDANCE.manualEnterYawRate) nextMode = 'MANUAL_OVERRIDE';
      else if (yawRate <= PLAYER_AVOIDANCE.straightEnterYawRate) nextMode = 'STRAIGHT';
    } else if (state.mode === 'MANUAL_OVERRIDE') {
      if (yawRate <= PLAYER_AVOIDANCE.manualExitYawRate) nextMode = 'TURNING';
    }

    if (nextMode !== state.mode) {
      state.mode = nextMode;
      if (nextMode === 'STRAIGHT') {
        state.lastStraightAt = state.time;
      } else {
        state.lastTurningAt = state.time;
        this.clearAvoidancePlan('immediate');
        state.assistSuppressedUntil = Math.max(
          state.assistSuppressedUntil,
          state.time + PLAYER_AVOIDANCE.modeExitSuppressTime,
        );
      }
    }
    return state.mode;
  };

  PlayerSystem.prototype.updateFilteredIntent = function updateFilteredIntent(rawMoveDir, dt) {
    const state = this.ensureAvoidanceState();
    if (rawMoveDir.lengthSq() <= 0.000001) return this.syncFilteredIntent(rawMoveDir);
    if (lengthSq2(state.filteredIntentX, state.filteredIntentZ) <= 0.000001) return this.syncFilteredIntent(rawMoveDir);

    const follow = clamp01(dt * PLAYER_AVOIDANCE.intentFollowRate);
    const filteredX = lerp(state.filteredIntentX, rawMoveDir.x, follow);
    const filteredZ = lerp(state.filteredIntentZ, rawMoveDir.z, follow);
    const normalized = normalize2(filteredX, filteredZ, rawMoveDir.x, rawMoveDir.z);
    state.filteredIntentX = normalized.x;
    state.filteredIntentZ = normalized.z;
    return state;
  };

  PlayerSystem.prototype.shouldSkipAvoidanceVertical = function shouldSkipAvoidanceVertical(playerHoverY, centerY, halfHeight) {
    return shouldSkipPlayerVerticalOverlap(playerHoverY, centerY, halfHeight);
  };

  // 更新ルール:
  // - 回避 assist の起動可否は前フレーム速度ではなく、このフレーム入力から得た motionIntent で判定する。
  PlayerSystem.prototype.getAvoidanceAssistGate = function getAvoidanceAssistGate(rawMoveDir, motionIntent) {
    const state = this.ensureAvoidanceState();
    if (!motionIntent?.hasInput || rawMoveDir.lengthSq() <= 0.000001) {
      state.intentShiftTimer = 0;
      return 'no-input';
    }
    if (motionIntent.commandSpeed < PLAYER_AVOIDANCE.minAssistSpeed) {
      state.intentShiftTimer = 0;
      return 'low-command';
    }
    return 'active';
  };

  PlayerSystem.prototype.collectAvoidanceProxies = function collectAvoidanceProxies(playerHoverY, candidates, out = AVOIDANCE_PROXIES) {
    out.length = 0;
    for (let i = 0; i < candidates.length; i += 1) {
      const collider = candidates[i];
      if (!collider || collider.blocksPlayer === false) continue;
      this.game.world.refreshCollider?.(collider);
      const discs = Array.isArray(collider?.playerAvoidanceDiscs) && collider.playerAvoidanceDiscs.length > 0
        ? collider.playerAvoidanceDiscs
        : null;
      const matrixWorld = this.getColliderMatrixWorld?.(collider) ?? collider.matrixWorldStatic ?? collider.source?.matrixWorld ?? null;
      const padding = Math.max(0, Number(collider?.avoidancePadding) || 0);
      if (Array.isArray(discs) && discs.length > 0) {
        for (let j = 0; j < discs.length; j += 1) {
          const disc = discs[j];
          if (!disc) continue;
          if (matrixWorld) {
            AVOIDANCE_PROXY_WORLD.set(disc.x ?? 0, disc.y ?? 0, disc.z ?? 0).applyMatrix4(matrixWorld);
          } else {
            AVOIDANCE_PROXY_WORLD.set(
              (collider.x ?? 0) + (disc.x ?? 0),
              (collider.y ?? 0) + (disc.y ?? 0),
              (collider.z ?? 0) + (disc.z ?? 0),
            );
          }
          const halfHeight = Math.max(0.02, Number(disc.halfHeight ?? collider.halfHeight ?? collider.verticalRadius ?? disc.radius ?? 0.02) || 0.02);
          if (this.shouldSkipAvoidanceVertical(playerHoverY, AVOIDANCE_PROXY_WORLD.y, halfHeight)) continue;
          out.push({
            x: AVOIDANCE_PROXY_WORLD.x,
            y: AVOIDANCE_PROXY_WORLD.y,
            z: AVOIDANCE_PROXY_WORLD.z,
            radius: Math.max(0.05, Number(disc.radius) || 0.05) + padding,
            halfHeight,
            collider,
          });
        }
        continue;
      }

      const halfHeight = Math.max(0.02, Number(collider?.halfHeight ?? collider?.verticalRadius ?? collider?.radius ?? 0.02) || 0.02);
      if (this.shouldSkipAvoidanceVertical(playerHoverY, collider.y ?? 0, halfHeight)) continue;
      out.push({
        x: collider.x ?? 0,
        y: collider.y ?? 0,
        z: collider.z ?? 0,
        radius: Math.max(0.05, Number(collider?.radius ?? 0.05) || 0.05) + padding,
        halfHeight,
        collider,
      });
    }
    return out;
  };

  PlayerSystem.prototype.evaluateAvoidancePathScore = function evaluateAvoidancePathScore(playerX, playerZ, targetX, targetZ, proxies, anchorX, anchorZ, playerRadius) {
    let score = 0;
    for (let i = 0; i < proxies.length; i += 1) {
      const proxy = proxies[i];
      const toX = proxy.x - playerX;
      const toZ = proxy.z - playerZ;
      const forwardDist = toX * anchorX + toZ * anchorZ;
      if (forwardDist < -proxy.radius) continue;
      const segDist = Math.sqrt(distancePointToSegmentSq(proxy.x, proxy.z, playerX, playerZ, targetX, targetZ));
      const clearance = proxy.radius + playerRadius + PLAYER_AVOIDANCE.corridorPad * 0.55;
      if (segDist >= clearance) continue;
      const overlap = 1 - segDist / Math.max(clearance, 0.0001);
      const forwardWeight = clamp01(1 - forwardDist / Math.max(length2(targetX - playerX, targetZ - playerZ), 0.0001));
      score += overlap * overlap * (0.35 + forwardWeight * 0.65);
    }
    return score;
  };

  PlayerSystem.prototype.buildAvoidancePlan = function buildAvoidancePlan(player, rawMoveDir, planningSpeed) {
    const world = this.game.world;
    if (!world?.collectPlayerAvoidanceCandidatesSegment) return null;

    const state = this.ensureAvoidanceState();
    const inputAnchor = normalize2(rawMoveDir.x, rawMoveDir.z, 0, 1);
    const anchorX = inputAnchor.x;
    const anchorZ = inputAnchor.z;
    const tangentX = -anchorZ;
    const tangentZ = anchorX;

    const farLookahead = clamp(planningSpeed * PLAYER_AVOIDANCE.farTime + PLAYER_AVOIDANCE.farBase, PLAYER_AVOIDANCE.farMin, PLAYER_AVOIDANCE.farMax);
    const endX = player.x + anchorX * farLookahead;
    const endZ = player.z + anchorZ * farLookahead;
    const candidates = world.collectPlayerAvoidanceCandidatesSegment(
      player.x,
      player.z,
      endX,
      endZ,
      PLAYER_AVOIDANCE.corridorPad,
      AVOIDANCE_CANDIDATES,
    );
    if (!Array.isArray(candidates) || candidates.length === 0) return null;

    const hoverGroundY = world.getHeight(player.x, player.z);
    const playerHoverY = Math.max(player.y, hoverGroundY + PLAYER_BASE.hoverHeight);
    const proxies = this.collectAvoidanceProxies(playerHoverY, candidates, AVOIDANCE_PROXIES);
    if (proxies.length === 0) return null;

    const playerRadius = PLAYER_BASE.collisionRadius;
    let bestProxy = null;
    let bestRisk = 0;
    let bestForwardDist = 0;
    for (let i = 0; i < proxies.length; i += 1) {
      const proxy = proxies[i];
      const toX = proxy.x - player.x;
      const toZ = proxy.z - player.z;
      const forwardDist = toX * anchorX + toZ * anchorZ;
      if (forwardDist <= 0 || forwardDist > farLookahead + proxy.radius + playerRadius) continue;
      const lateralDist = Math.abs(toX * tangentX + toZ * tangentZ);
      const laneRadius = proxy.radius + playerRadius + PLAYER_AVOIDANCE.corridorPad;
      if (lateralDist > laneRadius + 0.75) continue;
      const distanceWeight = clamp01(1 - forwardDist / Math.max(farLookahead, 0.0001));
      const centerWeight = clamp01(1 - lateralDist / Math.max(laneRadius, 0.0001));
      const nearBonus = forwardDist <= clamp(planningSpeed * PLAYER_AVOIDANCE.nearTime + PLAYER_AVOIDANCE.nearBase, PLAYER_AVOIDANCE.nearMin, PLAYER_AVOIDANCE.nearMax)
        ? 1.18
        : 1;
      const risk = centerWeight * (0.3 + distanceWeight * 0.7) * nearBonus;
      if (risk <= bestRisk) continue;
      bestRisk = risk;
      bestProxy = proxy;
      bestForwardDist = forwardDist;
    }

    if (!bestProxy || bestRisk < PLAYER_AVOIDANCE.minRiskToPlan) return null;

    const lateralOffset = bestProxy.radius + playerRadius + PLAYER_AVOIDANCE.lateralClearance;
    const forwardOffset = Math.max(PLAYER_AVOIDANCE.forwardClearance, bestForwardDist * 0.24);
    const leftTargetX = bestProxy.x + tangentX * lateralOffset + anchorX * forwardOffset;
    const leftTargetZ = bestProxy.z + tangentZ * lateralOffset + anchorZ * forwardOffset;
    const rightTargetX = bestProxy.x - tangentX * lateralOffset + anchorX * forwardOffset;
    const rightTargetZ = bestProxy.z - tangentZ * lateralOffset + anchorZ * forwardOffset;

    const leftScore = this.evaluateAvoidancePathScore(player.x, player.z, leftTargetX, leftTargetZ, proxies, anchorX, anchorZ, playerRadius);
    const rightScore = this.evaluateAvoidancePathScore(player.x, player.z, rightTargetX, rightTargetZ, proxies, anchorX, anchorZ, playerRadius);

    let side = leftScore <= rightScore ? 1 : -1;
    if (state.plan && Math.abs(leftScore - rightScore) <= PLAYER_AVOIDANCE.sideStickBias) {
      side = state.plan.side;
    }

    const targetPointX = side > 0 ? leftTargetX : rightTargetX;
    const targetPointZ = side > 0 ? leftTargetZ : rightTargetZ;
    const planDistance = length2(targetPointX - player.x, targetPointZ - player.z);
    const refSpeed = Math.max(planningSpeed, PLAYER_AVOIDANCE.minPlanSpeed);
    const expectedDuration = clamp(planDistance / refSpeed, PLAYER_AVOIDANCE.minPlanLife, PLAYER_AVOIDANCE.maxPlanLife);

    return {
      createdAt: state.time,
      expiresAt: state.time + expectedDuration,
      side,
      anchorDirX: anchorX,
      anchorDirZ: anchorZ,
      targetPointX,
      targetPointZ,
      corridorRadius: bestProxy.radius + playerRadius + PLAYER_AVOIDANCE.corridorPad,
      refSpeed,
      riskScore: bestRisk,
    };
  };

  PlayerSystem.prototype.shouldReplanAvoidance = function shouldReplanAvoidance(player, rawMoveDir, dt) {
    const state = this.ensureAvoidanceState();
    if (state.mode !== 'STRAIGHT') {
      state.intentShiftTimer = 0;
      return false;
    }
    if (state.time - state.lastStraightAt < PLAYER_AVOIDANCE.straightSettleTime) {
      state.intentShiftTimer = 0;
      return false;
    }

    const plan = state.plan;
    if (!plan) return true;
    if (state.time >= plan.expiresAt) return true;
    if (state.blockedFrames >= PLAYER_AVOIDANCE.emergencyBlockedFrames) return true;

    const filtered = normalize2(state.filteredIntentX, state.filteredIntentZ, rawMoveDir.x, rawMoveDir.z);
    const planHeading = Math.atan2(plan.anchorDirX, plan.anchorDirZ);
    const intentHeading = Math.atan2(filtered.x, filtered.z);
    if (Math.abs(angleDiff(planHeading, intentHeading)) >= PLAYER_AVOIDANCE.intentShiftAngle) {
      state.intentShiftTimer += dt;
      if (state.intentShiftTimer >= PLAYER_AVOIDANCE.intentShiftHold) return true;
    } else {
      state.intentShiftTimer = 0;
    }

    const corridorDist = Math.sqrt(distancePointToSegmentSq(
      player.x,
      player.z,
      player.x - plan.anchorDirX * 2.5,
      player.z - plan.anchorDirZ * 2.5,
      plan.targetPointX,
      plan.targetPointZ,
    ));
    if (corridorDist > plan.corridorRadius * 1.15) return true;

    return false;
  };

  // 更新ルール:
  // - assist / planner の speed 判定は motionIntent.commandSpeed に統一する。
  // - stale plan の速度低下判定は廃止し、blocked / intent shift / corridor / expiry に責務を分離する。
  PlayerSystem.prototype.computeAssistedMoveDir = function computeAssistedMoveDir(player, rawMoveDir, motionIntent, dt) {
    const state = this.ensureAvoidanceState();
    ASSISTED_MOVE.copy(rawMoveDir);

    if (this.isAvoidanceSuppressed()) {
      this.syncFilteredIntent(rawMoveDir);
      return ASSISTED_MOVE;
    }

    this.updateFilteredIntent(rawMoveDir, dt);

    const planningSpeed = motionIntent?.commandSpeed ?? 0;
    const assistGate = this.getAvoidanceAssistGate(rawMoveDir, motionIntent);
    if (assistGate !== 'active') {
      this.clearAvoidancePlan(assistGate === 'low-command' ? 'immediate' : '');
      return ASSISTED_MOVE;
    }

    const shouldReplan = this.shouldReplanAvoidance(player, rawMoveDir, dt);
    const canPlan = state.mode === 'STRAIGHT'
      && state.time >= state.nextPlannerAt
      && motionIntent?.hasInput
      && planningSpeed >= PLAYER_AVOIDANCE.minAssistSpeed;

    if (shouldReplan && canPlan) {
      state.plan = this.buildAvoidancePlan(player, rawMoveDir, planningSpeed);
      state.nextPlannerAt = state.time + PLAYER_AVOIDANCE.plannerInterval;
      state.intentShiftTimer = 0;
      state.blockedFrames = 0;
    } else if (shouldReplan) {
      this.clearAvoidancePlan('immediate');
    }

    const plan = state.plan;
    if (!plan || state.mode !== 'STRAIGHT' || state.time >= plan.expiresAt) {
      return ASSISTED_MOVE;
    }

    const toTargetX = plan.targetPointX - player.x;
    const toTargetZ = plan.targetPointZ - player.z;
    if (lengthSq2(toTargetX, toTargetZ) <= PLAYER_AVOIDANCE.targetPointReachRadius * PLAYER_AVOIDANCE.targetPointReachRadius) {
      this.clearAvoidancePlan();
      return ASSISTED_MOVE;
    }

    const planDir = normalize2(toTargetX, toTargetZ, rawMoveDir.x, rawMoveDir.z);
    const remain = Math.max(0, plan.expiresAt - state.time);
    const fade = clamp01(remain / Math.max(PLAYER_AVOIDANCE.planFadeWindow, 0.0001));
    const assistWeight = PLAYER_AVOIDANCE.assistWeight * fade * clamp(0.45 + plan.riskScore * 0.8, 0.45, 1);
    const blended = normalize2(
      rawMoveDir.x * (1 - assistWeight) + planDir.x * assistWeight,
      rawMoveDir.z * (1 - assistWeight) + planDir.z * assistWeight,
      rawMoveDir.x,
      rawMoveDir.z,
    );
    const clamped = clampDirToInputCone(
      rawMoveDir.x,
      rawMoveDir.z,
      blended.x,
      blended.z,
      PLAYER_AVOIDANCE.assistMaxDeviationAngle,
    );
    ASSISTED_MOVE.set(clamped.x, 0, clamped.z);
    return ASSISTED_MOVE;
  };

  // 更新ルール:
  // - post-move の blocked 判定は衝突後速度を使わず、attempted/actual forward delta の差だけで決める。
  // - これにより壁衝突で減速した瞬間でも plan を先に消さず、blockedFrames による再 plan が働く。
  PlayerSystem.prototype.updateAvoidancePostMove = function updateAvoidancePostMove(player, rawMoveDir, moveResult, motionIntent, dt) {
    const state = this.ensureAvoidanceState();
    if (!motionIntent?.hasInput || rawMoveDir.lengthSq() <= 0.000001) {
      this.clearAvoidancePlan('immediate');
      return;
    }
    if (!state.plan || state.mode !== 'STRAIGHT' || this.isAvoidanceSuppressed()) {
      state.blockedFrames = 0;
      return;
    }

    const inputDir = normalize2(rawMoveDir.x, rawMoveDir.z, 0, 1);
    const attemptedForward = ((moveResult?.attemptedDeltaX ?? motionIntent?.commandedDeltaX ?? 0) * inputDir.x)
      + ((moveResult?.attemptedDeltaZ ?? motionIntent?.commandedDeltaZ ?? 0) * inputDir.z);
    const actualForward = (moveResult?.actualDeltaX ?? 0) * inputDir.x + (moveResult?.actualDeltaZ ?? 0) * inputDir.z;
    const minForward = Math.max(
      PLAYER_AVOIDANCE.blockedMinForwardDistance,
      attemptedForward * PLAYER_AVOIDANCE.blockedMinForwardRatio,
    );
    const blocked = attemptedForward >= PLAYER_AVOIDANCE.blockedMinForwardDistance
      && actualForward < minForward;

    if (blocked) state.blockedFrames += 1;
    else state.blockedFrames = Math.max(0, state.blockedFrames - 1);
  };
}

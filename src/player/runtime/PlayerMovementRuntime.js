/**
 * Responsibility:
 * - player の移動、壁すべり、回避アシストの最終適用を担当する。
 *
 * Rules:
 * - 回避プランナ本体は disc ベースの corridor 評価器のまま維持する。
 * - shape ごとの差は world 側で bake 済みの playerAvoidanceDiscs に寄せ、このモジュールはそれを world 展開して使うだけにする。
 * - 回避 plan の保持条件と assist 適用条件は同じ gate を共有し、低速や無入力では stale plan を残さない。
 * - 自動回避は入力補助に限定し、入力変更後の短い抑止期間中は一切介入しない。
 * - 回避出力と速度ベクトルは常に現在入力の半平面内に制限し、入力に反する進行を残さない。
 */
import * as THREE from 'three';
import { PLAYER_AVOIDANCE, PLAYER_BASE } from '../../data/balance.js';
import { angleDiff, clamp, lerp } from '../../utils/math.js';
import { clampPointToPlayerTravelBounds } from '../shared/PlayerTravelBounds.js';

const CAMERA_MOVE_FORWARD = new THREE.Vector3();
const CAMERA_MOVE_RIGHT = new THREE.Vector3();
const MOVE = new THREE.Vector3();
const ASSISTED_MOVE = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const AVOIDANCE_PROXY_WORLD = new THREE.Vector3();
const LOOK_YAW_SENSITIVITY = 0.0024;
const LOOK_PITCH_SENSITIVITY = 0.0028;
const DEFAULT_MOUSE_SENSITIVITY = 1;
const PLASMA_READY_BURST_OFFSET = new THREE.Vector3(0, 0.14, 0);
const AXIS_MOVE_EPSILON = 0.0001;
const AVOIDANCE_CANDIDATES = [];
const AVOIDANCE_PROXIES = [];
const AVOIDANCE_VERTICAL_PASS_OVER_CLEARANCE = 0.2;
const AVOIDANCE_VERTICAL_EXTRA_CLEARANCE = 2.8;
const PLAYER_FIELD_COLLISION_INFO = { collided: false, pushX: 0, pushZ: 0, hitCount: 0 };
const PLAYER_AXIS_COLLISION_INFO = { collided: false, pushX: 0, pushZ: 0, hitCount: 0 };
const WALL_SLIDE_EPSILON = 0.000001;

function didReachAxisTarget(currentValue, targetValue) {
  return Math.abs(currentValue - targetValue) <= AXIS_MOVE_EPSILON;
}

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

export function installPlayerMovementRuntime(PlayerSystem) {
  PlayerSystem.prototype.movePlayerWithFieldSlide = function movePlayerWithFieldSlide(player, deltaX, deltaZ) {
    const startX = player.x;
    const startZ = player.z;
    const targetX = startX + deltaX;
    const targetZ = startZ + deltaZ;

    player.x = targetX;
    player.z = targetZ;
    const fullCollision = this.resolveFieldCollisions(player, PLAYER_FIELD_COLLISION_INFO);
    clampPointToPlayerTravelBounds(player);

    const fullX = player.x;
    const fullZ = player.z;
    const reachedFullTarget = didReachAxisTarget(fullX, targetX)
      && didReachAxisTarget(fullZ, targetZ);
    if (reachedFullTarget) {
      return {
        movedX: true,
        movedZ: true,
        collided: !!fullCollision?.collided,
        collisionPushX: fullCollision?.pushX ?? 0,
        collisionPushZ: fullCollision?.pushZ ?? 0,
        attemptedDeltaX: deltaX,
        attemptedDeltaZ: deltaZ,
        actualDeltaX: fullX - startX,
        actualDeltaZ: fullZ - startZ,
      };
    }

    player.x = startX;
    player.z = startZ;

    const axisOrder = Math.abs(deltaX) >= Math.abs(deltaZ)
      ? [['x', deltaX], ['z', deltaZ]]
      : [['z', deltaZ], ['x', deltaX]];

    const axisResult = {
      movedX: Math.abs(deltaX) <= AXIS_MOVE_EPSILON,
      movedZ: Math.abs(deltaZ) <= AXIS_MOVE_EPSILON,
      collided: false,
      collisionPushX: 0,
      collisionPushZ: 0,
    };

    for (let i = 0; i < axisOrder.length; i += 1) {
      const [axis, delta] = axisOrder[i];
      if (Math.abs(delta) <= AXIS_MOVE_EPSILON) continue;

      const beforeAxisValue = axis === 'x' ? player.x : player.z;
      const targetValue = beforeAxisValue + delta;

      if (axis === 'x') {
        player.x = targetValue;
      } else {
        player.z = targetValue;
      }

      const axisCollision = this.resolveFieldCollisions(player, PLAYER_AXIS_COLLISION_INFO);
      clampPointToPlayerTravelBounds(player);
      if (axisCollision?.collided) {
        axisResult.collided = true;
        axisResult.collisionPushX += axisCollision.pushX ?? 0;
        axisResult.collisionPushZ += axisCollision.pushZ ?? 0;
      }

      const resolvedValue = axis === 'x' ? player.x : player.z;
      const reachedTarget = didReachAxisTarget(resolvedValue, targetValue);
      if (axis === 'x') {
        axisResult.movedX = reachedTarget;
      } else {
        axisResult.movedZ = reachedTarget;
      }
    }

    const fullDispX = fullX - startX;
    const fullDispZ = fullZ - startZ;
    const axisDispX = player.x - startX;
    const axisDispZ = player.z - startZ;
    const attemptDir = normalize2(deltaX, deltaZ, 0, 1);
    const fullForward = fullDispX * attemptDir.x + fullDispZ * attemptDir.z;
    const axisForward = axisDispX * attemptDir.x + axisDispZ * attemptDir.z;
    const fullDistanceSq = lengthSq2(fullDispX, fullDispZ);
    const axisDistanceSq = lengthSq2(axisDispX, axisDispZ);
    const preferFullResolvedMove = (fullForward > axisForward + 0.02)
      || (Math.abs(fullForward - axisForward) <= 0.02 && fullDistanceSq > axisDistanceSq + 0.02);

    if (preferFullResolvedMove) {
      player.x = fullX;
      player.z = fullZ;
      return {
        movedX: didReachAxisTarget(fullX, targetX),
        movedZ: didReachAxisTarget(fullZ, targetZ),
        collided: !!fullCollision?.collided,
        collisionPushX: fullCollision?.pushX ?? 0,
        collisionPushZ: fullCollision?.pushZ ?? 0,
        attemptedDeltaX: deltaX,
        attemptedDeltaZ: deltaZ,
        actualDeltaX: fullX - startX,
        actualDeltaZ: fullZ - startZ,
      };
    }

    axisResult.attemptedDeltaX = deltaX;
    axisResult.attemptedDeltaZ = deltaZ;
    axisResult.actualDeltaX = player.x - startX;
    axisResult.actualDeltaZ = player.z - startZ;
    return axisResult;
  };

  PlayerSystem.prototype.applyWallSlideVelocity = function applyWallSlideVelocity(player, moveResult) {
    if (!moveResult?.collided) return;

    const pushX = Number(moveResult.collisionPushX) || 0;
    const pushZ = Number(moveResult.collisionPushZ) || 0;
    const pushLenSq = lengthSq2(pushX, pushZ);
    if (pushLenSq <= WALL_SLIDE_EPSILON) return;

    const invPushLen = 1 / Math.sqrt(pushLenSq);
    const normalX = pushX * invPushLen;
    const normalZ = pushZ * invPushLen;
    const inwardSpeed = player.vx * normalX + player.vz * normalZ;
    if (inwardSpeed >= 0) return;

    player.vx -= normalX * inwardSpeed;
    player.vz -= normalZ * inwardSpeed;
  };

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

  PlayerSystem.prototype.updateAvoidanceMode = function updateAvoidanceMode(cameraForward, dt) {
    const state = this.ensureAvoidanceState();
    const heading = Math.atan2(cameraForward.x, cameraForward.z);
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
    if (rawMoveDir.lengthSq() <= 0.000001) {
      return this.syncFilteredIntent(rawMoveDir);
    }
    if (lengthSq2(state.filteredIntentX, state.filteredIntentZ) <= 0.000001) {
      return this.syncFilteredIntent(rawMoveDir);
    }
    const follow = clamp01(dt * PLAYER_AVOIDANCE.intentFollowRate);
    const filteredX = lerp(state.filteredIntentX, rawMoveDir.x, follow);
    const filteredZ = lerp(state.filteredIntentZ, rawMoveDir.z, follow);
    const normalized = normalize2(filteredX, filteredZ, rawMoveDir.x, rawMoveDir.z);
    state.filteredIntentX = normalized.x;
    state.filteredIntentZ = normalized.z;
    return state;
  };

  PlayerSystem.prototype.shouldSkipAvoidanceVertical = function shouldSkipAvoidanceVertical(playerHoverY, centerY, halfHeight) {
    const safeHalfHeight = Math.max(0.02, Number(halfHeight) || 0.02);
    if (playerHoverY >= centerY + safeHalfHeight + AVOIDANCE_VERTICAL_PASS_OVER_CLEARANCE) return true;
    return Math.abs(playerHoverY - centerY) > safeHalfHeight + AVOIDANCE_VERTICAL_EXTRA_CLEARANCE;
  };

  PlayerSystem.prototype.getAvoidanceAssistGate = function getAvoidanceAssistGate(rawMoveDir, speed) {
    const state = this.ensureAvoidanceState();
    if (rawMoveDir.lengthSq() <= 0.000001) {
      state.intentShiftTimer = 0;
      return 'no-input';
    }
    if (speed < PLAYER_AVOIDANCE.minAssistSpeed) {
      state.intentShiftTimer = 0;
      return 'low-speed';
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

  PlayerSystem.prototype.buildAvoidancePlan = function buildAvoidancePlan(player, rawMoveDir, speed) {
    const world = this.game.world;
    if (!world?.collectPlayerAvoidanceCandidatesSegment) return null;

    const state = this.ensureAvoidanceState();
    const inputAnchor = normalize2(rawMoveDir.x, rawMoveDir.z, 0, 1);
    const anchorX = inputAnchor.x;
    const anchorZ = inputAnchor.z;
    const tangentX = -anchorZ;
    const tangentZ = anchorX;

    const farLookahead = clamp(speed * PLAYER_AVOIDANCE.farTime + PLAYER_AVOIDANCE.farBase, PLAYER_AVOIDANCE.farMin, PLAYER_AVOIDANCE.farMax);
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
      const nearBonus = forwardDist <= clamp(speed * PLAYER_AVOIDANCE.nearTime + PLAYER_AVOIDANCE.nearBase, PLAYER_AVOIDANCE.nearMin, PLAYER_AVOIDANCE.nearMax)
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
    const refSpeed = Math.max(speed, PLAYER_AVOIDANCE.minPlanSpeed);
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

  PlayerSystem.prototype.shouldReplanAvoidance = function shouldReplanAvoidance(player, rawMoveDir, speed, dt) {
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
    if (speed < plan.refSpeed * PLAYER_AVOIDANCE.emergencySpeedDropRatio) return true;

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

  PlayerSystem.prototype.computeAssistedMoveDir = function computeAssistedMoveDir(player, rawMoveDir, speed, dt) {
    const state = this.ensureAvoidanceState();
    ASSISTED_MOVE.copy(rawMoveDir);

    if (this.isAvoidanceSuppressed()) {
      this.syncFilteredIntent(rawMoveDir);
      return ASSISTED_MOVE;
    }

    this.updateFilteredIntent(rawMoveDir, dt);

    const assistGate = this.getAvoidanceAssistGate(rawMoveDir, speed);
    if (assistGate !== 'active') {
      this.clearAvoidancePlan(assistGate === 'low-speed' ? 'immediate' : '');
      return ASSISTED_MOVE;
    }

    const shouldReplan = this.shouldReplanAvoidance(player, rawMoveDir, speed, dt);
    const canPlan = state.mode === 'STRAIGHT'
      && state.time >= state.nextPlannerAt
      && speed >= PLAYER_AVOIDANCE.minAssistSpeed
      && rawMoveDir.lengthSq() > 0.000001;

    if (shouldReplan && canPlan) {
      state.plan = this.buildAvoidancePlan(player, rawMoveDir, speed);
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

  PlayerSystem.prototype.updateAvoidancePostMove = function updateAvoidancePostMove(player, rawMoveDir, moveResult, attemptedSpeed) {
    const state = this.ensureAvoidanceState();
    if (attemptedSpeed < PLAYER_AVOIDANCE.minAssistSpeed || rawMoveDir.lengthSq() <= 0.000001) {
      this.clearAvoidancePlan('immediate');
      return;
    }
    if (!state.plan || state.mode !== 'STRAIGHT' || this.isAvoidanceSuppressed()) {
      state.blockedFrames = 0;
      return;
    }

    const inputDir = normalize2(rawMoveDir.x, rawMoveDir.z, 0, 1);
    const attemptedForward = (moveResult?.attemptedDeltaX ?? 0) * inputDir.x + (moveResult?.attemptedDeltaZ ?? 0) * inputDir.z;
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

  PlayerSystem.prototype.update = function update(dt) {
    const { state, input, store } = this.game;
    const { player } = state;
    const mesh = store.playerMesh;
    if (!mesh) return;

    const avoidanceState = this.ensureAvoidanceState();
    avoidanceState.time += dt;

    const look = input.consumeLookDelta();
    const optionControls = this.game.optionState?.controls ?? null;
    const sensitivityScale = Number.isFinite(optionControls?.mouseSensitivity)
      ? optionControls.mouseSensitivity
      : DEFAULT_MOUSE_SENSITIVITY;
    const invertY = optionControls?.invertY === true ? -1 : 1;
    player.yaw -= look.x * LOOK_YAW_SENSITIVITY * sensitivityScale;
    player.pitch = clamp(player.pitch - (look.y * LOOK_PITCH_SENSITIVITY * sensitivityScale * invertY), -1.1, 0.85);
    player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    player.primaryCooldown = Math.max(0, player.primaryCooldown - dt);
    player.plasmaCooldown = Math.max(0, player.plasmaCooldown - dt);
    const plasmaReady = player.plasmaCooldown <= 0.0001;
    const plasmaReadyTriggered = !this.wasPlasmaReady && plasmaReady;
    this.wasPlasmaReady = plasmaReady;
    player.weaponHeat = Math.max(0, player.weaponHeat - dt * 0.55);
    player.recoil = Math.max(0, player.recoil - dt * 8.5);

    if (this.updateFinalClearCinematic(player, mesh, dt)) {
      return;
    }

    this.game.renderer.camera.getWorldDirection(CAMERA_MOVE_FORWARD);
    CAMERA_MOVE_FORWARD.y = 0;
    if (CAMERA_MOVE_FORWARD.lengthSq() < 0.0001) {
      CAMERA_MOVE_FORWARD.set(0, 0, -1).applyAxisAngle(UP, player.yaw);
    }
    CAMERA_MOVE_FORWARD.normalize();
    this.updateAvoidanceMode(CAMERA_MOVE_FORWARD, dt);
    CAMERA_MOVE_RIGHT.crossVectors(CAMERA_MOVE_FORWARD, UP).negate().normalize();

    let moveInputMask = 0;
    MOVE.set(0, 0, 0);
    if (input.isDown('KeyW')) {
      MOVE.add(CAMERA_MOVE_FORWARD);
      moveInputMask |= 1;
    }
    if (input.isDown('KeyS')) {
      MOVE.sub(CAMERA_MOVE_FORWARD);
      moveInputMask |= 2;
    }
    if (input.isDown('KeyD')) {
      MOVE.sub(CAMERA_MOVE_RIGHT);
      moveInputMask |= 4;
    }
    if (input.isDown('KeyA')) {
      MOVE.add(CAMERA_MOVE_RIGHT);
      moveInputMask |= 8;
    }
    if (MOVE.lengthSq() > 0) MOVE.normalize();
    this.handleMoveInputChange(player, MOVE, moveInputMask);

    const frostMoveScale = this.game.enemies?.getFrostBlizzardMoveScale?.() ?? 1;
    const astralGelMoveScale = this.game.world.getPlayerMoveScaleAt?.(player.x, player.y, player.z) ?? 1;
    const moveScale = frostMoveScale * astralGelMoveScale;
    const planarSpeed = Math.hypot(player.vx, player.vz);
    const moveDir = this.computeAssistedMoveDir(player, MOVE, planarSpeed, dt);
    const accel = moveDir.multiplyScalar(PLAYER_BASE.moveSpeed * 3.2 * moveScale);
    player.vx = lerp(player.vx, accel.x, dt * 4.8);
    player.vz = lerp(player.vz, accel.z, dt * 4.8);
    const drag = 1 - Math.min(dt * 0.22, 0.08);
    player.vx *= drag;
    player.vz *= drag;
    this.clampVelocityToInputHalfPlane(player, MOVE);

    const moveResult = this.movePlayerWithFieldSlide(player, player.vx * dt, player.vz * dt);
    this.applyWallSlideVelocity(player, moveResult);
    this.clampVelocityToInputHalfPlane(player, MOVE);
    if (!moveResult.movedX && Math.abs(player.vx) <= AXIS_MOVE_EPSILON) {
      player.vx = 0;
    }
    if (!moveResult.movedZ && Math.abs(player.vz) <= AXIS_MOVE_EPSILON) {
      player.vz = 0;
    }
    this.updateAvoidancePostMove(player, MOVE, moveResult, Math.hypot(player.vx, player.vz));

    const groundY = this.game.world.getHeight(player.x, player.z);
    player.bob += dt * (5 + Math.hypot(player.vx, player.vz) * 0.1);
    const targetY = groundY + PLAYER_BASE.hoverHeight + Math.sin(player.bob) * 0.18;
    player.y = lerp(player.y, targetY, dt * 8);

    mesh.position.set(player.x, player.y, player.z);
    if (plasmaReadyTriggered) {
      this.game.effects?.spawnPlasmaReadyBurst?.(mesh, 0x8ff6ff, 1, PLASMA_READY_BURST_OFFSET);
      this.game.audio?.playSfx('playerPlasmaReady', { cooldownMs: 120 });
    }
    mesh.rotation.y = lerp(mesh.rotation.y, player.yaw, dt * 10);
    mesh.rotation.z = lerp(mesh.rotation.z, -player.vx * 0.018, dt * 8);
    mesh.rotation.x = lerp(mesh.rotation.x, player.pitch * 0.16 + player.vz * 0.01, dt * 8);

    const hoverRing = mesh.userData.hoverRing;
    if (hoverRing) {
      hoverRing.rotation.z += dt * 1.8;
    }
    this.updatePlasmaGlowFeedback(player, mesh, state);
  };
}

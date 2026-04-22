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
    this.resolveFieldCollisions(player);
    clampPointToPlayerTravelBounds(player);

    const reachedFullTarget = didReachAxisTarget(player.x, targetX)
      && didReachAxisTarget(player.z, targetZ);
    if (reachedFullTarget) {
      return { movedX: true, movedZ: true };
    }

    player.x = startX;
    player.z = startZ;

    const axisOrder = Math.abs(deltaX) >= Math.abs(deltaZ)
      ? [['x', deltaX], ['z', deltaZ]]
      : [['z', deltaZ], ['x', deltaX]];

    const result = {
      movedX: Math.abs(deltaX) <= AXIS_MOVE_EPSILON,
      movedZ: Math.abs(deltaZ) <= AXIS_MOVE_EPSILON,
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

      this.resolveFieldCollisions(player);
      clampPointToPlayerTravelBounds(player);

      const resolvedValue = axis === 'x' ? player.x : player.z;
      const reachedTarget = didReachAxisTarget(resolvedValue, targetValue);
      if (axis === 'x') {
        result.movedX = reachedTarget;
      } else {
        result.movedZ = reachedTarget;
      }
    }

    return result;
  };

  PlayerSystem.prototype.ensureAvoidanceState = function ensureAvoidanceState() {
    if (!this.avoidanceState) this.avoidanceState = makeAvoidanceState();
    return this.avoidanceState;
  };

  PlayerSystem.prototype.clearAvoidancePlan = function clearAvoidancePlan(reason = '') {
    const state = this.ensureAvoidanceState();
    state.plan = null;
    state.intentShiftTimer = 0;
    state.blockedFrames = 0;
    if (reason === 'immediate') state.nextPlannerAt = state.time;
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
      }
    }
    return state.mode;
  };

  PlayerSystem.prototype.updateFilteredIntent = function updateFilteredIntent(rawMoveDir, dt) {
    const state = this.ensureAvoidanceState();
    if (rawMoveDir.lengthSq() <= 0.000001) {
      state.filteredIntentX = 0;
      state.filteredIntentZ = 1;
      return state;
    }
    if (lengthSq2(state.filteredIntentX, state.filteredIntentZ) <= 0.000001) {
      state.filteredIntentX = rawMoveDir.x;
      state.filteredIntentZ = rawMoveDir.z;
      return state;
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

  PlayerSystem.prototype.getAvoidanceDiscSource = function getAvoidanceDiscSource(collider) {
    if (Array.isArray(collider?.playerAvoidanceDiscs) && collider.playerAvoidanceDiscs.length > 0) {
      return collider.playerAvoidanceDiscs;
    }
    if (Array.isArray(collider?.playerCollisionDiscs) && collider.playerCollisionDiscs.length > 0) {
      return collider.playerCollisionDiscs;
    }
    return null;
  };

  PlayerSystem.prototype.collectAvoidanceProxies = function collectAvoidanceProxies(playerHoverY, candidates, out = AVOIDANCE_PROXIES) {
    out.length = 0;
    for (let i = 0; i < candidates.length; i += 1) {
      const collider = candidates[i];
      if (!collider || collider.blocksPlayer === false) continue;
      this.game.world.refreshCollider?.(collider);
      const discs = this.getAvoidanceDiscSource(collider);
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
        radius: Math.max(0.05, Number(collider?.radius ?? collider?.gridRadius ?? 0.05) || 0.05) + padding,
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
    const velocityDir = speed > 0.0001 ? normalize2(player.vx, player.vz, rawMoveDir.x, rawMoveDir.z) : null;
    const blendedAnchor = velocityDir
      ? normalize2(rawMoveDir.x * 0.72 + velocityDir.x * 0.28, rawMoveDir.z * 0.72 + velocityDir.z * 0.28, rawMoveDir.x, rawMoveDir.z)
      : normalize2(rawMoveDir.x, rawMoveDir.z, 0, 1);
    const anchorX = blendedAnchor.x;
    const anchorZ = blendedAnchor.z;
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
    if (rawMoveDir.lengthSq() <= 0.000001) {
      state.intentShiftTimer = 0;
      return false;
    }
    if (speed < PLAYER_AVOIDANCE.minAssistSpeed) {
      state.intentShiftTimer = 0;
      return false;
    }
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
    this.updateFilteredIntent(rawMoveDir, dt);

    ASSISTED_MOVE.copy(rawMoveDir);
    if (rawMoveDir.lengthSq() <= 0.000001) {
      this.clearAvoidancePlan();
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
    const currentDir = speed > 0.0001 ? normalize2(player.vx, player.vz, rawMoveDir.x, rawMoveDir.z) : normalize2(rawMoveDir.x, rawMoveDir.z, 0, 1);
    const rotated = rotateDirTowards(currentDir.x, currentDir.z, blended.x, blended.z, PLAYER_AVOIDANCE.planTurnRate * dt);
    ASSISTED_MOVE.set(rotated.x, 0, rotated.z);
    return ASSISTED_MOVE;
  };

  PlayerSystem.prototype.updateAvoidancePostMove = function updateAvoidancePostMove(player, moveResult, attemptedSpeed) {
    const state = this.ensureAvoidanceState();
    if (!state.plan || state.mode !== 'STRAIGHT' || attemptedSpeed < PLAYER_AVOIDANCE.minAssistSpeed) {
      state.blockedFrames = 0;
      return;
    }
    const blocked = !moveResult.movedX || !moveResult.movedZ;
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

    MOVE.set(0, 0, 0);
    if (input.isDown('KeyW')) MOVE.add(CAMERA_MOVE_FORWARD);
    if (input.isDown('KeyS')) MOVE.sub(CAMERA_MOVE_FORWARD);
    if (input.isDown('KeyD')) MOVE.sub(CAMERA_MOVE_RIGHT);
    if (input.isDown('KeyA')) MOVE.add(CAMERA_MOVE_RIGHT);
    if (MOVE.lengthSq() > 0) MOVE.normalize();

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

    const moveResult = this.movePlayerWithFieldSlide(player, player.vx * dt, player.vz * dt);
    if (!moveResult.movedX) {
      player.vx = 0;
    }
    if (!moveResult.movedZ) {
      player.vz = 0;
    }
    this.updateAvoidancePostMove(player, moveResult, Math.hypot(player.vx, player.vz));

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

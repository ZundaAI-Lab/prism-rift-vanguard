/**
 * Responsibility:
 * - 通常プレイ中の平面移動・壁すべり・hover 高さ更新を担当する。
 *
 * Rules:
 * - ここは「どう動くか」のみを持ち、回避プラン生成や mesh 演出を混ぜない。
 * - 実衝突解決そのものは PlayerCollisionRuntime を呼び出して利用する。
 * - 入力変更後に逆向き速度を残さない最終制限は、回避 runtime と共有する clamp を通す。
 * - 回避 runtime へ渡す速度は現在速度ではなく、このフレーム入力から作る motionIntent を正とする。
 * - post-move の blocked 判定は衝突後速度ではなく、attempted/actual delta を比較して行う。
 */
import { PLAYER_BASE } from '../../data/balance.js';
import { lerp } from '../../utils/math.js';
import { clampPointToPlayerTravelBounds } from '../shared/PlayerTravelBounds.js';

const AXIS_MOVE_EPSILON = 0.0001;
const PLAYER_FIELD_COLLISION_INFO = { collided: false, pushX: 0, pushZ: 0, hitCount: 0 };
const PLAYER_AXIS_COLLISION_INFO = { collided: false, pushX: 0, pushZ: 0, hitCount: 0 };
const WALL_SLIDE_EPSILON = 0.000001;

function didReachAxisTarget(currentValue, targetValue) {
  return Math.abs(currentValue - targetValue) <= AXIS_MOVE_EPSILON;
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

export function installPlayerMotionRuntime(PlayerSystem) {
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

      if (axis === 'x') player.x = targetValue;
      else player.z = targetValue;

      const axisCollision = this.resolveFieldCollisions(player, PLAYER_AXIS_COLLISION_INFO);
      clampPointToPlayerTravelBounds(player);
      if (axisCollision?.collided) {
        axisResult.collided = true;
        axisResult.collisionPushX += axisCollision.pushX ?? 0;
        axisResult.collisionPushZ += axisCollision.pushZ ?? 0;
      }

      const resolvedValue = axis === 'x' ? player.x : player.z;
      const reachedTarget = didReachAxisTarget(resolvedValue, targetValue);
      if (axis === 'x') axisResult.movedX = reachedTarget;
      else axisResult.movedZ = reachedTarget;
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

  // 更新ルール:
  // - 自動回避の開始条件と planner 用 speed は、このフレーム入力から作る motionIntent を正とする。
  // - 実移動後の blocked 判定は衝突後速度を渡さず、moveResult の attempted/actual delta 比較に一本化する。
  PlayerSystem.prototype.sampleAvoidanceMotionIntent = function sampleAvoidanceMotionIntent(player, rawMoveDir, moveScale, dt) {
    const hasInput = rawMoveDir.lengthSq() > 0.000001;
    const preMoveSpeed = Math.hypot(player.vx, player.vz);
    if (!hasInput) {
      return {
        hasInput: false,
        inputDirX: 0,
        inputDirZ: 1,
        preMoveSpeed,
        commandSpeed: 0,
        commandedDeltaX: 0,
        commandedDeltaZ: 0,
      };
    }

    const inputDir = normalize2(rawMoveDir.x, rawMoveDir.z, 0, 1);
    const targetSpeed = PLAYER_BASE.moveSpeed * 3.2 * moveScale;
    const predictedVx = lerp(player.vx, inputDir.x * targetSpeed, dt * 4.8);
    const predictedVz = lerp(player.vz, inputDir.z * targetSpeed, dt * 4.8);
    const drag = 1 - Math.min(dt * 0.22, 0.08);
    const commandVx = predictedVx * drag;
    const commandVz = predictedVz * drag;

    return {
      hasInput: true,
      inputDirX: inputDir.x,
      inputDirZ: inputDir.z,
      preMoveSpeed,
      commandSpeed: Math.max(targetSpeed, Math.hypot(commandVx, commandVz)),
      commandedDeltaX: commandVx * dt,
      commandedDeltaZ: commandVz * dt,
    };
  };

  PlayerSystem.prototype.updatePlanarMotion = function updatePlanarMotion(player, rawMoveDir, moveScale, dt) {
    const motionIntent = this.sampleAvoidanceMotionIntent(player, rawMoveDir, moveScale, dt);
    const moveDir = this.computeAssistedMoveDir(player, rawMoveDir, motionIntent, dt);
    const accel = moveDir.multiplyScalar(PLAYER_BASE.moveSpeed * 3.2 * moveScale);
    player.vx = lerp(player.vx, accel.x, dt * 4.8);
    player.vz = lerp(player.vz, accel.z, dt * 4.8);

    const drag = 1 - Math.min(dt * 0.22, 0.08);
    player.vx *= drag;
    player.vz *= drag;
    this.clampVelocityToInputHalfPlane(player, rawMoveDir);

    const moveResult = this.movePlayerWithFieldSlide(player, player.vx * dt, player.vz * dt);
    this.applyWallSlideVelocity(player, moveResult);
    this.clampVelocityToInputHalfPlane(player, rawMoveDir);

    if (!moveResult.movedX && Math.abs(player.vx) <= AXIS_MOVE_EPSILON) player.vx = 0;
    if (!moveResult.movedZ && Math.abs(player.vz) <= AXIS_MOVE_EPSILON) player.vz = 0;

    this.updateAvoidancePostMove(player, rawMoveDir, moveResult, motionIntent, dt);
    return moveResult;
  };

  PlayerSystem.prototype.updatePlayerHoverHeight = function updatePlayerHoverHeight(player, dt) {
    const groundY = this.game.world.getHeight(player.x, player.z);
    player.bob += dt * (5 + Math.hypot(player.vx, player.vz) * 0.1);
    const targetY = groundY + PLAYER_BASE.hoverHeight + Math.sin(player.bob) * 0.18;
    player.y = lerp(player.y, targetY, dt * 8);
    return player.y;
  };
}

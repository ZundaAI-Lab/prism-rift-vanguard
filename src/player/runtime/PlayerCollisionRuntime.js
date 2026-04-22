/**
 * Responsibility:
 * - player と静的ワールド障害物の実衝突解決を担当する。
 *
 * Rules:
 * - collider shape 判定は shared helper を truth source とし、移動/debug と別解釈を持たない。
 * - 実際の押し戻しは shape ごとの専用解決器で行う。
 */
import * as THREE from 'three';
import { PLAYER_BASE } from '../../data/balance.js';
import { getPlayerColliderModel } from '../../world/environment/PlayerColliderShapeShared.js';

const COLLIDER_WORLD = new THREE.Vector3();
const COLLISION_DELTA = new THREE.Vector2();
const FIELD_COLLIDER_QUERY_RESULTS = [];
const PLAYER_PASS_OVER_CLEARANCE = 0.2;
const PLAYER_WORLD_POINT = new THREE.Vector3();
const PLAYER_LOCAL_POINT = new THREE.Vector3();
const PLAYER_LOCAL_CLAMP = new THREE.Vector3();
const PLAYER_WORLD_CLOSEST = new THREE.Vector3();
const PLAYER_WORLD_PUSH = new THREE.Vector3();
const PLAYER_COLLIDER_MATRIX_INV = new THREE.Matrix4();
const PLAYER_COLLIDER_QUATERNION = new THREE.Quaternion();
const PLAYER_SUB_COLLIDER_WORLD = new THREE.Vector3();
const PLAYER_FIELD_COLLISION_EPSILON = 0.000001;

export function installPlayerCollisionRuntime(PlayerSystem) {
  PlayerSystem.prototype.getColliderTopY = function getColliderTopY(collider) {
    if (Number.isFinite(collider?.topY)) return collider.topY;
    const colliderHalfHeight = collider?.halfHeight ?? collider?.verticalRadius ?? collider?.radius ?? 0;
    return (collider?.y ?? 0) + colliderHalfHeight;
  };

  PlayerSystem.prototype.getPlayerCollisionModel = function getPlayerCollisionModelForRuntime(collider) {
    return getPlayerColliderModel(collider);
  };

  PlayerSystem.prototype.getColliderMatrixWorld = function getColliderMatrixWorld(collider) {
    return collider?.matrixWorldStatic ?? collider?.source?.matrixWorld ?? null;
  };

  PlayerSystem.prototype.getColliderWorldQuaternion = function getColliderWorldQuaternion(collider, out = PLAYER_COLLIDER_QUATERNION) {
    if (collider?.worldQuaternion) return out.copy(collider.worldQuaternion);
    collider?.source?.getWorldQuaternion?.(out);
    return out;
  };

  PlayerSystem.prototype.shouldSkipVerticalCollision = function shouldSkipVerticalCollision(playerHoverY, centerY, halfHeight) {
    const safeHalfHeight = Math.max(0.02, Number(halfHeight) || 0.02);
    if (playerHoverY >= centerY + safeHalfHeight + PLAYER_PASS_OVER_CLEARANCE) return true;
    return Math.abs(playerHoverY - centerY) > safeHalfHeight + 2.8;
  };

  PlayerSystem.prototype.pushPlayerOutOfDisc = function pushPlayerOutOfDisc(player, centerX, centerY, centerZ, radius, halfHeight, playerHoverY, playerRadius) {
    if (this.shouldSkipVerticalCollision(playerHoverY, centerY, halfHeight)) return false;

    COLLISION_DELTA.set(player.x - centerX, player.z - centerZ);
    const minDistance = playerRadius + Math.max(0.01, Number(radius) || 0.01);
    const distSq = COLLISION_DELTA.lengthSq();
    if (distSq >= minDistance * minDistance) return false;

    let dist = Math.sqrt(distSq);
    if (dist < 0.0001) {
      COLLISION_DELTA.set(1, 0);
      dist = 1;
    } else {
      COLLISION_DELTA.multiplyScalar(1 / dist);
    }

    const push = minDistance - dist;
    player.x += COLLISION_DELTA.x * push;
    player.z += COLLISION_DELTA.y * push;
    return true;
  };

  PlayerSystem.prototype.pushPlayerOutOfObb = function pushPlayerOutOfObb(player, collider, playerHoverY, playerRadius) {
    if (!collider?.localHalfExtents) return false;
    const matrixWorld = this.getColliderMatrixWorld(collider);
    if (!matrixWorld) return false;

    if (collider.matrixWorldInverseStatic) PLAYER_COLLIDER_MATRIX_INV.copy(collider.matrixWorldInverseStatic);
    else PLAYER_COLLIDER_MATRIX_INV.copy(matrixWorld).invert();

    PLAYER_WORLD_POINT.set(player.x, playerHoverY, player.z);
    PLAYER_LOCAL_POINT.copy(PLAYER_WORLD_POINT).applyMatrix4(PLAYER_COLLIDER_MATRIX_INV);

    const half = collider.localHalfExtents;
    if (this.shouldSkipVerticalCollision(PLAYER_LOCAL_POINT.y, 0, half.y ?? 0)) return false;

    const closestX = THREE.MathUtils.clamp(PLAYER_LOCAL_POINT.x, -half.x, half.x);
    const closestZ = THREE.MathUtils.clamp(PLAYER_LOCAL_POINT.z, -half.z, half.z);
    let push = 0;
    let normalX = 0;
    let normalZ = 0;

    const dx = PLAYER_LOCAL_POINT.x - closestX;
    const dz = PLAYER_LOCAL_POINT.z - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq > 0.0000001) {
      const dist = Math.sqrt(distSq);
      if (dist >= playerRadius) return false;
      push = playerRadius - dist;
      normalX = dx / dist;
      normalZ = dz / dist;
    } else {
      const penX = half.x - Math.abs(PLAYER_LOCAL_POINT.x);
      const penZ = half.z - Math.abs(PLAYER_LOCAL_POINT.z);
      if (penX <= penZ) {
        normalX = Math.sign(PLAYER_LOCAL_POINT.x) || 1;
        normalZ = 0;
        push = playerRadius + penX;
      } else {
        normalX = 0;
        normalZ = Math.sign(PLAYER_LOCAL_POINT.z) || 1;
        push = playerRadius + penZ;
      }
    }

    PLAYER_WORLD_PUSH.set(normalX, 0, normalZ).applyQuaternion(this.getColliderWorldQuaternion(collider));
    PLAYER_WORLD_PUSH.y = 0;
    if (PLAYER_WORLD_PUSH.lengthSq() < 0.000001) {
      PLAYER_WORLD_PUSH.set(player.x - (collider.x ?? 0), 0, player.z - (collider.z ?? 0));
      if (PLAYER_WORLD_PUSH.lengthSq() < 0.000001) PLAYER_WORLD_PUSH.set(1, 0, 0);
    }
    PLAYER_WORLD_PUSH.normalize().multiplyScalar(push);
    player.x += PLAYER_WORLD_PUSH.x;
    player.z += PLAYER_WORLD_PUSH.z;
    return true;
  };

  PlayerSystem.prototype.pushPlayerOutOfRing = function pushPlayerOutOfRing(player, collider, playerHoverY, playerRadius) {
    const matrixWorld = this.getColliderMatrixWorld(collider);
    if (!matrixWorld) return false;

    if (collider.matrixWorldInverseStatic) PLAYER_COLLIDER_MATRIX_INV.copy(collider.matrixWorldInverseStatic);
    else PLAYER_COLLIDER_MATRIX_INV.copy(matrixWorld).invert();

    PLAYER_WORLD_POINT.set(player.x, playerHoverY, player.z);
    PLAYER_LOCAL_POINT.copy(PLAYER_WORLD_POINT).applyMatrix4(PLAYER_COLLIDER_MATRIX_INV);

    const majorRadius = Math.max(0.01, Number(collider.ringRadius ?? collider.radius) || 0.01);
    const tubeRadius = Math.max(0.01, Number(collider.tubeRadius) || 0.01);
    const radial = Math.hypot(PLAYER_LOCAL_POINT.x, PLAYER_LOCAL_POINT.y);
    if (radial < 0.0001) return false;

    PLAYER_LOCAL_CLAMP.set((PLAYER_LOCAL_POINT.x / radial) * majorRadius, (PLAYER_LOCAL_POINT.y / radial) * majorRadius, 0);
    const localDeltaX = PLAYER_LOCAL_POINT.x - PLAYER_LOCAL_CLAMP.x;
    const localDeltaY = PLAYER_LOCAL_POINT.y - PLAYER_LOCAL_CLAMP.y;
    const localDeltaZ = PLAYER_LOCAL_POINT.z;
    const distSq = localDeltaX * localDeltaX + localDeltaY * localDeltaY + localDeltaZ * localDeltaZ;
    const minDistance = tubeRadius + playerRadius;
    if (distSq >= minDistance * minDistance) return false;

    let dist = Math.sqrt(distSq);
    if (dist < 0.0001) {
      PLAYER_LOCAL_POINT.set(0, 0, 1);
      dist = 1;
    } else {
      PLAYER_LOCAL_POINT.set(localDeltaX / dist, localDeltaY / dist, localDeltaZ / dist);
    }

    const push = minDistance - dist;
    PLAYER_LOCAL_CLAMP.addScaledVector(PLAYER_LOCAL_POINT, tubeRadius);
    PLAYER_WORLD_CLOSEST.copy(PLAYER_LOCAL_CLAMP).applyMatrix4(matrixWorld);
    PLAYER_WORLD_PUSH.set(player.x - PLAYER_WORLD_CLOSEST.x, 0, player.z - PLAYER_WORLD_CLOSEST.z);
    if (PLAYER_WORLD_PUSH.lengthSq() < 0.000001) {
      PLAYER_WORLD_PUSH.copy(PLAYER_LOCAL_POINT).applyQuaternion(this.getColliderWorldQuaternion(collider));
      PLAYER_WORLD_PUSH.y = 0;
      if (PLAYER_WORLD_PUSH.lengthSq() < 0.000001) {
        PLAYER_WORLD_PUSH.set(player.x - (collider.x ?? 0), 0, player.z - (collider.z ?? 0));
        if (PLAYER_WORLD_PUSH.lengthSq() < 0.000001) PLAYER_WORLD_PUSH.set(1, 0, 0);
      }
    }
    PLAYER_WORLD_PUSH.normalize().multiplyScalar(push);
    player.x += PLAYER_WORLD_PUSH.x;
    player.z += PLAYER_WORLD_PUSH.z;
    return true;
  };

  PlayerSystem.prototype.pushPlayerOutOfCompound = function pushPlayerOutOfCompound(player, collider, playerHoverY, playerRadius) {
    const discs = collider?.playerCollisionDiscs;
    if (!Array.isArray(discs) || discs.length === 0) return false;

    const matrixWorld = this.getColliderMatrixWorld(collider);
    let collided = false;
    for (let i = 0; i < discs.length; i += 1) {
      const disc = discs[i];
      if (!disc) continue;
      if (matrixWorld) {
        PLAYER_SUB_COLLIDER_WORLD.set(disc.x ?? 0, disc.y ?? 0, disc.z ?? 0).applyMatrix4(matrixWorld);
      } else {
        PLAYER_SUB_COLLIDER_WORLD.set(
          (collider.x ?? 0) + (disc.x ?? 0),
          (collider.y ?? 0) + (disc.y ?? 0),
          (collider.z ?? 0) + (disc.z ?? 0),
        );
      }
      collided = this.pushPlayerOutOfDisc(
        player,
        PLAYER_SUB_COLLIDER_WORLD.x,
        PLAYER_SUB_COLLIDER_WORLD.y,
        PLAYER_SUB_COLLIDER_WORLD.z,
        disc.radius,
        disc.halfHeight,
        playerHoverY,
        playerRadius,
      ) || collided;
    }
    return collided;
  };

  PlayerSystem.prototype.resolveSingleFieldCollider = function resolveSingleFieldCollider(player, collider, playerHoverY, playerRadius) {
    const model = this.getPlayerCollisionModel(collider);
    if (model === 'compound') return this.pushPlayerOutOfCompound(player, collider, playerHoverY, playerRadius);
    if (model === 'obb') return this.pushPlayerOutOfObb(player, collider, playerHoverY, playerRadius);
    if (model === 'ring') return this.pushPlayerOutOfRing(player, collider, playerHoverY, playerRadius);
    return this.pushPlayerOutOfDisc(
      player,
      collider.x ?? 0,
      collider.y ?? 0,
      collider.z ?? 0,
      collider.radius ?? 0,
      collider.halfHeight ?? collider.verticalRadius ?? collider.radius ?? 0,
      playerHoverY,
      playerRadius,
    );
  };

  PlayerSystem.prototype.resolveFieldCollisions = function resolveFieldCollisions(player, out = null) {
    if (out) {
      out.collided = false;
      out.pushX = 0;
      out.pushZ = 0;
      out.hitCount = 0;
    }

    const world = this.game.world;
    const playerRadius = PLAYER_BASE.collisionRadius;
    const colliders = world?.collectPlayerCollisionCandidates?.(player.x, player.z, playerRadius, FIELD_COLLIDER_QUERY_RESULTS);
    if (!Array.isArray(colliders) || colliders.length === 0) return out;

    const perf = this.game.debug?.getPerformanceMonitor?.();
    perf?.count?.('staticQueries', 1);
    perf?.sample?.('staticCandidates', colliders.length);

    const hoverGroundY = world.getHeight(player.x, player.z);
    const playerHoverY = Math.max(player.y, hoverGroundY + PLAYER_BASE.hoverHeight);

    for (let i = 0; i < colliders.length; i += 1) {
      const collider = colliders[i];
      if (!collider || collider.blocksPlayer === false) continue;
      world.refreshCollider?.(collider);
      const beforeX = player.x;
      const beforeZ = player.z;
      const collided = this.resolveSingleFieldCollider(player, collider, playerHoverY, playerRadius);
      if (!out || !collided) continue;
      const pushX = player.x - beforeX;
      const pushZ = player.z - beforeZ;
      if ((pushX * pushX + pushZ * pushZ) <= PLAYER_FIELD_COLLISION_EPSILON) continue;
      out.collided = true;
      out.pushX += pushX;
      out.pushZ += pushZ;
      out.hitCount += 1;
    }

    return out;
  };
}

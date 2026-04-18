import * as THREE from 'three';
import { PLAYER_BASE } from '../../data/balance.js';

const COLLIDER_WORLD = new THREE.Vector3();
const COLLISION_DELTA = new THREE.Vector2();
const FIELD_COLLIDER_QUERY_RESULTS = [];
const PLAYER_PASS_OVER_CLEARANCE = 0.2;

export function installPlayerCollisionRuntime(PlayerSystem) {
  PlayerSystem.prototype.getColliderTopY = function getColliderTopY(collider) {
    if (Number.isFinite(collider?.topY)) return collider.topY;
    const colliderHalfHeight = collider?.halfHeight ?? collider?.verticalRadius ?? collider?.radius ?? 0;
    return (collider?.y ?? 0) + colliderHalfHeight;
  };

  PlayerSystem.prototype.resolveFieldCollisions = function resolveFieldCollisions(player) {
    const world = this.game.world;
    const playerRadius = PLAYER_BASE.collisionRadius;
    const colliders = world?.collectPlayerCollisionCandidates?.(player.x, player.z, playerRadius, FIELD_COLLIDER_QUERY_RESULTS);
    if (!Array.isArray(colliders) || colliders.length === 0) return;

    const perf = this.game.debug?.getPerformanceMonitor?.();
    perf?.count?.('staticQueries', 1);
    perf?.sample?.('staticCandidates', colliders.length);

    const hoverGroundY = world.getHeight(player.x, player.z);
    const playerHoverY = Math.max(player.y, hoverGroundY + PLAYER_BASE.hoverHeight);

    for (let i = 0; i < colliders.length; i += 1) {
      const collider = colliders[i];
      if (!collider || collider.blocksPlayer === false) continue;
      world.refreshCollider?.(collider);

      COLLIDER_WORLD.set(collider.x ?? 0, collider.y ?? 0, collider.z ?? 0);
      const colliderRadius = collider.radius ?? 0;
      const colliderHalfHeight = collider.halfHeight ?? collider.verticalRadius ?? colliderRadius;
      const colliderTopY = this.getColliderTopY(collider);
      if (playerHoverY >= colliderTopY + PLAYER_PASS_OVER_CLEARANCE) continue;
      if (Math.abs(playerHoverY - COLLIDER_WORLD.y) > colliderHalfHeight + 2.8) continue;

      COLLISION_DELTA.set(player.x - COLLIDER_WORLD.x, player.z - COLLIDER_WORLD.z);
      const minDistance = playerRadius + colliderRadius;
      const distSq = COLLISION_DELTA.lengthSq();
      if (distSq >= minDistance * minDistance) continue;

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
    }
  };
}

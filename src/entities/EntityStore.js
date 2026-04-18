import { clearAndDisposeChildren, detachAndDispose } from '../utils/three-dispose.js';

/**
 * Responsibility:
 * - Central registry of runtime entities and scene object ownership.
 *
 * Rules:
 * - Arrays here are the single source of truth for active entities.
 * - Systems may push/remove entities, but scene parenting must stay aligned with these arrays.
 * - Pickup and projectile meshes stored in the entity lists are logic anchors only; their visible draw work lives in Renderer.batches.
 * - Avoid putting gameplay rules in this file.
 */
export class EntityStore {
  constructor(renderer) {
    this.renderer = renderer;
    this.groups = renderer.groups;
    this.reset();
  }

  reset() {
    this.playerMesh = null;
    this.enemies = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.pickups = [];
    this.effects = [];
    this.renderer?.batches?.pickups?.clear?.();
    this.renderer?.batches?.projectiles?.clear?.();
    clearAndDisposeChildren(this.groups.actors);
    clearAndDisposeChildren(this.groups.fx);
    clearAndDisposeChildren(this.groups.pickups);
  }

  clearCombatEntities() {
    for (const enemy of this.enemies) detachAndDispose(enemy.mesh);
    this.renderer?.batches?.projectiles?.clear?.();
    for (const projectile of this.playerProjectiles) projectile?.mesh?.parent?.remove?.(projectile.mesh);
    for (const projectile of this.enemyProjectiles) projectile?.mesh?.parent?.remove?.(projectile.mesh);
    this.renderer?.batches?.pickups?.clear?.();
    for (const pickup of this.pickups) pickup?.mesh?.parent?.remove?.(pickup.mesh);
    for (const effect of this.effects) detachAndDispose(effect.mesh);
    this.enemies = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.pickups = [];
    this.effects = [];
  }
}

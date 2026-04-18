import { CollisionSystem } from './CollisionSystem.js';
import { projectileMeshFactoryMethods } from './projectiles/ProjectileMeshFactory.js';
import { projectileSpecialRulesMethods } from './projectiles/ProjectileSpecialRules.js';
import { playerProjectileControllerMethods } from './projectiles/PlayerProjectileController.js';
import { enemyProjectileControllerMethods } from './projectiles/EnemyProjectileController.js';

/**
 * Responsibility:
 * - Owns all projectile entities, movement, homing, and hit resolution.
 *
 * Rules:
 * - Collision queries may happen here, but score and drops must be delegated.
 * - Every projectile added to the store must have a logic anchor mesh and a matching batched visual handle.
 * - Homing behavior belongs here; do not move its math into rendering code.
 * - Enemy projectile readability belongs here. When improving visibility, avoid inflating gameplay hitboxes unless that is explicitly intended.
 * - Static world props are queried through EnvironmentBuilder only. Do not duplicate obstacle lists here, or
 *   projectile-vs-world rules will drift between weapon types.
 */
export class ProjectileSystem {
  constructor(game) {
    this.game = game;
    this.collision = new CollisionSystem();
  }
}

Object.assign(
  ProjectileSystem.prototype,
  projectileMeshFactoryMethods,
  projectileSpecialRulesMethods,
  playerProjectileControllerMethods,
  enemyProjectileControllerMethods,
);

import * as Shared from '../EnemySystemShared.js';

const {
  removeFromArray,
  detachAndDispose,
} = Shared;

export function installEnemyLifecycle(EnemySystem) {
  EnemySystem.prototype.damageEnemy = function damageEnemy(enemy, amount, source = null) {
    if (!enemy.alive || enemy.invulnerable) return false;
    enemy.hp -= amount;
    this.triggerDamageShake(enemy, amount / Math.max(12, enemy.def.isBoss ? 120 : 32));
    this.game.effects.spawnHitSpark(enemy.mesh.position, enemy.def.accent);
    if (enemy.hp <= 0) {
      if (this.bossSystem.interceptLethal(enemy)) return true;
      this.killEnemy(enemy, { source });
      return true;
    }
    return true;
  }

  EnemySystem.prototype.damageEnemiesInRadius = function damageEnemiesInRadius(position, radius, damage, source = null) {
    if (!position || radius <= 0 || damage <= 0) return 0;

    const queryScratch = this.enemySplashQueryScratch || (this.enemySplashQueryScratch = []);
    const candidates = this.queryEnemyBoundsCircleXZ(position.x, position.z, radius, queryScratch);
    const perf = this.game?.debug?.getPerformanceMonitor?.();
    perf?.count?.('enemySplashQueries', 1);
    perf?.sample?.('enemySplashCandidates', candidates.length);

    let damagedCount = 0;
    const directHitEnemy = source?.directHitEnemy ?? null;
    if (directHitEnemy?.alive && directHitEnemy.mesh?.visible !== false) {
      if (this.damageEnemy(directHitEnemy, damage, source)) damagedCount += 1;
    }

    const collision = this.game?.projectiles?.collision ?? null;

    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      const enemy = candidates[i];
      if (!enemy?.alive || enemy.mesh?.visible === false || enemy === directHitEnemy) continue;

      const enemyRadius = Math.max(0, enemy.radius ?? enemy.def?.collisionRadius ?? enemy.def?.radius ?? 0);
      const enemyHalfHeight = Math.max(0, enemy.collisionHalfHeight ?? enemy.def?.collisionHalfHeight ?? 0);
      const edgeDistance = (enemy.collisionShape === 'capsule' && enemyHalfHeight > 0)
        ? (collision?.pointVerticalCapsuleEdgeDistance
          ? collision.pointVerticalCapsuleEdgeDistance(position, enemy.mesh.position, enemyRadius, enemyHalfHeight)
          : Math.max(0, position.distanceTo(enemy.mesh.position) - enemyRadius))
        : (collision?.pointSphereEdgeDistance
          ? collision.pointSphereEdgeDistance(position, enemy.mesh.position, enemyRadius)
          : Math.max(0, position.distanceTo(enemy.mesh.position) - enemyRadius));
      if (edgeDistance > radius) continue;

      const falloff = 1 - Math.min(1, edgeDistance / Math.max(0.001, radius));
      const appliedDamage = damage * (0.45 + falloff * 0.55);
      if (this.damageEnemy(enemy, appliedDamage, source)) damagedCount += 1;
    }
    return damagedCount;
  }

  EnemySystem.prototype.removeEnemy = function removeEnemy(enemy) {
    if (!enemy?.alive) return false;
    enemy.alive = false;
    removeFromArray(this.game.store.enemies, enemy);
    this.markSpatialDirty();
    this.markEnemyFrameDirty();
    detachAndDispose(enemy.mesh);
    return true;
  }

  EnemySystem.prototype.despawnEnemy = function despawnEnemy(enemy) {
    return this.removeEnemy(enemy);
  }

  EnemySystem.prototype.despawnEnemies = function despawnEnemies(predicate) {
    if (typeof predicate !== 'function') return 0;
    let removedCount = 0;
    for (let i = this.game.store.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.game.store.enemies[i];
      if (!enemy?.alive || !predicate(enemy)) continue;
      if (this.removeEnemy(enemy)) removedCount += 1;
    }
    return removedCount;
  }

  EnemySystem.prototype.killEnemy = function killEnemy(enemy, options = {}) {
    if (!this.removeEnemy(enemy)) return;

    this.game.missionAchievements?.registerEnemyDefeated?.(enemy, options.source ?? null);

    const destroySfxId = enemy.def.isBoss
      ? 'bossDestroy'
      : ((enemy.def.behavior === 'heavy' || enemy.def.hp >= 100) ? 'enemyDestroyHeavy' : 'enemyDestroySmall');
    this.game.audio?.playSfx(destroySfxId, { cooldownMs: enemy.def.isBoss ? 300 : 50, worldPosition: enemy.mesh.position });

    this.game.state.score += enemy.def.score;
    const crystalCount = this.game.rewards.calculateCrystalDropCount(enemy.def.crystal, enemy.age, enemy.def.isBoss);
    this.game.missionAchievements?.registerCrystalsDropped?.(crystalCount);
    this.game.rewards.spawnCrystalDrops(enemy.mesh.position.clone(), crystalCount, enemy.def.isBoss ? 1.55 : 1);
    this.game.effects.spawnExplosion(enemy.mesh.position.clone(), enemy.def.accent, enemy.def.isBoss ? 2.6 : 1.2);
    this.game.missionSystem.onEnemyDefeated(enemy);

  }

}

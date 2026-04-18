import * as Shared from '../FinalBossSystemShared.js';

const {
  THREE,
  GAME_BOUNDS,
  VOID_DAIS_RADIUS,
  VOID_DAIS_EXCLUSION_RADIUS,
  VOID_REINFORCEMENT_LIMIT,
  VOID_REINFORCEMENT_POOL,
} = Shared;

export function installFinalBossReinforcements(FinalBossSystem) {
  FinalBossSystem.prototype.countVoidFortressReinforcements = function countVoidFortressReinforcements() {
    let count = 0;
    for (const enemy of this.game.store.enemies) {
      if (!enemy?.alive || enemy.def?.isBoss) continue;
      count += 1;
    }
    return count;
  }

  FinalBossSystem.prototype.pickVoidFortressReinforcementType = function pickVoidFortressReinforcementType() {
    const totalWeight = VOID_REINFORCEMENT_POOL.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const entry of VOID_REINFORCEMENT_POOL) {
      roll -= entry.weight;
      if (roll <= 0) return entry.type;
    }
    return VOID_REINFORCEMENT_POOL[VOID_REINFORCEMENT_POOL.length - 1].type;
  }

  FinalBossSystem.prototype.pickVoidFortressReinforcementPosition = function pickVoidFortressReinforcementPosition() {
    const playerPos = this.game.store.playerMesh?.position;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = THREE.MathUtils.randFloat(VOID_DAIS_EXCLUSION_RADIUS + 4, GAME_BOUNDS.softRadius - 8);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (Math.hypot(x, z) <= VOID_DAIS_EXCLUSION_RADIUS) continue;
      if (playerPos && Math.hypot(x - playerPos.x, z - playerPos.z) < 18) continue;
      return { x, z };
    }
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.max(VOID_DAIS_RADIUS + 28, GAME_BOUNDS.softRadius * 0.72);
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }

  FinalBossSystem.prototype.hasFortressAttackStarted = function hasFortressAttackStarted(enemy) {
    return !!enemy?.alive
      && enemy.finalBoss?.form === 'fortress'
      && enemy.finalBoss?.state === 'fortress'
      && enemy.finalBoss?.fortressAttackStarted === true;
  }

  FinalBossSystem.prototype.trySpawnVoidFortressReinforcement = function trySpawnVoidFortressReinforcement(enemy) {
    if (!enemy?.alive || enemy.finalBoss?.form !== 'fortress' || enemy.finalBoss?.state !== 'fortress') return false;
    if (this.countVoidFortressReinforcements() >= VOID_REINFORCEMENT_LIMIT) return false;

    const typeKey = this.pickVoidFortressReinforcementType();
    const spawnPos = this.pickVoidFortressReinforcementPosition();
    const reinforcement = this.game.enemies.spawnEnemy(typeKey, spawnPos);
    reinforcement.voidFortressSummon = true;
    reinforcement.spawnedByFinalBossPhase1 = true;
    this.game.effects.spawnExplosion(reinforcement.mesh.position.clone(), reinforcement.def.accent, 0.9);
    return true;
  }

  FinalBossSystem.prototype.clearVoidFortressSummons = function clearVoidFortressSummons() {
    this.game.enemies.despawnEnemies((enemy) => enemy.voidFortressSummon === true || enemy.spawnedByFinalBossPhase1 === true);
  }

  FinalBossSystem.prototype.clearEnemyProjectiles = function clearEnemyProjectiles() {
    this.game.projectiles.clearEnemyProjectiles();
  }

}

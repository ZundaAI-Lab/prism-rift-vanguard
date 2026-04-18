import { ENEMY_LIBRARY, randChoice } from './EnemySystemShared.js';
import { EnemyFactory } from './EnemyFactory.js';
import { BossSystem } from './BossSystem.js';
import { installEnemySpawnRuntime } from './runtime/EnemySpawnRuntime.js';
import { installEnemySpawnIntro } from './runtime/EnemySpawnIntro.js';
import { installEnemyDamageRuntime } from './runtime/EnemyDamageRuntime.js';
import { installEnemyCombatRuntime } from './runtime/EnemyCombatRuntime.js';
import { installEnemyLifecycle } from './runtime/EnemyLifecycle.js';
import { installEnemySpatialRuntime } from './runtime/EnemySpatialRuntime.js';
import { installEnemyFrameRuntime } from './runtime/EnemyFrameRuntime.js';

/**
 * Responsibility:
 * - Spawns enemies, updates AI, fires enemy attacks, and resolves enemy death.
 *
 * Rules:
 * - Enemy state mutations must stay here.
 * - Use MissionSystem for wave/boss orchestration decisions.
 * - Use RewardSystem/EffectsSystem for drops and visuals; do not inline those concerns.
 * - Enemy spawns must respect the minimap inner ring as a no-spawn zone around the player so newly spawned threats never appear inside the near-field safety area.
 * - Spawn presentation should stay here as enemy runtime state because it temporarily gates movement and attacks. Cosmetic rift rendering belongs in EffectsSystem.
 * - New behavior strings and attack strings must be handled here explicitly so data entries never fall back silently.
 */
export class EnemySystem {
  constructor(game) {
    this.game = game;
    this.factory = new EnemyFactory();
    this.bossSystem = new BossSystem(game);
  }

  reset() {
    this.factory.resetIds();
    this.clearEncounterRuntimeState();
  }

  clearEncounterRuntimeState() {
    this.bossSystem.clearEncounterRuntimeState();
    this.resetEnemySpatialIndex();
    this.resetEnemyFrameView();
  }

  getFrostBlizzardState() {
    return this.bossSystem.getFrostBlizzardState();
  }

  getFrostBlizzardMoveScale() {
    const blizzard = this.getFrostBlizzardState();
    return blizzard?.active ? (blizzard.moveScale ?? 0.5) : 1;
  }

  getDefinition(typeKey) {
    return ENEMY_LIBRARY[typeKey];
  }

  pickWaveEnemy(mission, waveNumber) {
    const availableCount = Math.min(mission.enemies.length, Math.max(2, waveNumber));
    return randChoice(mission.enemies.slice(0, availableCount));
  }
}

installEnemySpawnRuntime(EnemySystem);
installEnemySpawnIntro(EnemySystem);
installEnemyDamageRuntime(EnemySystem);
installEnemyCombatRuntime(EnemySystem);
installEnemyLifecycle(EnemySystem);
installEnemySpatialRuntime(EnemySystem);
installEnemyFrameRuntime(EnemySystem);

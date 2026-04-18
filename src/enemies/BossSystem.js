/**
 * Responsibility:
 * - BossSystem はボス専用挙動の façade として各 Controller を束ねる。
 *
 * Rules:
 * - 外部からの import 入口はこのファイルのまま維持する。
 * - ボスごとの固有挙動は各 Controller へ委譲し、このクラスは振り分けと統合だけを行う。
 */
import { TARGET_DIR, SIDE, UP } from './BossSystemShared.js';
import { FinalBossSystem } from './FinalBossSystem.js';
import { installBossAim } from './bosses/shared/BossAim.js';
import { installBossBallistics } from './bosses/shared/BossBallistics.js';
import { installBossPose } from './bosses/shared/BossPose.js';
import { installDesertBossController } from './bosses/DesertBossController.js';
import { installSwampBossController } from './bosses/SwampBossController.js';
import { installForgeBossController } from './bosses/ForgeBossController.js';
import { installFrostBossController } from './bosses/FrostBossController.js';
import { installMirrorBossController } from './bosses/MirrorBossController.js';
import { installAstralBossController } from './bosses/AstralBossController.js';

/**
 * Responsibility:
 * - Boss-exclusive movement and attack orchestration.
 *
 * Rules:
 * - Only handle enemies flagged as bosses.
 * - Reuse ProjectileSystem for all shots; do not implement collision here.
 * - Boss phase thresholds are HP ratio based: base (> 1/2), mid (<= 1/2), final (<= 1/4).
 *   Keep those thresholds centralized here so future tuning cannot silently desync UI, HP, and behavior.
 */
const createFrostBlizzardState = () => ({
  active: false,
  timer: 0,
  moveScale: 1,
  telegraphActive: false,
  telegraphTimer: 0,
  telegraphDuration: 1.25,
  sourceX: 0,
  sourceY: 0,
  sourceZ: 0,
});

export class BossSystem {
    constructor(game) {
      this.game = game;
      this.finalBoss = new FinalBossSystem(game, this);
      this.frostBlizzardState = createFrostBlizzardState();
    }

    getFrostBlizzardState() {
      return this.frostBlizzardState;
    }

    clearEncounterRuntimeState() {
      this.clearFrostBlizzardState();
    }

    setupBoss(enemy) {
      this.finalBoss.setupBoss(enemy);
      if (this.finalBoss.isFinalBoss(enemy)) return;
      if (enemy.def.behavior === 'boss_frost') this.setupFrostBossState(enemy);
      if (enemy.def.behavior === 'boss_mirror') this.setupMirrorBossState(enemy);
      if (enemy.def.behavior === 'boss_astral') this.setupAstralBossState(enemy);
    }

    interceptLethal(enemy) {
      return this.finalBoss.interceptLethal(enemy);
    }

    updateBoss(enemy, dt) {
      if (this.finalBoss.isFinalBoss(enemy)) {
        this.clearFrostBlizzardState();
        this.finalBoss.update(enemy, dt);
        return;
      }
  
      if (enemy.def.behavior !== 'boss_frost') this.clearFrostBlizzardState();
  
      enemy.phase += dt;
      const playerPos = this.game.store.playerMesh.position;
      const hpRatio = enemy.hp / enemy.maxHp;
      const phaseTier = hpRatio <= 0.25 ? 2 : hpRatio <= 0.5 ? 1 : 0;
  
      TARGET_DIR.copy(playerPos).sub(enemy.mesh.position).normalize();
      SIDE.crossVectors(TARGET_DIR, UP).normalize();
  
      switch (enemy.def.behavior) {
        case 'boss_desert': this.updateDesertBoss(enemy, dt, phaseTier, hpRatio); break;
        case 'boss_swamp': this.updateSwampBoss(enemy, dt, phaseTier, hpRatio); break;
        case 'boss_forge': this.updateForgeBoss(enemy, dt, phaseTier, hpRatio); break;
        case 'boss_frost': this.updateFrostBoss(enemy, dt, phaseTier, hpRatio); break;
        case 'boss_mirror': this.updateMirrorBoss(enemy, dt, phaseTier, hpRatio); break;
        case 'boss_astral': this.updateAstralBoss(enemy, dt, phaseTier, hpRatio); break;
        default: break;
      }
    }

}

installBossAim(BossSystem);
installBossBallistics(BossSystem);
installBossPose(BossSystem);
installDesertBossController(BossSystem);
installSwampBossController(BossSystem);
installForgeBossController(BossSystem);
installFrostBossController(BossSystem);
installMirrorBossController(BossSystem);
installAstralBossController(BossSystem);

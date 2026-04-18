import { installFinalBossLifecycle } from './finalBoss/FinalBossLifecycle.js';
import { installFinalBossFortressPhase } from './finalBoss/FinalBossFortressPhase.js';
import { installFinalBossFighterPhase } from './finalBoss/FinalBossFighterPhase.js';
import { installFinalBossFighterRoute } from './finalBoss/FinalBossFighterRoute.js';
import { installFinalBossFortressPatterns } from './finalBoss/FinalBossFortressPatterns.js';
import { installFinalBossFighterPatterns } from './finalBoss/FinalBossFighterPatterns.js';
import { installFinalBossPose } from './finalBoss/FinalBossPose.js';
import { installFinalBossReinforcements } from './finalBoss/FinalBossReinforcements.js';

/**
 * Responsibility:
 * - Mission 7 exclusive boss choreography, including the fortress phase, the transformation sequence,
 *   and the dogfight fighter phase.
 *
 * Rules:
 * - This module owns every special-case rule for the final boss so generic BossSystem stays readable.
 * - Phase transition interception happens here; do not scatter "if final boss" checks across mission/UI code.
 * - Mesh swaps between forms must happen here because visual identity and combat identity change together.
 * - Score/drop payout belongs only to the true final kill. Phase-1 lethal hits are intercepted here and must not leak rewards.
 * - Fighter phase movement must stay physically continuous. No warping/teleporting is allowed here.
 */
export class FinalBossSystem {
  constructor(game, bossSystem) {
    this.game = game;
    this.bossSystem = bossSystem;
  }

  isFinalBoss(enemy) {
    return !!enemy && (
      enemy.def?.behavior === 'boss_final_fortress'
      || enemy.def?.behavior === 'boss_final_fighter'
      || !!enemy.finalBoss
    );
  }
}

installFinalBossLifecycle(FinalBossSystem);
installFinalBossFortressPhase(FinalBossSystem);
installFinalBossFighterPhase(FinalBossSystem);
installFinalBossFighterRoute(FinalBossSystem);
installFinalBossFortressPatterns(FinalBossSystem);
installFinalBossFighterPatterns(FinalBossSystem);
installFinalBossPose(FinalBossSystem);
installFinalBossReinforcements(FinalBossSystem);

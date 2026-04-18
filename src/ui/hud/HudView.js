/**
 * Responsibility:
 * - 戦闘 HUD の公開入口を維持し、builders / state モジュールへ委譲する。
 *
 * Rules:
 * - 固定 HUD の DOM 構築は core/HudBuilders.js を正本にする。
 * - 戦闘 HUD の差分更新は core/HudCombatState.js / HudBossState.js / HudNoticeState.js に分ける。
 * - pause / interval / tutorial / gameover / clear-inline の専用表示は各 screen / overlay view へ戻す。
 *
 * Update Rules:
 * - HudView.js 自体には façade だけを残す。
 * - title controls や tutorial panel を再びここへ混ぜない。
 * - DamageIndicator / Minimap / TargetLock の描画呼び出しは UIScreenFlow 側で順序を管理する。
 */
import { installHudBuilders } from './core/HudBuilders.js';
import { installHudCombatState } from './core/HudCombatState.js';
import { installHudBossState } from './core/HudBossState.js';
import { installHudNoticeState } from './core/HudNoticeState.js';

export function installHudView(UIRoot) {
  installHudBuilders(UIRoot);
  installHudCombatState(UIRoot);
  installHudBossState(UIRoot);
  installHudNoticeState(UIRoot);

  UIRoot.prototype.renderHud = function renderHud() {
    this.renderHudCombatState();
    this.renderHudBossState();
    this.renderHudNoticeState();
  };
}

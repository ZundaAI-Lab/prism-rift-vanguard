/**
 * Responsibility:
 * - HUD レイアウトの公開入口を維持し、個別レイアウトへ委譲する。
 *
 * Update Rules:
 * - boss / notice の位置調整は layout/hud/HudBossNoticeLayout.js を更新する。
 * - tutorial panel の位置調整は layout/hud/TutorialPanelLayout.js を更新する。
 * - HudLayout.js 自体へ詳細レイアウトを戻さない。
 */
import { installHudBossNoticeLayout } from './hud/HudBossNoticeLayout.js';
import { installTutorialPanelLayout } from './hud/TutorialPanelLayout.js';

export function installHudLayout(UIRoot) {
  installHudBossNoticeLayout(UIRoot);
  installTutorialPanelLayout(UIRoot);
}

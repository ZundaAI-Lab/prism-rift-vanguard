import { MISSIONS } from '../../../data/missions.js';
import { formatNumber } from '../../../utils/math.js';

function setTextIfChanged(node, value) {
  if (!node) return;
  const nextValue = String(value ?? '');
  if (node.__uiTextCache === nextValue) return;
  node.textContent = nextValue;
  node.__uiTextCache = nextValue;
}

/**
 * Responsibility:
 * - gameover 画面の本文差分更新を担当する。
 *
 * Update Rules:
 * - gameover 専用文言を HudView に戻さない。
 * - ボタンや DOM 構築は既存 screen builder 側を正本にする。
 */
export function installGameOverScreenState(UIRoot) {
  UIRoot.prototype.renderGameOverScreenState = function renderGameOverScreenState() {
    const state = this.game.state;
    if (state.mode !== 'gameover') return;

    const mission = MISSIONS[state.missionIndex] ?? MISSIONS[0];
    const failAward = state.progression.missionFailCrystalAward ?? 0;
    setTextIfChanged(
      this.refs.gameOverText,
      this.t('hud.gameOverRetryText', {
        mission: this.getMissionName(mission),
        crystals: formatNumber(failAward),
      }),
    );
  };
}

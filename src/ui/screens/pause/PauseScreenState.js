import { MISSIONS } from '../../../data/missions.js';
import { formatNumber } from '../../../utils/math.js';
import { formatMissionTimer } from '../../shared/UiFormatters.js';

function setTextIfChanged(node, value) {
  if (!node) return;
  const nextValue = String(value ?? '');
  if (node.__uiTextCache === nextValue) return;
  node.textContent = nextValue;
  node.__uiTextCache = nextValue;
}

/**
 * Responsibility:
 * - pause 画面の本文差分更新を担当する。
 *
 * Update Rules:
 * - pause 画面専用文言を HudView へ戻さない。
 * - DOM 構築やボタン bind は PauseScreenView.js を更新する。
 */
export function installPauseScreenState(UIRoot) {
  UIRoot.prototype.renderPauseScreenState = function renderPauseScreenState() {
    const state = this.game.state;
    if (state.mode !== 'paused') return;

    const mission = MISSIONS[state.missionIndex] ?? MISSIONS[0];
    const waveText = state.progression.wave > 0
      ? this.t('hud.waveShort', { current: state.progression.wave })
      : this.t('hud.missionIntro');
    const missionTimer = formatMissionTimer(state.progression.missionTimer);
    setTextIfChanged(
      this.refs.pauseInfo,
      this.t('pause.info', {
        mission: this.getMissionName(mission),
        wave: waveText,
        time: missionTimer,
        score: formatNumber(state.score),
        crystals: formatNumber(state.crystals),
      }),
    );
  };
}

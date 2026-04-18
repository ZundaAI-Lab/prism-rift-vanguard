import { MISSIONS } from '../../../data/missions.js';
import { formatNumber } from '../../../utils/math.js';
import { formatMissionDuration, formatMissionTimer } from '../../shared/UiFormatters.js';

function setTextIfChanged(node, value) {
  if (!node) return;
  const nextValue = String(value ?? '');
  if (node.__uiTextCache === nextValue) return;
  node.textContent = nextValue;
  node.__uiTextCache = nextValue;
}

function setStyleIfChanged(node, property, value) {
  if (!node) return;
  const nextValue = String(value ?? '');
  const cache = node.__uiStyleCache ?? (node.__uiStyleCache = Object.create(null));
  if (cache[property] === nextValue) return;
  node.style[property] = nextValue;
  cache[property] = nextValue;
}

/**
 * Responsibility:
 * - 戦闘 HUD の固定ステータス差分更新を担当する。
 *
 * Update Rules:
 * - HP / SCORE / MISSION / WAVE / TIMER / PLASMA だけをここで更新する。
 * - pause / interval / clear / gameover など画面専用文言は各 screen state へ戻す。
 * - ボスバーや center notice は別 state モジュールへ分ける。
 */
export function installHudCombatState(UIRoot) {
  UIRoot.prototype.renderHudCombatState = function renderHudCombatState() {
    const { state, upgrades } = this.game;
    const progression = state.progression;
    const displayMissionIndex = state.mode === 'interval' && Number.isFinite(progression.intervalMissionIndex)
      ? progression.intervalMissionIndex
      : state.missionIndex;
    const mission = MISSIONS[displayMissionIndex] ?? MISSIONS[state.missionIndex] ?? MISSIONS[0];
    const plasmaStats = upgrades.getPlasmaStats();
    const plasmaRatio = plasmaStats.cooldown <= 0 ? 1 : Math.max(0, 1 - state.player.plasmaCooldown / plasmaStats.cooldown);
    const missionTimer = formatMissionTimer(progression.missionTimer);
    const missionTargetTime = progression.missionTargetTime > 0
      ? formatMissionDuration(progression.missionTargetTime)
      : '--:--.-';

    setTextIfChanged(this.refs.missionText, this.getMissionName(mission));
    if (progression.tutorial?.active && mission.isTutorial) {
      setTextIfChanged(this.refs.waveText, this.t('hud.step', {
        current: Math.max(1, progression.tutorial.stepIndex + 1),
        total: Math.max(1, progression.tutorial.totalSteps || 1),
      }));
    } else {
      setTextIfChanged(
        this.refs.waveText,
        mission.waves > 0
          ? this.t('hud.wave', { current: state.progression.wave, total: mission.waves })
          : (state.progression.missionStatus === 'bossIntro' ? this.t('hud.finalBossApproach') : this.t('hud.finalBossActive')),
      );
    }

    if (this.refs.missionTargetTimeValue) {
      setTextIfChanged(this.refs.missionTargetTimeValue, missionTargetTime);
      setStyleIfChanged(this.refs.missionTargetTimeLabel, 'color', progression.missionTargetTime > 0 ? '#7fb8b2' : '#6f808c');
      setStyleIfChanged(this.refs.missionTargetTimeValue, 'color', progression.missionTargetTime > 0 ? '#bff9eb' : '#8ea0ad');
    }

    setTextIfChanged(this.refs.scoreText, formatNumber(state.score));
    setTextIfChanged(this.refs.crystalText, formatNumber(state.crystals));
    setTextIfChanged(this.refs.healthText, `${Math.ceil(state.player.health)} / ${state.player.maxHealth}`);

    const healthRatio = Math.max(0, state.player.health / state.player.maxHealth);
    const isCriticalHealth = healthRatio <= 0.25;
    const isCautionHealth = !isCriticalHealth && healthRatio <= 0.5;
    setStyleIfChanged(this.refs.healthBar, 'transform', `scaleX(${healthRatio})`);
    setStyleIfChanged(
      this.refs.healthBar,
      'background',
      isCriticalHealth
        ? 'linear-gradient(90deg, #ff9d42, #ffb24f 56%, #ffd089)'
        : isCautionHealth
          ? 'linear-gradient(90deg, #ffd84d, #ffe26a 56%, #fff0ad)'
          : 'linear-gradient(90deg, #5dffb1, #8dffde 56%, #f2fff9)',
    );
    setStyleIfChanged(
      this.refs.healthBar,
      'boxShadow',
      isCriticalHealth
        ? '0 0 22px rgba(255, 170, 82, 0.42)'
        : isCautionHealth
          ? '0 0 22px rgba(255, 220, 104, 0.4)'
          : '0 0 22px rgba(141,255,222,0.45)',
    );

    const plasmaReady = state.player.plasmaCooldown <= 0.0001;
    if (this.refs.missionTimerValue) {
      setTextIfChanged(this.refs.missionTimerValue, missionTimer);
      setStyleIfChanged(this.refs.missionTimerWrap, 'display', state.mode === 'title' ? 'none' : 'flex');
      setStyleIfChanged(this.refs.missionTimerWrap, 'opacity', state.mode === 'playing' ? '0.84' : '0.64');
      setStyleIfChanged(this.refs.missionTimerLabel, 'color', progression.missionTimerActive ? '#d6e6ee' : '#b89971');
      setStyleIfChanged(this.refs.missionTimerValue, 'color', progression.missionTimerActive ? '#d9edf8' : '#ffe0a8');
    }

    setStyleIfChanged(this.refs.plasmaGaugeFill, 'transform', `scaleX(${plasmaRatio})`);
    setTextIfChanged(this.refs.plasmaGaugeValue, plasmaReady ? this.t('hud.ready') : `${state.player.plasmaCooldown.toFixed(1)}s`);
    this.refs.plasmaGaugeWrap?.classList.toggle('is-ready', plasmaReady);
  };
}

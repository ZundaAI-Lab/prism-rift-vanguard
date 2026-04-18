/**
 * Responsibility:
 * - インターバル画面本文の差分更新だけを担当する。
 *
 * 更新ルール:
 * - boss alert / transition / shop 描画はこのファイルへ戻さない。
 * - overlay 演出は IntervalBossAlertRuntime.js / IntervalTransitionRuntime.js、
 *   shop は IntervalShopState.js を更新する。
 */
import { MISSIONS } from '../../../data/missions.js';
import { formatNumber } from '../../../utils/math.js';

function setTextIfChanged(node, value) {
  if (!node) return;
  const nextValue = String(value ?? '');
  if (node.__uiTextCache === nextValue) return;
  node.textContent = nextValue;
  node.__uiTextCache = nextValue;
}

function setTextAndHiddenIfChanged(node, value, hidden) {
  if (!node) return;
  setTextIfChanged(node, value);
  const nextHidden = !!hidden;
  if (node.__uiHiddenCache === nextHidden) return;
  node.hidden = nextHidden;
  node.__uiHiddenCache = nextHidden;
}

export function installIntervalScreenState(UIRoot) {
  UIRoot.prototype.renderIntervalScreenState = function renderIntervalScreenState() {
    const state = this.game.state;
    if (state.mode !== 'interval') return;

    const progression = state.progression;
    const upgrades = this.game.upgrades;
    const intervalMissionIndex = Number.isFinite(progression.intervalMissionIndex)
      ? progression.intervalMissionIndex
      : (state.missionIndex + 1);
    const intervalMission = MISSIONS[intervalMissionIndex] ?? null;
    const retryContext = progression.intervalContext === 'retry';
    const tutorialComplete = progression.intervalContext === 'tutorialComplete';

    setTextIfChanged(this.refs.intervalTitle, tutorialComplete ? this.t('interval.titleTrainingComplete') : this.t('interval.titleMissionInterval'));
    setTextIfChanged(
      this.refs.intervalSummary,
      tutorialComplete
        ? this.t('interval.summaryTutorialComplete')
        : this.t('interval.summaryAdvance'),
    );
    setTextIfChanged(this.refs.intervalCrystal, formatNumber(state.crystals));
    setTextIfChanged(this.refs.intervalPrimary, upgrades.summarizePrimary());
    setTextIfChanged(this.refs.intervalPlasma, upgrades.summarizePlasma());
    this.renderShopIfDirty();
    this.renderMedalCaseIfDirty();
    setTextIfChanged(this.refs.intervalNextMission, intervalMission ? this.getMissionName(intervalMission) : this.t('interval.finalComplete'));
    const missionBriefing = intervalMission ? this.getMissionBriefing(intervalMission) : '';
    setTextAndHiddenIfChanged(this.refs.intervalMissionBriefing, missionBriefing, !missionBriefing);
    if (this.refs.nextMissionBtn) {
      setTextIfChanged(
        this.refs.nextMissionBtn,
        tutorialComplete ? this.t('common.startCampaign') : (retryContext ? this.t('common.retryMission') : this.t('common.nextMission')),
      );
    }
  };
}

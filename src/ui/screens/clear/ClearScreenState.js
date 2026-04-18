/**
 * Responsibility:
 * - クリア要約、メダル帯、inline result の差分更新を担当する。
 */
import { formatNumber } from '../../../utils/math.js';
import { formatMissionDuration } from '../../shared/UiFormatters.js';
import { MEDAL_CATALOG } from '../../medals/MedalCatalog.js';

const CLEAR_INTEL_UNLOCK_POPUP_DELAY = 0.9;

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

export function installClearScreenState(UIRoot) {

  UIRoot.prototype.renderClearScreenState = function renderClearScreenState() {
    if (this.game.state.mode !== 'clear') {
      this.hideClearIntelUnlockPopup({ consumePending: false });
      return;
    }
    this.renderClearScreenSummaryIfDirty(this.game.state.progression.lastMissionSummary);
    this.renderClearIntelUnlockPopupText();
  };

  UIRoot.prototype.renderClearIntelUnlockPopupText = function renderClearIntelUnlockPopupText() {
    setTextIfChanged(this.refs.clearIntelUnlockPopupEyebrow, this.t('clear.unlockPopupEyebrow'));
    setTextIfChanged(this.refs.clearIntelUnlockPopupTitle, this.t('clear.unlockPopupTitle'));
    setTextIfChanged(this.refs.clearIntelUnlockPopupLead, this.t('clear.unlockPopupLead'));
    setTextIfChanged(this.refs.clearIntelUnlockPopupOkBtn, this.t('common.ok'));
  };

  UIRoot.prototype.showClearIntelUnlockPopup = function showClearIntelUnlockPopup() {
    const popup = this.refs.clearIntelUnlockPopup;
    const popupState = this.ensureUiRuntimeState().clearIntelUnlockPopup;
    if (!popup || popupState.visible) return;

    popupState.armed = false;
    popupState.timer = 0;
    popupState.visible = true;
    popup.classList.add('visible');
    popup.setAttribute('aria-hidden', 'false');
    if (this.refs.clearButtons) this.refs.clearButtons.style.visibility = 'hidden';
    requestAnimationFrame(() => {
      this.refs.clearIntelUnlockPopupOkBtn?.focus?.({ preventScroll: true });
    });
  };

  UIRoot.prototype.hideClearIntelUnlockPopup = function hideClearIntelUnlockPopup({ consumePending = false } = {}) {
    const popup = this.refs.clearIntelUnlockPopup;
    const popupState = this.ensureUiRuntimeState().clearIntelUnlockPopup;
    popupState.armed = false;
    popupState.timer = 0;
    popupState.visible = false;
    popup?.classList.remove('visible');
    popup?.setAttribute('aria-hidden', 'true');
    if (this.refs.clearButtons) this.refs.clearButtons.style.visibility = '';
    if (consumePending) this.game.state.progression.clearIntelUnlockPending = false;
  };

  UIRoot.prototype.updateClearIntelUnlockPopupState = function updateClearIntelUnlockPopupState(dt) {
    const popupState = this.ensureUiRuntimeState().clearIntelUnlockPopup;
    const shouldShowPopup = this.game.state.mode === 'clear' && !!this.game.state.progression.clearIntelUnlockPending;

    if (!shouldShowPopup) {
      this.hideClearIntelUnlockPopup({ consumePending: false });
      return;
    }

    if (popupState.visible) return;
    if (!popupState.armed) {
      popupState.armed = true;
      popupState.timer = CLEAR_INTEL_UNLOCK_POPUP_DELAY;
      return;
    }

    popupState.timer = Math.max(0, popupState.timer - Math.max(0, Number(dt) || 0));
    if (popupState.timer <= 0) this.showClearIntelUnlockPopup();
  };

  UIRoot.prototype.renderClearInlineResultState = function renderClearInlineResultState() {
    const state = this.game.state;
    const inlineResult = this.refs.clearInlineResult;
    if (!inlineResult) return;

    const visibleLineCount = this.getMissionClearResultVisibleLineCount(this.getMissionClearResultItems().length);
    if (visibleLineCount > 0) {
      this.renderSummaryBlock(this.refs.clearInlineResultHeader, this.refs.clearInlineResultRows, state.progression.lastMissionSummary, {
        compact: true,
        visibleLineCount,
      });
      setStyleIfChanged(inlineResult, 'display', 'block');
      setStyleIfChanged(inlineResult, 'opacity', '1');
      this.applyInlineClearResultLayout();
      return;
    }

    setStyleIfChanged(inlineResult, 'opacity', '0');
    setStyleIfChanged(inlineResult, 'display', 'none');
    setTextIfChanged(this.refs.clearInlineResultHeader, '');
    setTextIfChanged(this.refs.clearInlineResultRows, '');
  };
  UIRoot.prototype.applyInlineClearResultLayout = function applyInlineClearResultLayout() {
    const result = this.refs.clearInlineResult;
    const notice = this.refs.centerNotice;
    if (!result || !notice) return;

    const viewportHeight = Math.max(240, window.innerHeight || document.documentElement.clientHeight || 0);
    const defaultTop = Math.round(viewportHeight * 0.28);
    const noticeVisible = notice.style.opacity !== '0' && notice.textContent.trim().length > 0;
    let top = defaultTop;

    if (noticeVisible) {
      const noticeRect = notice.getBoundingClientRect();
      const gap = viewportHeight <= 500 ? 14 : 18;
      top = Math.round(noticeRect.bottom + gap);
    }

    const maxTop = Math.max(10, Math.round(viewportHeight * 0.56));
    result.style.top = `${Math.min(top, maxTop)}px`;
  };

  UIRoot.prototype.createResultEntryRow = function createResultEntryRow(entry, { compact = false } = {}) {
    const row = document.createElement(compact ? 'div' : 'span');
    row.style.display = 'inline-flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'center';
    row.style.gap = compact ? '8px' : '10px';
    row.style.minHeight = compact ? '1.3em' : '1.4em';
    row.style.flexWrap = 'wrap';
    row.style.whiteSpace = 'normal';

    if (entry?.isMedal && entry?.medalId) {
      const medalMeta = MEDAL_CATALOG.find((meta) => meta.key === entry.medalId) ?? {
        key: entry.medalId,
        label: entry.label,
        condition: entry.condition,
      };
      const medal = this.createMedalElement(entry.medalId, {
        size: compact ? 18 : 20,
        count: 1,
        tooltipMeta: medalMeta,
      });
      medal.style.verticalAlign = 'middle';
      row.appendChild(medal);
    }

    const label = document.createElement('span');
    label.textContent = `${this.getResultEntryLabel(entry, entry?.label ?? this.t('common.none'))} +${formatNumber(entry?.score ?? 0)}`;
    label.style.display = 'inline-block';
    label.style.lineHeight = '1.4';
    row.appendChild(label);
    return row;
  };

  UIRoot.prototype.getSummarySignature = function getSummarySignature(summary, { compact = false, visibleLineCount = null } = {}) {
    return JSON.stringify({
      compact: !!compact,
      visibleLineCount: Number.isFinite(visibleLineCount) ? visibleLineCount : null,
      score: this.game.state.score,
      clearTime: summary?.clearTime ?? null,
      entries: Array.isArray(summary?.resultEntries)
        ? summary.resultEntries.map((entry) => [entry.key, entry.score ?? 0, !!entry.isMedal])
        : [],
    });
  };

  UIRoot.prototype.renderClearScreenSummaryIfDirty = function renderClearScreenSummaryIfDirty(summary) {
    const medalCollection = summary?.medalCollectionSnapshot ?? this.game.state.progression?.medalCollection ?? {};
    const signature = JSON.stringify({
      medals: MEDAL_CATALOG.map((meta) => [meta.key, Math.max(0, Math.floor(medalCollection[meta.key] || 0))]),
    });
    if (signature === this.lastClearSummarySignature) return;
    this.lastClearSummarySignature = signature;
    this.renderCampaignClearMedalStrip(this.refs.clearTextHeader, this.refs.clearTextRows, medalCollection);
  };

  UIRoot.prototype.renderCampaignClearMedalStrip = function renderCampaignClearMedalStrip(headerNode, rowsNode, medalCollection) {
    if (!headerNode || !rowsNode) return;

    headerNode.textContent = this.t('clear.medals');
    headerNode.style.display = 'block';
    headerNode.style.lineHeight = '1.5';
    headerNode.style.letterSpacing = '0.08em';

    rowsNode.textContent = '';
    rowsNode.style.display = 'flex';
    rowsNode.style.flexWrap = 'nowrap';
    rowsNode.style.alignItems = 'center';
    rowsNode.style.justifyContent = 'center';
    rowsNode.style.gap = '12px';
    rowsNode.style.width = 'min(100%, 680px)';
    rowsNode.style.maxWidth = '100%';
    rowsNode.style.padding = '4px 6px 2px';
    rowsNode.style.overflowX = 'auto';
    rowsNode.style.overflowY = 'hidden';
    rowsNode.style.webkitOverflowScrolling = 'touch';

    const earnedEntries = MEDAL_CATALOG
      .map((meta) => ({ ...meta, count: Math.max(0, Math.floor(medalCollection?.[meta.key] || 0)) }))
      .filter((meta) => meta.count > 0);

    if (earnedEntries.length <= 0) {
      const empty = document.createElement('span');
      empty.textContent = this.t('clear.noMedals');
      empty.style.display = 'block';
      empty.style.padding = '8px 0 0';
      empty.style.fontSize = '13px';
      empty.style.color = '#9ab2c4';
      empty.style.letterSpacing = '0.05em';
      rowsNode.appendChild(empty);
      return;
    }

    for (const meta of earnedEntries) {
      const medal = this.createMedalElement(meta.key, {
        size: 54,
        count: meta.count,
        bordered: true,
        tooltipMeta: meta,
      });
      medal.style.flex = '0 0 auto';
      rowsNode.appendChild(medal);
    }
  };

  UIRoot.prototype.renderSummaryBlock = function renderSummaryBlock(headerNode, rowsNode, summary, { compact = false, visibleLineCount = null } = {}) {
    if (!headerNode || !rowsNode) return;
    const state = this.game.state;
    const clearTimeText = formatMissionDuration(summary?.clearTime ?? state.progression.missionTimer);
    headerNode.textContent = this.t('clear.summaryHeader', { score: formatNumber(state.score), time: clearTimeText });

    rowsNode.textContent = '';
    const resultEntries = Array.isArray(summary?.resultEntries) ? summary.resultEntries : [];
    const sliceCount = Number.isFinite(visibleLineCount) ? Math.max(0, visibleLineCount) : resultEntries.length;
    for (const entry of resultEntries.slice(0, sliceCount)) rowsNode.appendChild(this.createResultEntryRow(entry, { compact }));
  };

  UIRoot.prototype.getMissionClearResultItems = function getMissionClearResultItems() {
    const summary = this.game.state.progression?.lastMissionSummary;
    const resultEntries = Array.isArray(summary?.resultEntries) ? summary.resultEntries : [];
    return resultEntries.map((entry) => ({ type: 'entry', entry }));
  };

  UIRoot.prototype.getMissionClearResultVisibleLineCount = function getMissionClearResultVisibleLineCount(totalLines) {
    const state = this.game.state;
    const progression = state.progression;
    if (totalLines <= 0) return 0;
    if (state.mode !== 'playing') return 0;
    if (progression.missionStatus !== 'clearSequence') return 0;
    if ((state.ui?.notice?.timer || 0) <= 0) return 0;

    const clearSequenceDuration = Math.max(progression.clearSequenceDuration || 0, 0);
    const clearElapsed = Math.max(0, clearSequenceDuration - progression.clearSequenceTimer);
    const revealStart = progression.clearResultDelay || 0;
    const revealElapsed = clearElapsed - revealStart;
    if (revealElapsed < 0) return 0;

    const lineRevealInterval = 0.28;
    const baseVisibleCount = Math.max(0, Math.min(totalLines, 1 + Math.floor(revealElapsed / lineRevealInterval)));
    const forcedVisibleCount = Math.max(0, Number(progression.clearResultForcedVisibleCount) || 0);
    return Math.max(baseVisibleCount, Math.min(totalLines, forcedVisibleCount));
  };

  UIRoot.prototype.isMissionClearResultVisible = function isMissionClearResultVisible() {
    return this.getMissionClearResultVisibleLineCount(this.getMissionClearResultItems().length) > 0;
  };

  UIRoot.prototype.refreshResultScreenLocalization = function refreshResultScreenLocalization() {
    if (this.refs.clearTitleBtn) this.refs.clearTitleBtn.textContent = this.t('common.title');
    if (this.refs.gameOverHangarBtn) this.refs.gameOverHangarBtn.textContent = this.t('common.backToHangar');
  };
}

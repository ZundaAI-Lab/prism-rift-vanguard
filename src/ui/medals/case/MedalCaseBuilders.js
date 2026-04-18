/**
 * Responsibility:
 * - メダルケース DOM とメダル一覧カード構築を担当する。
 *
 * Update Rules:
 * - 画面レイアウト変更やメダルカードの見た目変更はこのファイルを更新する。
 * - tooltip 座標や preview renderer の責務は他モジュールへ戻さない。
 */
import { MEDAL_CATALOG } from '../MedalCatalog.js';

export function buildMedalTooltip(root) {
  root.ensureMedalCaseViewState();
  const tooltip = document.createElement('div');
  tooltip.style.position = 'fixed';
  tooltip.style.left = '0';
  tooltip.style.top = '0';
  tooltip.style.display = 'none';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.zIndex = '60';
  tooltip.style.maxWidth = '320px';
  tooltip.style.padding = '10px 12px';
  tooltip.style.borderRadius = '14px';
  tooltip.style.border = '1px solid rgba(170, 238, 255, 0.22)';
  tooltip.style.background = 'linear-gradient(180deg, rgba(8, 16, 32, 0.96), rgba(4, 10, 22, 0.94))';
  tooltip.style.boxShadow = '0 14px 34px rgba(0, 0, 0, 0.34)';
  tooltip.style.backdropFilter = 'blur(10px)';

  const title = document.createElement('div');
  title.style.fontSize = '12px';
  title.style.fontWeight = '800';
  title.style.letterSpacing = '0.12em';
  title.style.color = '#effcff';
  title.style.textTransform = 'uppercase';

  const condition = document.createElement('div');
  condition.style.marginTop = '6px';
  condition.style.fontSize = '12px';
  condition.style.lineHeight = '1.6';
  condition.style.color = '#d3e8f4';

  tooltip.append(title, condition);
  document.getElementById('app-shell').appendChild(tooltip);

  root.refs.medalTooltip = tooltip;
  root.refs.medalTooltipTitle = title;
  root.refs.medalTooltipCondition = condition;
}

export function buildIntervalMedalCase(root) {
  root.ensureMedalCaseViewState();
  const summaryGrid = document.getElementById('summaryGrid');
  if (!summaryGrid) return;

  const card = document.createElement('div');
  card.className = 'info-card';
  card.style.gridColumn = '1 / -1';
  card.style.display = 'grid';
  card.style.gap = '12px';
  card.style.alignContent = 'start';
  card.style.minHeight = '172px';

  const label = document.createElement('div');
  label.className = 'mini-label';
  label.textContent = root.t('clear.medals');

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(88px, 88px))';
  grid.style.justifyContent = 'start';
  grid.style.justifyItems = 'start';
  grid.style.alignContent = 'start';
  grid.style.gap = '12px';
  grid.style.alignItems = 'start';

  const empty = document.createElement('div');
  empty.textContent = root.t('clear.noMedals');
  empty.style.gridColumn = '1 / -1';
  empty.style.padding = '10px 0 2px';
  empty.style.fontSize = '13px';
  empty.style.color = '#9ab2c4';
  empty.style.letterSpacing = '0.05em';
  grid.appendChild(empty);

  card.append(label, grid);
  const nextMissionCard = document.getElementById('intervalNextMission')?.closest('.info-card');
  if (nextMissionCard && nextMissionCard.parentNode === summaryGrid) {
    summaryGrid.insertBefore(card, nextMissionCard);
  } else {
    summaryGrid.appendChild(card);
  }

  root.refs.intervalMedalCase = card;
  root.refs.intervalMedalLabel = label;
  root.refs.intervalMedalGrid = grid;
}

export function installMedalCaseState(UIRoot) {
  UIRoot.prototype.refreshMedalCaseLocalization = function refreshMedalCaseLocalization() {
    if (this.refs.intervalMedalLabel) this.refs.intervalMedalLabel.textContent = this.t('clear.medals');
  };

  UIRoot.prototype.getMedalCaseSignature = function getMedalCaseSignature() {
    return JSON.stringify(this.game.state.progression?.medalCollection ?? {});
  };

  UIRoot.prototype.renderMedalCaseIfDirty = function renderMedalCaseIfDirty(force = false) {
    const signature = this.getMedalCaseSignature();
    if (!force && signature === this.lastMedalCaseSignature) return;
    this.lastMedalCaseSignature = signature;
    this.renderMedalCase();
  };

  UIRoot.prototype.renderMedalCase = function renderMedalCase() {
    const grid = this.refs.intervalMedalGrid;
    if (!grid) return;
    const medalCollection = this.game.state.progression?.medalCollection ?? {};
    grid.textContent = '';

    const earnedEntries = MEDAL_CATALOG
      .map((meta) => ({ ...meta, count: Math.max(0, Math.floor(medalCollection[meta.key] || 0)) }))
      .filter((meta) => meta.count > 0);

    if (earnedEntries.length <= 0) {
      const empty = document.createElement('div');
      empty.textContent = this.t('clear.noMedals');
      empty.style.gridColumn = '1 / -1';
      empty.style.padding = '10px 0 2px';
      empty.style.fontSize = '13px';
      empty.style.color = '#9ab2c4';
      empty.style.letterSpacing = '0.05em';
      grid.appendChild(empty);
      return;
    }

    for (const meta of earnedEntries) {
      const card = document.createElement('div');
      card.style.display = 'grid';
      card.style.width = '88px';
      card.style.justifyItems = 'center';
      card.style.alignContent = 'start';
      card.style.gap = '6px';

      const medal = this.createMedalElement(meta.key, {
        size: 54,
        count: meta.count,
        bordered: true,
        tooltipMeta: meta,
      });
      const label = document.createElement('div');
      label.textContent = this.getResultEntryLabel(meta.key, meta.label);
      label.style.fontSize = '10px';
      label.style.lineHeight = '1.35';
      label.style.textAlign = 'center';
      label.style.color = '#dbeef7';
      label.style.letterSpacing = '0.03em';
      label.style.minHeight = '2.7em';

      card.append(medal, label);
      grid.appendChild(card);
    }
  };
}

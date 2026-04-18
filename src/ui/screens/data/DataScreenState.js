/**
 * Responsibility:
 * - 保存データ画面の state 反映と記録パネル生成を担当する。
 *
 * Update Rules:
 * - 記録の差分更新と medal row 表示はこのファイルを更新する。
 * - DOM の大枠構築は Builders 側へ残す。
 */
import { MISSIONS } from '../../../data/missions.js';
import { formatNumber } from '../../../utils/math.js';
import { formatMissionDuration } from '../../shared/UiFormatters.js';
import { MEDAL_CATALOG } from '../../medals/MedalCatalog.js';

const DATA_SCREEN_CARD_STYLE = {
  display: 'grid',
  gap: '12px',
  padding: '16px 18px',
  borderRadius: '18px',
  background: 'rgba(255,255,255,0.035)',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 16px 36px rgba(0,0,0,0.18)',
};

function applyStyles(node, styles) {
  Object.assign(node.style, styles);
}

function createMetricPair(labelText, valueText) {
  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.justifyItems = 'end';
  wrap.style.gap = '4px';

  const label = document.createElement('div');
  label.textContent = labelText;
  label.style.fontSize = '10px';
  label.style.letterSpacing = '0.16em';
  label.style.textTransform = 'uppercase';
  label.style.color = '#8faabd';

  const value = document.createElement('strong');
  value.textContent = valueText;
  value.style.fontSize = '16px';
  value.style.lineHeight = '1.1';
  value.style.letterSpacing = '0.04em';
  value.style.color = '#f1fbff';

  wrap.append(label, value);
  return wrap;
}

export function installDataScreenState(UIRoot) {
  UIRoot.prototype.setDataScreenOpen = function setDataScreenOpen(open) {
    this.dataScreenOpen = !!open;
    if (this.dataScreenOpen) {
      this.compendiumOpen = false;
      this.debugScreenOpen = false;
      this.creditScreenOpen = false;
    }
    this.refreshDataButtonState();
  };

  UIRoot.prototype.refreshDataButtonState = function refreshDataButtonState() {
    const dataOpenBtn = this.refs.dataOpenBtn;
    if (dataOpenBtn) {
      dataOpenBtn.textContent = this.t('common.data');
      dataOpenBtn.style.borderColor = '';
      dataOpenBtn.style.background = '';
    }

    const enemyIntelOpenBtn = this.refs.enemyIntelOpenBtn;
    if (enemyIntelOpenBtn) {
      const unlocked = !!this.game.records?.hasFinalClearRecord?.();
      enemyIntelOpenBtn.style.display = unlocked ? '' : 'none';
      if (!unlocked) this.compendiumOpen = false;
    }
  };

  UIRoot.prototype.refreshDataScreenState = function refreshDataScreenState(force = false) {
    const summaryRoot = this.refs.dataSummary;
    if (!summaryRoot) return;

    const data = this.game.records?.getData?.() ?? { missions: {}, finalResult: null };
    const signature = JSON.stringify(data);
    if (!force && this.lastDataSummarySignature === signature) return;
    this.lastDataSummarySignature = signature;
    this.refreshDataButtonState();
    summaryRoot.textContent = '';

    const missionEntries = MISSIONS.filter((entry) => !entry?.isTutorial);
    for (const mission of missionEntries) {
      const record = data.missions?.[mission.id] ?? null;
      const panel = this.createDataRecordPanel({
        title: this.getMissionName(mission),
        description: this.getMissionSubtitle(mission) || '',
        bestScore: record?.bestScore,
        bestTime: record?.bestTime,
        medalKeys: record?.medalKeys,
        accent: '#8fdfff',
        emptyText: this.t('common.none'),
      });
      summaryRoot.appendChild(panel);
    }

    const finalResult = data.finalResult ?? null;
    const finalPanel = this.createDataRecordPanel({
      title: this.t('data.finalResultTitle'),
      description: this.t('data.finalResultDescription'),
      bestScore: finalResult?.bestScore,
      bestTime: finalResult?.bestTime,
      medalCounts: finalResult?.medalCounts,
      accent: '#91cfff',
      emptyText: this.t('common.none'),
    });
    summaryRoot.appendChild(finalPanel);
  };

  UIRoot.prototype.createDataRecordPanel = function createDataRecordPanel({
    title,
    description = '',
    bestScore,
    bestTime,
    medalKeys,
    medalCounts = null,
    accent = '#8fdfff',
    emptyText = '－',
  }) {
    const panel = document.createElement('article');
    applyStyles(panel, DATA_SCREEN_CARD_STYLE);
    panel.style.gridTemplateRows = 'auto auto';

    const row1 = document.createElement('div');
    row1.style.display = 'grid';
    row1.style.gridTemplateColumns = 'minmax(0, 1fr) auto auto';
    row1.style.alignItems = 'center';
    row1.style.columnGap = '18px';
    row1.style.rowGap = '8px';

    const missionHead = document.createElement('div');
    missionHead.style.minWidth = '0';
    missionHead.style.display = 'flex';
    missionHead.style.alignItems = 'baseline';
    missionHead.style.flexWrap = 'wrap';
    missionHead.style.columnGap = '12px';
    missionHead.style.rowGap = '4px';

    const missionTitle = document.createElement('strong');
    missionTitle.textContent = title;
    missionTitle.style.minWidth = '0';
    missionTitle.style.fontSize = '18px';
    missionTitle.style.lineHeight = '1.2';
    missionTitle.style.letterSpacing = '0.06em';
    missionTitle.style.color = '#effcff';

    const missionDescription = document.createElement('span');
    missionDescription.textContent = description || '';
    missionDescription.style.minWidth = '0';
    missionDescription.style.fontSize = '12px';
    missionDescription.style.lineHeight = '1.35';
    missionDescription.style.letterSpacing = '0.03em';
    missionDescription.style.color = '#9cb6c8';
    missionDescription.style.opacity = description ? '0.92' : '0';
    missionDescription.style.whiteSpace = 'normal';

    missionHead.append(missionTitle, missionDescription);

    const scoreMetric = createMetricPair(
      this.t('data.highScore'),
      Number.isFinite(bestScore) ? formatNumber(bestScore) : this.t('common.noRecord'),
    );

    const timeMetric = createMetricPair(
      this.t('data.bestTime'),
      Number.isFinite(bestTime) ? formatMissionDuration(bestTime) : this.t('common.noRecord'),
    );

    row1.append(missionHead, scoreMetric, timeMetric);

    const row2 = document.createElement('div');
    row2.style.display = 'grid';
    row2.style.gridTemplateColumns = '120px minmax(0, 1fr)';
    row2.style.alignItems = 'center';
    row2.style.columnGap = '14px';
    row2.style.rowGap = '8px';
    row2.style.paddingTop = '2px';
    row2.style.borderTop = '1px solid rgba(255,255,255,0.05)';

    const medalLabel = document.createElement('div');
    medalLabel.textContent = this.t('data.medals');
    medalLabel.style.fontSize = '11px';
    medalLabel.style.letterSpacing = '0.16em';
    medalLabel.style.textTransform = 'uppercase';
    medalLabel.style.color = accent;

    const medalRow = this.createRecordMedalIconRow(medalKeys, { medalCounts, emptyText });
    row2.append(medalLabel, medalRow);

    panel.append(row1, row2);
    return panel;
  };

  UIRoot.prototype.createRecordMedalIconRow = function createRecordMedalIconRow(medalKeys, { medalCounts = null, emptyText = '－' } = {}) {
    const normalizedCounts = medalCounts && typeof medalCounts === 'object'
      ? Object.fromEntries(
        Object.entries(medalCounts)
          .map(([medalKey, count]) => [String(medalKey), Math.max(0, Math.floor(Number(count) || 0))])
          .filter(([, count]) => count > 0),
      )
      : {};
    const keys = Array.isArray(medalKeys)
      ? medalKeys.filter(Boolean).map((medalKey) => String(medalKey))
      : [];
    const visibleKeys = [...new Set([...keys, ...Object.keys(normalizedCounts)])];
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.minHeight = '34px';

    if (visibleKeys.length <= 0) {
      const empty = document.createElement('div');
      empty.textContent = emptyText;
      empty.style.fontSize = '14px';
      empty.style.letterSpacing = '0.08em';
      empty.style.color = '#91aabc';
      row.appendChild(empty);
      return row;
    }

    const order = new Map(MEDAL_CATALOG.map((meta, index) => [meta.key, index]));
    const metas = [...visibleKeys]
      .sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999))
      .map((medalKey) => MEDAL_CATALOG.find((meta) => meta.key === medalKey) ?? {
        key: medalKey,
        label: medalKey,
        condition: '',
      });

    for (const meta of metas) {
      const count = normalizedCounts[meta.key];
      const medal = this.createMedalElement(meta.key, {
        size: 28,
        count: Number.isFinite(count) && count > 0 ? count : undefined,
        bordered: true,
        tooltipMeta: meta,
      });
      row.appendChild(medal);
    }

    return row;
  };
}

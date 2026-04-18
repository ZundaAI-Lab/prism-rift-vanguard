import { RETICLE_VERTICAL_OFFSET_PX } from '../HudConstants.js';

/**
 * Responsibility:
 * - 固定 HUD の DOM 構築だけを担当する。
 *
 * Update Rules:
 * - 新しい固定 HUD パーツを追加するときはまずここへ寄せる。
 * - 毎フレームの state 反映は HudCombatState / HudBossState / HudNoticeState へ分ける。
 * - タイトル画面や pause / interval 専用 UI はここへ戻さない。
 */
export function installHudBuilders(UIRoot) {
  UIRoot.prototype.applyReticleLayout = function applyReticleLayout() {
    const { reticle } = this.refs;
    if (!reticle) return;
    reticle.style.top = `calc(50% - ${RETICLE_VERTICAL_OFFSET_PX}px)`;
  };

  UIRoot.prototype.createPlasmaGauge = function createPlasmaGauge() {
    this.upgradeHullHudPanel();

    const host = this.refs.weaponText?.parentElement;
    if (!host) return;

    const wrap = document.createElement('div');
    wrap.className = 'plasma-gauge';
    wrap.style.marginTop = '6px';
    wrap.style.display = 'grid';
    wrap.style.gap = '6px';

    const header = document.createElement('div');
    header.className = 'plasma-gauge-header';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.fontSize = '11px';
    header.style.letterSpacing = '0.18em';
    header.style.textTransform = 'uppercase';
    header.style.color = 'var(--hud-heading)';

    const label = document.createElement('span');
    label.className = 'plasma-gauge-label';
    label.textContent = this.t('hud.plasmaCharge');

    const value = document.createElement('span');
    value.className = 'plasma-gauge-value';
    value.textContent = this.t('hud.ready');

    const bar = document.createElement('div');
    bar.className = 'plasma-gauge-bar';
    bar.style.height = '8px';
    bar.style.borderRadius = '999px';
    bar.style.overflow = 'hidden';
    bar.style.background = 'rgba(255,255,255,0.08)';
    bar.style.border = '1px solid rgba(118,194,255,0.16)';
    bar.style.transition = 'border-color 120ms ease, box-shadow 120ms ease, background 120ms ease';

    const fill = document.createElement('div');
    fill.className = 'plasma-gauge-fill';
    fill.style.height = '100%';
    fill.style.width = '100%';
    fill.style.transformOrigin = 'left center';
    fill.style.background = 'linear-gradient(90deg, #5e9dff, #7fe3ff 52%, #dff7ff)';
    fill.style.boxShadow = '0 0 20px rgba(118,194,255,0.38)';
    fill.style.transition = 'box-shadow 120ms ease, filter 120ms ease, opacity 120ms ease';
    bar.appendChild(fill);

    wrap.style.transition = 'box-shadow 120ms ease, filter 120ms ease';
    label.style.transition = 'color 120ms ease, text-shadow 120ms ease';
    value.style.transition = 'color 120ms ease, text-shadow 120ms ease';

    header.append(label, value);
    wrap.append(header, bar);
    host.appendChild(wrap);

    this.refs.plasmaGaugeWrap = wrap;
    this.refs.plasmaGaugeLabel = label;
    this.refs.plasmaGaugeBar = bar;
    this.refs.plasmaGaugeValue = value;
    this.refs.plasmaGaugeFill = fill;
  };

  UIRoot.prototype.upgradeHullHudPanel = function upgradeHullHudPanel() {
    const rightPanel = this.refs.healthText?.closest('.stat-panel');
    const hullLabel = this.refs.hullLabel;
    const healthText = this.refs.healthText;
    const healthBar = this.refs.healthBar?.parentElement;
    const weaponText = this.refs.weaponText;
    if (!rightPanel || !hullLabel || !healthText || !healthBar || !weaponText) return;
    if (rightPanel.dataset.hullHudUpgraded === '1') return;
    rightPanel.dataset.hullHudUpgraded = '1';

    rightPanel.style.display = 'grid';
    rightPanel.style.alignContent = 'start';
    rightPanel.style.gap = '0';

    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.alignItems = 'baseline';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.gap = '12px';
    headerRow.style.width = '100%';

    hullLabel.style.margin = '0';
    hullLabel.style.flex = '0 0 auto';

    healthText.style.marginTop = '0';
    healthText.style.marginLeft = 'auto';
    healthText.style.textAlign = 'right';
    healthText.style.lineHeight = '1';
    healthText.style.flex = '0 0 auto';

    headerRow.append(hullLabel, healthText);
    rightPanel.insertBefore(headerRow, healthBar);

    healthBar.style.marginTop = '8px';
    weaponText.style.marginTop = '6px';
  };

  UIRoot.prototype.createMissionTimer = function createMissionTimer() {
    const missionPanel = this.refs.missionText?.closest('.panel');
    if (!missionPanel) return;

    const wrap = document.createElement('div');
    wrap.style.marginTop = '8px';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'space-between';
    wrap.style.gap = '10px';
    wrap.style.padding = '0';
    wrap.style.borderRadius = '0';
    wrap.style.border = 'none';
    wrap.style.background = 'none';
    wrap.style.boxShadow = 'none';
    wrap.style.opacity = '0.92';
    wrap.style.pointerEvents = 'none';
    wrap.style.transition = 'opacity 120ms ease';

    const label = document.createElement('span');
    label.textContent = this.t('hud.time');
    label.style.fontSize = '11px';
    label.style.letterSpacing = '0.18em';
    label.style.textTransform = 'uppercase';
    label.style.color = 'var(--hud-heading)';
    label.style.lineHeight = '1';

    const value = document.createElement('span');
    value.textContent = '00:00.0';
    value.style.fontSize = '12px';
    value.style.fontVariantNumeric = 'tabular-nums';
    value.style.letterSpacing = '0.12em';
    value.style.color = 'var(--hud-subtext)';
    value.style.lineHeight = '1.1';

    wrap.append(label, value);
    missionPanel.appendChild(wrap);

    this.refs.missionTimerWrap = wrap;
    this.refs.missionTimerLabel = label;
    this.refs.missionTimerValue = value;
  };

  UIRoot.prototype.createMissionTargetTime = function createMissionTargetTime() {
    const missionPanel = this.refs.missionText?.closest('.panel');
    const waveText = this.refs.waveText;
    if (!missionPanel || !waveText) return;

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.gap = '10px';
    row.style.marginTop = '8px';
    row.style.minWidth = '0';

    const targetWrap = document.createElement('div');
    targetWrap.style.display = 'flex';
    targetWrap.style.alignItems = 'baseline';
    targetWrap.style.justifyContent = 'flex-end';
    targetWrap.style.gap = '8px';
    targetWrap.style.padding = '0';
    targetWrap.style.borderRadius = '0';
    targetWrap.style.border = 'none';
    targetWrap.style.background = 'none';
    targetWrap.style.boxShadow = 'none';
    targetWrap.style.flexShrink = '0';
    targetWrap.style.whiteSpace = 'nowrap';
    targetWrap.style.pointerEvents = 'none';

    const label = document.createElement('span');
    label.textContent = this.t('hud.target');
    label.style.fontSize = '11px';
    label.style.letterSpacing = '0.18em';
    label.style.textTransform = 'uppercase';
    label.style.color = 'var(--hud-heading)';
    label.style.lineHeight = '1';

    const value = document.createElement('span');
    value.textContent = '--:--.-';
    value.style.fontSize = '12px';
    value.style.fontVariantNumeric = 'tabular-nums';
    value.style.letterSpacing = '0.12em';
    value.style.color = 'var(--hud-subtext)';
    value.style.lineHeight = '1.1';

    waveText.style.marginTop = '0';
    waveText.style.flex = '1 1 auto';
    waveText.style.minWidth = '0';

    row.append(waveText, targetWrap);
    targetWrap.append(label, value);
    missionPanel.insertBefore(row, this.refs.missionTimerWrap ?? null);

    this.refs.missionMetaRow = row;
    this.refs.missionTargetTimeWrap = targetWrap;
    this.refs.missionTargetTimeLabel = label;
    this.refs.missionTargetTimeValue = value;
  };

  UIRoot.prototype.refreshHudStaticLabels = function refreshHudStaticLabels() {
    if (this.refs.missionLabel) this.refs.missionLabel.textContent = this.t('topBar.mission');
    if (this.refs.scoreLabel) this.refs.scoreLabel.textContent = this.t('topBar.score');
    if (this.refs.hullLabel) this.refs.hullLabel.textContent = this.t('topBar.hull');
    if (this.refs.plasmaGaugeLabel) this.refs.plasmaGaugeLabel.textContent = this.t('hud.plasmaCharge');
    if (this.refs.missionTimerLabel) this.refs.missionTimerLabel.textContent = this.t('hud.time');
    if (this.refs.missionTargetTimeLabel) this.refs.missionTargetTimeLabel.textContent = this.t('hud.target');
    if (this.refs.crystalLabel) this.refs.crystalLabel.textContent = this.t('topBar.crystals');
  };

  UIRoot.prototype.upgradeCrystalHudPanel = function upgradeCrystalHudPanel() {
    const scoreText = this.refs.scoreText;
    const crystalText = this.refs.crystalText;
    const centerPanel = scoreText?.closest('.stat-panel');
    const crystalLine = crystalText?.parentElement;
    if (!scoreText || !crystalText || !centerPanel || !crystalLine) return;
    if (centerPanel.dataset.crystalHudUpgraded === '1') return;
    centerPanel.dataset.crystalHudUpgraded = '1';

    centerPanel.style.display = 'grid';
    centerPanel.style.gridAutoFlow = 'row';
    centerPanel.style.justifyItems = 'center';
    centerPanel.style.alignContent = 'start';
    centerPanel.style.gap = '0';

    scoreText.style.marginTop = '6px';
    scoreText.style.lineHeight = '1.05';

    const crystalWrap = document.createElement('div');
    crystalWrap.style.display = 'grid';
    crystalWrap.style.justifyItems = 'center';
    crystalWrap.style.gap = '6px';
    crystalWrap.style.width = '100%';
    crystalWrap.style.marginTop = '12px';
    crystalWrap.style.paddingTop = '0';
    crystalWrap.style.borderTop = 'none';

    const crystalLabel = document.createElement('div');
    crystalLabel.className = 'label';
    crystalLabel.textContent = this.t('topBar.crystals');
    this.refs.crystalLabel = crystalLabel;

    crystalText.style.display = 'block';
    crystalText.style.fontSize = '26px';
    crystalText.style.fontWeight = '800';
    crystalText.style.letterSpacing = '0.03em';
    crystalText.style.lineHeight = '1.05';
    crystalText.style.color = 'var(--hud-text)';
    crystalText.style.textShadow = '0 0 18px rgba(238,250,255,0.16)';

    crystalWrap.appendChild(crystalLabel);
    crystalWrap.appendChild(crystalText);
    crystalLine.replaceWith(crystalWrap);
  };
}

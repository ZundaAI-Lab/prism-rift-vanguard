import { APP_TITLE } from '../../app/AppMeta.js';
import {
  getCurrentLanguage,
  getEnemyName,
  getMissionBriefing,
  getMissionName,
  getMissionSubtitle,
  getResultEntryCondition,
  getResultEntryLabel,
  getShopDescription,
  getShopTitle,
  getSoundTestTrackLabel,
  translate,
} from '../../i18n/index.js';

/**
 * 更新ルール:
 * - 静的 DOM の文言と i18n helper はこのファイルへ集約する。
 * - UIRoot 本体に翻訳ロジックを戻さず、画面別の再構築呼び出しだけをここから束ねる。
 */
export function installUiLocalization(UIRoot) {
  UIRoot.prototype.getLanguage = function getLanguage() {
    return getCurrentLanguage(this.game);
  };

  UIRoot.prototype.t = function t(key, params = {}) {
    return translate(this.game, key, params);
  };

  UIRoot.prototype.getMissionName = function getLocalizedMissionName(missionOrId) {
    return getMissionName(this.game, missionOrId);
  };

  UIRoot.prototype.getMissionSubtitle = function getLocalizedMissionSubtitle(missionOrId) {
    return getMissionSubtitle(this.game, missionOrId);
  };

  UIRoot.prototype.getMissionBriefing = function getLocalizedMissionBriefing(missionOrId) {
    return getMissionBriefing(this.game, missionOrId);
  };

  UIRoot.prototype.getEnemyName = function getLocalizedEnemyName(enemyOrTypeKey) {
    return getEnemyName(this.game, enemyOrTypeKey);
  };

  UIRoot.prototype.getShopTitle = function getLocalizedShopTitle(itemOrId) {
    return getShopTitle(this.game, itemOrId);
  };

  UIRoot.prototype.getShopDescription = function getLocalizedShopDescription(itemOrId) {
    return getShopDescription(this.game, itemOrId);
  };

  UIRoot.prototype.getSoundTestTrackLabel = function getLocalizedSoundTestTrackLabel(trackId, fallback = '') {
    return getSoundTestTrackLabel(this.game, trackId, fallback);
  };

  UIRoot.prototype.getResultEntryLabel = function getLocalizedResultEntryLabel(entryOrKey, fallback = '-') {
    return getResultEntryLabel(this.game, entryOrKey, fallback);
  };

  UIRoot.prototype.getResultEntryCondition = function getLocalizedResultEntryCondition(entryOrKey, fallback = '') {
    return getResultEntryCondition(this.game, entryOrKey, fallback);
  };

  UIRoot.prototype.localizeStaticDom = function localizeStaticDom() {
    const root = document.documentElement;
    const lang = this.getLanguage();
    root.lang = lang;

    const startScreen = this.refs.startScreen;
    if (startScreen) {
      const eyebrow = startScreen.querySelector('.eyebrow');
      const lead = startScreen.querySelector('.lead');
      const title = startScreen.querySelector('h1');
      if (eyebrow) eyebrow.textContent = this.t('start.eyebrow');
      if (title) title.textContent = APP_TITLE;
      if (lead) lead.textContent = this.t('start.lead');
      const controls = [...startScreen.querySelectorAll('.controls-grid > div')];
      const controlKeys = [this.t('common.keys.wasd'), this.t('common.keys.mouse'), this.t('common.keys.leftClick'), this.t('common.keys.rightClick'), this.t('common.keys.esc')];
      const controlLabels = [
        this.t('start.controls.move'),
        this.t('start.controls.look'),
        this.t('start.controls.primary'),
        this.t('start.controls.plasma'),
        this.t('start.controls.releaseMouse'),
      ];
      for (let index = 0; index < controls.length; index += 1) {
        const row = controls[index];
        const strong = row.querySelector('strong');
        const span = row.querySelector('span');
        if (strong) strong.textContent = controlKeys[index] ?? strong.textContent;
        if (span) span.textContent = controlLabels[index] ?? span.textContent;
      }
      const startBtn = document.getElementById('startBtn');
      if (startBtn) startBtn.textContent = this.t('common.campaignStart');
    }

    this.refreshTutorialPanelLocalization();

    this.refreshTitleActionState();
    this.refreshTitleControlHintsLocalization();
    this.refreshHudStaticLabels();
    this.refreshMinimapLocalization();
    this.refreshPauseScreenLocalization();
    this.refreshResultScreenLocalization();
    this.refreshMedalCaseLocalization();
    this.refreshIntervalOverlayLocalization();


    if (this.refs.bossLabel && this.refs.bossBarWrap.classList.contains('hidden')) {
      this.refs.bossLabel.textContent = this.t('common.boss');
    }

    const intervalScreen = this.refs.intervalScreen;
    if (intervalScreen) {
      const eyebrow = intervalScreen.querySelector('.eyebrow');
      if (eyebrow) eyebrow.textContent = this.t('interval.eyebrow');
      const infoCards = intervalScreen.querySelectorAll('#summaryGrid .info-card .mini-label');
      if (infoCards[0]) infoCards[0].textContent = this.t('interval.labels.currentCrystals');
      if (infoCards[1]) infoCards[1].textContent = this.t('interval.labels.primaryStatus');
      if (infoCards[2]) infoCards[2].textContent = this.t('interval.labels.plasmaStatus');
      if (infoCards[3]) infoCards[3].textContent = this.t('interval.labels.nextMission');
      const shopTitle = intervalScreen.querySelector('.shop-title-row h3');
      const shopTip = intervalScreen.querySelector('.shop-title-row .shop-tip');
      if (shopTitle) shopTitle.textContent = this.t('interval.labels.hangarShop');
      if (shopTip) shopTip.textContent = this.t('interval.labels.hangarShopTip');
      const backBtn = document.getElementById('backToTitleBtn');
      if (backBtn) backBtn.textContent = this.t('common.title');
    }

    const gameOverScreen = this.refs.gameOverScreen;
    if (gameOverScreen) {
      const eyebrow = gameOverScreen.querySelector('.eyebrow');
      const title = gameOverScreen.querySelector('#gameOverTitle');
      if (eyebrow) eyebrow.textContent = this.t('gameOver.eyebrow');
      if (title) title.textContent = this.t('gameOver.title');
      const retryBtn = document.getElementById('restartBtn');
      const titleBtn = document.getElementById('gameOverTitleBtn');
      if (retryBtn) retryBtn.textContent = this.t('common.retryMission');
      if (titleBtn) titleBtn.textContent = this.t('common.title');
    }

    const clearScreen = this.refs.clearScreen;
    if (clearScreen) {
      const eyebrow = clearScreen.querySelector('.eyebrow');
      const title = clearScreen.querySelector('h2');
      const restartBtn = document.getElementById('clearRestartBtn');
      if (eyebrow) eyebrow.textContent = this.t('clear.eyebrow');
      if (title) title.textContent = this.t('clear.title');
      if (restartBtn) restartBtn.textContent = this.t('common.newRun');
    }
  };

  UIRoot.prototype.applyLocalization = function applyLocalization(force = false) {
    this.localizeStaticDom();
    this.rebuildCompendiumScreenForLocalization();
    this.rebuildDataScreenForLocalization();
    this.rebuildDebugScreenForLocalization();

    this.lastTitleActionSignature = '';
    this.refreshTitleActionState(true);
    this.lastCreditScreenSignature = '';
    this.refreshCreditScreenState(true);

    this.lastShopSignature = '';
    this.lastMedalCaseSignature = '';
    this.lastClearSummarySignature = '';
    this.lastDataSummarySignature = '';
    this.refreshOptionsScreenState(true);
    this.refreshDataButtonState();
    this.refreshDataScreenState(true);
    this.refreshDebugScreenState();
    this.renderShopIfDirty(true);
    this.renderMedalCaseIfDirty(true);
    if (force) this.lastScreenMode = '';
    this.renderHud();
    this.renderPauseScreenState();
    this.renderIntervalScreenState();
    this.renderTutorialPanelState();
    this.renderGameOverScreenState();
    this.renderClearScreenState();
    this.renderClearInlineResultState();
  };
}

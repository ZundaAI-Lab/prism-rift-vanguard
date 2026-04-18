
/**
 * 更新ルール:
 * - UIRoot のフィールド初期値と DOM refs はこのファイルを正にする。
 * - constructor へ直接プロパティを積み増さず、まずここへ寄せて粒度をそろえる。
 */
export function createUiRefs() {
  return {
    hud: document.getElementById('hud'),
    topBar: document.getElementById('topBar'),
    missionText: document.getElementById('missionText'),
    missionLabel: document.getElementById('missionText')?.closest('.panel')?.querySelector('.label') ?? null,
    waveText: document.getElementById('waveText'),
    scoreText: document.getElementById('scoreText'),
    scoreLabel: document.getElementById('scoreText')?.closest('.panel')?.querySelector('.label') ?? null,
    crystalLabel: null,
    crystalText: document.getElementById('crystalText'),
    healthText: document.getElementById('healthText'),
    hullLabel: document.getElementById('healthText')?.closest('.panel')?.querySelector('.label') ?? null,
    healthBar: document.getElementById('healthBar'),
    weaponText: document.getElementById('weaponText'),
    bossBarWrap: document.getElementById('bossBarWrap'),
    bossBar: document.getElementById('bossBar'),
    bossLabel: document.getElementById('bossLabel'),
    bossHpText: document.getElementById('bossHpText'),
    centerNotice: document.getElementById('centerNotice'),
    damageFlash: document.getElementById('damageFlash'),
    reticle: document.getElementById('reticle'),
    startScreen: document.getElementById('startScreen'),
    intervalScreen: document.getElementById('intervalScreen'),
    gameOverScreen: document.getElementById('gameOverScreen'),
    clearScreen: document.getElementById('clearScreen'),
    intervalTitle: document.getElementById('intervalTitle'),
    intervalSummary: document.getElementById('intervalSummary'),
    intervalCrystal: document.getElementById('intervalCrystal'),
    intervalPrimary: document.getElementById('intervalPrimary'),
    intervalPlasma: document.getElementById('intervalPlasma'),
    intervalNextMission: document.getElementById('intervalNextMission'),
    intervalMissionBriefing: document.getElementById('intervalMissionBriefing'),
    shopGrid: document.getElementById('shopGrid'),
    gameOverText: document.getElementById('gameOverText'),
    clearText: document.getElementById('clearText'),
    intervalMedalCase: null,
    intervalMedalLabel: null,
    intervalMedalGrid: null,
    medalTooltip: null,
    medalTooltipTitle: null,
    medalTooltipCondition: null,
    clearTextHeader: null,
    clearTextRows: null,
    nextMissionBtn: document.getElementById('nextMissionBtn'),
    clearButtons: null,
    bossAlertOverlay: null,
    bossAlertFrame: null,
    bossAlertStripeTop: null,
    bossAlertStripeBottom: null,
    bossAlertText: null,
    bossAlertSubtext: null,
    transitionWrap: null,
    transitionCanvas: null,
    transitionCtx: null,
    transitionTempCanvas: null,
    transitionTempCtx: null,
    gameOverHangarBtn: null,
    clearTitleBtn: null,
    clearInlineResult: null,
    clearInlineResultHeader: null,
    clearInlineResultRows: null,
    clearIntelUnlockPopup: null,
    clearIntelUnlockPopupCard: null,
    clearIntelUnlockPopupEyebrow: null,
    clearIntelUnlockPopupTitle: null,
    clearIntelUnlockPopupLead: null,
    clearIntelUnlockPopupOkBtn: null,
    tutorialStartBtn: null,
    tutorialPanel: null,
    tutorialEyebrow: null,
    tutorialTitle: null,
    tutorialObjective: null,
    tutorialProgress: null,
    enemyIntelOpenBtn: null,
    enemyIntelScreen: null,
    enemyIntelCloseBtn: null,
    dataOpenBtn: null,
    dataScreen: null,
    dataSummary: null,
    dataCloseBtn: null,
    dataDeleteBtn: null,
    debugOpenBtn: null,
    debugScreen: null,
    debugStageSelect: null,
    debugStageSummary: null,
    debugInvincibleBtn: null,
    debugBossModeBtn: null,
    debugScreenCloseBtn: null,
    debugPerfOverlay: null,
    debugPerfOverlayBody: null,
    debugPerfSection: null,
    debugPerfOverlayBtn: null,
    debugPerfLive: null,
    debugPerfReport: null,
    optionsOpenBtn: null,
    hangarOptionsBtn: null,
    pauseEyebrow: null,
    pauseTitle: null,
    pauseLead: null,
    pauseInfo: null,
    pauseResumeBtn: null,
    pauseTitleBtn: null,
    pauseOptionsBtn: null,
    minimapLabel: null,
    damageIndicatorLayer: null,
    creditsOpenBtn: null,
    creditsScreen: null,
    creditsCloseBtn: null,
    creditsContent: null,
    creditsMeta: null,
    optionsScreen: null,
    optionsCloseBtn: null,
    optionsResetBtn: null,
    optionsLanguageSelect: null,
    optionsLanguageValue: null,
    optionsSoundTestSelect: null,
    optionsSoundTestPlayBtn: null,
    optionsSoundTestStatus: null,
    optionsSoundTestStopBtn: null,
    optionsSoundTestNowPlaying: null,
    optionsBgmVolume: null,
    optionsBgmVolumeValue: null,
    optionsSfxVolume: null,
    optionsSfxVolumeValue: null,
    optionsMouseSensitivity: null,
    optionsMouseSensitivityValue: null,
    optionsInvertY: null,
    optionsGraphicsQuality: null,
    optionsGraphicsQualityValue: null,
    optionsHudOpacity: null,
    optionsHudOpacityValue: null,
    optionsHudMinimapVisible: null,
    optionsHudMinimapScale: null,
    optionsHudMinimapScaleValue: null,
    optionsHudEnemyMarkersVisible: null,
    confirmDialogScreen: null,
    confirmDialogCard: null,
    confirmDialogEyebrow: null,
    confirmDialogTitle: null,
    confirmDialogMessage: null,
    confirmDialogCancelBtn: null,
    confirmDialogConfirmBtn: null,
  };
}

export function initializeUiRootState(uiRoot) {
  uiRoot.lastShopSignature = '';
  uiRoot.lastMedalCaseSignature = '';
  uiRoot.lastClearSummarySignature = '';
  uiRoot.lastDataSummarySignature = '';
  uiRoot.lastScreenMode = '';
  uiRoot.compendiumOpen = false;
  uiRoot.dataScreenOpen = false;
  uiRoot.debugScreenOpen = false;
  uiRoot.optionsScreenOpen = false;
  uiRoot.creditScreenOpen = false;
  uiRoot.soundTestPlaying = false;
  uiRoot.lastCreditScreenSignature = '';
  uiRoot.lastTitleActionSignature = '';
  uiRoot.lastBossBarVisible = null;
  uiRoot.lastBossBarLabel = '';
  uiRoot.lastBossBarHpText = '';
  uiRoot.bossBarLayoutCacheKey = '';
  uiRoot.bossBarLayoutBottom = 0;
  uiRoot.centerNoticeLayoutCacheKey = '';
  uiRoot.lastCenterNoticeText = null;
  uiRoot.lastCenterNoticeOpacity = null;
  uiRoot.lastCenterNoticeTransition = null;
  uiRoot.bossAlertCueActive = false;
  uiRoot.bossAlertCueDurationCss = '';
  uiRoot.lastBossAlertTimer = 0;
  uiRoot.disposeUiRuntimeBus = () => {};
  uiRoot.unregisterConfirmDialogKeydown = () => {};
}

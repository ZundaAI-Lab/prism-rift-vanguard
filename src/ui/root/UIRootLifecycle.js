function disposeOffscreenRenderer(renderer) {
  const canvas = renderer?.domElement ?? null;
  renderer?.dispose?.();
  renderer?.forceContextLoss?.();
  canvas?.remove?.();
}

const HUD_DYNAMIC_REF_KEYS = Object.freeze([
  'plasmaGaugeWrap',
  'plasmaGaugeLabel',
  'plasmaGaugeBar',
  'plasmaGaugeValue',
  'plasmaGaugeFill',
  'missionTimerWrap',
  'missionTimerLabel',
  'missionTimerValue',
  'missionMetaRow',
  'missionTargetTimeWrap',
  'missionTargetTimeLabel',
  'missionTargetTimeValue',
  'tutorialPanel',
  'tutorialEyebrow',
  'tutorialTitle',
  'tutorialObjective',
  'tutorialProgress',
  'tutorialStartBtn',
  'minimapWrap',
  'minimapLabel',
  'minimapCanvas',
  'minimapCtx',
  'minimapDynamicCanvas',
  'minimapDynamicCtx',
  'minimapStaticCanvas',
  'minimapStaticCtx',
  'targetLockLayer',
  'damageIndicatorLayer',
  'clearInlineResult',
  'clearInlineResultHeader',
  'clearInlineResultRows',
  'clearTitleBtn',
  'gameOverHangarBtn',
  'titleVersionBadge',
]);

const OPTIONS_REF_KEYS = Object.freeze([
  'optionsScreen',
  'optionsCloseBtn',
  'optionsResetBtn',
  'optionsLanguageSelect',
  'optionsLanguageValue',
  'optionsSoundTestSelect',
  'optionsSoundTestPlayBtn',
  'optionsSoundTestStatus',
  'optionsSoundTestStopBtn',
  'optionsSoundTestNowPlaying',
  'optionsBgmVolume',
  'optionsBgmVolumeValue',
  'optionsSfxVolume',
  'optionsSfxVolumeValue',
  'optionsMouseSensitivity',
  'optionsMouseSensitivityValue',
  'optionsInvertY',
  'optionsGraphicsQuality',
  'optionsGraphicsQualityValue',
  'optionsFov',
  'optionsFovValue',
  'optionsEffectStrength',
  'optionsEffectStrengthValue',
  'optionsCrosshairPreset',
  'optionsCrosshairPresetValue',
  'optionsCrosshairScale',
  'optionsCrosshairScaleValue',
  'optionsHitDirectionIndicator',
  'optionsHighContrast',
  'optionsHudOpacity',
  'optionsHudOpacityValue',
  'optionsHudMinimapVisible',
  'optionsHudMinimapScale',
  'optionsHudMinimapScaleValue',
  'optionsHudEnemyMarkersVisible',
  'optionsMeta',
  'optionsOpenBtn',
  'pauseOptionsBtn',
  'hangarOptionsBtn',
]);

const PAUSE_REF_KEYS = Object.freeze([
  'pauseScreen',
  'pauseEyebrow',
  'pauseTitle',
  'pauseLead',
  'pauseInfo',
  'pauseResumeBtn',
  'pauseDebugBtn',
  'pauseTitleBtn',
  'pauseOptionsBtn',
]);

const CREDIT_REF_KEYS = Object.freeze([
  'creditsScreen',
  'creditsOpenBtn',
  'creditsCloseBtn',
  'creditsContent',
  'creditsMeta',
]);

const CONFIRM_DIALOG_REF_KEYS = Object.freeze([
  'confirmDialogScreen',
  'confirmDialogCard',
  'confirmDialogEyebrow',
  'confirmDialogTitle',
  'confirmDialogMessage',
  'confirmDialogCancelBtn',
  'confirmDialogConfirmBtn',
]);

const CLEAR_OVERLAY_REF_KEYS = Object.freeze([
  'transitionWrap',
  'transitionCanvas',
  'transitionCtx',
  'transitionTempCanvas',
  'transitionTempCtx',
  'bossAlertOverlay',
  'bossAlertFrame',
  'bossAlertStripeTop',
  'bossAlertStripeBottom',
  'bossAlertText',
  'bossAlertSubtext',
  'clearIntelUnlockPopup',
  'clearIntelUnlockPopupCard',
  'clearIntelUnlockPopupEyebrow',
  'clearIntelUnlockPopupTitle',
  'clearIntelUnlockPopupLead',
  'clearIntelUnlockPopupOkBtn',
  'intervalMedalCase',
  'intervalMedalLabel',
  'intervalMedalGrid',
  'medalTooltip',
  'medalTooltipTitle',
  'medalTooltipCondition',
  'clearButtons',
  'clearTextHeader',
  'clearTextRows',
]);

function removeNode(node) {
  node?.remove?.();
}

function clearRefs(refs, keys) {
  for (const key of keys) {
    refs[key] = null;
  }
}

function disposeTargetLockPool(uiRoot) {
  if (uiRoot.targetLockPool instanceof Map) {
    for (const entry of uiRoot.targetLockPool.values()) {
      entry?.root?.remove?.();
    }
    uiRoot.targetLockPool.clear();
  }
  uiRoot.targetLockPool = null;
  removeNode(uiRoot.refs.targetLockLayer);
  uiRoot.refs.targetLockLayer = null;
}

function disposeDamageIndicatorPool(uiRoot) {
  if (Array.isArray(uiRoot.damageIndicatorPool)) {
    for (const entry of uiRoot.damageIndicatorPool) {
      entry?.root?.remove?.();
    }
    uiRoot.damageIndicatorPool.length = 0;
  }
  uiRoot.damageIndicatorPool = null;
  removeNode(uiRoot.refs.damageIndicatorLayer);
  uiRoot.refs.damageIndicatorLayer = null;
}

function disposeStandaloneUiNodes(uiRoot) {
  removeNode(uiRoot.refs.plasmaGaugeWrap);
  removeNode(uiRoot.refs.missionTimerWrap);
  removeNode(uiRoot.refs.missionMetaRow);
  removeNode(uiRoot.refs.tutorialPanel);
  removeNode(uiRoot.refs.tutorialStartBtn);
  removeNode(uiRoot.refs.minimapWrap);
  removeNode(uiRoot.refs.clearInlineResult);
  removeNode(uiRoot.refs.clearTitleBtn);
  removeNode(uiRoot.refs.gameOverHangarBtn);
  removeNode(uiRoot.refs.titleVersionBadge ?? document.querySelector('.title-version'));
  clearRefs(uiRoot.refs, HUD_DYNAMIC_REF_KEYS);
}

function disposePauseScreen(uiRoot) {
  removeNode(uiRoot.refs.pauseScreen);
  clearRefs(uiRoot.refs, PAUSE_REF_KEYS);
}

function disposeOptionsScreen(uiRoot) {
  removeNode(uiRoot.refs.optionsScreen);
  removeNode(uiRoot.refs.optionsOpenBtn);
  removeNode(uiRoot.refs.pauseOptionsBtn);
  removeNode(uiRoot.refs.hangarOptionsBtn);
  clearRefs(uiRoot.refs, OPTIONS_REF_KEYS);
}

function disposeCreditScreen(uiRoot) {
  removeNode(uiRoot.refs.creditsScreen);
  removeNode(uiRoot.refs.creditsOpenBtn);
  clearRefs(uiRoot.refs, CREDIT_REF_KEYS);
}

function disposeConfirmDialog(uiRoot) {
  removeNode(uiRoot.refs.confirmDialogScreen);
  clearRefs(uiRoot.refs, CONFIRM_DIALOG_REF_KEYS);
  uiRoot.confirmDialogState = null;
}

function disposeClearAndRewardOverlays(uiRoot) {
  removeNode(uiRoot.refs.transitionWrap);
  removeNode(uiRoot.refs.bossAlertOverlay);
  removeNode(uiRoot.refs.clearIntelUnlockPopup);
  removeNode(uiRoot.refs.intervalMedalCase);
  removeNode(uiRoot.refs.medalTooltip);
  uiRoot.hideMedalTooltip?.();
  uiRoot.hideIntervalTransitionOverlay?.();
  uiRoot.hideBossAlertOverlay?.();
  clearRefs(uiRoot.refs, CLEAR_OVERLAY_REF_KEYS);
}

/**
 * 更新ルール:
 * - resize / dispose / 破棄順はこのファイルに集約する。
 * - UIRoot 本体や各 View へ window listener の追加を散らさない。
 * - dispose は「イベント解除 → 再生停止 → GPU/preview 解放 → DOM remove → refs null」の順を守る。
 * - constructor で append した後付け DOM は、ここで必ず remove して同じ静的 DOM への UIRoot 再生成を可能にする。
 */
export function initializeUiRootLifecycle(uiRoot) {
  uiRoot.handleHudResize = () => {
    uiRoot.invalidateBossBarLayout();
    uiRoot.invalidateCenterNoticeLayout();
    uiRoot.applyShopGridLayout();
    uiRoot.applyIntervalScreenLayout();
    uiRoot.applyBossBarLayout();
    uiRoot.applyCenterNoticeLayout();
    uiRoot.applyTutorialPanelLayout();
    uiRoot.applyInlineClearResultLayout();
    uiRoot.applyReticleLayout();
    uiRoot.applyOptionSettings?.(uiRoot.game?.optionState);
  };
  window.addEventListener('resize', uiRoot.handleHudResize);
  uiRoot.applyShopGridLayout();
  uiRoot.applyIntervalScreenLayout();
  uiRoot.applyBossBarLayout();
  uiRoot.applyCenterNoticeLayout();
  uiRoot.applyTutorialPanelLayout();
  uiRoot.applyInlineClearResultLayout();
}

export function installUiRootLifecycle(UIRoot) {
  UIRoot.prototype.dispose = function dispose() {
    window.removeEventListener('resize', this.handleHudResize);
    this.handleHudResize = null;
    this.disposeUiRuntimeBus();
    this.disposeUiRuntimeBus = null;
    this.unregisterConfirmDialogKeydown();
    this.unregisterConfirmDialogKeydown = null;
    this.resolveConfirmation(false);
    this.stopSoundTestPlayback({ restoreAutoBgm: false });

    this.disposeCompendiumView();
    this.disposeMedalPreviewAssets();
    this.destroyDebugPerformanceOverlay?.();
    this.destroyCompendiumScreen?.();
    this.destroyDataScreen?.();
    this.destroyDebugScreen?.();

    disposeTargetLockPool(this);
    disposeDamageIndicatorPool(this);
    disposeStandaloneUiNodes(this);
    disposePauseScreen(this);
    disposeOptionsScreen(this);
    disposeCreditScreen(this);
    disposeConfirmDialog(this);
    disposeClearAndRewardOverlays(this);
  };
}

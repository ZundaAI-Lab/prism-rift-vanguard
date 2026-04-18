function disposeOffscreenRenderer(renderer) {
  const canvas = renderer?.domElement ?? null;
  renderer?.dispose?.();
  renderer?.forceContextLoss?.();
  canvas?.remove?.();
}

/**
 * 更新ルール:
 * - resize / dispose / 破棄順はこのファイルに集約する。
 * - UIRoot 本体や各 View へ window listener の追加を散らさない。
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
  };
}

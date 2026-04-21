/**
 * Responsibility:
 * - 各 View が持つ入力導線を束ねて起動し、フレームごとの UI 更新順序を司る。
 *
 * Rules:
 * - 画面ごとの DOM 詳細と入力 callback 本体は各 View へ委譲し、このファイルはフロー統合に徹する。
 * - 入力 callback から直接ゲーム内部状態を捻らず、Game / MissionSystem の公開操作だけを呼ぶ。
 *
 * Update Rules:
 * - renderHud は戦闘 HUD だけを更新し、screen 専用 state はここで順序制御する。
 * - DamageIndicator / Minimap / TargetLock の描画順はこのファイルを正本にする。
 */
function resolveMinimapTargetInterval(uiRoot) {
  const quality = uiRoot.game.optionState?.graphics?.quality
    ?? uiRoot.game.renderer?.currentGraphicsOptions?.quality
    ?? 'high';
  if (quality === 'medium') return 1 / 40;
  if (quality === 'low') return 1 / 30;
  return 0;
}

function shouldRenderMinimapThisFrame(uiRoot, dt) {
  const uiState = uiRoot.ensureUiRuntimeState();
  const control = uiState.minimapRenderControl ?? (uiState.minimapRenderControl = {
    accumulator: 0,
    lastQuality: '',
    forceNext: true,
  });
  const quality = uiRoot.game.optionState?.graphics?.quality
    ?? uiRoot.game.renderer?.currentGraphicsOptions?.quality
    ?? 'high';
  if (control.lastQuality !== quality) {
    control.lastQuality = quality;
    control.accumulator = 0;
    control.forceNext = true;
  }

  const targetInterval = resolveMinimapTargetInterval(uiRoot);
  if (targetInterval <= 0) {
    control.accumulator = 0;
    control.forceNext = false;
    return true;
  }

  if (control.forceNext) {
    control.forceNext = false;
    control.accumulator = 0;
    return true;
  }

  control.accumulator += Math.max(0, Number.isFinite(dt) ? dt : 0);
  if (control.accumulator + 0.000001 < targetInterval) return false;
  control.accumulator %= targetInterval;
  return true;
}

export function installUIScreenFlow(UIRoot) {
  UIRoot.prototype.playUiConfirm = function playUiConfirm() {
    this.game.audio?.playSfx('uiConfirm', { cooldownMs: 60 });
  };

  UIRoot.prototype.playUiCancel = function playUiCancel() {
    this.game.audio?.playSfx('uiCancel', { cooldownMs: 60 });
  };

  UIRoot.prototype.bindButtons = function bindButtons() {
    this.bindTitleScreenControls();
    this.bindPauseScreenControls();
    this.bindIntervalScreenControls();
    this.bindResultScreenControls();
    this.bindCompendiumControls();
    this.bindDataScreenControls();
    this.bindCreditScreenControls();
    this.bindDebugScreenControls();
    this.bindOptionsControls();
  };

  UIRoot.prototype.showNotice = function showNotice(text, seconds = 1.2, options = {}) {
    this.game.bus?.emit('ui:notice', { text, seconds, options });
  };

  UIRoot.prototype.update = function update(dt) {
    this.refreshTitleActionState();
    this.refreshCreditScreenState();
    this.refreshDebugScreenState();
    this.refreshDebugPerformanceReportView();
    this.refreshDataButtonState();
    this.refreshDataScreenState();
    this.updateUiRuntime(dt);
    this.renderHud();
    this.renderPauseScreenState();
    this.renderIntervalScreenState();
    this.renderTutorialPanelState();
    this.renderGameOverScreenState();
    this.renderClearScreenState();
    this.updateClearIntelUnlockPopupState(dt);
    this.renderClearInlineResultState();
    this.renderScreens();
    this.renderDamageIndicators();
    this.syncMinimapCanvasResolution();
    this.renderMinimapStatic();
    const minimapVisible = this.refs?.minimapWrap?.style?.display !== 'none';
    const renderMinimapBaseThisFrame = shouldRenderMinimapThisFrame(this, dt);
    this.prepareMinimapFrame({
      refreshHazards: renderMinimapBaseThisFrame,
      allowHidden: true,
    });
    if (minimapVisible && renderMinimapBaseThisFrame) {
      this.renderMinimap();
    }
    if (minimapVisible) {
      this.renderMinimapDynamic();
    }
    this.renderTargetLocks();
    this.renderBossAlertCue();
    this.updateCompendiumPreviewAnimation(dt);
    this.updateIntervalTransition();
    this.renderDebugPerformanceOverlay();
  };

  UIRoot.prototype.renderScreens = function renderScreens() {
    const { mode } = this.game.state;

    if (mode !== 'title') {
      this.compendiumOpen = false;
      this.dataScreenOpen = false;
      this.creditScreenOpen = false;
    }
    if (mode !== 'title' && mode !== 'paused') {
      this.debugScreenOpen = false;
    }

    if (mode !== 'title' && mode !== 'paused' && mode !== 'interval') {
      if (this.optionsScreenOpen) this.setOptionsScreenOpen(false);
      else this.soundTestPlaying = false;
    }

    const compendiumVisible = mode === 'title' && this.compendiumOpen;
    const dataScreenVisible = mode === 'title' && this.dataScreenOpen;
    const debugScreenVisible = (mode === 'title' || mode === 'paused')
      && this.debugScreenOpen
      && this.game.debug.isEnabled();
    const creditsVisible = mode === 'title' && this.creditScreenOpen;
    const optionsVisible = (mode === 'title' || mode === 'paused' || mode === 'interval') && this.optionsScreenOpen;
    const missionClearResultVisible = this.isMissionClearResultVisible();

    this.refs.startScreen.classList.toggle('visible', mode === 'title' && !compendiumVisible && !dataScreenVisible && !debugScreenVisible && !creditsVisible && !optionsVisible);
    this.refs.enemyIntelScreen.classList.toggle('visible', compendiumVisible);
    this.refs.dataScreen?.classList.toggle('visible', dataScreenVisible);
    this.refs.debugScreen?.classList.toggle('visible', debugScreenVisible);
    this.refs.creditsScreen?.classList.toggle('visible', creditsVisible);
    this.refs.optionsScreen?.classList.toggle('visible', optionsVisible);
    this.refs.intervalScreen.classList.toggle('visible', mode === 'interval' && !optionsVisible);
    this.refs.gameOverScreen.classList.toggle('visible', mode === 'gameover');
    this.refs.clearScreen.classList.toggle('visible', mode === 'clear');
    this.refs.pauseScreen.classList.toggle('visible', mode === 'paused' && !debugScreenVisible && !optionsVisible);

    if (this.refs.clearButtons) {
      this.refs.clearButtons.style.display = '';
    }
    if (this.refs.clearInlineResult && !missionClearResultVisible) {
      this.refs.clearInlineResult.style.opacity = '0';
      this.refs.clearInlineResult.style.display = 'none';
    }

    if (mode !== this.lastScreenMode) {
      if (mode === 'interval') {
        this.renderShopIfDirty(true);
        this.renderMedalCaseIfDirty(true);
      }
      this.lastScreenMode = mode;
    }
  };
}

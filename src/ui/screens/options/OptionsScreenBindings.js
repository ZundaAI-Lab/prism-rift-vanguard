/**
 * Responsibility:
 * - オプション画面のイベント bind とサウンドテスト再生制御を担当する。
 *
 * Update Rules:
 * - 入力イベントや画面を開閉したときの副作用はこのファイルへ集約する。
 * - 値の見た目反映は State 側で行い、ここでは保存 API 呼び出しと導線制御に徹する。
 * - 新規コントロール追加時は bindOptionsControls に必ず対応イベントを追加する。
 */
/**
 * オプション画面の背面へ入力が漏れないよう、UI レイヤーでイベント伝播を止める。
 * 既存の DOM 操作や各コントロールの既定挙動は妨げず、背面 canvas / window listener だけを遮断する。
 */
function installOptionsInteractionShield(node) {
  if (!node || node.__optionsInteractionShieldInstalled) return;
  const stopPropagation = (event) => event.stopPropagation();
  [
    'pointerdown',
    'pointerup',
    'pointermove',
    'mousedown',
    'mouseup',
    'mousemove',
    'click',
    'dblclick',
    'contextmenu',
    'wheel',
    'touchstart',
    'touchmove',
    'touchend',
  ].forEach((eventName) => {
    node.addEventListener(eventName, stopPropagation);
  });
  node.__optionsInteractionShieldInstalled = true;
}

export function installOptionsScreenBindings(UIRoot) {
  UIRoot.prototype.setOptionsScreenOpen = function setOptionsScreenOpen(open) {
    this.optionsScreenOpen = !!open;
    installOptionsInteractionShield(this.refs.optionsScreen);

    const gameplayCanvas = this.game.renderer?.webgl?.domElement ?? null;
    if (this.optionsScreenOpen) {
      this.compendiumOpen = false;
      this.dataScreenOpen = false;
      this.debugScreenOpen = false;
      this.creditScreenOpen = false;
      this.game.input?.releasePointerLock?.();
      this.game.input?.setEnabled?.(false);
      if (gameplayCanvas) gameplayCanvas.style.pointerEvents = 'none';
      this.refreshOptionsScreenState(true);
    } else {
      this.game.input?.setEnabled?.(true);
      if (gameplayCanvas) gameplayCanvas.style.pointerEvents = '';
      this.stopSoundTestPlayback({ restoreAutoBgm: true });
    }
  };

  UIRoot.prototype.beginSoundTestPlayback = function beginSoundTestPlayback() {
    const trackId = this.refs.optionsSoundTestSelect?.value || this.game.optionState?.soundTestTrackId;
    if (!trackId) return;
    this.soundTestPlaying = true;
    this.game.audio?.holdAutoBgm?.({ durationMs: 60 * 60 * 1000, mode: this.game.state.mode });
    this.game.audio?.playBgm?.(trackId, { restart: true });
    this.refreshOptionsScreenState();
  };

  UIRoot.prototype.stopSoundTestPlayback = function stopSoundTestPlayback({ restoreAutoBgm = true } = {}) {
    if (!this.soundTestPlaying && !restoreAutoBgm) return;
    this.soundTestPlaying = false;
    this.game.audio?.holdAutoBgm?.({ durationMs: 0, mode: this.game.state.mode });
    if (restoreAutoBgm) this.game.syncAudioState?.();
    this.refreshOptionsScreenState();
  };

  UIRoot.prototype.bindOptionsControls = function bindOptionsControls() {
    if (this.refs.optionsOpenBtn) this.refs.optionsOpenBtn.onclick = () => {
      this.playUiConfirm();
      this.setOptionsScreenOpen(true);
    };
    if (this.refs.pauseOptionsBtn) this.refs.pauseOptionsBtn.onclick = () => {
      this.playUiConfirm();
      this.setOptionsScreenOpen(true);
    };
    if (this.refs.hangarOptionsBtn) this.refs.hangarOptionsBtn.onclick = () => {
      this.playUiConfirm();
      this.setOptionsScreenOpen(true);
    };
    if (this.refs.optionsCloseBtn) this.refs.optionsCloseBtn.onclick = () => {
      this.playUiCancel();
      this.setOptionsScreenOpen(false);
    };

    if (this.refs.optionsResetBtn) this.refs.optionsResetBtn.onclick = async () => {
      const accepted = await this.requestConfirmation({
        message: this.t('confirm.restoreDefaults'),
        confirmText: this.t('common.restoreDefaults'),
      });
      if (!accepted) return;
      this.playUiConfirm();
      const resumeSoundTest = this.soundTestPlaying;
      this.stopSoundTestPlayback({ restoreAutoBgm: false });
      const snapshot = this.game.options.resetToDefaults();
      this.game.applyOptionSettings(snapshot);
      if (resumeSoundTest) this.beginSoundTestPlayback();
    };

    if (this.refs.optionsLanguageSelect) this.refs.optionsLanguageSelect.onchange = (event) => {
      this.game.options.setLanguage(event.currentTarget.value);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsSoundTestSelect) this.refs.optionsSoundTestSelect.onchange = (event) => {
      this.game.options.setSoundTestTrackId(event.currentTarget.value);
      this.game.applyOptionSettings();
      if (this.soundTestPlaying) this.beginSoundTestPlayback();
      else this.refreshOptionsScreenState();
    };
    if (this.refs.optionsSoundTestPlayBtn) this.refs.optionsSoundTestPlayBtn.onclick = () => {
      this.beginSoundTestPlayback();
    };
    if (this.refs.optionsSoundTestStopBtn) this.refs.optionsSoundTestStopBtn.onclick = () => {
      this.playUiCancel();
      this.stopSoundTestPlayback({ restoreAutoBgm: true });
    };

    if (this.refs.optionsBgmVolume) this.refs.optionsBgmVolume.oninput = (event) => {
      this.game.options.setBgmVolume(event.currentTarget.value);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsSfxVolume) this.refs.optionsSfxVolume.oninput = (event) => {
      this.game.options.setSfxVolume(event.currentTarget.value);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsSfxVolume) this.refs.optionsSfxVolume.onchange = () => {
      this.playUiConfirm();
    };
    if (this.refs.optionsMouseSensitivity) this.refs.optionsMouseSensitivity.oninput = (event) => {
      this.game.options.setMouseSensitivity(event.currentTarget.value);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsInvertY) this.refs.optionsInvertY.onchange = (event) => {
      this.game.options.setInvertY(event.currentTarget.checked);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsGraphicsQuality) this.refs.optionsGraphicsQuality.onchange = (event) => {
      this.game.options.setGraphicsQuality(event.currentTarget.value);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsFov) this.refs.optionsFov.oninput = (event) => {
      this.game.options.setFov(event.currentTarget.value);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsEffectStrength) this.refs.optionsEffectStrength.onchange = (event) => {
      this.game.options.setEffectStrength(event.currentTarget.value);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsCrosshairPreset) this.refs.optionsCrosshairPreset.onchange = (event) => {
      this.game.options.setCrosshairPreset(event.currentTarget.value);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsCrosshairScale) this.refs.optionsCrosshairScale.oninput = (event) => {
      this.game.options.setCrosshairScale(event.currentTarget.value);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsHitDirectionIndicator) this.refs.optionsHitDirectionIndicator.onchange = (event) => {
      this.game.options.setHitDirectionIndicator(event.currentTarget.checked ? 'strong' : 'off');
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsHudOpacity) this.refs.optionsHudOpacity.oninput = (event) => {
      this.game.options.setHudOpacity(event.currentTarget.value);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsHudMinimapVisible) this.refs.optionsHudMinimapVisible.onchange = (event) => {
      this.game.options.setHudMinimapVisible(event.currentTarget.checked);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsHudMinimapScale) this.refs.optionsHudMinimapScale.oninput = (event) => {
      this.game.options.setHudMinimapScale(event.currentTarget.value);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsHudEnemyMarkersVisible) this.refs.optionsHudEnemyMarkersVisible.onchange = (event) => {
      this.game.options.setHudEnemyMarkersVisible(event.currentTarget.checked);
      this.game.applyOptionSettings();
    };
    if (this.refs.optionsHighContrast) this.refs.optionsHighContrast.onchange = (event) => {
      this.game.options.setHighContrast(event.currentTarget.checked);
      this.game.applyOptionSettings();
    };
  };
}

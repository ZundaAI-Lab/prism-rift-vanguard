const DAMAGE_FLASH_DECAY_PER_SECOND = 3.2;

/**
 * 更新ルール:
 * - UI 専用の runtime state と EventBus 経由の UI 反応はこのファイルに置く。
 * - damageFlash や hit indicator の時間経過は FX ではなくここで処理する。
 */
export function installUiRuntimeState(UIRoot) {
  UIRoot.prototype.ensureUiRuntimeState = function ensureUiRuntimeState() {
    const uiState = this.game.state.ui ?? (this.game.state.ui = {});
    uiState.notice ??= { text: '', timer: 0, duration: 0, fadeInDuration: 0, fadeOutDuration: 0, justShown: false };
    uiState.intervalTransition ??= { armed: false, active: false, duration: 0, startedAtMissionIndex: -1 };
    uiState.clearIntelUnlockPopup ??= { armed: false, timer: 0, visible: false };
    return uiState;
  };

  UIRoot.prototype.setUiNoticeState = function setUiNoticeState(text, seconds = 1.2, options = {}) {
    const duration = Math.max(0, Number(seconds) || 0);
    const fadeInDuration = Math.max(0, Math.min(duration, Number(options.fadeInDuration) || 0));
    const fadeOutDuration = Math.max(0, Math.min(duration, Number(options.fadeOutDuration) || 0));
    this.ensureUiRuntimeState().notice = {
      text,
      timer: duration,
      duration,
      fadeInDuration,
      fadeOutDuration,
      justShown: true,
    };
  };

  UIRoot.prototype.clearUiNoticeState = function clearUiNoticeState() {
    this.ensureUiRuntimeState().notice = { text: '', timer: 0, duration: 0, fadeInDuration: 0, fadeOutDuration: 0, justShown: false };
  };

  UIRoot.prototype.armUiIntervalTransition = function armUiIntervalTransition(duration = 1.45) {
    const transition = this.ensureUiRuntimeState().intervalTransition;
    transition.armed = true;
    transition.active = false;
    transition.duration = Math.max(0.35, duration);
    transition.startedAtMissionIndex = this.game.state.missionIndex;
    this.hideIntervalTransitionOverlay();
  };

  UIRoot.prototype.cancelUiIntervalTransition = function cancelUiIntervalTransition() {
    const transition = this.ensureUiRuntimeState().intervalTransition;
    transition.armed = false;
    transition.active = false;
    transition.duration = 0;
    transition.startedAtMissionIndex = -1;
    this.hideIntervalTransitionOverlay();
  };

  UIRoot.prototype.bindUiRuntimeBus = function bindUiRuntimeBus() {
    const bus = this.game.bus;
    if (!bus) return;
    this.disposeUiRuntimeBus();
    const disposers = [];
    disposers.push(bus.on('ui:notice', ({ text = '', seconds = 1.2, options = {} } = {}) => {
      this.setUiNoticeState(text, seconds, options);
    }));
    disposers.push(bus.on('ui:notice:clear', () => {
      this.clearUiNoticeState();
    }));
    disposers.push(bus.on('ui:interval-transition:arm', ({ duration = 1.45 } = {}) => {
      this.armUiIntervalTransition(duration);
    }));
    disposers.push(bus.on('ui:interval-transition:cancel', () => {
      this.cancelUiIntervalTransition();
    }));
    this.disposeUiRuntimeBus = () => {
      while (disposers.length) {
        const dispose = disposers.pop();
        dispose?.();
      }
    };
  };

  UIRoot.prototype.updateUiRuntime = function updateUiRuntime(dt) {
    this.game.state.damageFlash = Math.max(0, (this.game.state.damageFlash ?? 0) - dt * DAMAGE_FLASH_DECAY_PER_SECOND);
    if (this.game.state.mode !== 'playing') return;

    const uiState = this.ensureUiRuntimeState();
    const notice = uiState.notice;
    if (notice.justShown) {
      notice.justShown = false;
    } else {
      notice.timer = Math.max(0, notice.timer - dt);
    }

    if (Array.isArray(uiState.damageIndicators) && uiState.damageIndicators.length > 0) {
      for (let index = uiState.damageIndicators.length - 1; index >= 0; index -= 1) {
        const indicator = uiState.damageIndicators[index];
        if (!indicator) {
          uiState.damageIndicators.splice(index, 1);
          continue;
        }
        indicator.timer = Math.max(0, (indicator.timer ?? 0) - dt);
        if (indicator.timer <= 0) {
          uiState.damageIndicators.splice(index, 1);
        }
      }
    }
  };
}

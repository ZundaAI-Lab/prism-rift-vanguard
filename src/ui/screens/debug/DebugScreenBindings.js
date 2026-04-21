/**
 * Responsibility:
 * - デバッグ画面の操作 bind を担当する。
 */
export function installDebugScreenBindings(UIRoot) {
  UIRoot.prototype.bindDebugScreenControls = function bindDebugScreenControls() {
    if (this.refs.debugOpenBtn) this.refs.debugOpenBtn.onclick = () => {
      this.playUiConfirm();
      this.setDebugScreenOpen(true);
    };

    if (this.refs.debugInvincibleBtn) this.refs.debugInvincibleBtn.onclick = () => {
      this.playUiConfirm();
      this.game.debug.toggleInvincible();
      this.refreshDebugScreenState();
    };

    if (this.refs.debugBossModeBtn) this.refs.debugBossModeBtn.onclick = () => {
      this.playUiConfirm();
      this.game.debug.toggleBossMode();
      this.refreshDebugScreenState();
    };

    if (this.refs.debugCollisionOverlayBtn) this.refs.debugCollisionOverlayBtn.onclick = () => {
      this.playUiConfirm();
      this.game.debug.toggleCollisionOverlay();
      this.refreshDebugScreenState();
    };

    if (this.refs.debugStageSelect) this.refs.debugStageSelect.onchange = (event) => {
      this.game.debug.setTitleStartMissionIndex(event.currentTarget.value);
      this.refreshDebugScreenState();
    };

    if (this.refs.debugJumpBtn) this.refs.debugJumpBtn.onclick = () => {
      this.playUiConfirm();
      const missionIndex = this.game.debug.getTitleStartMissionIndex();
      this.setDebugScreenOpen(false);
      this.setCompendiumOpen?.(false);
      this.game.startNewRun(missionIndex);
    };

    if (this.refs.debugScreenCloseBtn) this.refs.debugScreenCloseBtn.onclick = () => {
      this.playUiCancel();
      this.setDebugScreenOpen(false);
    };
  };
}

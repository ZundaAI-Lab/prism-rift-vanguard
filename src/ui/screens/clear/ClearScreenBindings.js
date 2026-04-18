/**
 * Responsibility:
 * - クリア画面 / ゲームオーバー画面の導線ボタン bind を担当する。
 */
export function installClearScreenBindings(UIRoot) {
  UIRoot.prototype.bindResultScreenControls = function bindResultScreenControls() {
    const retryBtn = document.getElementById('restartBtn');
    if (retryBtn) retryBtn.onclick = () => {
      this.playUiConfirm();
      this.game.retryCurrentMission();
    };

    const clearRestartBtn = document.getElementById('clearRestartBtn');
    if (clearRestartBtn) clearRestartBtn.onclick = () => {
      this.playUiConfirm();
      this.game.startNewRun();
    };

    if (this.refs.gameOverHangarBtn) this.refs.gameOverHangarBtn.onclick = () => {
      this.playUiCancel();
      this.game.backToMissionHangar();
    };

    const gameOverTitleBtn = document.getElementById('gameOverTitleBtn');
    if (gameOverTitleBtn) gameOverTitleBtn.onclick = () => {
      this.playUiCancel();
      this.game.backToTitle();
    };

    if (this.refs.clearTitleBtn) this.refs.clearTitleBtn.onclick = () => {
      this.playUiCancel();
      this.game.backToTitle();
    };

    if (this.refs.clearIntelUnlockPopupOkBtn) this.refs.clearIntelUnlockPopupOkBtn.onclick = () => {
      this.playUiConfirm();
      this.hideClearIntelUnlockPopup({ consumePending: true });
    };
  };
}

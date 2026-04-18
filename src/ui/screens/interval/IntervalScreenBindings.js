/**
 * Responsibility:
 * - インターバル画面の操作 bind を担当する。
 *
 * 更新ルール:
 * - overlay localized text は IntervalOverlayBuilders.js 側へ置く。
 * - このファイルにはボタン操作 bind だけを置く。
 */
export function installIntervalScreenBindings(UIRoot) {
  UIRoot.prototype.bindIntervalScreenControls = function bindIntervalScreenControls() {
    if (this.refs.nextMissionBtn) this.refs.nextMissionBtn.onclick = () => {
      this.playUiConfirm();
      this.game.launchFromInterval();
    };

    const backToTitleBtn = document.getElementById('backToTitleBtn');
    if (backToTitleBtn) backToTitleBtn.onclick = async () => {
      const accepted = await this.requestConfirmation({
        message: this.t('confirm.returnToTitleFromHangar'),
        confirmText: this.t('common.title'),
      });
      if (!accepted) return;
      this.playUiCancel();
      this.game.backToTitle();
    };
  };
}

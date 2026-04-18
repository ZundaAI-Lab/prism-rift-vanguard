/**
 * Responsibility:
 * - 保存データ画面のボタン bind を担当する。
 */
export function installDataScreenBindings(UIRoot) {
  UIRoot.prototype.bindDataScreenControls = function bindDataScreenControls() {
    if (this.refs.dataOpenBtn) this.refs.dataOpenBtn.onclick = () => {
      this.playUiConfirm();
      this.refreshDataScreenState(true);
      this.setDataScreenOpen(true);
    };

    if (this.refs.dataCloseBtn) this.refs.dataCloseBtn.onclick = () => {
      this.playUiCancel();
      this.setDataScreenOpen(false);
    };

    if (this.refs.dataDeleteBtn) this.refs.dataDeleteBtn.onclick = async () => {
      const accepted = await this.requestConfirmation({
        message: this.t('data.deleteConfirm'),
        confirmText: this.t('common.deleteData'),
        tone: 'danger',
      });
      if (!accepted) return;
      this.playUiConfirm();
      this.game.records?.clearAll?.();
      this.refreshDataScreenState(true);
      this.refreshDataButtonState();
    };
  };
}

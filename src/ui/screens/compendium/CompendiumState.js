/**
 * Responsibility:
 * - 図鑑画面の開閉 state、入力 bind、再構築の入口を担当する。
 *
 * Update Rules:
 * - タイトル画面との開閉排他はこのファイルを更新する。
 * - DOM 構築は Builders、3D preview は PreviewRuntime 側へ寄せる。
 */
export function installCompendiumState(UIRoot) {
  UIRoot.prototype.bindCompendiumControls = function bindCompendiumControls() {
    if (this.refs.enemyIntelOpenBtn) this.refs.enemyIntelOpenBtn.onclick = () => {
      this.playUiConfirm();
      this.setCompendiumOpen(true);
    };

    if (this.refs.enemyIntelCloseBtn) this.refs.enemyIntelCloseBtn.onclick = () => {
      this.playUiCancel();
      this.setCompendiumOpen(false);
    };
  };

  UIRoot.prototype.setCompendiumOpen = function setCompendiumOpen(open) {
    this.compendiumOpen = !!open;
    if (this.compendiumOpen) {
      this.dataScreenOpen = false;
      this.debugScreenOpen = false;
      this.creditScreenOpen = false;
      this.ensureCompendiumPreviews();
    }
    this.refreshDataButtonState();
  };
}

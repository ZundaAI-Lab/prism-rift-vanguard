/**
 * Responsibility:
 * - boss alert overlay の再生状態更新を担当する。
 *
 * 更新ルール:
 * - DOM 構築や localized text は OverlayBuilders 側へ置く。
 * - このファイルにはタイマーと active class の更新だけを置く。
 */
export function installIntervalBossAlertRuntime(UIRoot) {
  UIRoot.prototype.renderBossAlertCue = function renderBossAlertCue() {
    const overlay = this.refs.bossAlertOverlay;
    const frame = this.refs.bossAlertFrame;
    const stripeTop = this.refs.bossAlertStripeTop;
    const stripeBottom = this.refs.bossAlertStripeBottom;
    const text = this.refs.bossAlertText;
    const subtext = this.refs.bossAlertSubtext;
    if (!overlay || !frame || !stripeTop || !stripeBottom || !text || !subtext) return;

    const progression = this.game.state.progression;
    const timer = Math.max(0, progression.bossAlertCueTimer || 0);
    const duration = Math.max(0.0001, progression.bossAlertCueDuration || 1.1);
    const isVisible = timer > 0 && this.game.state.mode !== 'title';
    if (!isVisible) {
      if (this.bossAlertCueActive) {
        overlay.classList.remove('boss-alert-active');
        overlay.style.display = 'none';
        this.bossAlertCueActive = false;
        this.bossAlertCueDurationCss = '';
      }
      this.lastBossAlertTimer = 0;
      return;
    }

    const durationCss = `${duration.toFixed(3)}s`;
    const shouldRestart = !this.bossAlertCueActive
      || this.bossAlertCueDurationCss !== durationCss
      || timer > (this.lastBossAlertTimer + 0.0001);

    if (shouldRestart) {
      overlay.style.setProperty('--boss-alert-duration', durationCss);
      overlay.style.display = 'block';
      overlay.classList.remove('boss-alert-active');
      void overlay.offsetWidth;
      overlay.classList.add('boss-alert-active');
      this.bossAlertCueActive = true;
      this.bossAlertCueDurationCss = durationCss;
    }

    this.lastBossAlertTimer = timer;
  };
}

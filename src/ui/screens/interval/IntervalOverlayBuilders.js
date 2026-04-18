/**
 * Responsibility:
 * - インターバル overlay DOM 構築と初期表示、overlay 共通補正を担当する。
 *
 * 更新ルール:
 * - 毎フレーム演出は BossAlert / Transition runtime へ追記する。
 * - このファイルには DOM 生成と初期表示の責務だけを置く。
 */
export function installIntervalOverlayBuilders(UIRoot) {
  UIRoot.prototype.hideIntervalTransitionOverlay = function hideIntervalTransitionOverlay() {
    if (this.refs.transitionWrap) {
      this.refs.transitionWrap.style.display = 'none';
      this.refs.transitionWrap.style.opacity = '0';
    }
  };

  UIRoot.prototype.createTransitionOverlay = function createTransitionOverlay() {
    const wrap = document.createElement('div');
    wrap.className = 'interval-transition-overlay';

    const canvas = document.createElement('canvas');
    canvas.className = 'interval-transition-canvas';
    wrap.appendChild(canvas);
    document.getElementById('app-shell').appendChild(wrap);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { alpha: true });
    const ctx = canvas.getContext('2d', { alpha: true });
    if (tempCtx) tempCtx.imageSmoothingEnabled = false;
    if (ctx) ctx.imageSmoothingEnabled = false;

    this.refs.transitionWrap = wrap;
    this.refs.transitionCanvas = canvas;
    this.refs.transitionCtx = ctx;
    this.refs.transitionTempCanvas = tempCanvas;
    this.refs.transitionTempCtx = tempCtx;
    this.hideIntervalTransitionOverlay();
  };

  UIRoot.prototype.createBossAlertOverlay = function createBossAlertOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'boss-alert-overlay';

    const vignette = document.createElement('div');
    vignette.className = 'boss-alert-vignette';

    const stripeTop = document.createElement('div');
    stripeTop.className = 'boss-alert-stripe boss-alert-stripe-top';

    const stripeBottom = document.createElement('div');
    stripeBottom.className = 'boss-alert-stripe boss-alert-stripe-bottom';

    const frame = document.createElement('div');
    frame.className = 'boss-alert-frame';

    const frameGlow = document.createElement('div');
    frameGlow.className = 'boss-alert-frame-glow';

    const text = document.createElement('div');
    text.className = 'boss-alert-text';

    const subtext = document.createElement('div');
    subtext.className = 'boss-alert-subtext';

    frame.append(frameGlow, text, subtext);
    overlay.append(vignette, stripeTop, stripeBottom, frame);
    document.getElementById('app-shell').appendChild(overlay);

    this.refs.bossAlertOverlay = overlay;
    this.refs.bossAlertFrame = frame;
    this.refs.bossAlertStripeTop = stripeTop;
    this.refs.bossAlertStripeBottom = stripeBottom;
    this.refs.bossAlertText = text;
    this.refs.bossAlertSubtext = subtext;
    this.refreshIntervalOverlayLocalization();
    overlay.style.display = 'none';
  };

  UIRoot.prototype.refreshIntervalOverlayLocalization = function refreshIntervalOverlayLocalization() {
    if (this.refs.bossAlertText) this.refs.bossAlertText.textContent = this.t('common.warning');
    if (this.refs.bossAlertSubtext) this.refs.bossAlertSubtext.textContent = this.t('common.bossApproach');
  };

  UIRoot.prototype.forceInteractiveOverlays = function forceInteractiveOverlays() {
    const screens = [this.refs.startScreen, this.refs.enemyIntelScreen, this.refs.dataScreen, this.refs.intervalScreen, this.refs.gameOverScreen, this.refs.clearScreen, this.refs.pauseScreen];
    for (const screen of screens) {
      if (!screen) continue;
      screen.style.zIndex = screen === this.refs.pauseScreen ? '45' : '40';
      screen.style.pointerEvents = 'auto';
      const buttons = screen.querySelectorAll('button');
      buttons.forEach((button) => {
        button.style.pointerEvents = 'auto';
        button.style.position = 'relative';
        button.style.zIndex = '2';
      });
    }
    if (this.refs.shopGrid) this.refs.shopGrid.style.pointerEvents = 'auto';
  };
}

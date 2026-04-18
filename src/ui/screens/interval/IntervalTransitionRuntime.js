/**
 * Responsibility:
 * - clearSequence から interval へ入る transition overlay runtime を担当する。
 *
 * 更新ルール:
 * - overlay DOM の生成は OverlayBuilders 側、レイアウトは layout/interval 側へ置く。
 * - このファイルには progress 計算と canvas 描画だけを置く。
 */
export function installIntervalTransitionRuntime(UIRoot) {
  UIRoot.prototype.updateIntervalTransition = function updateIntervalTransition() {
    const { state } = this.game;
    const transition = state.ui?.intervalTransition;
    if (!transition?.armed) {
      this.hideIntervalTransitionOverlay();
      return;
    }

    const stillEligible = state.mode === 'playing'
      && state.progression.missionStatus === 'clearSequence'
      && state.missionIndex === transition.startedAtMissionIndex;

    if (!stillEligible) {
      this.cancelUiIntervalTransition();
      return;
    }

    const remaining = Math.max(0, state.progression.clearSequenceTimer);
    if (remaining > transition.duration) return;

    transition.active = true;
    const progress = 1 - Math.min(1, remaining / transition.duration);
    this.renderIntervalTransition(progress);
    if (this.refs.transitionWrap) {
      this.refs.transitionWrap.style.display = 'block';
      this.refs.transitionWrap.style.opacity = '1';
    }
  };

  UIRoot.prototype.renderIntervalTransition = function renderIntervalTransition(progress) {
    const wrap = this.refs.transitionWrap;
    const canvas = this.refs.transitionCanvas;
    const ctx = this.refs.transitionCtx;
    const tempCanvas = this.refs.transitionTempCanvas;
    const tempCtx = this.refs.transitionTempCtx;
    const source = this.game.renderer?.webgl?.domElement;
    if (!wrap || !canvas || !ctx || !tempCanvas || !tempCtx || !source) return;

    const displayWidth = Math.max(2, Math.floor(window.innerWidth));
    const displayHeight = Math.max(2, Math.floor(window.innerHeight));
    const pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const width = Math.max(2, Math.floor(displayWidth * pixelRatio));
    const height = Math.max(2, Math.floor(displayHeight * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const eased = progress * progress * (3 - 2 * progress);
    const block = 1 + Math.floor(eased * 36);
    tempCanvas.width = Math.max(16, Math.floor(width / block));
    tempCanvas.height = Math.max(16, Math.floor(height / block));

    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(source, 0, 0, tempCanvas.width, tempCanvas.height);

    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, width, height);

    const veilAlpha = Math.min(0.98, eased * 0.92 + Math.max(0, eased - 0.35) * 0.28);
    ctx.fillStyle = `rgba(0, 0, 0, ${veilAlpha})`;
    ctx.fillRect(0, 0, width, height);
  };
}

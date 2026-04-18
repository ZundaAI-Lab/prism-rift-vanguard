/**
 * Responsibility:
 * - ミニマップ DOM/canvas の生成と解像度同期を担当する。
 *
 * Rules:
 * - ミニマップの canvas 作成・再解像度化はこのファイルを通す。
 * - View 本体には install 入口だけを残し、canvas 詳細はここへ寄せる。
 * - 解像度変更時の signature 破棄はこのファイルで完結させる。
 */
import {
  MINIMAP_CANVAS_SIZE,
  configureMinimapCanvasElement,
  isMinimapVisible,
  resolveMinimapMarkerScale,
  resolveMinimapPixelRatio,
  resizeMinimapCanvas,
} from './MinimapShared.js';

export function installMinimapCanvas(UIRoot) {
  UIRoot.prototype.createMinimap = function createMinimap() {
    const size = MINIMAP_CANVAS_SIZE;
    const wrap = document.createElement('div');
    wrap.className = 'minimap-wrap';

    const label = document.createElement('div');
    label.className = 'minimap-label';
    label.textContent = this.t('minimap.label');
    label.style.zIndex = '3';

    const pixelRatio = resolveMinimapPixelRatio(this);

    const baseCanvas = document.createElement('canvas');
    configureMinimapCanvasElement(baseCanvas, size, 0);
    baseCanvas.width = Math.round(size * pixelRatio);
    baseCanvas.height = Math.round(size * pixelRatio);

    const dynamicCanvas = document.createElement('canvas');
    configureMinimapCanvasElement(dynamicCanvas, size, 1);
    dynamicCanvas.width = Math.round(size * pixelRatio);
    dynamicCanvas.height = Math.round(size * pixelRatio);

    const staticCanvas = document.createElement('canvas');
    configureMinimapCanvasElement(staticCanvas, size, 2);
    staticCanvas.width = Math.round(size * pixelRatio);
    staticCanvas.height = Math.round(size * pixelRatio);

    wrap.append(baseCanvas, dynamicCanvas, staticCanvas, label);
    this.refs.hud.appendChild(wrap);
    this.refs.minimapWrap = wrap;
    this.refs.minimapLabel = label;
    this.refs.minimapCanvas = baseCanvas;
    this.refs.minimapCtx = baseCanvas.getContext('2d');
    this.refs.minimapDynamicCanvas = dynamicCanvas;
    this.refs.minimapDynamicCtx = dynamicCanvas.getContext('2d');
    this.refs.minimapStaticCanvas = staticCanvas;
    this.refs.minimapStaticCtx = staticCanvas.getContext('2d');
  };

  UIRoot.prototype.refreshMinimapLocalization = function refreshMinimapLocalization() {
    if (this.refs.minimapLabel) this.refs.minimapLabel.textContent = this.t('minimap.label');
  };

  UIRoot.prototype.syncMinimapCanvasResolution = function syncMinimapCanvasResolution() {
    if (!isMinimapVisible(this)) return;
    const pixelRatio = resolveMinimapPixelRatio(this);
    const markerScale = resolveMinimapMarkerScale(this);
    const uiState = this.ensureUiRuntimeState();
    const control = uiState?.minimapCanvasResolution ?? (uiState.minimapCanvasResolution = {
      pixelRatio: 0,
      markerScale: 0,
    });
    if (Math.abs(control.pixelRatio - pixelRatio) <= 0.0001 && Math.abs((control.markerScale ?? 0) - markerScale) <= 0.0001) return;

    control.pixelRatio = pixelRatio;
    control.markerScale = markerScale;
    const resized = [
      resizeMinimapCanvas(this.refs.minimapCanvas, MINIMAP_CANVAS_SIZE, pixelRatio),
      resizeMinimapCanvas(this.refs.minimapDynamicCanvas, MINIMAP_CANVAS_SIZE, pixelRatio),
      resizeMinimapCanvas(this.refs.minimapStaticCanvas, MINIMAP_CANVAS_SIZE, pixelRatio),
    ].some(Boolean);

    if (!resized) return;
    const staticLayer = uiState?.minimapStaticLayer;
    if (staticLayer) staticLayer.signature = '';
    this.refs.minimapCtx?.clearRect?.(0, 0, this.refs.minimapCanvas?.width ?? 0, this.refs.minimapCanvas?.height ?? 0);
    this.refs.minimapDynamicCtx?.clearRect?.(0, 0, this.refs.minimapDynamicCanvas?.width ?? 0, this.refs.minimapDynamicCanvas?.height ?? 0);
    this.refs.minimapStaticCtx?.clearRect?.(0, 0, this.refs.minimapStaticCanvas?.width ?? 0, this.refs.minimapStaticCanvas?.height ?? 0);
  };
}

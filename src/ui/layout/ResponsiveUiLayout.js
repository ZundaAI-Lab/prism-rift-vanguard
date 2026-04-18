import { getGameViewportSize, getViewportFitMetrics } from '../../utils/dom-layout.js';
import { clamp } from '../../utils/math.js';

const RESPONSIVE_CARD_SELECTOR = '.responsive-screen-card';
const DEFAULT_SCREEN_BASE_WIDTH = 760;
const DEFAULT_SCREEN_BASE_HEIGHT = 760;
const DEFAULT_SCREEN_MARGIN_X = 24;
const DEFAULT_SCREEN_MARGIN_Y = 24;
const TOP_BAR_BASE_WIDTH = 1320;
const TOP_BAR_BASE_HEIGHT = 118;

function readNumericDataset(node, key, fallback) {
  const value = Number(node?.dataset?.[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Responsibility:
 * - 画面全体の responsive UI layout をまとめて扱う。
 *
 * Update Rules:
 * - screen card の contain 縮小はこのファイルを正本にする。
 * - HUD 上部バーの縮小と minimap 自動倍率もこのファイルへ集約する。
 * - target lock / reticle の座標責務はここで触らない。
 */
export function installResponsiveUiLayout(UIRoot) {
  UIRoot.prototype.applyResponsiveScreenScale = function applyResponsiveScreenScale() {
    const cards = document.querySelectorAll(RESPONSIVE_CARD_SELECTOR);
    if (!cards.length) return;

    cards.forEach((card) => {
      const baseWidth = readNumericDataset(card, 'responsiveBaseWidth', DEFAULT_SCREEN_BASE_WIDTH);
      const baseHeight = readNumericDataset(card, 'responsiveBaseHeight', DEFAULT_SCREEN_BASE_HEIGHT);
      const marginX = readNumericDataset(card, 'responsiveMarginX', DEFAULT_SCREEN_MARGIN_X);
      const marginY = readNumericDataset(card, 'responsiveMarginY', DEFAULT_SCREEN_MARGIN_Y);
      const fit = getViewportFitMetrics(this.game?.renderer?.host, {
        baseWidth,
        baseHeight,
        marginX,
        marginY,
      });
      card.style.setProperty('--screen-responsive-scale', `${fit.scale.toFixed(4)}`);
    });
  };

  UIRoot.prototype.applyResponsiveHudScale = function applyResponsiveHudScale() {
    const topBar = this.refs.topBar;
    if (!topBar) return;

    const { width: viewportWidth, height: viewportHeight } = getGameViewportSize(this.game?.renderer?.host);
    const availableWidth = Math.max(240, viewportWidth - 28);
    const availableHudHeight = Math.max(72, Math.min(viewportHeight * 0.2, viewportHeight - 132));
    const widthScale = availableWidth / TOP_BAR_BASE_WIDTH;
    const heightScale = availableHudHeight / TOP_BAR_BASE_HEIGHT;
    const scale = clamp(Math.min(1, widthScale, heightScale), 0.42, 1);
    const fittedWidth = Math.floor(availableWidth / scale);
    const gap = Math.round(clamp(12 * (0.55 + scale * 0.45), 5, 12));

    topBar.style.width = `${fittedWidth}px`;
    topBar.style.maxWidth = `${fittedWidth}px`;
    topBar.style.setProperty('--hud-topbar-scale', `${scale.toFixed(4)}`);
    topBar.style.setProperty('--hud-topbar-gap', `${gap}px`);
  };

  UIRoot.prototype.applyResponsiveMinimapLayout = function applyResponsiveMinimapLayout() {
    const wrap = this.refs.minimapWrap;
    if (!wrap) return;

    const snapshot = this.game.optionState ?? this.game.getOptionsSnapshot?.();
    const userScale = clamp(Number(snapshot?.hud?.minimapScale) || 1, 0.75, 1.4);
    const minimapVisible = snapshot?.hud?.minimapVisible !== false;
    const hudOpacity = clamp(Number(snapshot?.hud?.opacity) || 1, 0.35, 1);
    const { width: viewportWidth, height: viewportHeight } = getGameViewportSize(this.game?.renderer?.host);
    const widthScale = viewportWidth / 1480;
    const heightScale = Math.max(0.5, (viewportHeight - 120) / 980);
    const autoScale = clamp(Math.min(1, widthScale, heightScale), 0.68, 1);
    const effectiveScale = clamp(userScale * autoScale, 0.55, 1.4);
    const inset = Math.round(clamp(18 * autoScale, 10, 18));

    wrap.style.display = minimapVisible ? 'grid' : 'none';
    wrap.style.opacity = `${hudOpacity}`;
    wrap.style.transform = `scale(${effectiveScale})`;
    wrap.style.transformOrigin = 'bottom right';
    wrap.style.right = `${inset}px`;
    wrap.style.bottom = `${inset}px`;
  };
}

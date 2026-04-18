/**
 * Responsibility:
 * - tutorial panel のレイアウトだけを担当する。
 *
 * Update Rules:
 * - tutorial panel の位置調整を boss / notice レイアウトへ戻さない。
 */
export function installTutorialPanelLayout(UIRoot) {
  UIRoot.prototype.applyTutorialPanelLayout = function applyTutorialPanelLayout() {
    const panel = this.refs.tutorialPanel;
    if (!panel) return;

    const viewportWidth = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 0);
    const viewportHeight = Math.max(240, window.innerHeight || document.documentElement.clientHeight || 0);
    const sideMargin = viewportWidth <= 520 ? 12 : 16;
    const bottomMargin = viewportHeight <= 500 ? 12 : 18;
    const desiredWidth = viewportWidth <= 720
      ? Math.min(420, viewportWidth - sideMargin * 2)
      : Math.min(520, Math.max(320, viewportWidth * 0.32));
    const maxPanelWidth = Math.max(120, Math.floor(viewportWidth / 3));
    const maxPanelHeight = Math.max(96, Math.floor(viewportHeight / 3));

    panel.style.left = `${sideMargin}px`;
    panel.style.right = 'auto';
    panel.style.top = 'auto';
    panel.style.bottom = `${bottomMargin}px`;
    panel.style.width = `${Math.max(280, desiredWidth)}px`;
    panel.style.maxWidth = `calc(100vw - ${sideMargin * 2}px)`;
    panel.style.maxHeight = `calc(100vh - ${bottomMargin * 2}px)`;
    panel.style.transformOrigin = 'left bottom';
    panel.style.transform = 'none';

    const panelRect = panel.getBoundingClientRect();
    if (panelRect.width <= 0 || panelRect.height <= 0) return;

    const scale = Math.min(
      1,
      maxPanelWidth / panelRect.width,
      maxPanelHeight / panelRect.height,
    );
    panel.style.transform = `scale(${scale.toFixed(4)})`;
  };
}

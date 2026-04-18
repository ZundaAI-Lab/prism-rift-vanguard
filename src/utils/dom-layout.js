/**
 * Responsibility:
 * - Shared DOM layout helpers for sizing the game against its host container.
 *
 * Rules:
 * - Keep this file DOM-only. No renderer, UI state, or gameplay imports.
 * - Always prefer the game host container when available, with viewport fallback for standalone pages.
 */
function resolveDocumentViewport() {
  const doc = document.documentElement;
  return {
    width: Math.max(1, Math.floor(window.innerWidth || doc?.clientWidth || document.body?.clientWidth || 1)),
    height: Math.max(1, Math.floor(window.innerHeight || doc?.clientHeight || document.body?.clientHeight || 1)),
  };
}

export function getGameHostElement(preferred = null) {
  if (preferred instanceof HTMLElement) return preferred;
  return document.getElementById('app-shell') ?? document.body;
}

export function getGameHostRect(preferred = null) {
  const host = getGameHostElement(preferred);
  const viewport = resolveDocumentViewport();
  const rect = host?.getBoundingClientRect?.();
  const width = Math.max(1, Math.floor(rect?.width || host?.clientWidth || viewport.width));
  const height = Math.max(1, Math.floor(rect?.height || host?.clientHeight || viewport.height));
  return {
    host,
    rect: rect ?? new DOMRect(0, 0, width, height),
    width,
    height,
  };
}

export function getGameViewportSize(preferred = null, { minWidth = 0, minHeight = 0 } = {}) {
  const { host, rect, width, height } = getGameHostRect(preferred);
  return {
    host,
    rect,
    width: Math.max(minWidth, width),
    height: Math.max(minHeight, height),
  };
}

export function getPointWithinGameViewport(clientX = 0, clientY = 0, preferred = null) {
  const { host, rect, width, height } = getGameViewportSize(preferred);
  return {
    host,
    rect,
    width,
    height,
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}


export function resolveContainScale(containerWidth = 1, containerHeight = 1, contentWidth = 1, contentHeight = 1, { minScale = 0, maxScale = 1 } = {}) {
  const safeContainerWidth = Math.max(1, Number(containerWidth) || 1);
  const safeContainerHeight = Math.max(1, Number(containerHeight) || 1);
  const safeContentWidth = Math.max(1, Number(contentWidth) || 1);
  const safeContentHeight = Math.max(1, Number(contentHeight) || 1);
  const scale = Math.min(safeContainerWidth / safeContentWidth, safeContainerHeight / safeContentHeight, maxScale);
  return Math.max(minScale, scale);
}

export function getViewportFitMetrics(preferred = null, {
  baseWidth = 1,
  baseHeight = 1,
  marginX = 0,
  marginY = 0,
  minWidth = 0,
  minHeight = 0,
  minScale = 0,
  maxScale = 1,
} = {}) {
  const { host, rect, width, height } = getGameViewportSize(preferred, { minWidth, minHeight });
  const availableWidth = Math.max(1, width - marginX * 2);
  const availableHeight = Math.max(1, height - marginY * 2);
  const scale = resolveContainScale(availableWidth, availableHeight, baseWidth, baseHeight, { minScale, maxScale });
  return {
    host,
    rect,
    width,
    height,
    baseWidth,
    baseHeight,
    availableWidth,
    availableHeight,
    scale,
    fittedWidth: baseWidth * scale,
    fittedHeight: baseHeight * scale,
    offsetX: Math.max(0, (width - baseWidth * scale) * 0.5),
    offsetY: Math.max(0, (height - baseHeight * scale) * 0.5),
  };
}

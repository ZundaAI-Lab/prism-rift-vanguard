/**
 * Responsibility:
 * - ミニマップ専用の共有定数・一時ベクトル・描画補助をまとめる。
 *
 * Rules:
 * - ミニマップ専用の共有値はこのファイルを正本にする。
 * - TargetLock/HUD 本体の共有値をここへ混在させない。
 * - ミニマップの画質・ピクセル比・投影基底の更新規約はここに集約する。
 */
import * as THREE from 'three';
import { MINIMAP, PLAYER_TRAVEL } from '../../../data/balance.js';

export { MINIMAP, PLAYER_TRAVEL };

export const MINIMAP_CANVAS_SIZE = 368;
export const MINIMAP_PROJECT_POINT_A = { x: 0, y: 0 };
export const MINIMAP_PROJECT_POINT_B = { x: 0, y: 0 };

export const MINIMAP_FORWARD = new THREE.Vector3();
export const MINIMAP_RIGHT = new THREE.Vector3();
export const MINIMAP_DELTA = new THREE.Vector3();
export const MINIMAP_UP = new THREE.Vector3(0, 1, 0);
export const MINIMAP_BOUNDARY_OFFSET = new THREE.Vector3();
export const MINIMAP_COLLIDER_WORLD = new THREE.Vector3();
export const MINIMAP_COLLIDER_AXIS_X = new THREE.Vector3();

export function configureMinimapCanvasElement(canvas, size, zIndex = 0) {
  canvas.className = 'minimap-canvas';
  canvas.style.position = 'absolute';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.style.zIndex = String(zIndex);
  canvas.style.pointerEvents = 'none';
}

export function resolveMinimapGraphicsQuality(uiRoot) {
  return uiRoot.game.optionState?.graphics?.quality
    ?? uiRoot.game.renderer?.currentGraphicsOptions?.quality
    ?? 'high';
}

export function resolveMinimapShadowBlur(uiRoot, baseBlur) {
  if (!(baseBlur > 0)) return 0;
  const quality = resolveMinimapGraphicsQuality(uiRoot);
  if (quality === 'low') return 0;
  if (quality === 'medium') return baseBlur * 0.5;
  return baseBlur;
}

export function applyMinimapShadow(uiRoot, ctx, color, baseBlur) {
  const blur = resolveMinimapShadowBlur(uiRoot, baseBlur);
  ctx.shadowBlur = blur;
  ctx.shadowColor = blur > 0 ? color : 'rgba(0, 0, 0, 0)';
}

export function resolveMinimapHighQualityPixelRatio() {
  return Math.min(1.5, Math.max(1, Math.min(2, window.devicePixelRatio || 1)));
}

export function resolveMinimapPixelRatio(uiRoot) {
  const quality = resolveMinimapGraphicsQuality(uiRoot);
  const highQualityPixelRatio = resolveMinimapHighQualityPixelRatio();
  if (quality === 'low') return 1;
  if (quality === 'medium') return Math.min(1.25, highQualityPixelRatio);
  return highQualityPixelRatio;
}

export function resolveMinimapMarkerScale(uiRoot) {
  const pixelRatio = resolveMinimapPixelRatio(uiRoot);
  const highQualityPixelRatio = resolveMinimapHighQualityPixelRatio();
  return Math.max(0.5, pixelRatio / Math.max(0.0001, highQualityPixelRatio));
}

export function resizeMinimapCanvas(canvas, size, pixelRatio) {
  if (!canvas) return false;
  const nextWidth = Math.max(1, Math.round(size * pixelRatio));
  const nextHeight = Math.max(1, Math.round(size * pixelRatio));
  if (canvas.width === nextWidth && canvas.height === nextHeight) return false;
  canvas.width = nextWidth;
  canvas.height = nextHeight;
  return true;
}

export function isMinimapVisible(uiRoot) {
  return uiRoot?.refs?.minimapWrap?.style?.display !== 'none';
}

export function updateMinimapOrientationBasis(camera) {
  if (!camera?.getWorldDirection) {
    MINIMAP_FORWARD.set(0, 0, -1);
    MINIMAP_RIGHT.set(1, 0, 0);
    return;
  }
  MINIMAP_FORWARD.copy(camera.getWorldDirection(MINIMAP_FORWARD));
  MINIMAP_FORWARD.y = 0;
  if (MINIMAP_FORWARD.lengthSq() < 0.0001) MINIMAP_FORWARD.set(0, 0, -1);
  MINIMAP_FORWARD.normalize();
  MINIMAP_RIGHT.crossVectors(MINIMAP_FORWARD, MINIMAP_UP).normalize();
}

export function projectMinimapWorldPointTo(out, worldX, worldZ, playerMesh, mapRange, radius) {
  MINIMAP_DELTA.set(worldX - playerMesh.position.x, 0, worldZ - playerMesh.position.z);
  const localRight = MINIMAP_DELTA.dot(MINIMAP_RIGHT);
  const localForward = MINIMAP_DELTA.dot(MINIMAP_FORWARD);
  out.x = (localRight / mapRange) * radius;
  out.y = (-localForward / mapRange) * radius;
  return out;
}

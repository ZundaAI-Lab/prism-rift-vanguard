/**
 * Responsibility:
 * - インターバル画面 builder の公開入口を維持し、overlay builder へ委譲する。
 *
 * 更新ルール:
 * - overlay DOM 追加は IntervalOverlayBuilders.js を更新する。
 * - builder へ runtime や shop 描画を戻さない。
 */
import { installIntervalOverlayBuilders } from './IntervalOverlayBuilders.js';

export function installIntervalScreenBuilders(UIRoot) {
  installIntervalOverlayBuilders(UIRoot);
}

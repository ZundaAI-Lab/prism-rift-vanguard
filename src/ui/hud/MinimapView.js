/**
 * Responsibility:
 * - ミニマップ系サブモジュールを束ねて UIRoot へ install する façade。
 *
 * Rules:
 * - MinimapView 自体には install の入口だけを残す。
 * - 新しいミニマップ機能は minimap/ 配下へ追加し、ここへ実処理を戻さない。
 * - 動的レイヤ・静的レイヤ・frame/canvas 更新規約は各サブモジュールの責務に従う。
 */
import { installMinimapCanvas } from './minimap/MinimapCanvas.js';
import { installMinimapFrame } from './minimap/MinimapFrame.js';
import { installMinimapHazardMarkers } from './minimap/MinimapHazardMarkers.js';
import { installMinimapStaticLayer } from './minimap/MinimapStaticLayer.js';
import { installMinimapDynamicLayer } from './minimap/MinimapDynamicLayer.js';

export function installMinimapView(UIRoot) {
  installMinimapCanvas(UIRoot);
  installMinimapFrame(UIRoot);
  installMinimapHazardMarkers(UIRoot);
  installMinimapStaticLayer(UIRoot);
  installMinimapDynamicLayer(UIRoot);
}

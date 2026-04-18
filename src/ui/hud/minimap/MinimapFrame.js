/**
 * Responsibility:
 * - ミニマップ描画フレームの準備と投影基底更新を担当する。
 *
 * Rules:
 * - ミニマップの forward/right 基底更新は毎フレームここを通す。
 * - hazard marker の更新タイミング制御はこのファイルで束ねる。
 * - ワールド点の投影 helper はこのファイル経由で公開する。
 */
import { getStageHazardMinimapMarkers } from './MinimapHazardMarkers.js';
import {
  MINIMAP,
  isMinimapVisible,
  projectMinimapWorldPointTo,
  updateMinimapOrientationBasis,
} from './MinimapShared.js';

export function installMinimapFrame(UIRoot) {
  UIRoot.prototype.prepareMinimapFrame = function prepareMinimapFrame(options = null) {
    const refreshHazards = options?.refreshHazards !== false;
    const allowHidden = options?.allowHidden === true;
    const uiState = this.ensureUiRuntimeState();
    const frame = uiState.minimapFrame ?? (uiState.minimapFrame = {
      ready: false,
      visible: false,
      width: 0,
      height: 0,
      cx: 0,
      cy: 0,
      radius: 0,
      mapRange: MINIMAP.range,
      playerMesh: null,
      hazardMarkers: [],
    });

    this.syncMinimapCanvasResolution();
    const canvas = this.refs.minimapCanvas;
    const playerMesh = this.game.store.playerMesh;
    frame.visible = isMinimapVisible(this);
    frame.width = canvas?.width ?? 0;
    frame.height = canvas?.height ?? 0;
    frame.cx = frame.width * 0.5;
    frame.cy = frame.height * 0.5;
    frame.radius = Math.min(frame.width, frame.height) * 0.39;
    frame.mapRange = MINIMAP.range;
    frame.playerMesh = playerMesh ?? null;
    frame.ready = !!canvas && !!playerMesh && (allowHidden || frame.visible);
    if (!frame.ready) {
      frame.hazardMarkers = [];
      return frame;
    }

    updateMinimapOrientationBasis(this.game.renderer?.camera);
    if (refreshHazards) frame.hazardMarkers = getStageHazardMinimapMarkers(this.game.stageGimmicks);
    return frame;
  };

  UIRoot.prototype.projectMinimapWorldPointTo = function projectMinimapWorldPointToFacade(out, worldX, worldZ, playerMesh, mapRange, radius) {
    return projectMinimapWorldPointTo(out, worldX, worldZ, playerMesh, mapRange, radius);
  };
}

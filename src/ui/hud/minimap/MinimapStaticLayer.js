/**
 * Responsibility:
 * - ミニマップの固定レイヤとベースレイヤ描画を担当する。
 *
 * Rules:
 * - 静的 HUD 枠とワールド背景描画はこのファイルへ集約する。
 * - obstacle / astral gel / travel boundary の表示規約はここを正本にする。
 * - ミニマップ本体ベース描画はここ、敵点や敵弾点は DynamicLayer に残す。
 */
import {
  MINIMAP,
  MINIMAP_BOUNDARY_OFFSET,
  MINIMAP_COLLIDER_AXIS_X,
  MINIMAP_COLLIDER_WORLD,
  MINIMAP_DELTA,
  MINIMAP_FORWARD,
  MINIMAP_RIGHT,
  PLAYER_TRAVEL,
  isMinimapVisible,
  resolveMinimapMarkerScale,
} from './MinimapShared.js';

export function installMinimapStaticLayer(UIRoot) {
  UIRoot.prototype.renderMinimapStatic = function renderMinimapStatic() {
    const canvas = this.refs.minimapStaticCanvas;
    const ctx = this.refs.minimapStaticCtx;
    if (!canvas || !ctx) return;

    const wrap = this.refs.minimapWrap;
    if (wrap?.style?.display === 'none') return;

    const w = canvas.width;
    const h = canvas.height;
    const highContrast = this.game.optionState?.hud?.highContrast === true;
    const signature = `${w}x${h}|${highContrast ? 'hc' : 'std'}`;
    const uiState = this.ensureUiRuntimeState();
    const control = uiState.minimapStaticLayer ?? (uiState.minimapStaticLayer = { signature: '' });
    if (control.signature === signature) return;
    control.signature = signature;

    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.5;
    const radius = Math.min(w, h) * 0.39;
    const innerRadius = radius * MINIMAP.innerRingRatio;
    const centerRingRadius = radius * MINIMAP.centerRingRatio;
    const markerScale = resolveMinimapMarkerScale(this);
    const playerMarkerScale = markerScale * 0.84;

    ctx.strokeStyle = highContrast ? 'rgba(255,255,255,0.56)' : 'rgba(134, 255, 232, 0.18)';
    ctx.lineWidth = Math.max(1, w * (highContrast ? 0.0095 : 0.008));
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.arc(cx, cy, centerRingRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(playerMarkerScale, playerMarkerScale);
    ctx.fillStyle = '#dffcff';
    ctx.strokeStyle = 'rgba(118, 255, 240, 0.95)';
    ctx.lineWidth = Math.max(2.2, w * 0.0085) / Math.max(0.0001, playerMarkerScale);
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(11, 13.5);
    ctx.lineTo(0, 8.5);
    ctx.lineTo(-11, 13.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  UIRoot.prototype.drawMinimapObstacleLayer = function drawMinimapObstacleLayer(ctx, cx, cy, radius, mapRange, playerMesh) {
    const colliders = this.game.world?.getMinimapStaticObstacleColliders?.() ?? this.game.world?.staticColliders;
    if (!Array.isArray(colliders) || colliders.length === 0) return;

    const obstacleFill = 'rgba(132, 142, 156, 0.28)';

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, radius - 1), 0, Math.PI * 2);
    ctx.clip();

    for (const collider of colliders) {
      if (!collider || collider.blocksPlayer === false) continue;

      MINIMAP_COLLIDER_WORLD.set(collider.x ?? 0, collider.y ?? 0, collider.z ?? 0);

      MINIMAP_DELTA.subVectors(MINIMAP_COLLIDER_WORLD, playerMesh.position);
      MINIMAP_DELTA.y = 0;
      const localRight = MINIMAP_DELTA.dot(MINIMAP_RIGHT);
      const localForward = MINIMAP_DELTA.dot(MINIMAP_FORWARD);
      const px = (localRight / mapRange) * radius;
      const py = (-localForward / mapRange) * radius;
      const colliderRadius = Math.max(0.8, collider.radius ?? 0.8);
      const scaledRadius = Math.max(2.2, (colliderRadius / mapRange) * radius);
      const dist = Math.hypot(px, py);
      if (dist > radius + scaledRadius + 4) continue;

      ctx.save();
      ctx.translate(cx + px, cy + py);
      ctx.fillStyle = obstacleFill;

      if (collider.localHalfExtents && (collider.worldAxisX || collider.source)) {
        if (collider.worldAxisX) MINIMAP_COLLIDER_AXIS_X.copy(collider.worldAxisX);
        else {
          MINIMAP_COLLIDER_AXIS_X.setFromMatrixColumn(collider.source.matrixWorld, 0);
          MINIMAP_COLLIDER_AXIS_X.y = 0;
          if (MINIMAP_COLLIDER_AXIS_X.lengthSq() < 0.0001) MINIMAP_COLLIDER_AXIS_X.set(1, 0, 0);
          else MINIMAP_COLLIDER_AXIS_X.normalize();
        }
        const axisRight = MINIMAP_COLLIDER_AXIS_X.dot(MINIMAP_RIGHT);
        const axisForward = MINIMAP_COLLIDER_AXIS_X.dot(MINIMAP_FORWARD);
        const angle = Math.atan2(-axisForward, axisRight);
        const halfW = Math.max(4, (Math.max(collider.localHalfExtents.x, collider.radius ?? 1) / mapRange) * radius);
        const halfH = Math.max(1.8, (Math.max(collider.localHalfExtents.z, 0.45) / mapRange) * radius);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.rect(-halfW, -halfH, halfW * 2, halfH * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, scaledRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  };

  UIRoot.prototype.drawMinimapAstralGelLayer = function drawMinimapAstralGelLayer(ctx, cx, cy, radius, mapRange, playerMesh) {
    const fields = this.game.world?.getMinimapAstralGelFields?.();
    if (!Array.isArray(fields) || fields.length === 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, radius - 1), 0, Math.PI * 2);
    ctx.clip();

    for (const field of fields) {
      const source = field?.source;
      if (!source) continue;

      source.updateWorldMatrix?.(true, false);
      source.getWorldPosition(MINIMAP_COLLIDER_WORLD);
      MINIMAP_DELTA.subVectors(MINIMAP_COLLIDER_WORLD, playerMesh.position);
      MINIMAP_DELTA.y = 0;
      const localRight = MINIMAP_DELTA.dot(MINIMAP_RIGHT);
      const localForward = MINIMAP_DELTA.dot(MINIMAP_FORWARD);
      const px = (localRight / mapRange) * radius;
      const py = (-localForward / mapRange) * radius;
      const gelRadiusX = Math.max(1.8, (Math.max(0.1, field.radiusX ?? field.radius ?? 1) / mapRange) * radius);
      const gelRadiusZ = Math.max(1.8, (Math.max(0.1, field.radiusZ ?? field.radius ?? 1) / mapRange) * radius);
      const dist = Math.hypot(px, py);
      const maxRadius = Math.max(gelRadiusX, gelRadiusZ);
      if (dist > radius + maxRadius + 4) continue;

      MINIMAP_COLLIDER_AXIS_X.setFromMatrixColumn(source.matrixWorld, 0);
      MINIMAP_COLLIDER_AXIS_X.y = 0;
      if (MINIMAP_COLLIDER_AXIS_X.lengthSq() < 0.0001) MINIMAP_COLLIDER_AXIS_X.set(1, 0, 0);
      MINIMAP_COLLIDER_AXIS_X.normalize();
      const axisRight = MINIMAP_COLLIDER_AXIS_X.dot(MINIMAP_RIGHT);
      const axisForward = MINIMAP_COLLIDER_AXIS_X.dot(MINIMAP_FORWARD);
      const angle = Math.atan2(-axisForward, axisRight);

      ctx.save();
      ctx.translate(cx + px, cy + py);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(168, 244, 255, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 0, gelRadiusX, gelRadiusZ, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  };

  UIRoot.prototype.drawMinimapBoundary = function drawMinimapBoundary(ctx, cx, cy, radius, mapRange, playerMesh) {
    const boundaryHalfExtent = PLAYER_TRAVEL.radius;
    if (!(boundaryHalfExtent > 0)) return;

    const playerX = playerMesh.position.x;
    const playerZ = playerMesh.position.z;
    const corners = [
      [-boundaryHalfExtent, -boundaryHalfExtent],
      [boundaryHalfExtent, -boundaryHalfExtent],
      [boundaryHalfExtent, boundaryHalfExtent],
      [-boundaryHalfExtent, boundaryHalfExtent],
    ];

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, radius - 1), 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(132, 142, 156, 0.24)';
    ctx.lineWidth = Math.max(1.05, radius * 0.021);
    ctx.setLineDash([Math.max(4, radius * 0.11), Math.max(4, radius * 0.12)]);
    ctx.lineDashOffset = -this.game.state.elapsed * 16;
    ctx.beginPath();

    for (let i = 0; i < corners.length; i += 1) {
      const [worldX, worldZ] = corners[i];
      MINIMAP_BOUNDARY_OFFSET.set(worldX - playerX, 0, worldZ - playerZ);
      const localRight = MINIMAP_BOUNDARY_OFFSET.dot(MINIMAP_RIGHT);
      const localForward = MINIMAP_BOUNDARY_OFFSET.dot(MINIMAP_FORWARD);
      const px = cx + (localRight / mapRange) * radius;
      const py = cy + (-localForward / mapRange) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  };

  UIRoot.prototype.renderMinimap = function renderMinimap() {
    if (!isMinimapVisible(this)) return;
    const canvas = this.refs.minimapCanvas;
    const ctx = this.refs.minimapCtx;
    if (!canvas || !ctx) return;

    const frame = this.ensureUiRuntimeState().minimapFrame ?? this.prepareMinimapFrame();
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!frame?.ready || !frame.playerMesh) return;

    const { cx, cy, radius, mapRange, playerMesh, hazardMarkers } = frame;
    const telegraphOverlapActive = this.isPlayerOverlappingMinimapTelegraph(playerMesh, hazardMarkers);

    let minimapBackgroundFill = 'rgba(7, 13, 24, 0.88)';
    if (telegraphOverlapActive) minimapBackgroundFill = 'rgba(94, 48, 14, 0.9)';
    ctx.fillStyle = minimapBackgroundFill;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    this.drawMinimapAstralGelLayer(ctx, cx, cy, radius, mapRange, playerMesh);
    this.drawMinimapBoundary(ctx, cx, cy, radius, mapRange, playerMesh);
    this.drawMinimapStageHazards(ctx, cx, cy, radius, mapRange, playerMesh, hazardMarkers);
  };
}

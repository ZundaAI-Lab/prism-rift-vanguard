/**
 * Responsibility:
 * - ミニマップの動的レイヤ(敵点・敵弾点・クリスタル点)描画を担当する。
 *
 * Rules:
 * - 敵点・敵弾点・クリスタル点の更新規約はこのファイルを正本にする。
 * - 敵マーカー名称/枠の UI は TargetLockView の責務でありここへ混在させない。
 * - 脅威弾の shot-line 判定と点描画は同じ動的レイヤで管理する。
 */
import {
  MINIMAP_DELTA,
  MINIMAP_FORWARD,
  MINIMAP_RIGHT,
  applyMinimapShadow,
  isMinimapVisible,
  resolveMinimapMarkerScale,
} from './MinimapShared.js';

function isPlayerInEnemyProjectileShotLine(projectile, playerMesh) {
  if (!projectile?.mesh?.position || !playerMesh?.position) return false;
  const velocity = projectile.velocity;
  const vx = velocity?.x ?? projectile.direction?.x ?? 0;
  const vz = velocity?.z ?? projectile.direction?.z ?? 0;
  const planarLenSq = (vx * vx) + (vz * vz);
  if (planarLenSq <= 0.0001) return false;

  const invPlanarLen = 1 / Math.sqrt(planarLenSq);
  const dirX = vx * invPlanarLen;
  const dirZ = vz * invPlanarLen;
  const toPlayerX = playerMesh.position.x - projectile.mesh.position.x;
  const toPlayerZ = playerMesh.position.z - projectile.mesh.position.z;
  const forward = (toPlayerX * dirX) + (toPlayerZ * dirZ);
  if (forward < 0) return false;

  const distSq = (toPlayerX * toPlayerX) + (toPlayerZ * toPlayerZ);
  const lateralSq = Math.max(0, distSq - (forward * forward));
  const shotLineRadius = Math.max(1.35, (projectile.radius ?? 0.4) * 3.2);
  return lateralSq <= (shotLineRadius * shotLineRadius);
}

export function installMinimapDynamicLayer(UIRoot) {
  UIRoot.prototype.collectThreateningMinimapEnemyProjectiles = function collectThreateningMinimapEnemyProjectiles(playerMesh, mapRange) {
    const threateningProjectiles = new Set();
    if (!playerMesh) return threateningProjectiles;
    const projectiles = this.game.store.enemyProjectiles;
    if (!Array.isArray(projectiles) || projectiles.length === 0) return threateningProjectiles;
    const mapRangeSq = mapRange * mapRange;
    for (let i = 0; i < projectiles.length; i += 1) {
      const projectile = projectiles[i];
      if (!projectile?.mesh?.position) continue;
      MINIMAP_DELTA.subVectors(projectile.mesh.position, playerMesh.position);
      MINIMAP_DELTA.y = 0;
      if (MINIMAP_DELTA.lengthSq() > mapRangeSq) continue;
      if (isPlayerInEnemyProjectileShotLine(projectile, playerMesh)) threateningProjectiles.add(projectile);
    }
    return threateningProjectiles;
  };

  UIRoot.prototype.renderMinimapDynamic = function renderMinimapDynamic() {
    if (!isMinimapVisible(this)) return;
    const canvas = this.refs.minimapDynamicCanvas;
    const ctx = this.refs.minimapDynamicCtx;
    if (!canvas || !ctx) return;

    const frame = this.ensureUiRuntimeState().minimapFrame ?? this.prepareMinimapFrame({ refreshHazards: false });
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!frame?.ready || !frame.playerMesh) return;

    const { cx, cy, radius, mapRange, playerMesh } = frame;
    const threateningProjectiles = this.collectThreateningMinimapEnemyProjectiles(playerMesh, mapRange);
    const markerScale = resolveMinimapMarkerScale(this);
    const enemyEdgeInset = 10 * markerScale;

    // ここで扱うのはミニマップ動的レイヤ(敵点・敵弾点・クリスタル点)のみ。
    // オプションの『敵マーカー』(敵の周囲の四角い枠と名称) は TargetLockView の責務なので、
    // この更新頻度や可視判定と結び付けないこと。
    for (const enemy of this.game.store.enemies) {
      if (!enemy.alive || enemy.mesh.visible === false) continue;

      MINIMAP_DELTA.subVectors(enemy.mesh.position, playerMesh.position);
      MINIMAP_DELTA.y = 0;
      const localRight = MINIMAP_DELTA.dot(MINIMAP_RIGHT);
      const localForward = MINIMAP_DELTA.dot(MINIMAP_FORWARD);
      const px = (localRight / mapRange) * radius;
      const py = (-localForward / mapRange) * radius;
      const dist = Math.hypot(px, py);
      const isOutOfRange = dist > radius;
      const enemyMarkerScale = markerScale * (isOutOfRange ? 0.5 : 1);

      if (dist > radius - enemyEdgeInset) {
        const s = (radius - enemyEdgeInset) / Math.max(0.0001, dist);
        ctx.save();
        ctx.translate(cx + px * s, cy + py * s);
      } else {
        ctx.save();
        ctx.translate(cx + px, cy + py);
      }

      const hostileFill = enemy.def.isBoss ? 'rgba(255, 84, 84, 0.96)' : 'rgba(255, 72, 72, 0.94)';
      const hostileStroke = 'rgba(255, 198, 198, 0.95)';
      applyMinimapShadow(this, ctx, 'rgba(255, 72, 72, 0.9)', enemy.def.isBoss ? 18 : 12);

      if (enemy.def.isBoss) {
        ctx.scale(enemyMarkerScale, enemyMarkerScale);
        ctx.fillStyle = hostileFill;
        ctx.strokeStyle = hostileStroke;
        ctx.lineWidth = Math.max(2.2, w * 0.0085) / Math.max(0.0001, markerScale);
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(14, 0);
        ctx.lineTo(0, 14);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.scale(enemyMarkerScale, enemyMarkerScale);
        ctx.fillStyle = hostileFill;
        ctx.beginPath();
        ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const enemyProjectileLimit = 120;
    let enemyProjectileDrawn = 0;
    for (let i = this.game.store.enemyProjectiles.length - 1; i >= 0; i -= 1) {
      if (enemyProjectileDrawn >= enemyProjectileLimit) break;
      const projectile = this.game.store.enemyProjectiles[i];
      MINIMAP_DELTA.subVectors(projectile.mesh.position, playerMesh.position);
      MINIMAP_DELTA.y = 0;
      const worldDist = MINIMAP_DELTA.length();
      if (worldDist > mapRange) continue;
      const localRight = MINIMAP_DELTA.dot(MINIMAP_RIGHT);
      const localForward = MINIMAP_DELTA.dot(MINIMAP_FORWARD);
      const px = (localRight / mapRange) * radius;
      const py = (-localForward / mapRange) * radius;
      const threatening = threateningProjectiles.has(projectile);

      ctx.save();
      if (threatening) {
        ctx.fillStyle = 'rgba(255, 194, 108, 0.98)';
        ctx.strokeStyle = 'rgba(255, 239, 208, 0.96)';
        applyMinimapShadow(this, ctx, 'rgba(255, 156, 54, 0.92)', 14);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(cx + px, cy + py, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + px, cy + py, 8.4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 182, 90, 0.54)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255, 228, 102, 0.96)';
        ctx.beginPath();
        ctx.arc(cx + px, cy + py, 3.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      enemyProjectileDrawn += 1;
    }

    const crystalLimit = 120;
    let crystalDrawn = 0;
    ctx.fillStyle = 'rgba(120, 196, 255, 0.96)';
    for (let i = this.game.store.pickups.length - 1; i >= 0; i -= 1) {
      if (crystalDrawn >= crystalLimit) break;
      const pickup = this.game.store.pickups[i];
      if (pickup.kind !== 'crystal') continue;
      MINIMAP_DELTA.subVectors(pickup.mesh.position, playerMesh.position);
      MINIMAP_DELTA.y = 0;
      const worldDist = MINIMAP_DELTA.length();
      if (worldDist > mapRange) continue;
      const localRight = MINIMAP_DELTA.dot(MINIMAP_RIGHT);
      const localForward = MINIMAP_DELTA.dot(MINIMAP_FORWARD);
      const px = (localRight / mapRange) * radius;
      const py = (-localForward / mapRange) * radius;

      ctx.beginPath();
      ctx.arc(cx + px, cy + py, 3.1, 0, Math.PI * 2);
      ctx.fill();
      crystalDrawn += 1;
    }
  };
}

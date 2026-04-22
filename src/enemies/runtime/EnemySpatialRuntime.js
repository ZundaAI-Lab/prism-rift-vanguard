import { SpatialHashGrid2D } from '../../spatial/SpatialHashGrid2D.js';

const ENEMY_SPATIAL_GRID_CELL_SIZE = 24;

/**
 * Responsibility:
 * - Enemy 配列に対する broad-phase 近傍問い合わせを管理する。
 *
 * Rules:
 * - EntityStore は配列の truth source を持ち、この runtime は検索 index だけを持つ。
 * - enemy の生死判定や damage 判定はここへ移さない。
 * - 索引は spawn / move / visibility change / remove に合わせて enemy 単位で増分同期する。
 * - 問い合わせ半径の不足による取りこぼしを防ぐため、query 側で最大 enemy 半径の padding を吸収する。
 */
export function installEnemySpatialRuntime(EnemySystem) {
  EnemySystem.prototype.recordEnemySpatialQuery = function recordEnemySpatialQuery(result, kind = 'all') {
    const perf = this.game?.debug?.getPerformanceMonitor?.();
    perf?.count?.('enemySpatialQueries', 1);
    perf?.sample?.('enemySpatialCandidates', Array.isArray(result) ? result.length : 0);
    if (kind === 'center') {
      perf?.count?.('enemySpatialCenterQueries', 1);
      perf?.sample?.('enemySpatialCenterCandidates', Array.isArray(result) ? result.length : 0);
    } else if (kind === 'bounds') {
      perf?.count?.('enemySpatialBoundsQueries', 1);
      perf?.sample?.('enemySpatialBoundsCandidates', Array.isArray(result) ? result.length : 0);
    }
    return result;
  };

  EnemySystem.prototype.ensureEnemySpatialState = function ensureEnemySpatialState() {
    if (!this.enemySpatialGrid) this.enemySpatialGrid = new SpatialHashGrid2D(ENEMY_SPATIAL_GRID_CELL_SIZE);
    if (!this.enemySpatialQueryScratch) this.enemySpatialQueryScratch = [];
    if (!Number.isFinite(this.enemySpatialMaxRadius)) this.enemySpatialMaxRadius = 0;
  };

  EnemySystem.prototype.resetEnemySpatialIndex = function resetEnemySpatialIndex() {
    this.ensureEnemySpatialState();
    this.enemySpatialGrid.clear();
    this.enemySpatialMaxRadius = 0;
    this.enemySpatialQueryScratch.length = 0;
  };

  EnemySystem.prototype.computeEnemySpatialBounds = function computeEnemySpatialBounds(enemy) {
    const radius = Math.max(0, enemy?.radius ?? enemy?.def?.radius ?? 0);
    const position = enemy?.mesh?.position;
    if (!position) return radius;
    enemy.spatialRadius = radius;
    enemy.spatialMinX = position.x - radius;
    enemy.spatialMaxX = position.x + radius;
    enemy.spatialMinZ = position.z - radius;
    enemy.spatialMaxZ = position.z + radius;
    return radius;
  };

  EnemySystem.prototype.recomputeEnemySpatialMaxRadius = function recomputeEnemySpatialMaxRadius() {
    let maxRadius = 0;
    for (let i = 0; i < this.game.store.enemies.length; i += 1) {
      const enemy = this.game.store.enemies[i];
      if (!enemy?.alive || enemy.mesh?.visible === false) continue;
      const radius = Math.max(0, enemy.spatialRadius ?? enemy.radius ?? enemy.def?.radius ?? 0);
      if (radius > maxRadius) maxRadius = radius;
    }
    this.enemySpatialMaxRadius = maxRadius;
    return maxRadius;
  };

  EnemySystem.prototype.registerEnemySpatialEntry = function registerEnemySpatialEntry(enemy) {
    this.ensureEnemySpatialState();
    if (!enemy?.alive || enemy.mesh?.visible === false) return false;
    this.computeEnemySpatialBounds(enemy);
    if (enemy.spatialIndexed) {
      this.enemySpatialGrid.updateTrackedAabb(enemy, enemy.spatialMinX, enemy.spatialMaxX, enemy.spatialMinZ, enemy.spatialMaxZ);
    } else {
      this.enemySpatialGrid.insertTrackedAabb(enemy, enemy.spatialMinX, enemy.spatialMaxX, enemy.spatialMinZ, enemy.spatialMaxZ);
    }
    if ((enemy.spatialRadius || 0) > this.enemySpatialMaxRadius) this.enemySpatialMaxRadius = enemy.spatialRadius || 0;
    return true;
  };

  EnemySystem.prototype.syncEnemySpatialEntry = function syncEnemySpatialEntry(enemy) {
    this.ensureEnemySpatialState();
    if (!enemy?.alive || enemy.mesh?.visible === false) {
      this.unregisterEnemySpatialEntry(enemy);
      return false;
    }
    this.computeEnemySpatialBounds(enemy);
    this.enemySpatialGrid.updateTrackedAabb(enemy, enemy.spatialMinX, enemy.spatialMaxX, enemy.spatialMinZ, enemy.spatialMaxZ);
    if ((enemy.spatialRadius || 0) > this.enemySpatialMaxRadius) this.enemySpatialMaxRadius = enemy.spatialRadius || 0;
    return true;
  };

  EnemySystem.prototype.unregisterEnemySpatialEntry = function unregisterEnemySpatialEntry(enemy) {
    if (!enemy?.spatialIndexed) return false;
    const removedRadius = Math.max(0, enemy.spatialRadius || 0);
    this.enemySpatialGrid.removeTracked(enemy);
    if (removedRadius >= (this.enemySpatialMaxRadius || 0)) this.recomputeEnemySpatialMaxRadius();
    return true;
  };

  EnemySystem.prototype.getActiveSpatialCellCount = function getActiveSpatialCellCount() {
    return this.enemySpatialGrid?.getActiveCellCount?.() ?? 0;
  };

  EnemySystem.prototype.getSpatialQueryPaddingRadius = function getSpatialQueryPaddingRadius() {
    return Math.max(0, this.enemySpatialMaxRadius || 0);
  };

  EnemySystem.prototype.queryEnemyCentersAabbXZ = function queryEnemyCentersAabbXZ(minX, maxX, minZ, maxZ, out = []) {
    this.ensureEnemySpatialState();
    const result = this.enemySpatialGrid.queryAabb(minX, maxX, minZ, maxZ, out);
    return this.recordEnemySpatialQuery(result, 'center');
  };

  EnemySystem.prototype.queryEnemyCentersCircleXZ = function queryEnemyCentersCircleXZ(x, z, radius, out = []) {
    this.ensureEnemySpatialState();
    const result = this.enemySpatialGrid.queryCircle(x, z, Math.max(0, radius || 0), out);
    return this.recordEnemySpatialQuery(result, 'center');
  };

  EnemySystem.prototype.queryEnemyBoundsAabbXZ = function queryEnemyBoundsAabbXZ(minX, maxX, minZ, maxZ, out = []) {
    this.ensureEnemySpatialState();
    const padding = Math.max(0, this.enemySpatialMaxRadius || 0);
    const result = this.enemySpatialGrid.queryAabb(minX - padding, maxX + padding, minZ - padding, maxZ + padding, out);
    return this.recordEnemySpatialQuery(result, 'bounds');
  };

  EnemySystem.prototype.queryEnemyBoundsCircleXZ = function queryEnemyBoundsCircleXZ(x, z, radius, out = []) {
    this.ensureEnemySpatialState();
    const padding = Math.max(0, this.enemySpatialMaxRadius || 0);
    const result = this.enemySpatialGrid.queryCircle(x, z, Math.max(0, radius || 0) + padding, out);
    return this.recordEnemySpatialQuery(result, 'bounds');
  };

  EnemySystem.prototype.queryEnemiesAabbXZ = function queryEnemiesAabbXZ(minX, maxX, minZ, maxZ, out = []) {
    return this.queryEnemyBoundsAabbXZ(minX, maxX, minZ, maxZ, out);
  };

  EnemySystem.prototype.queryEnemiesCircleXZ = function queryEnemiesCircleXZ(x, z, radius, out = []) {
    return this.queryEnemyBoundsCircleXZ(x, z, radius, out);
  };
}

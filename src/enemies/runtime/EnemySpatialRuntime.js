import { SpatialHashGrid2D } from '../../spatial/SpatialHashGrid2D.js';

const ENEMY_SPATIAL_GRID_CELL_SIZE = 24;

/**
 * Responsibility:
 * - Enemy 配列に対する broad-phase 近傍問い合わせを管理する。
 *
 * Rules:
 * - EntityStore は配列の truth source を持ち、この runtime は検索 index だけを持つ。
 * - enemy の生死判定や damage 判定はここへ移さない。
 * - 索引の rebuild 条件は EnemySystem 側の spawn / move / remove から明示的に通知する。
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
  };

  EnemySystem.prototype.resetEnemySpatialIndex = function resetEnemySpatialIndex() {
    this.ensureEnemySpatialState();
    this.enemySpatialGrid.clear();
    this.enemySpatialDirty = true;
    this.enemySpatialMaxRadius = 0;
    this.enemySpatialQueryScratch.length = 0;
  };

  EnemySystem.prototype.markSpatialDirty = function markSpatialDirty() {
    this.ensureEnemySpatialState();
    this.enemySpatialDirty = true;
  };

  EnemySystem.prototype.rebuildEnemySpatialIndex = function rebuildEnemySpatialIndex() {
    this.ensureEnemySpatialState();
    const perf = this.game?.debug?.getPerformanceMonitor?.();
    perf?.count?.('enemySpatialRebuilds', 1);
    this.enemySpatialGrid.clear();
    this.enemySpatialMaxRadius = 0;

    for (const enemy of this.game.store.enemies) {
      if (!enemy?.alive || enemy.mesh?.visible === false) continue;
      const radius = Math.max(0, enemy.radius ?? enemy.def?.radius ?? 0);
      enemy.spatialRadius = radius;
      if (radius > this.enemySpatialMaxRadius) this.enemySpatialMaxRadius = radius;
      enemy.spatialMinX = enemy.mesh.position.x - radius;
      enemy.spatialMaxX = enemy.mesh.position.x + radius;
      enemy.spatialMinZ = enemy.mesh.position.z - radius;
      enemy.spatialMaxZ = enemy.mesh.position.z + radius;
      this.enemySpatialGrid.insertAabb(enemy.spatialMinX, enemy.spatialMaxX, enemy.spatialMinZ, enemy.spatialMaxZ, enemy);
    }

    this.enemySpatialDirty = false;
    return this.enemySpatialGrid;
  };

  EnemySystem.prototype.ensureEnemySpatialIndex = function ensureEnemySpatialIndex() {
    this.ensureEnemySpatialState();
    if (this.enemySpatialDirty !== false) this.rebuildEnemySpatialIndex();
    return this.enemySpatialGrid;
  };

  EnemySystem.prototype.getActiveSpatialCellCount = function getActiveSpatialCellCount() {
    return this.enemySpatialGrid?.getActiveCellCount?.() ?? 0;
  };

  EnemySystem.prototype.getSpatialQueryPaddingRadius = function getSpatialQueryPaddingRadius() {
    return Math.max(0, this.enemySpatialMaxRadius || 0);
  };

  EnemySystem.prototype.queryEnemyCentersAabbXZ = function queryEnemyCentersAabbXZ(minX, maxX, minZ, maxZ, out = []) {
    this.ensureEnemySpatialIndex();
    const result = this.enemySpatialGrid.queryAabb(minX, maxX, minZ, maxZ, out);
    return this.recordEnemySpatialQuery(result, 'center');
  };

  EnemySystem.prototype.queryEnemyCentersCircleXZ = function queryEnemyCentersCircleXZ(x, z, radius, out = []) {
    this.ensureEnemySpatialIndex();
    const result = this.enemySpatialGrid.queryCircle(x, z, Math.max(0, radius || 0), out);
    return this.recordEnemySpatialQuery(result, 'center');
  };

  EnemySystem.prototype.queryEnemyBoundsAabbXZ = function queryEnemyBoundsAabbXZ(minX, maxX, minZ, maxZ, out = []) {
    this.ensureEnemySpatialIndex();
    const padding = Math.max(0, this.enemySpatialMaxRadius || 0);
    const result = this.enemySpatialGrid.queryAabb(minX - padding, maxX + padding, minZ - padding, maxZ + padding, out);
    return this.recordEnemySpatialQuery(result, 'bounds');
  };

  EnemySystem.prototype.queryEnemyBoundsCircleXZ = function queryEnemyBoundsCircleXZ(x, z, radius, out = []) {
    this.ensureEnemySpatialIndex();
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

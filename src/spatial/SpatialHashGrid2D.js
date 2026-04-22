const VISIT_STAMP = Symbol('spatialHashVisitStamp');

/**
 * Responsibility:
 * - XZ 平面の broad-phase 用セル分割を提供する汎用データ構造。
 *
 * Rules:
 * - ここにはゲーム固有ルールを入れない。
 * - 当たり判定の意味づけは呼び出し元が持ち、このモジュールは候補収集だけを担当する。
 * - item の alive 判定や damage 判定をここへ持ち込まない。
 */
export class SpatialHashGrid2D {
  constructor(cellSize = 24) {
    this.cellSize = Math.max(1, Number(cellSize) || 24);
    this.cells = new Map();
    this.queryStamp = 1;
  }

  clear() {
    this.cells.clear();
    this.queryStamp = 1;
  }

  getActiveCellCount() {
    return this.cells.size;
  }

  toCell(value) {
    return Math.floor(value / this.cellSize);
  }

  cellKey(cellX, cellZ) {
    return `${cellX}:${cellZ}`;
  }

  insertAabb(minX, maxX, minZ, maxZ, item) {
    if (!item) return;
    const startX = this.toCell(Math.min(minX, maxX));
    const endX = this.toCell(Math.max(minX, maxX));
    const startZ = this.toCell(Math.min(minZ, maxZ));
    const endZ = this.toCell(Math.max(minZ, maxZ));

    for (let cellZ = startZ; cellZ <= endZ; cellZ += 1) {
      for (let cellX = startX; cellX <= endX; cellX += 1) {
        const key = this.cellKey(cellX, cellZ);
        let bucket = this.cells.get(key);
        if (!bucket) {
          bucket = [];
          this.cells.set(key, bucket);
        }
        bucket.push(item);
      }
    }
  }

  insertTrackedAabb(item, minX, maxX, minZ, maxZ) {
    if (!item) return false;
    const startX = this.toCell(Math.min(minX, maxX));
    const endX = this.toCell(Math.max(minX, maxX));
    const startZ = this.toCell(Math.min(minZ, maxZ));
    const endZ = this.toCell(Math.max(minZ, maxZ));

    for (let cellZ = startZ; cellZ <= endZ; cellZ += 1) {
      for (let cellX = startX; cellX <= endX; cellX += 1) {
        const key = this.cellKey(cellX, cellZ);
        let bucket = this.cells.get(key);
        if (!bucket) {
          bucket = [];
          this.cells.set(key, bucket);
        }
        bucket.push(item);
      }
    }

    item.spatialCellMinX = startX;
    item.spatialCellMaxX = endX;
    item.spatialCellMinZ = startZ;
    item.spatialCellMaxZ = endZ;
    item.spatialIndexed = true;
    return true;
  }

  removeTracked(item) {
    if (!item?.spatialIndexed) return false;

    for (let cellZ = item.spatialCellMinZ; cellZ <= item.spatialCellMaxZ; cellZ += 1) {
      for (let cellX = item.spatialCellMinX; cellX <= item.spatialCellMaxX; cellX += 1) {
        const key = this.cellKey(cellX, cellZ);
        const bucket = this.cells.get(key);
        if (!bucket) continue;
        const index = bucket.indexOf(item);
        if (index >= 0) bucket.splice(index, 1);
        if (bucket.length === 0) this.cells.delete(key);
      }
    }

    item.spatialIndexed = false;
    return true;
  }

  updateTrackedAabb(item, minX, maxX, minZ, maxZ) {
    if (!item) return false;
    const nextMinCellX = this.toCell(Math.min(minX, maxX));
    const nextMaxCellX = this.toCell(Math.max(minX, maxX));
    const nextMinCellZ = this.toCell(Math.min(minZ, maxZ));
    const nextMaxCellZ = this.toCell(Math.max(minZ, maxZ));

    if (
      item.spatialIndexed
      && item.spatialCellMinX === nextMinCellX
      && item.spatialCellMaxX === nextMaxCellX
      && item.spatialCellMinZ === nextMinCellZ
      && item.spatialCellMaxZ === nextMaxCellZ
    ) {
      return false;
    }

    if (item.spatialIndexed) this.removeTracked(item);
    return this.insertTrackedAabb(item, minX, maxX, minZ, maxZ);
  }

  insertCircle(x, z, radius, item) {
    const r = Math.max(0, radius || 0);
    this.insertAabb(x - r, x + r, z - r, z + r, item);
  }

  queryAabb(minX, maxX, minZ, maxZ, out = []) {
    out.length = 0;
    const startX = this.toCell(Math.min(minX, maxX));
    const endX = this.toCell(Math.max(minX, maxX));
    const startZ = this.toCell(Math.min(minZ, maxZ));
    const endZ = this.toCell(Math.max(minZ, maxZ));
    const stamp = this.queryStamp++;

    for (let cellZ = startZ; cellZ <= endZ; cellZ += 1) {
      for (let cellX = startX; cellX <= endX; cellX += 1) {
        const bucket = this.cells.get(this.cellKey(cellX, cellZ));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i += 1) {
          const item = bucket[i];
          if (!item || item[VISIT_STAMP] === stamp) continue;
          item[VISIT_STAMP] = stamp;
          out.push(item);
        }
      }
    }
    return out;
  }

  queryCircle(x, z, radius, out = []) {
    const r = Math.max(0, radius || 0);
    return this.queryAabb(x - r, x + r, z - r, z + r, out);
  }
}

import { PLAYER_TRAVEL } from '../../data/balance.js';

/**
 * Responsibility:
 * - プレイヤー移動可能範囲の単一の正本。
 *
 * 更新ルール:
 * - プレイヤー専用の移動範囲判定はこのファイルに集約する。
 * - 敵や UI が同じ境界を参照してもよいが、プレイヤー仕様を utils 汎用層へ戻さない。
 */
export function resolvePlayerTravelBounds(point, padding = 0) {
  const limit = Math.max(0, PLAYER_TRAVEL.radius - padding);
  const min = -limit;
  const max = limit;
  const clampedX = Math.min(max, Math.max(min, point.x));
  const clampedZ = Math.min(max, Math.max(min, point.z));
  return {
    minX: min,
    maxX: max,
    minZ: min,
    maxZ: max,
    limit,
    clampedX,
    clampedZ,
    isInside: point.x === clampedX && point.z === clampedZ,
  };
}

export function clampPointToPlayerTravelBounds(point, padding = 0) {
  const bounds = resolvePlayerTravelBounds(point, padding);
  point.x = bounds.clampedX;
  point.z = bounds.clampedZ;
  return point;
}

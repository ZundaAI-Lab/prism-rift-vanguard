/**
 * Responsibility:
 * - player と静的障害物の縦方向オーバーラップ判定 gate を 1 箇所に集約する。
 *
 * Rules:
 * - collision / avoidance / debug が縦方向の通過条件を別実装で持たないこと。
 * - 「上を安全に通過できる高さ」と「十分離れているので無視できる高さ」はここを truth source とする。
 */
const PLAYER_VERTICAL_PASS_OVER_CLEARANCE = 0.2;
const PLAYER_VERTICAL_EXTRA_CLEARANCE = 2.8;

export function shouldSkipPlayerVerticalOverlap(playerHoverY, centerY, halfHeight) {
  const safeHalfHeight = Math.max(0.02, Number(halfHeight) || 0.02);
  if (playerHoverY >= centerY + safeHalfHeight + PLAYER_VERTICAL_PASS_OVER_CLEARANCE) return true;
  return Math.abs(playerHoverY - centerY) > safeHalfHeight + PLAYER_VERTICAL_EXTRA_CLEARANCE;
}

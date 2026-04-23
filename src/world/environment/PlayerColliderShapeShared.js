/**
 * Responsibility:
 * - player 用の静的コライダ shape 判定と、avoidance 用 disc 近似の共通 truth source を提供する。
 *
 * Rules:
 * - collision / avoidance / debug は shape 判定ロジックをここから共有する。
 * - avoidance は planner 本体を disc ベースのまま維持し、shape ごとの差はここで disc 群へ正規化する。
 * - 手書きの playerAvoidanceDiscs がある場合は、この自動生成よりそちらを優先する。
 */

const AUTO_OBB_MIN_SPACING = 0.8;
const AUTO_OBB_RADIUS_PAD = 1.05;
const AUTO_OBB_MAX_DISCS = 7;
const AUTO_RING_MIN_DISCS = 12;
const AUTO_RING_MAX_DISCS = 32;
const AUTO_RING_TARGET_SPACING = 1.8;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeDiscEntry(disc, fallbackRadius = 0.01, fallbackHalfHeight = null) {
  if (!disc) return null;
  const radius = Math.max(0.01, Number(disc.radius ?? fallbackRadius) || 0.01);
  const halfHeightSource = fallbackHalfHeight ?? radius;
  return {
    x: Number(disc.x) || 0,
    y: Number(disc.y) || 0,
    z: Number(disc.z) || 0,
    radius,
    halfHeight: Math.max(0.02, Number(disc.halfHeight ?? halfHeightSource) || halfHeightSource || 0.02),
  };
}

function cloneNormalizedDiscs(discs, fallbackRadius = 0.01, fallbackHalfHeight = null) {
  if (!Array.isArray(discs) || discs.length <= 0) return null;
  const normalized = [];
  for (let i = 0; i < discs.length; i += 1) {
    const disc = normalizeDiscEntry(discs[i], fallbackRadius, fallbackHalfHeight);
    if (!disc) continue;
    normalized.push(disc);
  }
  return normalized.length > 0 ? normalized : null;
}

export function getPlayerColliderModel(collider) {
  if (collider?.playerCollisionModel) return collider.playerCollisionModel;
  if (Array.isArray(collider?.playerCollisionDiscs) && collider.playerCollisionDiscs.length > 0) return 'compound';
  if (Number.isFinite(collider?.ringRadius) && Number.isFinite(collider?.tubeRadius)) return 'ring';
  if (collider?.localHalfExtents) return 'obb';
  return 'disc';
}

function buildDiscAvoidanceDiscs(collider) {
  const radius = Math.max(0.01, Number(collider?.radius) || 0.01);
  const halfHeight = Math.max(0.02, Number(collider?.halfHeight ?? collider?.verticalRadius ?? radius) || radius);
  return [{ x: 0, y: 0, z: 0, radius, halfHeight }];
}

function buildCompoundAvoidanceDiscs(collider) {
  return cloneNormalizedDiscs(collider?.playerCollisionDiscs, collider?.radius ?? 0.01, collider?.halfHeight ?? collider?.verticalRadius ?? null);
}

function buildObbAvoidanceDiscs(collider) {
  const half = collider?.localHalfExtents;
  if (!half) return buildDiscAvoidanceDiscs(collider);

  const halfX = Math.max(0.01, Number(half.x) || 0.01);
  const halfY = Math.max(0.02, Number(half.y ?? collider?.halfHeight ?? collider?.verticalRadius ?? 0.02) || 0.02);
  const halfZ = Math.max(0.01, Number(half.z) || 0.01);
  const useX = halfX >= halfZ;
  const halfLong = useX ? halfX : halfZ;
  const halfShort = useX ? halfZ : halfX;
  const centerSpan = Math.max(0, halfLong - halfShort);
  const radius = Math.max(0.05, halfShort * AUTO_OBB_RADIUS_PAD);
  const spacingBase = Math.max(halfShort * 1.6, AUTO_OBB_MIN_SPACING);
  const count = clamp(Math.ceil((centerSpan * 2) / spacingBase) + 1, 1, AUTO_OBB_MAX_DISCS);
  const discs = [];

  if (count === 1 || centerSpan <= 0.0001) {
    discs.push({ x: 0, y: 0, z: 0, radius, halfHeight: halfY });
    return discs;
  }

  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const offset = -centerSpan + centerSpan * 2 * t;
    discs.push({
      x: useX ? offset : 0,
      y: 0,
      z: useX ? 0 : offset,
      radius,
      halfHeight: halfY,
    });
  }
  return discs;
}

function buildRingAvoidanceDiscs(collider) {
  const ringRadius = Math.max(0.01, Number(collider?.ringRadius ?? collider?.radius) || 0.01);
  const tubeRadius = Math.max(0.01, Number(collider?.tubeRadius ?? 0.01) || 0.01);
  const circumference = Math.PI * 2 * ringRadius;
  const count = clamp(Math.ceil(circumference / AUTO_RING_TARGET_SPACING), AUTO_RING_MIN_DISCS, AUTO_RING_MAX_DISCS);
  const discs = [];
  for (let i = 0; i < count; i += 1) {
    const theta = (i / count) * Math.PI * 2;
    discs.push({
      x: Math.cos(theta) * ringRadius,
      y: Math.sin(theta) * ringRadius,
      z: 0,
      radius: tubeRadius,
      halfHeight: tubeRadius,
    });
  }
  return discs;
}

export function buildAutoPlayerAvoidanceDiscs(collider) {
  const model = getPlayerColliderModel(collider);
  if (model === 'compound') return buildCompoundAvoidanceDiscs(collider);
  if (model === 'obb') return buildObbAvoidanceDiscs(collider);
  if (model === 'ring') return buildRingAvoidanceDiscs(collider);
  return buildDiscAvoidanceDiscs(collider);
}

export function clonePlayerAvoidanceDiscs(discs, fallbackRadius = 0.01, fallbackHalfHeight = null) {
  return cloneNormalizedDiscs(discs, fallbackRadius, fallbackHalfHeight);
}

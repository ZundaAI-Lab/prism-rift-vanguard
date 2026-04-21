/**
 * Responsibility:
 * - world の静的コライダを、描画専用の軽い debug entry へ変換する。
 *
 * Rules:
 * - 描画ライブラリへ依存しない。
 * - world 側の内部表現をそのまま描画側へ渡さず、必要最小限へ射影する。
 * - 表示不要なコライダはここで除外する。
 */
export function buildStaticColliderDebugEntries(world) {
  const colliders = world?.staticColliders;
  if (!Array.isArray(colliders) || colliders.length <= 0) return [];

  const entries = [];
  for (let i = 0; i < colliders.length; i += 1) {
    const collider = colliders[i];
    if (!collider) continue;
    world?.refreshCollider?.(collider);
    const entry = toStaticColliderDebugEntry(collider);
    if (!entry) continue;
    entries.push(entry);
  }
  return entries;
}

export function toStaticColliderDebugEntry(collider) {
  if (!collider) return null;
  if (collider.blocksPlayer === false && collider.blocksProjectiles === false) return null;

  const radius = Math.max(0.01, Number(collider.radius) || 0.01);
  const halfHeight = Math.max(0.02, Number(collider.halfHeight ?? collider.verticalRadius ?? collider.radius) || 0.02);

  return {
    key: collider,
    x: Number(collider.x) || 0,
    y: Number(collider.y) || 0,
    z: Number(collider.z) || 0,
    radius,
    halfHeight,
    blocksPlayer: collider.blocksPlayer,
    blocksProjectiles: collider.blocksProjectiles,
  };
}

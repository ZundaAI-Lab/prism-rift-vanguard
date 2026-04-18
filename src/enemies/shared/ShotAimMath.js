/**
 * Responsibility:
 * - Enemy/Boss 共通の照準高さ補正と先読み時間計算を担当する。
 *
 * Rules:
 * - 呼び出し側から渡された一時ベクトルだけを使い、新規システム依存を持ち込まない。
 * - ここでは純粋なベクトル計算だけを行い、射撃パターン分岐は持たない。
 */
export function alignShotToPlayerHeight(origin, direction, playerPos, forwardOut, alignedOut) {
  if (!playerPos) return direction.clone().normalize();

  forwardOut.set(direction.x, 0, direction.z);
  if (forwardOut.lengthSq() < 0.000001) return direction.clone().normalize();
  forwardOut.normalize();

  const horizontalDistance = Math.max(1, Math.hypot(playerPos.x - origin.x, playerPos.z - origin.z));
  alignedOut.copy(forwardOut).multiplyScalar(horizontalDistance);
  alignedOut.y = playerPos.y - origin.y;
  if (alignedOut.lengthSq() < 0.000001) return direction.clone().normalize();
  return alignedOut.normalize();
}

export function writePlayerVelocity(playerState, out) {
  out.set(playerState?.vx ?? 0, 0, playerState?.vz ?? 0);
  return out;
}

export function solveLeadTime(origin, projectileSpeed, leadStrength, playerPos, playerVelocity, maxTime = 1.8) {
  if (!playerPos) return 0;

  const vx = playerVelocity.x * leadStrength;
  const vz = playerVelocity.z * leadStrength;
  const rx = playerPos.x - origin.x;
  const rz = playerPos.z - origin.z;

  const a = (vx * vx) + (vz * vz) - (projectileSpeed * projectileSpeed);
  const b = 2 * ((rx * vx) + (rz * vz));
  const c = (rx * rx) + (rz * rz);

  if (Math.abs(a) < 0.0001) {
    if (Math.abs(b) < 0.0001) return 0;
    const t = -c / b;
    return Number.isFinite(t) ? Math.max(0, Math.min(maxTime, t)) : 0;
  }

  const discriminant = (b * b) - (4 * a * c);
  if (discriminant < 0) return 0;

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  const candidates = [t1, t2].filter((value) => Number.isFinite(value) && value > 0.001);
  if (!candidates.length) return 0;
  return Math.max(0, Math.min(maxTime, Math.min(...candidates)));
}

/**
 * Responsibility:
 * - Simple collision primitives shared by projectile and pickup systems.
 *
 * Rules:
 * - Pure geometry only. No score changes, no entity removal.
 */
const SWEEP_SEGMENT = { x: 0, y: 0, z: 0 };
const SWEEP_TO_CENTER = { x: 0, y: 0, z: 0 };
const CAPSULE_AXIS_START = { x: 0, y: 0, z: 0 };
const CAPSULE_AXIS_END = { x: 0, y: 0, z: 0 };

const SEGMENT_D1 = { x: 0, y: 0, z: 0 };
const SEGMENT_D2 = { x: 0, y: 0, z: 0 };
const SEGMENT_R = { x: 0, y: 0, z: 0 };

const EPSILON = 0.0000001;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function closestPointOnSegment(point, start, end, out = null) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const lengthSq = (dx ** 2) + (dy ** 2) + (dz ** 2);
  let t = 0;
  if (lengthSq > EPSILON) {
    t = clamp01(((point.x - start.x) * dx + (point.y - start.y) * dy + (point.z - start.z) * dz) / lengthSq);
  }
  const x = start.x + dx * t;
  const y = start.y + dy * t;
  const z = start.z + dz * t;
  if (out?.set) out.set(x, y, z);
  return { x, y, z };
}

function closestPointsBetweenSegments(startA, endA, startB, endB, outA = null, outB = null) {
  SEGMENT_D1.x = endA.x - startA.x;
  SEGMENT_D1.y = endA.y - startA.y;
  SEGMENT_D1.z = endA.z - startA.z;
  SEGMENT_D2.x = endB.x - startB.x;
  SEGMENT_D2.y = endB.y - startB.y;
  SEGMENT_D2.z = endB.z - startB.z;
  SEGMENT_R.x = startA.x - startB.x;
  SEGMENT_R.y = startA.y - startB.y;
  SEGMENT_R.z = startA.z - startB.z;

  const a = SEGMENT_D1.x ** 2 + SEGMENT_D1.y ** 2 + SEGMENT_D1.z ** 2;
  const e = SEGMENT_D2.x ** 2 + SEGMENT_D2.y ** 2 + SEGMENT_D2.z ** 2;
  const f = SEGMENT_D2.x * SEGMENT_R.x + SEGMENT_D2.y * SEGMENT_R.y + SEGMENT_D2.z * SEGMENT_R.z;

  let s = 0;
  let t = 0;

  if (a <= EPSILON && e <= EPSILON) {
    // both degenerate to points
  } else if (a <= EPSILON) {
    t = clamp01(f / e);
  } else {
    const c = SEGMENT_D1.x * SEGMENT_R.x + SEGMENT_D1.y * SEGMENT_R.y + SEGMENT_D1.z * SEGMENT_R.z;
    if (e <= EPSILON) {
      s = clamp01(-c / a);
    } else {
      const b = SEGMENT_D1.x * SEGMENT_D2.x + SEGMENT_D1.y * SEGMENT_D2.y + SEGMENT_D1.z * SEGMENT_D2.z;
      const denom = a * e - b * b;
      if (Math.abs(denom) > EPSILON) s = clamp01((b * f - c * e) / denom);
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }

  const ax = startA.x + SEGMENT_D1.x * s;
  const ay = startA.y + SEGMENT_D1.y * s;
  const az = startA.z + SEGMENT_D1.z * s;
  const bx = startB.x + SEGMENT_D2.x * t;
  const by = startB.y + SEGMENT_D2.y * t;
  const bz = startB.z + SEGMENT_D2.z * t;

  if (outA?.set) outA.set(ax, ay, az);
  if (outB?.set) outB.set(bx, by, bz);

  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return (dx ** 2) + (dy ** 2) + (dz ** 2);
}

export class CollisionSystem {
  sphereHit(aPos, aRadius, bPos, bRadius) {
    return aPos.distanceToSquared(bPos) <= (aRadius + bRadius) ** 2;
  }

  sweptSphereHit(startPos, endPos, movingRadius, targetPos, targetRadius, outPoint = null) {
    const combinedRadius = Math.max(0, movingRadius || 0) + Math.max(0, targetRadius || 0);
    if (combinedRadius <= 0) return false;

    SWEEP_SEGMENT.x = endPos.x - startPos.x;
    SWEEP_SEGMENT.y = endPos.y - startPos.y;
    SWEEP_SEGMENT.z = endPos.z - startPos.z;

    const segmentLengthSq = (SWEEP_SEGMENT.x ** 2) + (SWEEP_SEGMENT.y ** 2) + (SWEEP_SEGMENT.z ** 2);
    if (segmentLengthSq <= EPSILON) {
      if (!this.sphereHit(startPos, movingRadius, targetPos, targetRadius)) return false;
      if (outPoint?.copy) outPoint.copy(startPos);
      return true;
    }

    SWEEP_TO_CENTER.x = targetPos.x - startPos.x;
    SWEEP_TO_CENTER.y = targetPos.y - startPos.y;
    SWEEP_TO_CENTER.z = targetPos.z - startPos.z;

    const t = Math.max(0, Math.min(1, ((SWEEP_TO_CENTER.x * SWEEP_SEGMENT.x) + (SWEEP_TO_CENTER.y * SWEEP_SEGMENT.y) + (SWEEP_TO_CENTER.z * SWEEP_SEGMENT.z)) / segmentLengthSq));
    const closestX = startPos.x + SWEEP_SEGMENT.x * t;
    const closestY = startPos.y + SWEEP_SEGMENT.y * t;
    const closestZ = startPos.z + SWEEP_SEGMENT.z * t;
    const dx = targetPos.x - closestX;
    const dy = targetPos.y - closestY;
    const dz = targetPos.z - closestZ;
    const hit = ((dx ** 2) + (dy ** 2) + (dz ** 2)) <= combinedRadius ** 2;
    if (!hit) return false;

    if (outPoint?.set) outPoint.set(closestX, closestY, closestZ);
    return true;
  }

  sphereVsVerticalCapsuleHit(sphereCenter, sphereRadius, capsuleCenter, capsuleRadius, capsuleHalfHeight = 0, outCapsulePoint = null) {
    const safeHalfHeight = Math.max(0, capsuleHalfHeight || 0);
    if (safeHalfHeight <= EPSILON) {
      const hit = this.sphereHit(sphereCenter, sphereRadius, capsuleCenter, capsuleRadius);
      if (hit && outCapsulePoint?.copy) outCapsulePoint.copy(capsuleCenter);
      return hit;
    }

    CAPSULE_AXIS_START.x = capsuleCenter.x;
    CAPSULE_AXIS_START.y = capsuleCenter.y - safeHalfHeight;
    CAPSULE_AXIS_START.z = capsuleCenter.z;
    CAPSULE_AXIS_END.x = capsuleCenter.x;
    CAPSULE_AXIS_END.y = capsuleCenter.y + safeHalfHeight;
    CAPSULE_AXIS_END.z = capsuleCenter.z;
    const closest = closestPointOnSegment(sphereCenter, CAPSULE_AXIS_START, CAPSULE_AXIS_END, outCapsulePoint);
    const dx = sphereCenter.x - closest.x;
    const dy = sphereCenter.y - closest.y;
    const dz = sphereCenter.z - closest.z;
    const combinedRadius = Math.max(0, sphereRadius || 0) + Math.max(0, capsuleRadius || 0);
    return ((dx ** 2) + (dy ** 2) + (dz ** 2)) <= combinedRadius ** 2;
  }

  sweptSphereVsVerticalCapsuleHit(startPos, endPos, movingRadius, capsuleCenter, capsuleRadius, capsuleHalfHeight = 0, outPoint = null) {
    const safeHalfHeight = Math.max(0, capsuleHalfHeight || 0);
    if (safeHalfHeight <= EPSILON) {
      return this.sweptSphereHit(startPos, endPos, movingRadius, capsuleCenter, capsuleRadius, outPoint);
    }

    CAPSULE_AXIS_START.x = capsuleCenter.x;
    CAPSULE_AXIS_START.y = capsuleCenter.y - safeHalfHeight;
    CAPSULE_AXIS_START.z = capsuleCenter.z;
    CAPSULE_AXIS_END.x = capsuleCenter.x;
    CAPSULE_AXIS_END.y = capsuleCenter.y + safeHalfHeight;
    CAPSULE_AXIS_END.z = capsuleCenter.z;

    const distanceSq = closestPointsBetweenSegments(startPos, endPos, CAPSULE_AXIS_START, CAPSULE_AXIS_END, outPoint, null);
    const combinedRadius = Math.max(0, movingRadius || 0) + Math.max(0, capsuleRadius || 0);
    return distanceSq <= combinedRadius ** 2;
  }


  sphereVsVerticalCylinderHit(sphereCenter, sphereRadius, cylinderCenter, cylinderRadius, cylinderHalfHeight = 0, outCylinderPoint = null) {
    const safeHalfHeight = Math.max(0, cylinderHalfHeight || 0);
    const safeRadius = Math.max(0, cylinderRadius || 0);
    const closestY = safeHalfHeight > EPSILON
      ? Math.max(cylinderCenter.y - safeHalfHeight, Math.min(cylinderCenter.y + safeHalfHeight, sphereCenter.y))
      : cylinderCenter.y;
    const dx = sphereCenter.x - cylinderCenter.x;
    const dz = sphereCenter.z - cylinderCenter.z;
    const planarLengthSq = (dx ** 2) + (dz ** 2);
    if (outCylinderPoint?.set) {
      if (planarLengthSq > EPSILON && safeRadius > 0) {
        const planarLength = Math.sqrt(planarLengthSq);
        const planarScale = Math.min(1, safeRadius / planarLength);
        outCylinderPoint.set(cylinderCenter.x + dx * planarScale, closestY, cylinderCenter.z + dz * planarScale);
      } else {
        outCylinderPoint.set(cylinderCenter.x, closestY, cylinderCenter.z);
      }
    }

    const verticalDist = Math.max(0, Math.abs(sphereCenter.y - cylinderCenter.y) - safeHalfHeight);
    const planarDist = Math.max(0, Math.sqrt(planarLengthSq) - safeRadius);
    const safeSphereRadius = Math.max(0, sphereRadius || 0);
    return ((planarDist ** 2) + (verticalDist ** 2)) <= safeSphereRadius ** 2;
  }

  sweptSphereVsVerticalCylinderHit(startPos, endPos, movingRadius, cylinderCenter, cylinderRadius, cylinderHalfHeight = 0, outPoint = null) {
    if (this.sphereVsVerticalCylinderHit(endPos, movingRadius, cylinderCenter, cylinderRadius, cylinderHalfHeight, outPoint)) return true;

    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const dz = endPos.z - startPos.z;
    const distance = Math.sqrt((dx ** 2) + (dy ** 2) + (dz ** 2));
    const safeRadius = Math.max(0, movingRadius || 0);
    const stepSize = Math.max(0.6, safeRadius * 0.35);
    const steps = Math.max(2, Math.min(12, Math.ceil(distance / stepSize)));

    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      SWEEP_SEGMENT.x = startPos.x + dx * t;
      SWEEP_SEGMENT.y = startPos.y + dy * t;
      SWEEP_SEGMENT.z = startPos.z + dz * t;
      if (this.sphereVsVerticalCylinderHit(SWEEP_SEGMENT, safeRadius, cylinderCenter, cylinderRadius, cylinderHalfHeight, outPoint)) return true;
    }

    return this.sphereVsVerticalCylinderHit(startPos, safeRadius, cylinderCenter, cylinderRadius, cylinderHalfHeight, outPoint);
  }

  pointSphereEdgeDistance(point, center, radius) {
    return Math.max(0, point.distanceTo(center) - Math.max(0, radius || 0));
  }

  pointVerticalCapsuleEdgeDistance(point, capsuleCenter, capsuleRadius, capsuleHalfHeight = 0) {
    const safeHalfHeight = Math.max(0, capsuleHalfHeight || 0);
    if (safeHalfHeight <= EPSILON) return this.pointSphereEdgeDistance(point, capsuleCenter, capsuleRadius);
    CAPSULE_AXIS_START.x = capsuleCenter.x;
    CAPSULE_AXIS_START.y = capsuleCenter.y - safeHalfHeight;
    CAPSULE_AXIS_START.z = capsuleCenter.z;
    CAPSULE_AXIS_END.x = capsuleCenter.x;
    CAPSULE_AXIS_END.y = capsuleCenter.y + safeHalfHeight;
    CAPSULE_AXIS_END.z = capsuleCenter.z;
    const closest = closestPointOnSegment(point, CAPSULE_AXIS_START, CAPSULE_AXIS_END, null);
    const dx = point.x - closest.x;
    const dy = point.y - closest.y;
    const dz = point.z - closest.z;
    return Math.max(0, Math.sqrt((dx ** 2) + (dy ** 2) + (dz ** 2)) - Math.max(0, capsuleRadius || 0));
  }
}

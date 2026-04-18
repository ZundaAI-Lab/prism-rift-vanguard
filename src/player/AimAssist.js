import * as THREE from 'three';

const TO_TARGET = new THREE.Vector3();
const FLAT_FORWARD = new THREE.Vector3();
const FLAT_TO_TARGET = new THREE.Vector3();
const CLUSTER_DELTA = new THREE.Vector3();
const CLUSTER_SUM = new THREE.Vector3();
const CLUSTER_CENTER = new THREE.Vector3();

const MAX_HOMING_LEVEL = 5;
const PRIMARY_VERTICAL_LOCK = {
  baseMin: 4.5,
  baseMax: 18,
  launchMin: 5.5,
  launchMax: 20,
  wideMin: 6.0,
  wideMax: 24,
  scoreWeightMin: 0.018,
  scoreWeightMax: 0.06,
};
const PLASMA_VERTICAL_SCORE = {
  min: 0.012,
  max: 0.035,
};

function getHomingLevelFactor(homing = 0, homingLevel = null) {
  if (Number.isFinite(homingLevel)) return THREE.MathUtils.clamp(homingLevel / MAX_HOMING_LEVEL, 0, 1);
  return THREE.MathUtils.clamp(homing ?? 0, 0, 1);
}

/**
 * Responsibility:
 * - Selects aim-assist targets for player projectiles.
 *
 * Rules:
 * - Read-only against enemy entities.
 * - Never apply damage or spawn projectiles here.
 * - Target scoring must stay stable across refactors so shot feel does not drift.
 */
export class AimAssist {
  constructor(game) {
    this.game = game;
  }

  getPrimaryLockWindow(homing = 0, { launch = false, allowWideRetarget = false, homingLevel = null } = {}) {
    const assist = THREE.MathUtils.clamp(homing ?? 0, 0, 1);
    const verticalAssist = getHomingLevelFactor(homing, homingLevel);
    if (launch) {
      return {
        maxDistance: THREE.MathUtils.lerp(44, 138, assist),
        minAlignment: THREE.MathUtils.lerp(0.992, 0.72, assist),
        maxLateralError: THREE.MathUtils.lerp(2.4, 24, assist),
        maxVerticalError: THREE.MathUtils.lerp(PRIMARY_VERTICAL_LOCK.launchMin, PRIMARY_VERTICAL_LOCK.launchMax, verticalAssist),
        verticalWeight: THREE.MathUtils.lerp(PRIMARY_VERTICAL_LOCK.scoreWeightMin, PRIMARY_VERTICAL_LOCK.scoreWeightMax, verticalAssist),
      };
    }
    if (allowWideRetarget) {
      return {
        maxDistance: THREE.MathUtils.lerp(56, 182, assist),
        minAlignment: THREE.MathUtils.lerp(0.985, 0.56, assist),
        maxLateralError: THREE.MathUtils.lerp(3.4, 34, assist),
        maxVerticalError: THREE.MathUtils.lerp(PRIMARY_VERTICAL_LOCK.wideMin, PRIMARY_VERTICAL_LOCK.wideMax, verticalAssist),
        verticalWeight: THREE.MathUtils.lerp(PRIMARY_VERTICAL_LOCK.scoreWeightMin, PRIMARY_VERTICAL_LOCK.scoreWeightMax, verticalAssist),
      };
    }
    return {
      maxDistance: THREE.MathUtils.lerp(50, 152, assist),
      minAlignment: THREE.MathUtils.lerp(0.988, 0.64, assist),
      maxLateralError: THREE.MathUtils.lerp(2.8, 28, assist),
      maxVerticalError: THREE.MathUtils.lerp(PRIMARY_VERTICAL_LOCK.baseMin, PRIMARY_VERTICAL_LOCK.baseMax, verticalAssist),
      verticalWeight: THREE.MathUtils.lerp(PRIMARY_VERTICAL_LOCK.scoreWeightMin, PRIMARY_VERTICAL_LOCK.scoreWeightMax, verticalAssist),
    };
  }

  getPlasmaLockWindow(homing = 0, { allowWideRetarget = false, homingLevel = null } = {}) {
    const assist = THREE.MathUtils.clamp(homing ?? 0, 0, 1);
    const verticalAssist = getHomingLevelFactor(homing, homingLevel);
    if (allowWideRetarget) {
      return {
        maxDistance: THREE.MathUtils.lerp(92, 196, assist),
        minAlignment: THREE.MathUtils.lerp(0.72, 0.08, assist),
        maxLateralError: THREE.MathUtils.lerp(18, 124, assist),
        verticalWeight: THREE.MathUtils.lerp(PLASMA_VERTICAL_SCORE.min, PLASMA_VERTICAL_SCORE.max, verticalAssist),
      };
    }
    return {
      maxDistance: THREE.MathUtils.lerp(84, 168, assist),
      minAlignment: THREE.MathUtils.lerp(0.78, 0.2, assist),
      maxLateralError: THREE.MathUtils.lerp(14, 92, assist),
      verticalWeight: THREE.MathUtils.lerp(PLASMA_VERTICAL_SCORE.min, PLASMA_VERTICAL_SCORE.max, verticalAssist),
    };
  }

  findTarget(origin, forward, maxDistance = 120, {
    minAlignment = 0.78,
    maxLateralError = 14,
    maxVerticalError = Infinity,
    lateralWeight = 2.2,
    verticalWeight = PRIMARY_VERTICAL_LOCK.scoreWeightMin,
    distanceWeight = 0.14,
    alignmentWeight = 16,
    excludeSet = null,
  } = {}) {
    FLAT_FORWARD.set(forward.x, 0, forward.z);
    const hasPlanarForward = FLAT_FORWARD.lengthSq() >= 0.000001;
    if (hasPlanarForward) FLAT_FORWARD.normalize();

    const perf = this.game.debug?.getPerformanceMonitor?.();
    perf?.count?.('aimAssistQueries', 1);
    let candidateCount = 0;
    let best = null;
    let bestScore = Infinity;
    const frameView = this.game.enemies.getEnemyFrameView();
    const entries = frameView.entries;

    for (let i = 0; i < frameView.count; i += 1) {
      const entry = entries[i];
      const enemy = entry.enemy;
      if (!enemy.alive || enemy.mesh.visible === false) continue;
      if (excludeSet?.has(enemy)) continue;
      TO_TARGET.set(entry.x - origin.x, entry.y - origin.y, entry.z - origin.z);
      const distance = TO_TARGET.length();
      if (distance < 2 || distance > maxDistance) continue;

      const verticalError = Math.abs(TO_TARGET.y);
      if (verticalError > maxVerticalError) continue;

      FLAT_TO_TARGET.set(TO_TARGET.x, 0, TO_TARGET.z);
      const planarDistance = FLAT_TO_TARGET.length();
      let alignment = 1;
      let lateralError = 0;

      if (hasPlanarForward && planarDistance > 0.001) {
        FLAT_TO_TARGET.multiplyScalar(1 / planarDistance);
        alignment = FLAT_FORWARD.dot(FLAT_TO_TARGET);
        if (alignment < minAlignment) continue;

        const forwardDistance = planarDistance * alignment;
        lateralError = Math.sqrt(Math.max(0, planarDistance * planarDistance - forwardDistance * forwardDistance));
      } else {
        const dirToEnemy = TO_TARGET.clone().normalize();
        alignment = forward.dot(dirToEnemy);
        if (alignment < minAlignment) continue;
        lateralError = Math.sqrt(Math.max(0, 1 - alignment * alignment)) * distance;
      }

      if (lateralError > maxLateralError) continue;

      const bossBias = entry.isBoss ? -8 : 0;
      const score = lateralError * lateralWeight + verticalError * verticalWeight + distance * distanceWeight - alignment * alignmentWeight + bossBias;
      candidateCount += 1;
      if (score < bestScore) {
        bestScore = score;
        best = enemy;
      }
    }

    perf?.sample?.('aimAssistCandidates', candidateCount);
    return best;
  }

  collectForwardPriorityTargets(origin, forward, {
    maxDistance = 132,
    minAlignment = 0.5,
    maxLateralError = Infinity,
    verticalWeight = PLASMA_VERTICAL_SCORE.min,
    excludeSet = null,
  } = {}) {
    FLAT_FORWARD.set(forward.x, 0, forward.z);
    if (FLAT_FORWARD.lengthSq() < 0.000001) return [];
    FLAT_FORWARD.normalize();

    const perf = this.game.debug?.getPerformanceMonitor?.();
    perf?.count?.('aimAssistQueries', 1);
    const candidates = [];
    const frameView = this.game.enemies.getEnemyFrameView();
    const entries = frameView.entries;
    for (let i = 0; i < frameView.count; i += 1) {
      const entry = entries[i];
      const enemy = entry.enemy;
      if (!enemy.alive || enemy.mesh.visible === false) continue;
      if (excludeSet?.has(enemy)) continue;
      TO_TARGET.set(entry.x - origin.x, entry.y - origin.y, entry.z - origin.z);
      const distance = TO_TARGET.length();
      if (distance < 2 || distance > maxDistance) continue;

      FLAT_TO_TARGET.set(TO_TARGET.x, 0, TO_TARGET.z);
      const planarDistance = FLAT_TO_TARGET.length();
      if (planarDistance < 0.001) continue;
      FLAT_TO_TARGET.normalize();

      const alignment = FLAT_FORWARD.dot(FLAT_TO_TARGET);
      if (alignment < minAlignment) continue;

      const forwardDistance = planarDistance * alignment;
      const lateralError = Math.sqrt(Math.max(0, planarDistance * planarDistance - forwardDistance * forwardDistance));
      if (Number.isFinite(maxLateralError) && lateralError > maxLateralError) continue;

      const verticalError = Math.abs(entry.y - origin.y);
      const bossBias = entry.isBoss ? -1.2 : 0;
      const score = planarDistance * 1.2 + distance * 0.08 + lateralError * 0.22 + verticalError * verticalWeight - alignment * 4.5 + bossBias;
      candidates.push({ enemy, score });
    }

    candidates.sort((a, b) => a.score - b.score);
    perf?.sample?.('aimAssistCandidates', candidates.length);
    return candidates;
  }

  findForwardPriorityTarget(origin, forward, options = {}) {
    return this.collectForwardPriorityTargets(origin, forward, options)[0]?.enemy ?? null;
  }

  findPlasmaVolleyTargets(origin, forward, {
    shotCount = 1,
    maxDistance = 132,
    minAlignment = 0.5,
    maxLateralError = Infinity,
  } = {}) {
    const candidates = this.collectForwardPriorityTargets(origin, forward, {
      maxDistance,
      minAlignment,
      maxLateralError,
    });
    if (!candidates.length || shotCount <= 0) return [];

    const primary = candidates[0]?.enemy ?? null;
    if (primary?.def?.isBoss) return Array.from({ length: shotCount }, () => primary);

    const uniqueNonBoss = [];
    for (const candidate of candidates) {
      if (candidate.enemy.def?.isBoss) continue;
      if (!uniqueNonBoss.includes(candidate.enemy)) uniqueNonBoss.push(candidate.enemy);
      if (uniqueNonBoss.length >= shotCount) break;
    }

    if (!uniqueNonBoss.length) return Array.from({ length: shotCount }, () => primary);

    const assigned = [];
    for (let i = 0; i < shotCount; i += 1) {
      assigned.push(uniqueNonBoss[i % uniqueNonBoss.length]);
    }
    return assigned;
  }

  findPlasmaClusterTarget(origin, forward, {
    maxDistance = 132,
    minAlignment = 0.5,
    maxLateralError = 58,
    clusterRadius = 16,
    excludeSet = null,
  } = {}) {
    FLAT_FORWARD.set(forward.x, 0, forward.z);
    if (FLAT_FORWARD.lengthSq() < 0.000001) return null;
    FLAT_FORWARD.normalize();

    const perf = this.game.debug?.getPerformanceMonitor?.();
    perf?.count?.('aimAssistQueries', 1);
    const candidates = [];
    const frameView = this.game.enemies.getEnemyFrameView();
    const entries = frameView.entries;
    for (let i = 0; i < frameView.count; i += 1) {
      const entry = entries[i];
      const enemy = entry.enemy;
      if (!enemy.alive || enemy.mesh.visible === false) continue;
      if (excludeSet?.has(enemy)) continue;

      TO_TARGET.set(entry.x - origin.x, entry.y - origin.y, entry.z - origin.z);
      const distance = TO_TARGET.length();
      if (distance < 2 || distance > maxDistance) continue;

      FLAT_TO_TARGET.set(TO_TARGET.x, 0, TO_TARGET.z);
      const planarDistance = FLAT_TO_TARGET.length();
      if (planarDistance < 0.001) continue;
      FLAT_TO_TARGET.normalize();

      const alignment = FLAT_FORWARD.dot(FLAT_TO_TARGET);
      if (alignment < minAlignment) continue;

      const forwardDistance = planarDistance * alignment;
      const lateralError = Math.sqrt(Math.max(0, planarDistance * planarDistance - forwardDistance * forwardDistance));
      if (Number.isFinite(maxLateralError) && lateralError > maxLateralError) continue;

      candidates.push({ enemy, x: entry.x, y: entry.y, z: entry.z, isBoss: entry.isBoss, distance, planarDistance, alignment, lateralError });
    }

    perf?.sample?.('aimAssistCandidates', candidates.length);
    if (!candidates.length) return null;

    let best = null;
    let bestScore = -Infinity;

    for (const center of candidates) {
      CLUSTER_SUM.set(0, 0, 0);
      CLUSTER_CENTER.set(center.x, center.y, center.z);
      let totalWeight = 0;
      let memberCount = 0;
      let representative = center.enemy;
      let representativeScore = Infinity;
      let hasBoss = center.isBoss ? 1 : 0;

      for (const candidate of candidates) {
        CLUSTER_DELTA.set(candidate.x, candidate.y, candidate.z).sub(CLUSTER_CENTER);
        const planarDelta = Math.hypot(CLUSTER_DELTA.x, CLUSTER_DELTA.z);
        if (planarDelta > clusterRadius) continue;

        const bossWeight = candidate.isBoss ? 1.8 : 1.0;
        const proximityWeight = 1.0 + (1.0 - planarDelta / Math.max(0.001, clusterRadius)) * 0.9;
        const weight = bossWeight * proximityWeight;
        totalWeight += weight;
        memberCount += 1;
        if (candidate.isBoss) hasBoss = 1;
        CLUSTER_SUM.addScaledVector(CLUSTER_DELTA.add(CLUSTER_CENTER), weight);

        const clusterFit = planarDelta * 0.7 + candidate.distance * 0.08;
        if (clusterFit < representativeScore || (candidate.isBoss && !(representative.isBoss ?? representative.def?.isBoss))) {
          representativeScore = clusterFit;
          representative = candidate.enemy;
        }
      }

      if (memberCount <= 0 || totalWeight <= 0) continue;

      CLUSTER_SUM.multiplyScalar(1 / totalWeight);
      const score = totalWeight * 24 + memberCount * 16 - center.planarDistance * 0.18 - center.lateralError * 0.42 + center.alignment * 7 + hasBoss * 12;
      if (score > bestScore) {
        bestScore = score;
        best = {
          target: representative,
          point: CLUSTER_SUM.clone(),
          members: memberCount,
          score,
        };
      }
    }

    return best;
  }

  bendDirection(origin, direction, homing = 0, homingLevel = null) {
    const lockWindow = this.getPrimaryLockWindow(homing, { launch: true, homingLevel });
    return {
      direction,
      target: this.findTarget(origin, direction, lockWindow.maxDistance, {
        minAlignment: lockWindow.minAlignment,
        maxLateralError: lockWindow.maxLateralError,
        maxVerticalError: lockWindow.maxVerticalError,
        verticalWeight: lockWindow.verticalWeight,
      }),
    };
  }
}

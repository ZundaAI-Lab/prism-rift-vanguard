import * as THREE from 'three';
import { PLAYER_TRAVEL } from '../../data/balance.js';

export const CURRENT_DIR = new THREE.Vector3();
export const PREDICTED = new THREE.Vector3();
export const DESIRED = new THREE.Vector3();
export const REFLECT_NORMAL = new THREE.Vector3();
export const PREVIOUS_PROJECTILE_POS = new THREE.Vector3();
export const HIT_POINT = new THREE.Vector3();
export const UP = new THREE.Vector3(0, 1, 0);
export const VIEW_PROJECTION = new THREE.Matrix4();
export const CAMERA_FRUSTUM = new THREE.Frustum();
export const FRUSTUM_SPHERE = new THREE.Sphere();
export const MAX_HOMING_LEVEL = 5;
export const PRIMARY_VERTICAL_STEER = {
  minAtLv0: 1.0,
  minAtMax: 1.08,
  maxAtLv0: 1.05,
  maxAtMax: 1.42,
};
export const PRIMARY_VERTICAL_TURN_BOOST = {
  minAtLv0: 0.0,
  minAtMax: 0.25,
  maxAtLv0: 0.45,
  maxAtMax: 2.2,
};
export const PLASMA_VERTICAL_STEER = {
  minAtLv0: 1.0,
  minAtMax: 1.06,
  maxAtLv0: 1.04,
  maxAtMax: 1.26,
};
export const PLASMA_VERTICAL_TURN_BOOST = {
  minAtLv0: 0.0,
  minAtMax: 0.15,
  maxAtLv0: 0.2,
  maxAtMax: 1.3,
};
export const PROJECTILE_CULL_PADDING = 90;
export const PROJECTILE_CULL_LIMIT = PLAYER_TRAVEL.radius + PROJECTILE_CULL_PADDING;
export const WAVE_END_PROJECTILE_FADE_DURATION = 0.28;

const TARGET_SHAPE_VECTOR = new THREE.Vector3();
const ENEMY_HIT_CENTER = new THREE.Vector3();

export function getEnemyHitRadius(enemy) {
  return Math.max(0, enemy?.radius ?? enemy?.def?.collisionRadius ?? enemy?.def?.radius ?? 0);
}

export function getEnemyHitHalfHeight(enemy) {
  return Math.max(0, enemy?.collisionHalfHeight ?? enemy?.def?.collisionHalfHeight ?? 0);
}

export function getEnemyHitShape(enemy) {
  const shape = enemy?.collisionShape ?? enemy?.def?.collisionShape ?? 'sphere';
  if (shape === 'capsule' && getEnemyHitHalfHeight(enemy) > 0) return 'capsule';
  if (shape === 'cylinder' && getEnemyHitHalfHeight(enemy) > 0) return 'cylinder';
  return 'sphere';
}

export function getEnemyHitCenter(enemy, center = enemy?.mesh?.position, out = new THREE.Vector3()) {
  const source = center ?? enemy?.mesh?.position;
  if (!source) return out.set(0, 0, 0);
  const yOffset = enemy?.collisionCenterYOffset ?? enemy?.def?.collisionCenterYOffset ?? 0;
  return out.set(source.x, source.y + yOffset, source.z);
}

export function getClosestPointOnTargetSphere(origin, center, radius = 0, out = new THREE.Vector3()) {
  out.copy(center);
  const safeRadius = Math.max(0, radius || 0);
  if (safeRadius <= 0) return out;

  TARGET_SHAPE_VECTOR.copy(origin).sub(center);
  const lengthSq = TARGET_SHAPE_VECTOR.lengthSq();
  if (lengthSq <= 0.000001) return out;

  TARGET_SHAPE_VECTOR.multiplyScalar(safeRadius / Math.sqrt(lengthSq));
  return out.add(TARGET_SHAPE_VECTOR);
}

export function getClosestPointOnVerticalCapsule(origin, center, radius = 0, halfHeight = 0, out = new THREE.Vector3()) {
  const safeHalfHeight = Math.max(0, halfHeight || 0);
  if (safeHalfHeight <= 0.000001) return getClosestPointOnTargetSphere(origin, center, radius, out);
  out.set(center.x, THREE.MathUtils.clamp(origin.y, center.y - safeHalfHeight, center.y + safeHalfHeight), center.z);
  const safeRadius = Math.max(0, radius || 0);
  if (safeRadius <= 0) return out;

  TARGET_SHAPE_VECTOR.copy(origin).sub(out);
  const lengthSq = TARGET_SHAPE_VECTOR.lengthSq();
  if (lengthSq <= 0.000001) return out;

  TARGET_SHAPE_VECTOR.multiplyScalar(safeRadius / Math.sqrt(lengthSq));
  return out.add(TARGET_SHAPE_VECTOR);
}

export function getClosestPointOnVerticalCylinder(origin, center, radius = 0, halfHeight = 0, out = new THREE.Vector3()) {
  const safeHalfHeight = Math.max(0, halfHeight || 0);
  const safeRadius = Math.max(0, radius || 0);
  out.set(center.x, THREE.MathUtils.clamp(origin.y, center.y - safeHalfHeight, center.y + safeHalfHeight), center.z);
  if (safeRadius <= 0) return out;

  TARGET_SHAPE_VECTOR.set(origin.x - center.x, 0, origin.z - center.z);
  const planarLengthSq = TARGET_SHAPE_VECTOR.x * TARGET_SHAPE_VECTOR.x + TARGET_SHAPE_VECTOR.z * TARGET_SHAPE_VECTOR.z;
  if (planarLengthSq <= 0.000001) return out;

  const planarLength = Math.sqrt(planarLengthSq);
  const scale = Math.min(1, safeRadius / planarLength);
  out.x = center.x + TARGET_SHAPE_VECTOR.x * scale;
  out.z = center.z + TARGET_SHAPE_VECTOR.z * scale;
  return out;
}

export function getClosestPointOnEnemyHitShape(origin, enemy, center = enemy?.mesh?.position, out = new THREE.Vector3()) {
  const shape = getEnemyHitShape(enemy);
  const hitCenter = getEnemyHitCenter(enemy, center, ENEMY_HIT_CENTER);
  if (shape === 'capsule') {
    return getClosestPointOnVerticalCapsule(origin, hitCenter, getEnemyHitRadius(enemy), getEnemyHitHalfHeight(enemy), out);
  }
  if (shape === 'cylinder') {
    return getClosestPointOnVerticalCylinder(origin, hitCenter, getEnemyHitRadius(enemy), getEnemyHitHalfHeight(enemy), out);
  }
  return getClosestPointOnTargetSphere(origin, hitCenter, getEnemyHitRadius(enemy), out);
}
export const PLAYER_CORE_GEOMETRY = new THREE.SphereGeometry(1, 12, 12);
PLAYER_CORE_GEOMETRY.userData.shared = true;
export const PLAYER_PLASMA_GEOMETRY = new THREE.IcosahedronGeometry(1, 2);
PLAYER_PLASMA_GEOMETRY.userData.shared = true;
export const HALO_GEOMETRY = new THREE.SphereGeometry(1, 12, 12);
HALO_GEOMETRY.userData.shared = true;
export const RING_GEOMETRY = new THREE.TorusGeometry(1, 0.15, 8, 28);
RING_GEOMETRY.userData.shared = true;

export const PROJECTILE_VISUAL_FAMILY = Object.freeze({
  playerPrimary: 'playerPrimary',
  playerPlasma: 'playerPlasma',
  enemyBullet: 'enemyBullet',
  enemyShowBullet: 'enemyShowBullet',
  enemyMine: 'enemyMine',
});

export const PROJECTILE_VISUAL_LAYER = Object.freeze({
  core: 'core',
  halo: 'halo',
  ring: 'ring',
});

export const PROJECTILE_VISUAL_CAPACITY = Object.freeze({
  [PROJECTILE_VISUAL_FAMILY.playerPrimary]: 96,
  [PROJECTILE_VISUAL_FAMILY.playerPlasma]: 32,
  [PROJECTILE_VISUAL_FAMILY.enemyBullet]: 768,
  [PROJECTILE_VISUAL_FAMILY.enemyShowBullet]: 384,
  [PROJECTILE_VISUAL_FAMILY.enemyMine]: 256,
});

/**
 * Responsibility:
 * - Shared projectile constants and visual family descriptors.
 *
 * Rules:
 * - Projectile gameplay keeps using projectile.mesh as a logic anchor only.
 * - Visible bullet rendering is grouped by visual family/layer so draw count scales with bullet types, not bullet count.
 * - Family additions start here so geometry/material sharing does not drift between the factory and the batch renderer.
 */
export const PROJECTILE_VISUAL_LAYER_CONFIG = Object.freeze({
  [PROJECTILE_VISUAL_FAMILY.playerPrimary]: {
    [PROJECTILE_VISUAL_LAYER.core]: {
      kind: 'core',
      geometry: PLAYER_CORE_GEOMETRY,
      renderOrder: 3,
      materialParams: { roughness: 0.18, metalness: 0.15 },
    },
    [PROJECTILE_VISUAL_LAYER.halo]: {
      kind: 'halo',
      geometry: HALO_GEOMETRY,
      renderOrder: 4,
      materialParams: { blending: THREE.AdditiveBlending },
    },
  },
  [PROJECTILE_VISUAL_FAMILY.playerPlasma]: {
    [PROJECTILE_VISUAL_LAYER.core]: {
      kind: 'core',
      geometry: PLAYER_PLASMA_GEOMETRY,
      renderOrder: 3,
      materialParams: { roughness: 0.18, metalness: 0.15 },
    },
    [PROJECTILE_VISUAL_LAYER.halo]: {
      kind: 'halo',
      geometry: HALO_GEOMETRY,
      renderOrder: 4,
      materialParams: { blending: THREE.AdditiveBlending },
    },
  },
  [PROJECTILE_VISUAL_FAMILY.enemyBullet]: {
    [PROJECTILE_VISUAL_LAYER.core]: {
      kind: 'core',
      geometry: PLAYER_CORE_GEOMETRY,
      renderOrder: 3,
      materialParams: { roughness: 0.18, metalness: 0.15 },
    },
    [PROJECTILE_VISUAL_LAYER.halo]: {
      kind: 'halo',
      geometry: HALO_GEOMETRY,
      renderOrder: 4,
      materialParams: { blending: THREE.AdditiveBlending },
    },
    [PROJECTILE_VISUAL_LAYER.ring]: {
      kind: 'ring',
      geometry: RING_GEOMETRY,
      renderOrder: 5,
      materialParams: { blending: THREE.AdditiveBlending },
    },
  },
  [PROJECTILE_VISUAL_FAMILY.enemyShowBullet]: {
    [PROJECTILE_VISUAL_LAYER.core]: {
      kind: 'core',
      geometry: PLAYER_CORE_GEOMETRY,
      renderOrder: 3,
      materialParams: { roughness: 0.18, metalness: 0.15 },
    },
    [PROJECTILE_VISUAL_LAYER.halo]: {
      kind: 'halo',
      geometry: HALO_GEOMETRY,
      renderOrder: 4,
      materialParams: { blending: THREE.AdditiveBlending },
    },
    [PROJECTILE_VISUAL_LAYER.ring]: {
      kind: 'ring',
      geometry: RING_GEOMETRY,
      renderOrder: 5,
      materialParams: { blending: THREE.AdditiveBlending },
    },
  },
  [PROJECTILE_VISUAL_FAMILY.enemyMine]: {
    [PROJECTILE_VISUAL_LAYER.core]: {
      kind: 'core',
      geometry: PLAYER_CORE_GEOMETRY,
      renderOrder: 3,
      materialParams: { roughness: 0.1, metalness: 0.08 },
    },
    [PROJECTILE_VISUAL_LAYER.halo]: {
      kind: 'halo',
      geometry: HALO_GEOMETRY,
      renderOrder: 4,
      materialParams: { blending: THREE.NormalBlending },
    },
    [PROJECTILE_VISUAL_LAYER.ring]: {
      kind: 'ring',
      geometry: RING_GEOMETRY,
      renderOrder: 5,
      materialParams: { blending: THREE.NormalBlending },
    },
  },
});

export function getHomingLevelFactor(projectile) {
  if (Number.isFinite(projectile?.homingLevel)) return THREE.MathUtils.clamp(projectile.homingLevel / MAX_HOMING_LEVEL, 0, 1);
  return THREE.MathUtils.clamp(projectile?.homing ?? 0, 0, 1);
}

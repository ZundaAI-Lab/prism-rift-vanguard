import * as THREE from 'three';
import { getPlayerColliderModel } from './PlayerColliderShapeShared.js';

const DEBUG_WORLD_POINT = new THREE.Vector3();

/**
 * Responsibility:
 * - world の静的コライダを、描画専用の軽い debug entry へ変換する。
 *
 * Rules:
 * - world 側の内部表現をそのまま描画側へ渡さず、必要最小限へ射影する。
 * - 表示不要なコライダはここで除外する。
 * - shape 判定は shared helper を使い、collision / avoidance と解釈をずらさない。
 */
export function buildStaticColliderDebugEntries(world) {
  const colliders = world?.staticColliders;
  if (!Array.isArray(colliders) || colliders.length <= 0) return [];

  const entries = [];
  for (let i = 0; i < colliders.length; i += 1) {
    const collider = colliders[i];
    if (!collider) continue;
    world?.refreshCollider?.(collider);
    const colliderEntries = toStaticColliderDebugEntries(collider);
    if (!Array.isArray(colliderEntries) || colliderEntries.length <= 0) continue;
    entries.push(...colliderEntries);
  }
  return entries;
}

export function toStaticColliderDebugEntries(collider) {
  if (!collider) return [];
  if (collider.blocksPlayer === false && collider.blocksProjectiles === false) return [];

  const model = getDebugShapeModel(collider);
  if (model === 'compound') return createCompoundEntries(collider);
  if (model === 'obb') return [createObbEntry(collider)];
  if (model === 'ring') return [createRingEntry(collider)];
  return [createCylinderEntry(collider)];
}

function getDebugShapeModel(collider) {
  return getPlayerColliderModel(collider);
}

function createBaseEntry(collider, key) {
  return {
    key,
    blocksPlayer: collider.blocksPlayer,
    blocksProjectiles: collider.blocksProjectiles,
  };
}

function getQuaternionArray(collider) {
  const quat = collider?.worldQuaternion;
  if (quat) return [quat.x, quat.y, quat.z, quat.w];
  return [0, 0, 0, 1];
}

function createCylinderEntry(collider) {
  return {
    ...createBaseEntry(collider, `static:${collider.orderIndex ?? 0}`),
    shape: 'cylinder',
    x: Number(collider.x) || 0,
    y: Number(collider.y) || 0,
    z: Number(collider.z) || 0,
    radius: Math.max(0.01, Number(collider.radius) || 0.01),
    halfHeight: Math.max(0.02, Number(collider.halfHeight ?? collider.verticalRadius ?? collider.radius) || 0.02),
  };
}

function createObbEntry(collider) {
  const half = collider.localHalfExtents;
  return {
    ...createBaseEntry(collider, `static:${collider.orderIndex ?? 0}`),
    shape: 'box',
    x: Number(collider.x) || 0,
    y: Number(collider.y) || 0,
    z: Number(collider.z) || 0,
    quaternion: getQuaternionArray(collider),
    halfExtents: {
      x: Math.max(0.01, Number(half?.x) || 0.01),
      y: Math.max(0.02, Number(half?.y) || 0.02),
      z: Math.max(0.01, Number(half?.z) || 0.01),
    },
  };
}

function createRingEntry(collider) {
  return {
    ...createBaseEntry(collider, `static:${collider.orderIndex ?? 0}`),
    shape: 'ring',
    x: Number(collider.x) || 0,
    y: Number(collider.y) || 0,
    z: Number(collider.z) || 0,
    quaternion: getQuaternionArray(collider),
    ringRadius: Math.max(0.01, Number(collider.ringRadius ?? collider.radius) || 0.01),
    tubeRadius: Math.max(0.01, Number(collider.tubeRadius) || 0.01),
  };
}

function createCompoundEntries(collider) {
  const discs = Array.isArray(collider.playerCollisionDiscs) ? collider.playerCollisionDiscs : [];
  const matrixWorld = collider.matrixWorldStatic ?? collider.source?.matrixWorld ?? null;
  const entries = [];
  for (let i = 0; i < discs.length; i += 1) {
    const disc = discs[i];
    if (!disc) continue;
    if (matrixWorld) {
      DEBUG_WORLD_POINT.set(disc.x ?? 0, disc.y ?? 0, disc.z ?? 0).applyMatrix4(matrixWorld);
    } else {
      DEBUG_WORLD_POINT.set(
        (collider.x ?? 0) + (disc.x ?? 0),
        (collider.y ?? 0) + (disc.y ?? 0),
        (collider.z ?? 0) + (disc.z ?? 0),
      );
    }
    entries.push({
      ...createBaseEntry(collider, `static:${collider.orderIndex ?? 0}:compound:${i}`),
      shape: 'cylinder',
      x: DEBUG_WORLD_POINT.x,
      y: DEBUG_WORLD_POINT.y,
      z: DEBUG_WORLD_POINT.z,
      radius: Math.max(0.01, Number(disc.radius) || 0.01),
      halfHeight: Math.max(0.02, Number(disc.halfHeight ?? disc.radius) || 0.02),
    });
  }
  return entries;
}

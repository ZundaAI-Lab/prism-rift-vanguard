import * as THREE from 'three';

const STATIC_COLLIDER_DEBUG_CYLINDER_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 20, 1, false);
STATIC_COLLIDER_DEBUG_CYLINDER_GEOMETRY.userData.shared = true;

const STATIC_COLLIDER_DEBUG_BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
STATIC_COLLIDER_DEBUG_BOX_GEOMETRY.userData.shared = true;

const STATIC_COLLIDER_PLAYER_DEBUG_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xff8be8,
  wireframe: true,
  transparent: true,
  opacity: 0.7,
  depthWrite: false,
  depthTest: false,
  toneMapped: false,
});
STATIC_COLLIDER_PLAYER_DEBUG_MATERIAL.userData.shared = true;

const STATIC_COLLIDER_PROJECTILE_DEBUG_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xffcf6f,
  wireframe: true,
  transparent: true,
  opacity: 0.66,
  depthWrite: false,
  depthTest: false,
  toneMapped: false,
});
STATIC_COLLIDER_PROJECTILE_DEBUG_MATERIAL.userData.shared = true;

const STATIC_COLLIDER_MISC_DEBUG_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xa6ffd8,
  wireframe: true,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
  depthTest: false,
  toneMapped: false,
});
STATIC_COLLIDER_MISC_DEBUG_MATERIAL.userData.shared = true;

function createStaticColliderDebugMesh(geometry, material, shape) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'StaticColliderDebug';
  mesh.visible = false;
  mesh.renderOrder = 999;
  mesh.frustumCulled = false;
  mesh.userData.shape = shape;
  return mesh;
}

/**
 * Responsibility:
 * - 静的コライダのデバッグ可視化メッシュを生成・再利用・破棄する。
 * - Three.js 依存の描画実装をここへ閉じ込める。
 *
 * Rules:
 * - 入力はデバッグ表示用 entry のみ受け取り、game / world へ直接依存しない。
 * - shared geometry / material はここでのみ所有し、呼び出し側へ漏らさない。
 * - 表示対象の増減は key ベースで差分同期する。
 */
export class StaticColliderOverlayRenderer {
  constructor(parentGroup) {
    this.parentGroup = parentGroup ?? null;
    this.group = new THREE.Group();
    this.group.name = 'StaticColliderDebugGroup';
    this.group.visible = false;
    this.meshes = new Map();
    this.torusGeometryCache = new Map();
    if (this.parentGroup) {
      this.parentGroup.add(this.group);
    }
  }

  setVisible(visible) {
    this.group.visible = !!visible;
  }

  sync(entries = []) {
    const activeKeys = new Set();
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (!entry?.key) continue;
      const mesh = this.ensureMesh(entry);
      this.applyEntry(mesh, entry);
      activeKeys.add(entry.key);
    }
    this.pruneUnused(activeKeys);
  }

  clear() {
    for (const mesh of this.meshes.values()) {
      mesh.removeFromParent();
    }
    this.meshes.clear();
  }

  dispose() {
    this.clear();
    for (const geometry of this.torusGeometryCache.values()) geometry.dispose();
    this.torusGeometryCache.clear();
    this.group.removeFromParent();
    this.parentGroup = null;
  }

  ensureMesh(entry) {
    let mesh = this.meshes.get(entry.key);
    const desiredShape = entry.shape ?? 'cylinder';
    if (!mesh || mesh.userData.shape !== desiredShape || (desiredShape === 'ring' && mesh.userData.geometryKey !== this.getRingGeometryKey(entry))) {
      if (mesh) mesh.removeFromParent();
      mesh = this.createMeshForEntry(entry);
      this.meshes.set(entry.key, mesh);
      this.group.add(mesh);
    }
    mesh.material = this.pickMaterial(entry);
    return mesh;
  }

  createMeshForEntry(entry) {
    const shape = entry.shape ?? 'cylinder';
    let geometry = STATIC_COLLIDER_DEBUG_CYLINDER_GEOMETRY;
    if (shape === 'box') geometry = STATIC_COLLIDER_DEBUG_BOX_GEOMETRY;
    else if (shape === 'ring') geometry = this.getRingGeometry(entry);
    const mesh = createStaticColliderDebugMesh(geometry, this.pickMaterial(entry), shape);
    if (shape === 'ring') mesh.userData.geometryKey = this.getRingGeometryKey(entry);
    return mesh;
  }

  getRingGeometryKey(entry) {
    return `${Number(entry.ringRadius ?? 0).toFixed(3)}:${Number(entry.tubeRadius ?? 0).toFixed(3)}`;
  }

  getRingGeometry(entry) {
    const key = this.getRingGeometryKey(entry);
    let geometry = this.torusGeometryCache.get(key);
    if (!geometry) {
      geometry = new THREE.TorusGeometry(entry.ringRadius ?? 1, entry.tubeRadius ?? 0.1, 10, 48);
      geometry.userData.shared = true;
      this.torusGeometryCache.set(key, geometry);
    }
    return geometry;
  }

  pickMaterial(entry) {
    if (entry?.blocksPlayer !== false) return STATIC_COLLIDER_PLAYER_DEBUG_MATERIAL;
    if (entry?.blocksProjectiles !== false) return STATIC_COLLIDER_PROJECTILE_DEBUG_MATERIAL;
    return STATIC_COLLIDER_MISC_DEBUG_MATERIAL;
  }

  applyEntry(mesh, entry) {
    const quaternion = entry.quaternion ?? [0, 0, 0, 1];
    mesh.position.set(entry.x ?? 0, entry.y ?? 0, entry.z ?? 0);
    mesh.quaternion.set(quaternion[0] ?? 0, quaternion[1] ?? 0, quaternion[2] ?? 0, quaternion[3] ?? 1);

    if (entry.shape === 'box') {
      const half = entry.halfExtents ?? { x: 0.01, y: 0.02, z: 0.01 };
      mesh.scale.set(Math.max(half.x * 2, 0.02), Math.max(half.y * 2, 0.04), Math.max(half.z * 2, 0.02));
    } else if (entry.shape === 'ring') {
      mesh.scale.set(1, 1, 1);
    } else {
      mesh.scale.set(entry.radius ?? 0.01, Math.max((entry.halfHeight ?? 0.02) * 2, 0.04), entry.radius ?? 0.01);
    }
    mesh.visible = true;
  }

  pruneUnused(activeKeys) {
    for (const [key, mesh] of this.meshes) {
      if (activeKeys.has(key)) continue;
      mesh.removeFromParent();
      this.meshes.delete(key);
    }
  }
}

import * as THREE from 'three';

const STATIC_COLLIDER_DEBUG_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 20, 1, false);
STATIC_COLLIDER_DEBUG_GEOMETRY.userData.shared = true;

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

function createStaticColliderDebugMesh(material) {
  const mesh = new THREE.Mesh(STATIC_COLLIDER_DEBUG_GEOMETRY, material);
  mesh.name = 'StaticColliderDebug';
  mesh.visible = false;
  mesh.renderOrder = 999;
  mesh.frustumCulled = false;
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
    this.group.removeFromParent();
    this.parentGroup = null;
  }

  ensureMesh(entry) {
    let mesh = this.meshes.get(entry.key);
    if (!mesh) {
      mesh = createStaticColliderDebugMesh(this.pickMaterial(entry));
      this.meshes.set(entry.key, mesh);
      this.group.add(mesh);
    }
    mesh.material = this.pickMaterial(entry);
    return mesh;
  }

  pickMaterial(entry) {
    if (entry?.blocksPlayer !== false) return STATIC_COLLIDER_PLAYER_DEBUG_MATERIAL;
    if (entry?.blocksProjectiles !== false) return STATIC_COLLIDER_PROJECTILE_DEBUG_MATERIAL;
    return STATIC_COLLIDER_MISC_DEBUG_MATERIAL;
  }

  applyEntry(mesh, entry) {
    mesh.position.set(entry.x ?? 0, entry.y ?? 0, entry.z ?? 0);
    mesh.scale.set(entry.radius ?? 0.01, Math.max((entry.halfHeight ?? 0.02) * 2, 0.04), entry.radius ?? 0.01);
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

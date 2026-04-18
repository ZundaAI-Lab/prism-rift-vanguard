import * as THREE from 'three';

export const ENEMY_MODEL_SIZE_MULTIPLIER = Object.freeze({
  trainingTarget: 1.15,
  forgeCube: 2.0,
  mortar: 1.5,
  glacier: 2.0,
  whiteout: 1.5,
  watcher: 2.0,
  reflector: 1.5,
  urchin: 1.5,
  coralKnight: 2.0,
});

export function createEnemyMeshContext(def) {
  const group = new THREE.Group();
  const mainMaterial = new THREE.MeshStandardMaterial({
    color: def.color,
    emissive: def.accent,
    emissiveIntensity: def.isBoss ? 1.25 : 1.05,
    roughness: 0.24,
    metalness: 0.72,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8ffff,
    emissive: def.color,
    emissiveIntensity: def.isBoss ? 1.1 : 0.9,
    roughness: 0.08,
    metalness: 0.25,
  });
  const modelSize = ENEMY_MODEL_SIZE_MULTIPLIER[def.mesh] ?? 1;

  const addHalo = (size = 2.2, thickness = 0.08, color = def.accent, opacity = def.isBoss ? 0.42 : 0.26) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(size * modelSize, thickness * modelSize, 10, 36),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity }),
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  };

  const createBakedMesh = (geometry, material, {
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    bakedYaw = 0,
  } = {}) => {
    const bakedGeometry = geometry.clone();
    const localMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    if (bakedYaw !== 0) {
      const bakeMatrix = new THREE.Matrix4().makeRotationY(bakedYaw);
      bakedGeometry.applyMatrix4(bakeMatrix.multiply(localMatrix));
    } else {
      bakedGeometry.applyMatrix4(localMatrix);
    }
    return new THREE.Mesh(bakedGeometry, material);
  };

  const createForwardTriPyramidGeometry = (length = 3.0, rearWidth = 1.2, rearHeight = 1.0) => {
    const halfLength = length * 0.5;
    const rearZ = -halfLength;
    const apexZ = halfLength;
    const positions = new Float32Array([
      0, 0, apexZ,
      -rearWidth * 0.55, rearHeight * 0.62, rearZ,
      -rearWidth * 0.55, -rearHeight * 0.62, rearZ,

      0, 0, apexZ,
      rearWidth, 0, rearZ,
      -rearWidth * 0.55, rearHeight * 0.62, rearZ,

      0, 0, apexZ,
      -rearWidth * 0.55, -rearHeight * 0.62, rearZ,
      rearWidth, 0, rearZ,

      -rearWidth * 0.55, rearHeight * 0.62, rearZ,
      rearWidth, 0, rearZ,
      -rearWidth * 0.55, -rearHeight * 0.62, rearZ,
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  };

  return {
    THREE,
    def,
    group,
    mainMaterial,
    accentMaterial,
    modelSize,
    addHalo,
    createBakedMesh,
    createForwardTriPyramidGeometry,
  };
}

export function finalizeEnemyMesh(ctx) {
  const { THREE, def, group, modelSize } = ctx;
  if (!def.isBoss) {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(def.radius * 0.92 * modelSize, 0.05 * modelSize, 6, 28),
      new THREE.MeshBasicMaterial({ color: def.accent, transparent: true, opacity: 0.18 }),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.35 * modelSize;
    group.add(halo);
  }
  return group;
}

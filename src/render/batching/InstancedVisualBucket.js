import * as THREE from 'three';

const TMP_MATRIX = new THREE.Matrix4();
const TMP_QUATERNION = new THREE.Quaternion();
const TMP_EULER = new THREE.Euler();
const TMP_SCALE = new THREE.Vector3();
const DEFAULT_POSITION = new THREE.Vector3();
const DEFAULT_COLOR = new THREE.Color(0xffffff);
const DEFAULT_SCALE = new THREE.Vector3(1, 1, 1);

function copyRange(target, fromOffset, toOffset, length) {
  for (let i = 0; i < length; i += 1) target[toOffset + i] = target[fromOffset + i];
}

function patchMaterialForInstanceOpacity(baseMaterial) {
  const material = baseMaterial.clone();
  material.transparent = true;
  material.vertexColors = true;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nattribute float instanceOpacity;\nvarying float vInstanceOpacity;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvInstanceOpacity = instanceOpacity;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nvarying float vInstanceOpacity;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      'diffuseColor.a *= vInstanceOpacity;\n#include <opaque_fragment>',
    );
  };
  material.customProgramCacheKey = () => `instanced-opacity-${baseMaterial.type}-${baseMaterial.blending}-${baseMaterial.depthWrite ? 1 : 0}`;
  material.needsUpdate = true;
  return material;
}

/**
 * Responsibility:
 * - Dense instancing pool used by the hot-path batch renderers.
 *
 * Rules:
 * - Handles are dense and may be slot-swapped on release. Callers must treat the returned handle as the
 *   authoritative slot owner and never cache the numeric slot separately.
 * - Per-instance opacity is supported here so gameplay systems can keep their fade logic without going back
 *   to one-mesh-per-entity rendering.
 * - If allocate() returns null, the caller must skip gameplay entity creation itself. Do not fall back to an
 *   invisible logic-only entity when the visual batch is full.
 * - This pool owns the cloned geometry/material pair. Do not pass its mesh into detachAndDispose(); release
 *   instances through the owning batch renderer instead.
 */
export class InstancedVisualBucket {
  constructor({ group, geometry, material, capacity, renderOrder = 0, castShadow = false, receiveShadow = false }) {
    this.group = group;
    this.capacity = Math.max(1, Math.floor(capacity || 1));
    this.handles = new Array(this.capacity).fill(null);
    this.activeCount = 0;
    this.dirtyMatrix = false;
    this.dirtyColor = false;
    this.dirtyOpacity = false;

    const instancedGeometry = geometry.clone();
    const instancedMaterial = patchMaterialForInstanceOpacity(material);
    this.mesh = new THREE.InstancedMesh(instancedGeometry, instancedMaterial, this.capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 3), 3);
    this.mesh.geometry.setAttribute('instanceColor', this.mesh.instanceColor);
    this.opacityAttribute = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity), 1);
    this.mesh.geometry.setAttribute('instanceOpacity', this.opacityAttribute);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder;
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = receiveShadow;
    this.mesh.count = 0;
    this.group.add(this.mesh);
  }

  allocate(meta = null) {
    // Common batched-visual contract: null means the caller must abandon spawning the owning gameplay entity.
    if (this.activeCount >= this.capacity) return null;
    const handle = {
      bucket: this,
      slot: this.activeCount,
      meta,
    };
    this.handles[this.activeCount] = handle;
    this.activeCount += 1;
    this.mesh.count = this.activeCount;
    return handle;
  }

  sync(handle, state = {}) {
    if (!handle || handle.bucket !== this || handle.slot < 0 || handle.slot >= this.activeCount) return false;
    const slot = handle.slot;
    const matrixOffset = slot * 16;
    const colorOffset = slot * 3;
    const scale = state.scale?.isVector3
      ? state.scale
      : (Number.isFinite(state.scaleScalar)
        ? TMP_SCALE.setScalar(state.scaleScalar)
        : DEFAULT_SCALE);
    const quaternion = state.quaternion?.isQuaternion
      ? state.quaternion
      : TMP_QUATERNION.setFromEuler(state.rotation?.isEuler ? state.rotation : TMP_EULER.set(0, 0, 0));
    const position = state.position?.isVector3 ? state.position : DEFAULT_POSITION;

    TMP_MATRIX.compose(position, quaternion, scale);
    TMP_MATRIX.toArray(this.mesh.instanceMatrix.array, matrixOffset);
    this.dirtyMatrix = true;

    const color = state.color?.isColor ? state.color : DEFAULT_COLOR;
    this.mesh.instanceColor.array[colorOffset] = color.r;
    this.mesh.instanceColor.array[colorOffset + 1] = color.g;
    this.mesh.instanceColor.array[colorOffset + 2] = color.b;
    this.dirtyColor = true;

    const opacity = state.visible === false ? 0 : THREE.MathUtils.clamp(state.opacity ?? 1, 0, 1);
    this.opacityAttribute.array[slot] = opacity;
    this.dirtyOpacity = true;
    return true;
  }

  release(handle) {
    if (!handle || handle.bucket !== this || handle.slot < 0 || handle.slot >= this.activeCount) return false;
    const slot = handle.slot;
    const last = this.activeCount - 1;
    if (slot !== last) {
      copyRange(this.mesh.instanceMatrix.array, last * 16, slot * 16, 16);
      copyRange(this.mesh.instanceColor.array, last * 3, slot * 3, 3);
      this.opacityAttribute.array[slot] = this.opacityAttribute.array[last];
      const movedHandle = this.handles[last];
      this.handles[slot] = movedHandle;
      if (movedHandle) movedHandle.slot = slot;
    }
    this.handles[last] = null;
    handle.slot = -1;
    handle.bucket = null;
    this.activeCount -= 1;
    this.mesh.count = this.activeCount;
    this.dirtyMatrix = true;
    this.dirtyColor = true;
    this.dirtyOpacity = true;
    return true;
  }

  clear() {
    for (let i = 0; i < this.activeCount; i += 1) {
      const handle = this.handles[i];
      if (handle) {
        handle.slot = -1;
        handle.bucket = null;
      }
      this.handles[i] = null;
    }
    this.activeCount = 0;
    this.mesh.count = 0;
    this.dirtyMatrix = true;
    this.dirtyColor = true;
    this.dirtyOpacity = true;
  }

  commitFrame() {
    if (this.dirtyMatrix) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.dirtyMatrix = false;
    }
    if (this.dirtyColor) {
      this.mesh.instanceColor.needsUpdate = true;
      this.dirtyColor = false;
    }
    if (this.dirtyOpacity) {
      this.opacityAttribute.needsUpdate = true;
      this.dirtyOpacity = false;
    }
  }

  dispose() {
    this.group?.remove?.(this.mesh);
    this.mesh.geometry?.dispose?.();
    this.mesh.material?.dispose?.();
  }
}

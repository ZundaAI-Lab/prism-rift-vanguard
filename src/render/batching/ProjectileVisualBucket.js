import * as THREE from 'three';

const TMP_MATRIX = new THREE.Matrix4();
const ZERO_SCALE = new THREE.Vector3(0, 0, 0);
const DEFAULT_POSITION = new THREE.Vector3();
const DEFAULT_QUATERNION = new THREE.Quaternion();
const DEFAULT_SCALE = new THREE.Vector3(1, 1, 1);
const DEFAULT_COLOR = new THREE.Color(0xffffff);

/**
 * Responsibility:
 * - One family/layer instanced bucket for projectile visuals.
 *
 * Rules:
 * - Slots are stable. Gameplay stores the returned slot handle and never needs swap-fixups when bullets die.
 * - Inactive slots are written with zero scale so the renderer can keep stable indices without one draw per projectile.
 * - Per-instance tint uses Three's instanceColor; opacity/glow are separate instanced attributes patched into the material.
 * - If allocateSlot() returns -1, the family allocation must fail and the caller must skip gameplay entity
 *   creation instead of spawning a logic-only projectile.
 */
export class ProjectileVisualBucket {
  constructor({ group, geometry, material, capacity, renderOrder = 0 }) {
    this.group = group;
    this.capacity = Math.max(1, Math.floor(capacity || 1));
    this.nextSlot = 0;
    this.freeList = [];
    this.occupied = new Array(this.capacity).fill(false);
    this.highestUsedSlot = 0;
    this.dirtyMatrix = false;
    this.dirtyColor = false;
    this.dirtyAttributes = false;

    this.mesh = new THREE.InstancedMesh(geometry.clone(), material, this.capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 3), 3);
    this.mesh.geometry.setAttribute('instanceColor', this.mesh.instanceColor);
    this.opacityAttribute = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity), 1);
    this.glowAttribute = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity), 1);
    this.opacityAttribute.setUsage(THREE.DynamicDrawUsage);
    this.glowAttribute.setUsage(THREE.DynamicDrawUsage);
    this.mesh.geometry.setAttribute('instanceOpacity', this.opacityAttribute);
    this.mesh.geometry.setAttribute('instanceGlow', this.glowAttribute);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder;
    this.mesh.count = 0;
    this.group.add(this.mesh);

    for (let i = 0; i < this.capacity; i += 1) this.writeHidden(i);
    this.commitFrame();
  }

  allocateSlot() {
    // -1 means the owning family cannot allocate a complete visual set and spawn must be skipped entirely.
    let slot = this.freeList.length > 0 ? this.freeList.pop() : this.nextSlot;
    if (slot >= this.capacity) return -1;
    if (slot === this.nextSlot) this.nextSlot += 1;
    this.occupied[slot] = true;
    this.highestUsedSlot = Math.max(this.highestUsedSlot, slot + 1);
    this.mesh.count = this.highestUsedSlot;
    return slot;
  }

  freeSlot(slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= this.capacity || !this.occupied[slot]) return false;
    this.occupied[slot] = false;
    this.freeList.push(slot);
    this.writeHidden(slot);
    while (this.highestUsedSlot > 0 && !this.occupied[this.highestUsedSlot - 1]) this.highestUsedSlot -= 1;
    this.mesh.count = this.highestUsedSlot;
    return true;
  }

  writeHidden(slot) {
    TMP_MATRIX.compose(DEFAULT_POSITION, DEFAULT_QUATERNION, ZERO_SCALE);
    this.mesh.setMatrixAt(slot, TMP_MATRIX);
    this.mesh.instanceColor.array[(slot * 3)] = 1;
    this.mesh.instanceColor.array[(slot * 3) + 1] = 1;
    this.mesh.instanceColor.array[(slot * 3) + 2] = 1;
    this.opacityAttribute.array[slot] = 0;
    this.glowAttribute.array[slot] = 1;
    this.dirtyMatrix = true;
    this.dirtyColor = true;
    this.dirtyAttributes = true;
  }

  writeSlot(slot, state = {}) {
    if (!this.occupied[slot]) return false;
    const position = state.position?.isVector3 ? state.position : DEFAULT_POSITION;
    const quaternion = state.quaternion?.isQuaternion ? state.quaternion : DEFAULT_QUATERNION;
    const scale = state.scale?.isVector3 ? state.scale : DEFAULT_SCALE;
    TMP_MATRIX.compose(position, quaternion, scale);
    this.mesh.setMatrixAt(slot, TMP_MATRIX);
    this.dirtyMatrix = true;

    const color = state.color?.isColor ? state.color : DEFAULT_COLOR;
    const colorOffset = slot * 3;
    this.mesh.instanceColor.array[colorOffset] = color.r;
    this.mesh.instanceColor.array[colorOffset + 1] = color.g;
    this.mesh.instanceColor.array[colorOffset + 2] = color.b;
    this.dirtyColor = true;

    this.opacityAttribute.array[slot] = THREE.MathUtils.clamp(state.opacity ?? 1, 0, 1);
    this.glowAttribute.array[slot] = Math.max(0, state.glow ?? 1);
    this.dirtyAttributes = true;
    return true;
  }

  clear() {
    this.nextSlot = 0;
    this.freeList.length = 0;
    this.occupied.fill(false);
    this.highestUsedSlot = 0;
    this.mesh.count = 0;
    for (let i = 0; i < this.capacity; i += 1) this.writeHidden(i);
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
    if (this.dirtyAttributes) {
      this.opacityAttribute.needsUpdate = true;
      this.glowAttribute.needsUpdate = true;
      this.dirtyAttributes = false;
    }
  }

  dispose() {
    this.group?.remove?.(this.mesh);
    this.mesh.geometry?.dispose?.();
    this.mesh.material?.dispose?.();
  }
}

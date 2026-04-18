import * as THREE from 'three';
import { COLORS } from '../../data/balance.js';
import { InstancedVisualBucket } from './InstancedVisualBucket.js';

/**
 * Responsibility:
 * - Instanced renderer for pickup visuals.
 *
 * Rules:
 * - Pickup gameplay keeps using pickup.mesh as a logic anchor so minimap/collision code stays unchanged.
 * - The crystal material remains globally animated from RewardSystem, but individual drops no longer allocate
 *   their own mesh/material pairs.
 */
export class PickupBatchRenderer {
  constructor(group) {
    this.group = group;
    this.crystalGeometry = new THREE.OctahedronGeometry(0.42, 0);
    this.crystalGeometry.userData.shared = true;
    this.crystalMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.crystal,
      emissive: COLORS.crystal,
      emissiveIntensity: 1.18,
      roughness: 0.06,
      metalness: 0.18,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      toneMapped: false,
    });
    this.crystalMaterial.userData.shared = true;
    this.crystalBucket = new InstancedVisualBucket({
      group,
      geometry: this.crystalGeometry,
      material: this.crystalMaterial,
      capacity: 512,
      renderOrder: 3,
    });
  }

  getCrystalMaterial() {
    return this.crystalBucket.mesh.material;
  }

  allocateCrystal(meta = null) {
    return this.crystalBucket.allocate(meta);
  }

  syncCrystal(pickup) {
    if (!pickup?.visualHandle) return;
    this.crystalBucket.sync(pickup.visualHandle, {
      position: pickup.mesh.position,
      quaternion: pickup.mesh.quaternion,
      scale: pickup.visualScale,
      color: pickup.visualColor,
      opacity: pickup.visualOpacity ?? 1,
      visible: true,
    });
  }

  releaseCrystal(handle) {
    this.crystalBucket.release(handle);
  }

  clear() {
    this.crystalBucket.clear();
  }

  commitFrame() {
    this.crystalBucket.commitFrame();
  }

  dispose() {
    this.crystalBucket.dispose();
  }
}

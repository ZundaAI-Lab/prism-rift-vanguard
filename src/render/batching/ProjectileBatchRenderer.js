import * as THREE from 'three';
import {
  PROJECTILE_VISUAL_CAPACITY,
  PROJECTILE_VISUAL_FAMILY,
  PROJECTILE_VISUAL_LAYER,
  PROJECTILE_VISUAL_LAYER_CONFIG,
} from '../../combat/projectiles/ProjectileShared.js';
import { ProjectileVisualBucket } from './ProjectileVisualBucket.js';
import {
  buildInstancedProjectileCoreMaterial,
  buildInstancedProjectileHaloMaterial,
  buildInstancedProjectileRingMaterial,
} from '../materials/buildInstancedProjectileMaterials.js';

const TMP_RING_QUATERNION = new THREE.Quaternion();
const TMP_COMBINED_QUATERNION = new THREE.Quaternion();
const TMP_RING_SCALE = new THREE.Vector3();
const TMP_ZERO_SCALE = new THREE.Vector3(0, 0, 0);
const TMP_RING_EULER = new THREE.Euler();

function buildLayerMaterial(layerConfig) {
  if (layerConfig.kind === 'core') return buildInstancedProjectileCoreMaterial(layerConfig.materialParams);
  if (layerConfig.kind === 'halo') return buildInstancedProjectileHaloMaterial(layerConfig.materialParams);
  return buildInstancedProjectileRingMaterial(layerConfig.materialParams);
}

/**
 * Responsibility:
 * - Projectile-only instanced draw layer.
 *
 * Rules:
 * - Gameplay keeps projectile.mesh as a logic anchor. Visible bullet geometry exists only inside these buckets.
 * - One slot index is shared by the core/halo/ring buckets for a family so per-projectile visual state stays aligned.
 * - If allocate() returns null, callers must skip projectile creation itself. Capacity exhaustion is an exceptional
 *   drop condition, not permission to keep a logic-only projectile alive.
 * - commitFrame() is the only place that uploads instanced buffers each frame.
 */
export class ProjectileBatchRenderer {
  constructor(group) {
    this.group = group;
    this.familyBuckets = new Map();
    this.activeHandles = new Set();
    for (const family of Object.values(PROJECTILE_VISUAL_FAMILY)) {
      const layerMap = new Map();
      const capacity = PROJECTILE_VISUAL_CAPACITY[family] ?? 32;
      const layerConfig = PROJECTILE_VISUAL_LAYER_CONFIG[family] ?? {};
      for (const layer of Object.values(PROJECTILE_VISUAL_LAYER)) {
        const config = layerConfig[layer];
        if (!config) continue;
        layerMap.set(layer, new ProjectileVisualBucket({
          group,
          geometry: config.geometry,
          material: buildLayerMaterial(config),
          capacity,
          renderOrder: config.renderOrder ?? 0,
        }));
      }
      this.familyBuckets.set(family, layerMap);
    }
  }

  allocate(family, meta = null) {
    // Common batched-visual contract: null means the caller must abandon spawning the owning gameplay entity.
    const layerMap = this.familyBuckets.get(family);
    if (!layerMap) return null;
    const slotMap = new Map();
    for (const [layer, bucket] of layerMap.entries()) {
      const slot = bucket.allocateSlot();
      if (slot < 0) {
        for (const [rollbackLayer, rollbackSlot] of slotMap.entries()) layerMap.get(rollbackLayer)?.freeSlot(rollbackSlot);
        return null;
      }
      slotMap.set(layer, slot);
    }
    const handle = {
      renderer: this,
      family,
      meta,
      slots: slotMap,
      alive: true,
    };
    this.activeHandles.add(handle);
    return handle;
  }

  release(handle) {
    if (!handle?.alive) return false;
    const layerMap = this.familyBuckets.get(handle.family);
    if (!layerMap) {
      handle.alive = false;
      this.activeHandles.delete(handle);
      return false;
    }
    for (const [layer, slot] of handle.slots.entries()) layerMap.get(layer)?.freeSlot(slot);
    handle.alive = false;
    this.activeHandles.delete(handle);
    return true;
  }

  syncProjectile(projectile) {
    const handle = projectile?.visualHandle;
    if (!handle?.alive) return false;
    const state = projectile.visualState ?? null;
    const layerMap = this.familyBuckets.get(handle.family);
    if (!state || !layerMap) return false;

    layerMap.get(PROJECTILE_VISUAL_LAYER.core)?.writeSlot(handle.slots.get(PROJECTILE_VISUAL_LAYER.core), {
      position: projectile.mesh.position,
      quaternion: projectile.mesh.quaternion,
      scale: TMP_RING_SCALE.setScalar(Math.max(0, state.coreScale ?? 0)),
      color: state.coreColor,
      opacity: state.coreAlpha ?? 0,
      glow: state.coreGlow ?? 1,
    });

    layerMap.get(PROJECTILE_VISUAL_LAYER.halo)?.writeSlot(handle.slots.get(PROJECTILE_VISUAL_LAYER.halo), {
      position: projectile.mesh.position,
      quaternion: projectile.mesh.quaternion,
      scale: TMP_RING_SCALE.setScalar(Math.max(0, state.haloScale ?? 0)),
      color: state.haloColor,
      opacity: state.haloAlpha ?? 0,
      glow: state.haloGlow ?? 1,
    });

    const ringBucket = layerMap.get(PROJECTILE_VISUAL_LAYER.ring);
    if (ringBucket) {
      if ((state.ringScale ?? 0) > 0 && (state.ringAlpha ?? 0) > 0 && state.ringEuler?.isEuler) {
        TMP_RING_EULER.copy(state.ringEuler);
        TMP_RING_QUATERNION.setFromEuler(TMP_RING_EULER);
        TMP_COMBINED_QUATERNION.copy(projectile.mesh.quaternion).multiply(TMP_RING_QUATERNION);
        ringBucket.writeSlot(handle.slots.get(PROJECTILE_VISUAL_LAYER.ring), {
          position: projectile.mesh.position,
          quaternion: TMP_COMBINED_QUATERNION,
          scale: TMP_RING_SCALE.setScalar(Math.max(0, state.ringScale ?? 0)),
          color: state.ringColor,
          opacity: state.ringAlpha ?? 0,
          glow: state.ringGlow ?? 1,
        });
      } else {
        ringBucket.writeSlot(handle.slots.get(PROJECTILE_VISUAL_LAYER.ring), {
          position: projectile.mesh.position,
          quaternion: projectile.mesh.quaternion,
          scale: TMP_ZERO_SCALE,
          color: state.ringColor,
          opacity: 0,
          glow: 1,
        });
      }
    }
    return true;
  }

  clear() {
    for (const handle of this.activeHandles) handle.alive = false;
    this.activeHandles.clear();
    for (const layerMap of this.familyBuckets.values()) {
      for (const bucket of layerMap.values()) bucket.clear();
    }
  }

  commitFrame() {
    for (const layerMap of this.familyBuckets.values()) {
      for (const bucket of layerMap.values()) bucket.commitFrame();
    }
  }

  dispose() {
    this.clear();
    for (const layerMap of this.familyBuckets.values()) {
      for (const bucket of layerMap.values()) bucket.dispose();
    }
    this.familyBuckets.clear();
  }
}

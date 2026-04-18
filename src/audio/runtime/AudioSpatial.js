import {
  clamp,
  lerp,
  smoothstep01,
  getAudioRuntime,
  SPATIAL_PAN_MIN_DISTANCE,
  SPATIAL_PAN_FULL_DISTANCE,
  SPATIAL_PAN_MAX_ABS,
  LISTENER_FORWARD,
  LISTENER_RIGHT,
  WORLD_UP,
  SPATIAL_DISTANCE_Y_WEIGHT,
  SPATIAL_DISTANCE_TAIL_RANGE,
} from './AudioManagerShared.js';
import { MINIMAP } from '../../data/balance.js';

export const audioSpatialMethods = {
getNowMs() {
  return globalThis.performance?.now?.() ?? Date.now();
},

getPlayerPositionSafe() {
  try {
    const position = this.getPlayerPosition?.();
    if (!position) return null;
    const x = Number(position.x);
    const z = Number(position.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    return position;
  } catch {
    return null;
  }
},

getListenerObjectSafe() {
  try {
    return this.getListenerObject?.() ?? null;
  } catch {
    return null;
  }
},

getSpatialDistanceMetrics(worldPosition) {
  if (!worldPosition) return null;

  const playerPosition = this.getPlayerPositionSafe();
  if (!playerPosition) return null;

  const sourceX = Number(worldPosition.x);
  const sourceY = Number(worldPosition.y);
  const sourceZ = Number(worldPosition.z);
  if (!Number.isFinite(sourceX) || !Number.isFinite(sourceZ)) return null;

  const listenerX = Number(playerPosition.x);
  const listenerY = Number(playerPosition.y);
  const listenerZ = Number(playerPosition.z);
  if (!Number.isFinite(listenerX) || !Number.isFinite(listenerZ)) return null;

  const dx = sourceX - listenerX;
  const dz = sourceZ - listenerZ;
  const dy = (Number.isFinite(sourceY) ? sourceY : 0) - (Number.isFinite(listenerY) ? listenerY : 0);
  const planarDistance = Math.hypot(dx, dz);
  const weightedDistance = Math.hypot(dx, dz, dy * SPATIAL_DISTANCE_Y_WEIGHT);

  return {
    dx,
    dy,
    dz,
    planarDistance,
    weightedDistance,
  };
},

getListenerPlanarRightSafe() {
  const listenerObject = this.getListenerObjectSafe();
  if (!listenerObject?.getWorldDirection) return null;

  try {
    listenerObject.getWorldDirection(LISTENER_FORWARD);
  } catch {
    return null;
  }

  LISTENER_FORWARD.y = 0;
  if (LISTENER_FORWARD.lengthSq() < 0.0001) return null;
  LISTENER_FORWARD.normalize();
  LISTENER_RIGHT.crossVectors(LISTENER_FORWARD, WORLD_UP);
  if (LISTENER_RIGHT.lengthSq() < 0.0001) return null;
  LISTENER_RIGHT.normalize();
  return LISTENER_RIGHT;
},

ensureAudioContext() {
  if (this.audioContextUnavailable) return null;
  if (this.audioContext) return this.audioContext;

  const AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext ?? null;
  if (!AudioContextCtor) {
    this.audioContextUnavailable = true;
    return null;
  }

  try {
    this.audioContext = new AudioContextCtor();
    return this.audioContext;
  } catch {
    this.audioContextUnavailable = true;
    return null;
  }
},

resumeSpatialAudioContext() {
  if (!this.userUnlocked) return;
  const context = this.ensureAudioContext();
  if (!context?.resume || context.state !== 'suspended') return;
  context.resume().catch(() => {
    // no-op
  });
},

ensureSpatialNodes(audio) {
  if (!audio || !this.userUnlocked) return null;

  const runtime = getAudioRuntime(audio);
  if (runtime?.spatialNodes) return runtime.spatialNodes;

  const context = this.ensureAudioContext();
  if (!context?.createMediaElementSource) return null;

  try {
    const source = context.createMediaElementSource(audio);
    const panner = context.createStereoPanner
      ? context.createStereoPanner()
      : new globalThis.StereoPannerNode(context, { pan: 0 });
    source.connect(panner);
    panner.connect(context.destination);
    runtime.spatialNodes = { source, panner };
    return runtime.spatialNodes;
  } catch {
    runtime.spatialNodes = null;
    return null;
  }
},

resetStereoPan(audio) {
  const runtime = getAudioRuntime(audio);
  runtime.stereoPan = 0;
  const nodes = runtime?.spatialNodes;
  if (!nodes?.panner) return;
  try {
    nodes.panner.pan.value = 0;
  } catch {
    // no-op
  }
},

disposeSpatialNodes(audio) {
  const runtime = getAudioRuntime(audio);
  const nodes = runtime?.spatialNodes;
  if (!nodes) return;
  try {
    nodes.source?.disconnect?.();
  } catch {
    // no-op
  }
  try {
    nodes.panner?.disconnect?.();
  } catch {
    // no-op
  }
  runtime.spatialNodes = null;
},

computeSpatialStereoPan(options = {}) {
  const metrics = this.getSpatialDistanceMetrics(options.worldPosition ?? null);
  if (!metrics) return 0;

  const { dx, dz, planarDistance } = metrics;
  if (planarDistance <= SPATIAL_PAN_MIN_DISTANCE) return 0;

  const listenerRight = this.getListenerPlanarRightSafe();
  const lateralDirection = listenerRight
    ? clamp(((dx / planarDistance) * listenerRight.x) + ((dz / planarDistance) * listenerRight.z), -1, 1)
    : clamp(dx / planarDistance, -1, 1);
  const distanceStrength = clamp((planarDistance - SPATIAL_PAN_MIN_DISTANCE) / (SPATIAL_PAN_FULL_DISTANCE - SPATIAL_PAN_MIN_DISTANCE), 0, 1);
  const panMagnitude = lerp(0.18, SPATIAL_PAN_MAX_ABS, distanceStrength);
  return clamp(lateralDirection * panMagnitude, -1, 1);
},

applyStereoPanToVoice(audio, stereoPan = 0) {
  if (!audio) return;

  const runtime = getAudioRuntime(audio);
  runtime.stereoPan = clamp(Number(stereoPan) || 0, -1, 1);

  const nodes = this.ensureSpatialNodes(audio) ?? runtime.spatialNodes;
  if (!nodes?.panner) return;

  try {
    nodes.panner.pan.value = runtime.stereoPan;
  } catch {
    // no-op
  }
},

computeMinimapRingVolumeScale(worldPosition, {
  nearVolumeScale = 1,
  midVolumeScale = 0.6,
  farVolumeScale = 0.2,
  outOfRangeVolumeScale = 0,
} = {}) {
  if (!worldPosition) return 0;
  const metrics = this.getSpatialDistanceMetrics(worldPosition);
  if (!metrics) return 1;

  const distance = metrics.weightedDistance;
  const nearRadius = MINIMAP.range * MINIMAP.centerRingRatio;
  const midRadius = MINIMAP.range * MINIMAP.innerRingRatio;
  const farRadius = MINIMAP.range;
  const tailRadius = farRadius + SPATIAL_DISTANCE_TAIL_RANGE;

  if (distance <= nearRadius) return nearVolumeScale;
  if (distance <= midRadius) {
    const t = smoothstep01((distance - nearRadius) / Math.max(0.0001, midRadius - nearRadius));
    return lerp(nearVolumeScale, midVolumeScale, t);
  }
  if (distance <= farRadius) {
    const t = smoothstep01((distance - midRadius) / Math.max(0.0001, farRadius - midRadius));
    return lerp(midVolumeScale, farVolumeScale, t);
  }
  if (distance >= tailRadius) return outOfRangeVolumeScale;
  const t = smoothstep01((distance - farRadius) / Math.max(0.0001, tailRadius - farRadius));
  return lerp(farVolumeScale, outOfRangeVolumeScale, t);
},

computeEnemyMinimapRingVolumeScale(worldPosition, policy = null) {
  return this.computeMinimapRingVolumeScale(worldPosition, {
    nearVolumeScale: 1,
    midVolumeScale: 0.6,
    farVolumeScale: 0.2,
    outOfRangeVolumeScale: policy?.outOfRangeVolumeScale ?? 0.1,
  });
},

computeSpatialVolumeScale(policy, options = {}) {
  switch (policy?.spatialProfile) {
    case 'enemyMinimapRings':
      return this.computeEnemyMinimapRingVolumeScale(options.worldPosition ?? null, policy);
    default:
      return 1;
  }
}
};

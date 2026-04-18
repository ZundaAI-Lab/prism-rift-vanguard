import * as THREE from 'three';
import { MINIMAP } from '../../data/balance.js';
import { clamp, lerp } from '../../utils/math.js';

export const MODE_BGM_ID = {
  title: 'title',
  interval: 'hangar',
  gameover: 'gameover',
};

export const MISSION_BGM_ID = {
  tutorial: 'tutorial',
  desert: 'missionDesert',
  swamp: 'missionSwamp',
  forge: 'missionForge',
  frost: 'missionFrost',
  mirror: 'missionMirror',
  astral: 'missionAstral',
  voidcrown: 'missionVoidcrown',
};

export const BOSS_BGM_ID = {
  desert: 'bossDesert',
  swamp: 'bossSwamp',
  forge: 'bossForge',
  frost: 'bossFrost',
  mirror: 'bossMirror',
  astral: 'bossAstral',
  voidcrown: 'bossVoidFortress',
};

export const DEFAULT_SFX_POLICY = Object.freeze({
  maxVoices: 4,
  burstWindowMs: 0,
  burstVolumeDecay: 1,
  minVolumeScale: 0.35,
  duckingGroup: null,
});

export const BGM_START_SILENCE_MS = 500;
export const BGM_FADE_OUT_MS = 700;
export const PAUSE_BGM_VOLUME_SCALE = 0.32;
export const PAUSE_SFX_VOLUME_SCALE = 0.58;
export const SUPPRESS_AUTO_BGM = Symbol('SUPPRESS_AUTO_BGM');
export const SPATIAL_PAN_MIN_DISTANCE = 2.25;
export const SPATIAL_PAN_FULL_DISTANCE = Math.max(12, MINIMAP.range * MINIMAP.centerRingRatio);
export const SPATIAL_PAN_MAX_ABS = 0.88;
export const LISTENER_FORWARD = new THREE.Vector3();
export const LISTENER_RIGHT = new THREE.Vector3();
export const WORLD_UP = new THREE.Vector3(0, 1, 0);
export const SPATIAL_DISTANCE_Y_WEIGHT = 0.35;
export const SPATIAL_DISTANCE_TAIL_RANGE = Math.max(18, MINIMAP.range * 0.85);

export function smoothstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - (2 * t));
}

export function isAutoplayError(error) {
  return error?.name === 'NotAllowedError' || error?.name === 'AbortError';
}

export function safePause(audio) {
  try {
    audio?.pause?.();
  } catch {
    // no-op
  }
}

export function safeCurrentTime(audio, time = 0) {
  try {
    audio.currentTime = time;
  } catch {
    // no-op
  }
}

export function disposeAudio(audio) {
  if (!audio) return;
  safePause(audio);
  try {
    audio.src = '';
    audio.load?.();
  } catch {
    // no-op
  }
}

export function getAudioRuntime(audio) {
  if (!audio) return null;
  if (!audio.__prismAudioRuntime) {
    audio.__prismAudioRuntime = {
      trackId: null,
      volumeScale: 1,
      startedAt: -Infinity,
      voiceSerial: 0,
      bgmErrorHandler: null,
    };
  }
  return audio.__prismAudioRuntime;
}

export function detachBgmErrorHandler(audio) {
  if (!audio?.removeEventListener) return;
  const runtime = getAudioRuntime(audio);
  const handler = runtime?.bgmErrorHandler;
  if (!handler) return;
  try {
    audio.removeEventListener('error', handler);
  } catch {
    // no-op
  }
  runtime.bgmErrorHandler = null;
}

export function isVoiceReusable(audio) {
  if (!audio) return false;
  if (audio.error) return false;
  if (audio.paused) return true;
  const duration = Number(audio.duration);
  if (Number.isFinite(duration) && duration > 0) {
    return audio.currentTime >= Math.max(0, duration - 0.03);
  }
  return false;
}

export { clamp, lerp };

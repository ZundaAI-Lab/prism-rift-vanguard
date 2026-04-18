import * as THREE from 'three';
import { ENEMY_LIBRARY } from '../data/enemies.js';
import { GAME_BOUNDS } from '../data/balance.js';
import { clampPointToPlayerTravelBounds } from '../player/shared/PlayerTravelBounds.js';
import { lerp, randRange } from '../utils/math.js';
import { detachAndDispose } from '../utils/three-dispose.js';
import { translate } from '../i18n/index.js';

export {
  THREE,
  ENEMY_LIBRARY,
  GAME_BOUNDS,
  clampPointToPlayerTravelBounds,
  lerp,
  randRange,
  detachAndDispose,
  translate,
};

export const TARGET_DIR = new THREE.Vector3();
export const SIDE = new THREE.Vector3();
export const UP = new THREE.Vector3(0, 1, 0);
export const PREV = new THREE.Vector3();
export const DESIRED = new THREE.Vector3();
export const ORBIT = new THREE.Vector3();
export const TEMP = new THREE.Vector3();
export const TEMP2 = new THREE.Vector3();
export const PLAYER_FORWARD = new THREE.Vector3();
export const PLAYER_RIGHT = new THREE.Vector3();
export const START = new THREE.Vector3();
export const END = new THREE.Vector3();
export const LOOK_TARGET = new THREE.Vector3();
export const LOOK_MATRIX = new THREE.Matrix4();
export const LOOK_QUAT = new THREE.Quaternion();
export const LOOK_EULER = new THREE.Euler(0, 0, 0, 'YXZ');
export const INTRO_TILT_QUAT = new THREE.Quaternion();

export const VOID_DAIS_RADIUS = 24;
export const VOID_DAIS_EXCLUSION_RADIUS = 46;
export const VOID_REINFORCEMENT_INTERVAL = 3.0;
export const VOID_REINFORCEMENT_LIMIT = 10;
export const VOID_REINFORCEMENT_POOL = [
  { type: 'shardfin', weight: 1.0 },
  { type: 'haloSeraph', weight: 1.0 },
  { type: 'glacier', weight: 1.1 },
  { type: 'whiteout', weight: 1.15 },
  { type: 'facet', weight: 1.4 },
  { type: 'watcher', weight: 1.55 },
  { type: 'duelist', weight: 1.7 },
  { type: 'reflector', weight: 1.7 },
  { type: 'reefRay', weight: 2.1 },
  { type: 'urchin', weight: 2.25 },
  { type: 'drifter', weight: 2.35 },
  { type: 'coralKnight', weight: 2.55 },
];

export function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

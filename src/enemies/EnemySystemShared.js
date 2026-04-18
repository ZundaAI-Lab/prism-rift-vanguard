import * as THREE from 'three';
import { ENEMY_LIBRARY } from '../data/enemies.js';
import { GAME_BOUNDS, MINIMAP } from '../data/balance.js';
import { randChoice, removeFromArray, randRange, sampleRange } from '../utils/math.js';
import { clampPointToPlayerTravelBounds } from '../player/shared/PlayerTravelBounds.js';
import { detachAndDispose } from '../utils/three-dispose.js';

export {
  THREE,
  ENEMY_LIBRARY,
  GAME_BOUNDS,
  MINIMAP,
  randChoice,
  removeFromArray,
  randRange,
  sampleRange,
  clampPointToPlayerTravelBounds,
  detachAndDispose,
};

export const TO_PLAYER = new THREE.Vector3();
export const DESIRED = new THREE.Vector3();
export const SIDE = new THREE.Vector3();
export const UP = new THREE.Vector3(0, 1, 0);
export const TEMP = new THREE.Vector3();
export const HEIGHT_ALIGNED = new THREE.Vector3();
export const HEIGHT_FORWARD = new THREE.Vector3();
export const LEAD_TARGET = new THREE.Vector3();
export const DIRECT_FORWARD = new THREE.Vector3();
export const DIRECT_SIDE = new THREE.Vector3();
export const SHOT_DIR = new THREE.Vector3();
export const PLAYER_VELOCITY = new THREE.Vector3();
export const SHOT_SPREAD = new THREE.Vector3();
export const ARC_TARGET = new THREE.Vector3();
export const ARC_HORIZONTAL = new THREE.Vector3();
export const ARC_VELOCITY = new THREE.Vector3();
export const BALLISTIC_MINE_TARGET = new THREE.Vector3();
export const BALLISTIC_MINE_FORWARD = new THREE.Vector3();
export const BALLISTIC_MINE_SIDE = new THREE.Vector3();
export const BALLISTIC_MINE_ORIGIN = new THREE.Vector3();
export const BALLISTIC_MINE_VELOCITY = new THREE.Vector3();
export const BALLISTIC_MINE_FALLBACK = new THREE.Vector3();
export const SPAWN_POINT = new THREE.Vector3();
export const SPAWN_FALLBACK = new THREE.Vector3();
export const SPAWN_INTRO_LOOK = new THREE.Vector3();
export const BLINK_BASE_DIR = new THREE.Vector3();
export const BLINK_CANDIDATE = new THREE.Vector3();
export const BLINK_BEST = new THREE.Vector3();
export const BLINK_OFFSET = new THREE.Vector3();

export const PREDICTIVE_ENEMY_RULES = {
  2: { types: new Set(['mortar']), leadStrength: 0.62 },
  3: { types: new Set(['whiteout']), leadStrength: 0.7 },
  4: { types: new Set(['facet', 'duelist']), leadStrength: 0.78 },
  5: { types: new Set(['drifter', 'coralKnight']), leadStrength: 0.86 },
};
export const ENEMY_HIT_SHAKE_DURATION = 0.18;
export const ENEMY_HIT_SHAKE_PITCH = 0.06;
export const ENEMY_HIT_SHAKE_ROLL = 0.095;
export const ENEMY_HIT_SHAKE_YAW = 0.038;

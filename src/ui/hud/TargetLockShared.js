/**
 * Responsibility:
 * - target-lock 専用の定数・一時ベクトルをまとめる。
 *
 * Rules:
 * - target-lock 以外の HUD ロジックをここへ入れない。
 * - ミニマップ専用 shared は minimap/MinimapShared.js を正本にする。
 */
import * as THREE from 'three';
import { TARGET_LOCK } from '../../data/balance.js';

export { TARGET_LOCK };

export const LOCK_PLAYER_POS = new THREE.Vector3();
export const LOCK_WORLD_POS = new THREE.Vector3();
export const LOCK_SCREEN_CENTER = new THREE.Vector3();
export const LOCK_SCREEN_RIGHT = new THREE.Vector3();
export const LOCK_SCREEN_UP = new THREE.Vector3();
export const LOCK_CAMERA_RIGHT = new THREE.Vector3();
export const LOCK_CAMERA_UP = new THREE.Vector3();

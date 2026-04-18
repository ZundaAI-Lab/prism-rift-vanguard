/**
 * Responsibility:
 * - BossSystem 系モジュールが共有する import・ベクトルワーク領域・純粋 helper を集約する。
 *
 * Rules:
 * - ボス個別の phase 制御は各 Controller に置き、この shared には分岐を持ち込まない。
 * - 弾道用の一時ベクトルと共通ユーティリティだけを定義する。
 */
import * as THREE from 'three';
import { MINIMAP } from '../data/balance.js';
import { clampPointToPlayerTravelBounds, resolvePlayerTravelBounds } from '../player/shared/PlayerTravelBounds.js';
export { THREE, MINIMAP, clampPointToPlayerTravelBounds, resolvePlayerTravelBounds };

export const TARGET_DIR = new THREE.Vector3();
export const SIDE = new THREE.Vector3();
export const UP = new THREE.Vector3(0, 1, 0);
export const HEIGHT_ALIGNED = new THREE.Vector3();
export const HEIGHT_FORWARD = new THREE.Vector3();
export const LEAD_TARGET = new THREE.Vector3();
export const PLAYER_VELOCITY = new THREE.Vector3();
export const DIRECT_AIM = new THREE.Vector3();
export const LEAD_AIM = new THREE.Vector3();
export const REMAPPED = new THREE.Vector3();
export const BALLISTIC_TARGET = new THREE.Vector3();
export const BALLISTIC_VELOCITY = new THREE.Vector3();
export const BALLISTIC_FALLBACK = new THREE.Vector3();
export const RAIN_TARGET = new THREE.Vector3();
export const MIRROR_WARP_POINT = new THREE.Vector3();
export const MIRROR_WARP_JITTER = new THREE.Vector3();
export const FROST_BLIZZARD_SOURCE = new THREE.Vector3();
export const ASTRAL_DASH_POINT = new THREE.Vector3();
export const ASTRAL_DASH_FROM_PLAYER = new THREE.Vector3();
export const ASTRAL_DASH_POSITION = new THREE.Vector3();
export const ASTRAL_DASH_WOBBLE = new THREE.Vector3();
export const ASTRAL_BARRAGE_DIR = new THREE.Vector3();
export const ASTRAL_RING_TARGET = new THREE.Vector3();
export const LOOK_TARGET = new THREE.Vector3();
export const LOOK_MATRIX = new THREE.Matrix4();
export const LOOK_QUAT = new THREE.Quaternion();
export const LOOK_EULER = new THREE.Euler(0, 0, 0, 'YXZ');

/**
 * Responsibility:
 * - Boss-exclusive movement and attack orchestration.
 *
 * Rules:
 * - Only handle enemies flagged as bosses.
 * - Reuse ProjectileSystem for all shots; do not implement collision here.
 * - Boss phase thresholds are HP ratio based: base (> 1/2), mid (<= 1/2), final (<= 1/4).
 *   Keep those thresholds centralized here so future tuning cannot silently desync UI, HP, and behavior.
 */

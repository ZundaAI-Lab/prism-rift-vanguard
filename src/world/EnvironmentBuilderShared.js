/**
 * Responsibility:
 * - EnvironmentBuilder 系モジュールが共有する import・ワーク領域・純粋 helper を集約する。
 *
 * Rules:
 * - ミッションごとの構築分岐や描画更新分岐は各責務モジュールへ残す。
 * - shared には一時ベクトル・定数・共通 util だけを置く。
 */
import * as THREE from 'three';
import { randChoice, randRange } from '../utils/math.js';
import { clearAndDisposeChildren, detachAndDispose } from '../utils/three-dispose.js';
import { MINIMAP, PLAYER_TRAVEL } from '../data/balance.js';
export { THREE, randChoice, randRange, clearAndDisposeChildren, detachAndDispose, MINIMAP, PLAYER_TRAVEL };

export const COLLIDER_WORLD_POS = new THREE.Vector3();
export const COLLIDER_NORMAL = new THREE.Vector3();
export const COLLIDER_QUATERNION = new THREE.Quaternion();
export const COLLIDER_MATRIX_INV = new THREE.Matrix4();
export const COLLIDER_LOCAL_PREV = new THREE.Vector3();
export const COLLIDER_LOCAL_CURR = new THREE.Vector3();
export const COLLIDER_WORLD_POINT = new THREE.Vector3();
export const COLLIDER_RING_CENTER = new THREE.Vector3();
export const COLLIDER_RING_NORMAL = new THREE.Vector3();
export const ASTRAL_FIELD_WORLD = new THREE.Vector3();

/**
 * Responsibility:
 * - Builds mission visuals: sky, fog, terrain, ambient particles, and decor.
 *
 * Rules:
 * - World visuals must live under renderer.groups.world.
 * - This module must not know about score, upgrades, or UI.
 * - Biome-specific art variation belongs here, while damage / hazard logic belongs in StageGimmickSystem.
 * - Static collider registration for world props also belongs here. Combat systems may query the colliders,
 *   but they must not invent their own hidden obstacle lists or projectile/object behavior will drift again.
 */

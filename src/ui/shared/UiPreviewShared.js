/**
 * Responsibility:
 * - 図鑑 / メダルの 3D プレビュー表示が共有する preview 定数と Three 補助値をまとめる。
 *
 * Rules:
 * - プレビュー用の一時 Box / Vector と破棄 helper だけを置く。
 * - 実際の DOM / renderer / scene 更新ロジックは各 View 側へ残す。
 */
import * as THREE from 'three';
import { disposeObject3D } from '../../utils/three-dispose.js';

export { THREE, disposeObject3D };

export const COMPENDIUM_PREVIEW_SIZE = 320;
export const MEDAL_PREVIEW_SIZE = 160;
export const COMPENDIUM_CAMERA = new THREE.Vector3();
export const COMPENDIUM_LOOK = new THREE.Vector3();
export const COMPENDIUM_SIZE = new THREE.Vector3();
export const COMPENDIUM_CENTER = new THREE.Vector3();
export const COMPENDIUM_BOX = new THREE.Box3();
export const MEDAL_CAMERA = new THREE.Vector3();
export const MEDAL_LOOK = new THREE.Vector3();
export const MEDAL_SIZE = new THREE.Vector3();
export const MEDAL_CENTER = new THREE.Vector3();
export const MEDAL_BOX = new THREE.Box3();

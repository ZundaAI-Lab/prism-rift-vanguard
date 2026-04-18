import * as THREE from 'three';

export const PLAYER_XZ = new THREE.Vector2();
export const TEMP_XZ = new THREE.Vector2();
export const SEG_A = new THREE.Vector2();
export const SEG_B = new THREE.Vector2();

export const VOID_JUDGEMENT_PILLAR_TELEGRAPH_TIME = 1.4;
export const VOID_JUDGEMENT_PILLAR_IMPACT_TIME = 1.48;
export const VOID_JUDGEMENT_PILLAR_STAGGER = 0.5;
export const VOID_JUDGEMENT_RING_PULSE_START = 1.0;
export const VOID_JUDGEMENT_ARENA_LIMIT = 176;

export function distanceToSegment2(point, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const denom = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / denom));
  const dx = a.x + abx * t - point.x;
  const dy = a.y + aby * t - point.y;
  return Math.hypot(dx, dy);
}

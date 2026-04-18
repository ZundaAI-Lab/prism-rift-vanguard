/**
 * Responsibility:
 * - Shared math helpers used by multiple systems.
 *
 * Rules:
 * - Keep this file pure. No DOM access, no scene mutation, no entity creation.
 * - Never import game systems from here.
 * - Every helper must be deterministic for the same inputs.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function damp(current, target, smoothing, dt) {
  return lerp(current, target, 1 - Math.exp(-smoothing * dt));
}

export function fract(x) {
  return x - Math.floor(x);
}

export function hash2(x, z) {
  return fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453123);
}

export function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function valueNoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x, z, octaves = 5) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise(x * freq, z * freq) * amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value;
}

export function ridged(x, z) {
  const n = fbm(x, z, 4) * 2 - 1;
  return 1 - Math.abs(n);
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, maxInclusive) {
  return Math.floor(randRange(min, maxInclusive + 1));
}

export function randChoice(items) {
  return items[(Math.random() * items.length) | 0];
}

export function angleWrap(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function angleDiff(a, b) {
  return angleWrap(b - a);
}


export function formatNumber(value) {
  return Intl.NumberFormat('ja-JP').format(Math.round(value));
}

export function removeFromArray(array, item) {
  const index = array.indexOf(item);
  if (index >= 0) array.splice(index, 1);
}

export function sampleRange([min, max]) {
  return randRange(min, max);
}

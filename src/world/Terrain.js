import * as THREE from 'three';
import { fbm, ridged, smoothstep } from '../utils/math.js';

/**
 * Responsibility:
 * - Terrain height queries and ground mesh generation.
 *
 * Rules:
 * - Terrain must be queryable without reading entity state.
 * - All systems that need ground height must come through this module.
 * - Mission-specific landforms belong here, not in EnvironmentBuilder.
 * - Final mission terrain may create large ceremonial silhouettes, but keep the central arena readable for boss combat.
 *   The center should remain mostly playable while outer crown structures provide scale.
 */
const DEFAULT_GROUND_PATCH_SIZE = 720;
const DEFAULT_GROUND_PATCH_SEGMENTS = 180;

const FROST_BASE_COLOR = new THREE.Color();
const FROST_SHADOW_COLOR = new THREE.Color();
const FROST_HIGHLIGHT_COLOR = new THREE.Color();
const FROST_GLAZE_COLOR = new THREE.Color();
const FROST_VERTEX_COLOR = new THREE.Color();

export class Terrain {
  constructor() {
    this.currentMissionId = 'desert';
  }

  setMission(missionId) {
    this.currentMissionId = missionId;
  }


  getHeight(x, z) {
    if (this.currentMissionId === 'desert') {
      const dunes = fbm(x * 0.025, z * 0.025, 5) * 9.2;
      const ripples = Math.sin(x * 0.12 + z * 0.06) * 0.65 + Math.cos(z * 0.12) * 0.45;
      const crater = smoothstep(18, 110, Math.sqrt(x * x + z * z)) * -2.2;
      return dunes + ripples + crater;
    }
    if (this.currentMissionId === 'swamp') {
      const base = fbm(x * 0.018, z * 0.018, 5) * 6.2;
      const islands = ridged(x * 0.014, z * 0.014) * 4.4;
      const sink = -smoothstep(0.15, 0.75, fbm(x * 0.05 + 20, z * 0.05 - 10, 4)) * 2.8;
      return base + islands + sink;
    }
    if (this.currentMissionId === 'forge') {
      const basalt = fbm(x * 0.022, z * 0.022, 5) * 5.2;
      const ridges = ridged(x * 0.018 + 6, z * 0.018 - 4) * 8.8;
      const cracks = Math.abs(Math.sin(x * 0.14) * Math.cos(z * 0.12)) * 1.4;
      return basalt + ridges + cracks - 2.6;
    }
    if (this.currentMissionId === 'frost') {
      const terraces = fbm(x * 0.016, z * 0.016, 5) * 7.6;
      const shelves = Math.floor((terraces + 8) * 0.48) * 1.2;
      const ravines = -ridged(x * 0.014 + 12, z * 0.014 - 8) * 5.4;
      const glaze = Math.sin(x * 0.05) * 0.4 + Math.cos(z * 0.04) * 0.55;
      return terraces * 0.7 + shelves + ravines + glaze + 1.6;
    }
    if (this.currentMissionId === 'mirror') {
      const plinth = fbm(x * 0.012, z * 0.012, 4) * 3.4;
      const facets = (Math.abs(Math.sin(x * 0.08)) + Math.abs(Math.cos(z * 0.08))) * 2.2;
      const lanes = -Math.min(2.8, Math.abs(Math.sin((x + z) * 0.03)) * 3.6);
      const tiers = Math.floor((plinth + facets) * 0.55) * 1.25;
      return tiers + lanes - 0.8;
    }
    if (this.currentMissionId === 'astral') {
      const reef = fbm(x * 0.014, z * 0.014, 5) * 5.8;
      const domes = ridged(x * 0.01 + 30, z * 0.01 - 22) * 10.5;
      const bowls = -smoothstep(0.24, 0.88, fbm(x * 0.026 - 40, z * 0.026 + 18, 4)) * 3.8;
      const coral = Math.sin(Math.sqrt(x * x + z * z) * 0.09) * 1.8;
      return reef + domes * 0.55 + bowls + coral - 1.6;
    }
    if (this.currentMissionId === 'voidcrown') {
      const dist = Math.sqrt(x * x + z * z);
      const arena = -smoothstep(0, 72, dist) * 2.4;
      const innerDais = (1 - smoothstep(0, 52, dist)) * 4.6;
      const ringTerraces = Math.sin(dist * 0.105) * 1.1 + Math.sin(dist * 0.043 + 1.4) * 1.9;
      const crownSpines = Math.pow(Math.max(0, Math.sin(Math.atan2(z, x) * 8.0)), 2.5) * smoothstep(62, 150, dist) * 5.8;
      const tears = -smoothstep(84, 150, dist) * ridged(x * 0.02 + 13, z * 0.02 - 17) * 4.8;
      const noise = fbm(x * 0.014, z * 0.014, 5) * 2.6;
      const centralRunes = Math.cos(x * 0.08) * Math.cos(z * 0.08) * 0.7 * (1 - smoothstep(0, 48, dist));
      return innerDais + arena + ringTerraces + crownSpines + tears + noise + centralRunes - 1.4;
    }
    return 0;
  }

  updateFrostGroundAppearance(mesh, theme, centerX = 0, centerZ = 0) {
    const surface = mesh?.userData?.terrainSurface;
    if (!surface) return;

    const geometry = surface.geometry;
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    let colors = geometry.attributes.color;
    if (!colors || colors.count !== positions.count) {
      colors = new THREE.BufferAttribute(new Float32Array(positions.count * 3), 3);
      geometry.setAttribute('color', colors);
    }

    FROST_BASE_COLOR.setHex(theme.groundColor ?? 0xe7eef7);
    FROST_SHADOW_COLOR.setHex(theme.groundSnowShadow ?? 0xd4e2f2);
    FROST_HIGHLIGHT_COLOR.setHex(theme.groundSnowHighlight ?? 0xffffff);
    FROST_GLAZE_COLOR.setHex(theme.groundSnowGlaze ?? 0xcfe1f8);

    const { localXZ } = surface;
    for (let i = 0; i < positions.count; i += 1) {
      const worldX = localXZ[i * 2] + centerX;
      const worldZ = localXZ[i * 2 + 1] + centerZ;
      const slope = THREE.MathUtils.clamp(1 - normals.getY(i), 0, 1);
      const slopeShade = smoothstep(0.04, 0.5, slope);
      const packed = fbm(worldX * 0.022 + 14, worldZ * 0.022 - 7, 4);
      const windLine = Math.sin(worldX * 0.05 + worldZ * 0.018) * 0.5 + 0.5;
      const crust = ridged(worldX * 0.036 - 10, worldZ * 0.018 + 25);
      const glaze = windLine * 0.55 + packed * 0.45;
      const highlight = (1 - slopeShade) * (0.12 + glaze * 0.2) + crust * 0.08;
      const coolShadow = slopeShade * 0.82 + (1 - highlight) * 0.04;
      const lift = Math.max(0, 0.52 - packed) * 0.045;

      FROST_VERTEX_COLOR.copy(FROST_BASE_COLOR);
      FROST_VERTEX_COLOR.lerp(FROST_SHADOW_COLOR, THREE.MathUtils.clamp(coolShadow, 0, 0.9));
      FROST_VERTEX_COLOR.lerp(FROST_GLAZE_COLOR, THREE.MathUtils.clamp(glaze * 0.22 * (1 - slopeShade * 0.75), 0, 0.22));
      FROST_VERTEX_COLOR.lerp(FROST_HIGHLIGHT_COLOR, THREE.MathUtils.clamp(highlight, 0, 0.28));
      FROST_VERTEX_COLOR.offsetHSL(0, 0, lift);
      colors.setXYZ(i, FROST_VERTEX_COLOR.r, FROST_VERTEX_COLOR.g, FROST_VERTEX_COLOR.b);
    }
    colors.needsUpdate = true;
  }

  updateGroundMesh(mesh, centerX = 0, centerZ = 0, force = false) {
    const surface = mesh?.userData?.terrainSurface;
    if (!surface) return;

    if (!force && surface.sampleCenterX === centerX && surface.sampleCenterZ === centerZ) return;

    const positions = surface.geometry.attributes.position;
    const { localXZ } = surface;
    for (let i = 0; i < positions.count; i += 1) {
      const sampleX = localXZ[i * 2] + centerX;
      const sampleZ = localXZ[i * 2 + 1] + centerZ;
      positions.setY(i, this.getHeight(sampleX, sampleZ));
    }
    positions.needsUpdate = true;
    surface.geometry.computeVertexNormals();
    if (this.currentMissionId === 'frost') this.updateFrostGroundAppearance(mesh, surface.theme, centerX, centerZ);
    mesh.position.set(centerX, 0, centerZ);
    surface.sampleCenterX = centerX;
    surface.sampleCenterZ = centerZ;
  }

  buildGroundMesh(theme, options = {}) {
    const size = options.size ?? DEFAULT_GROUND_PATCH_SIZE;
    const segments = options.segments ?? DEFAULT_GROUND_PATCH_SEGMENTS;
    const centerX = options.centerX ?? 0;
    const centerZ = options.centerZ ?? 0;
    const isFrost = this.currentMissionId === 'frost';

    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    const localXZ = new Float32Array(positions.count * 2);
    for (let i = 0; i < positions.count; i += 1) {
      localXZ[i * 2] = positions.getX(i);
      localXZ[i * 2 + 1] = positions.getZ(i);
    }

    const material = new THREE.MeshStandardMaterial({
      color: theme.groundColor,
      emissive: theme.groundEmissive,
      emissiveIntensity: theme.groundEmissiveIntensity ?? 0.42,
      roughness: theme.groundRoughness ?? 0.7,
      metalness: theme.groundMetalness ?? 0.08,
      vertexColors: isFrost,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.userData.terrainSurface = {
      geometry,
      localXZ,
      size,
      segments,
      sampleCenterX: Number.NaN,
      sampleCenterZ: Number.NaN,
      theme,
    };
    this.updateGroundMesh(mesh, centerX, centerZ, true);
    return mesh;
  }
}

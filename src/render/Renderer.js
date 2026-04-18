import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { PickupBatchRenderer } from './batching/PickupBatchRenderer.js';
import { ProjectileBatchRenderer } from './batching/ProjectileBatchRenderer.js';

const GRAPHICS_PRESETS = Object.freeze({
  low: {
    pixelRatioCap: 1.0,
    renderScale: 0.67,
    toneExposure: 1.08,
    bloomStrength: 0.54,
    bloomRadius: 0.4,
    bloomThreshold: 0.54,
    postProcessing: true,
    shadows: false,
    shadowMapSize: 1024,
  },
  medium: {
    pixelRatioCap: 1.35,
    renderScale: 0.75,
    toneExposure: 1.12,
    bloomStrength: 0.82,
    bloomRadius: 0.52,
    bloomThreshold: 0.48,
    postProcessing: true,
    shadows: true,
    shadowMapSize: 1536,
  },
  high: {
    pixelRatioCap: 1.8,
    renderScale: 1,
    postProcessing: true,
    shadows: true,
    shadowMapSize: 2048,
  },
});

const EFFECT_STRENGTH_PRESETS = Object.freeze({
  standard: {
    exposureMul: 1,
    bloomMul: 1,
    thresholdAdd: 0,
  },
  reduced: {
    exposureMul: 0.97,
    bloomMul: 0.72,
    thresholdAdd: 0.06,
  },
  minimal: {
    exposureMul: 0.94,
    bloomMul: 0.45,
    thresholdAdd: 0.12,
  },
});

function clampFov(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 74;
  return THREE.MathUtils.clamp(Math.round(numeric), 68, 84);
}

function normalizeQuality(value) {
  return GRAPHICS_PRESETS[value] ? value : 'high';
}

function normalizeEffectStrength(value) {
  return EFFECT_STRENGTH_PRESETS[value] ? value : 'standard';
}

/**
 * Responsibility:
 * - Owns the Three.js renderer, scene, composer, and shared scene groups.
 *
 * Rules:
 * - Rendering setup lives here.
 * - Gameplay systems may add objects only through the exported groups. Pickups and projectiles are the batched
 *   combat visual layers kept here, so their runtime anchors stay separate from the instanced draw layers.
 * - Do not place mission or combat logic in this module.
 * - Default post effects live here; gameplay-driven intensity changes belong in CameraRig.
 */
export class Renderer {
  constructor({ quality = 'high' } = {}) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.1, 1600);
    this.webgl = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    this.webgl.setSize(window.innerWidth, window.innerHeight);
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.info.autoReset = false;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.16;
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.webgl.domElement);

    this.composer = new EffectComposer(this.webgl);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.08, 0.65, 0.42);
    this.composer.addPass(this.bloom);

    this.groups = {
      world: new THREE.Group(),
      actors: new THREE.Group(),
      fx: new THREE.Group(),
      pickups: new THREE.Group(),
    };
    this.batchedGroups = {
      pickups: new THREE.Group(),
      projectiles: new THREE.Group(),
    };
    this.scene.add(
      this.groups.world,
      this.groups.actors,
      this.groups.fx,
      this.groups.pickups,
      this.batchedGroups.pickups,
      this.batchedGroups.projectiles,
    );

    this.batches = {
      pickups: new PickupBatchRenderer(this.batchedGroups.pickups),
      projectiles: new ProjectileBatchRenderer(this.batchedGroups.projectiles),
      clearAll: () => {
        this.batches.pickups.clear();
        this.batches.projectiles.clear();
      },
      commitFrame: () => {
        this.batches.pickups.commitFrame();
        this.batches.projectiles.commitFrame();
      },
    };

    this.lightRig = new THREE.Group();
    this.scene.add(this.lightRig);

    this.hemi = new THREE.HemisphereLight(0x9dc7ff, 0x150d22, 1.15);
    this.sun = new THREE.DirectionalLight(0x9dc1ff, 1.8);
    this.sun.position.set(30, 45, 18);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 260;
    this.sun.shadow.camera.left = -92;
    this.sun.shadow.camera.right = 92;
    this.sun.shadow.camera.top = 92;
    this.sun.shadow.camera.bottom = -92;
    this.lightRig.add(this.hemi, this.sun, this.sun.target);

    this.playerGlow = new THREE.PointLight(0x4dfff1, 4.4, 28, 2);
    this.accentGlow = new THREE.PointLight(0xff4cc7, 8, 130, 2);
    this.accentGlow.position.set(0, 18, -34);
    this.scene.add(this.playerGlow, this.accentGlow);

    this.graphicsQuality = 'high';
    this.pixelRatioCap = GRAPHICS_PRESETS.high.pixelRatioCap;
    this.renderScale = GRAPHICS_PRESETS.high.renderScale;
    this.postProcessingEnabled = GRAPHICS_PRESETS.high.postProcessing !== false;
    this.currentGraphicsOptions = {
      quality: normalizeQuality(quality),
      fov: 74,
      effectStrength: 'standard',
    };
    this.missionVisualProfile = {
      toneExposure: this.webgl.toneMappingExposure,
      bloomStrength: this.bloom.strength,
      bloomRadius: this.bloom.radius,
      bloomThreshold: this.bloom.threshold,
    };

    this.handleResize = () => this.resize();
    window.addEventListener('resize', this.handleResize);
    this.applyGraphicsOptions(this.currentGraphicsOptions);
    this.resize();
    this.lastRenderStats = this.buildRenderStatsSnapshot({ wallMs: 0, usedComposer: this.postProcessingEnabled });
  }

  setMissionVisualProfile(profile = {}) {
    this.missionVisualProfile = {
      toneExposure: Number.isFinite(profile.toneExposure) ? profile.toneExposure : this.webgl.toneMappingExposure,
      bloomStrength: Number.isFinite(profile.bloomStrength) ? profile.bloomStrength : this.bloom.strength,
      bloomRadius: Number.isFinite(profile.bloomRadius) ? profile.bloomRadius : this.bloom.radius,
      bloomThreshold: Number.isFinite(profile.bloomThreshold) ? profile.bloomThreshold : this.bloom.threshold,
    };
    this.applyResolvedVisualProfile();
    return this.missionVisualProfile;
  }

  getAdjustedVisualProfile(profile = this.resolveBaseVisualProfile()) {
    const base = profile ?? this.resolveBaseVisualProfile();
    const effectPreset = EFFECT_STRENGTH_PRESETS[this.currentGraphicsOptions.effectStrength] ?? EFFECT_STRENGTH_PRESETS.standard;
    return {
      toneExposure: base.toneExposure * effectPreset.exposureMul,
      bloomStrength: Math.max(0, base.bloomStrength * effectPreset.bloomMul),
      bloomRadius: base.bloomRadius,
      bloomThreshold: Math.min(1, base.bloomThreshold + effectPreset.thresholdAdd),
    };
  }

  resolveBaseVisualProfile() {
    if (this.graphicsQuality === 'high') return this.missionVisualProfile;
    const preset = GRAPHICS_PRESETS[this.graphicsQuality] ?? GRAPHICS_PRESETS.high;
    return {
      toneExposure: preset.toneExposure,
      bloomStrength: preset.bloomStrength,
      bloomRadius: preset.bloomRadius,
      bloomThreshold: preset.bloomThreshold,
    };
  }

  applyVisualProfile(profile) {
    const resolved = profile ?? this.resolveBaseVisualProfile();
    this.webgl.toneMappingExposure = resolved.toneExposure;
    this.bloom.strength = resolved.bloomStrength;
    this.bloom.radius = resolved.bloomRadius;
    this.bloom.threshold = resolved.bloomThreshold;
    this.bloom.enabled = resolved.bloomStrength > 0.0001;
  }

  applyResolvedVisualProfile(profile = this.resolveBaseVisualProfile()) {
    this.applyVisualProfile(this.getAdjustedVisualProfile(profile));
  }

  setQualityPreset(quality = 'high') {
    const resolvedQuality = normalizeQuality(quality);
    const preset = GRAPHICS_PRESETS[resolvedQuality];
    this.graphicsQuality = resolvedQuality;
    this.currentGraphicsOptions.quality = resolvedQuality;
    this.pixelRatioCap = preset.pixelRatioCap;
    this.renderScale = preset.renderScale ?? 1;
    this.postProcessingEnabled = preset.postProcessing !== false;
    this.applyRenderScale();
    this.webgl.shadowMap.enabled = preset.shadows;
    this.sun.castShadow = preset.shadows;
    this.sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    this.sun.shadow.needsUpdate = true;
    this.applyResolvedVisualProfile();
    return this.graphicsQuality;
  }

  applyGraphicsOptions(graphicsOptions = {}) {
    this.currentGraphicsOptions = {
      quality: normalizeQuality(graphicsOptions.quality ?? this.currentGraphicsOptions.quality),
      fov: clampFov(graphicsOptions.fov ?? this.currentGraphicsOptions.fov),
      effectStrength: normalizeEffectStrength(graphicsOptions.effectStrength ?? this.currentGraphicsOptions.effectStrength),
    };
    this.camera.fov = this.currentGraphicsOptions.fov;
    this.camera.updateProjectionMatrix();
    this.setQualityPreset(this.currentGraphicsOptions.quality);
    return { ...this.currentGraphicsOptions };
  }

  applyRenderScale() {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scaledPixelRatio = Math.min(devicePixelRatio, this.pixelRatioCap) * (this.renderScale ?? 1);
    this.webgl.setPixelRatio(scaledPixelRatio);
    this.composer.setPixelRatio?.(scaledPixelRatio);
  }

  resize() {
    if (!this.webgl) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.applyRenderScale();
    this.webgl.setSize(window.innerWidth, window.innerHeight);
    this.composer?.setSize?.(window.innerWidth, window.innerHeight);
  }

  buildRenderStatsSnapshot({ wallMs = 0, usedComposer = false } = {}) {
    const info = this.webgl.info;
    const canvas = this.webgl.domElement;
    return {
      wallMs: Number.isFinite(wallMs) ? wallMs : 0,
      drawCalls: info?.render?.calls ?? 0,
      triangles: info?.render?.triangles ?? 0,
      lines: info?.render?.lines ?? 0,
      points: info?.render?.points ?? 0,
      geometries: info?.memory?.geometries ?? 0,
      textures: info?.memory?.textures ?? 0,
      usedComposer: usedComposer === true,
      postProcessingEnabled: this.postProcessingEnabled === true,
      shadowMapEnabled: this.webgl.shadowMap?.enabled === true,
      renderScale: Number(this.renderScale) || 1,
      pixelRatio: this.webgl.getPixelRatio?.() ?? 0,
      viewportWidth: canvas?.width ?? 0,
      viewportHeight: canvas?.height ?? 0,
    };
  }

  getLastRenderStats() {
    return { ...(this.lastRenderStats ?? this.buildRenderStatsSnapshot()) };
  }

  render() {
    if (!this.webgl) return this.getLastRenderStats();
    this.batches?.commitFrame?.();
    this.webgl.info.reset?.();
    const usedComposer = this.postProcessingEnabled === true;
    const startedAt = performance.now();
    if (usedComposer) this.composer?.render?.();
    else this.webgl.render(this.scene, this.camera);
    const wallMs = performance.now() - startedAt;
    this.lastRenderStats = this.buildRenderStatsSnapshot({ wallMs, usedComposer });
    return this.getLastRenderStats();
  }

  dispose() {
    window.removeEventListener('resize', this.handleResize);
    this.handleResize = null;

    this.batches?.pickups?.dispose?.();
    this.batches?.projectiles?.dispose?.();

    this.composer?.dispose?.();
    this.renderPass?.dispose?.();
    this.bloom?.dispose?.();

    const canvas = this.webgl?.domElement ?? null;
    this.webgl?.dispose?.();
    this.webgl?.forceContextLoss?.();
    canvas?.remove?.();

    this.batches = null;
    this.batchedGroups = null;

    this.composer = null;
    this.renderPass = null;
    this.bloom = null;
    this.webgl = null;
  }
}

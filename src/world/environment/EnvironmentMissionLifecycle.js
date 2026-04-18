/**
 * Responsibility:
 * - EnvironmentBuilder の state 初期化、graphics 再適用、mission 適用、frame update を担当する。
 */
import { THREE, clearAndDisposeChildren, detachAndDispose } from '../EnvironmentBuilderShared.js';
import { createDecorForMission } from './DecorRegistry.js';

export function installEnvironmentMissionLifecycle(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.resetEnvironmentState = function resetEnvironmentState() {
    this.skyMaterial = null;
    this.starField = null;
    this.ambientPoints = null;
    this.groundMesh = null;
    this.decorGroup = null;
    this.staticDecorGroup = null;
    this.staticColliders = [];
    this.playerBlockerColliders = [];
    this.projectileBlockerColliders = [];
    this.minimapObstacleColliders = [];
    this.reflectiveStaticColliders = [];
    this.staticColliderGridDirty = true;
    this.staticColliderMaxGridRadius = 0;
    this.localTime = 0;
    this.currentTheme = null;
    this.currentMissionId = 'desert';
    this.snowPoints = null;
    this.snowState = null;
    this.frostMistPoints = null;
    this.frostMistState = null;
    this.frostDomeMesh = null;
    this.frostBaseFogDensity = 0.01;
    this.frostStormBlend = 0;
    this.boundaryVeilMesh = null;
    this.boundaryVeilMaterial = null;
    this.boundaryVeilPoints = null;
    this.boundaryVeilState = null;
    this.groundFollowState = null;
    this.astralGelFields = [];
    this.finalBossSkyReveal = null;
  };

  EnvironmentBuilder.prototype.getGraphicsQuality = function getGraphicsQuality() {
    return this.game.optionState?.graphics?.quality
      ?? this.game.renderer?.currentGraphicsOptions?.quality
      ?? 'high';
  };

  EnvironmentBuilder.prototype.getEnvironmentDensityScale = function getEnvironmentDensityScale(type = 'general') {
    const quality = this.getGraphicsQuality();
    if (quality === 'medium') {
      if (type === 'stars' || type === 'ambient') return 0.5;
      return 1;
    }
    if (quality === 'low') {
      if (type === 'stars' || type === 'ambient') return 0;
      return 1;
    }
    return 1;
  };

  EnvironmentBuilder.prototype.applyGraphicsOptions = function applyGraphicsOptions(graphics = this.game.optionState?.graphics) {
    if (!this.currentTheme) return;
    if (graphics?.quality && this.game.optionState?.graphics) this.game.optionState.graphics.quality = graphics.quality;

    if (this.starField) {
      detachAndDispose(this.starField);
      this.starField = null;
    }
    if (this.ambientPoints) {
      detachAndDispose(this.ambientPoints);
      this.ambientPoints = null;
    }
    this.createStars(this.currentTheme);
    this.createAmbient(this.currentTheme);
  };

  EnvironmentBuilder.prototype.clearWorld = function clearWorld() {
    const { world } = this.game.renderer.groups;
    clearAndDisposeChildren(world);
    this.staticColliderGrid?.clear?.();
    this.resetEnvironmentState();
  };

  EnvironmentBuilder.prototype.applyMission = function applyMission(mission) {
    const { renderer } = this.game;
    const theme = mission.theme;
    this.clearWorld();
    this.currentTheme = theme;
    this.currentMissionId = mission.id;
    this.terrain.setMission(mission.id);

    renderer.scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);
    this.frostBaseFogDensity = theme.fogDensity;
    this.frostStormBlend = 0;
    renderer.hemi.color.setHex(theme.hemiSky);
    renderer.hemi.groundColor.setHex(theme.hemiGround);
    renderer.hemi.intensity = theme.hemiIntensity ?? 1.15;
    renderer.sun.color.setHex(theme.sunColor);
    renderer.sun.intensity = theme.sunIntensity ?? 1.8;
    renderer.accentGlow.color.setHex(theme.accent);
    renderer.accentGlow.intensity = theme.glowIntensity ?? 6.6;
    renderer.webgl.toneMappingExposure = theme.toneMappingExposure ?? 1.16;
    renderer.bloom.strength = theme.bloomStrength ?? 1.08;
    renderer.bloom.radius = theme.bloomRadius ?? 0.65;
    renderer.bloom.threshold = theme.bloomThreshold ?? 0.42;

    if (mission.id === 'mirror') {
      renderer.hemi.intensity *= 1.12;
      renderer.sun.intensity *= 1.08;
      renderer.webgl.toneMappingExposure += 0.1;
      renderer.bloom.strength += 0.1;
      renderer.bloom.threshold = Math.max(0.34, renderer.bloom.threshold - 0.04);
    }

    renderer.setMissionVisualProfile?.({
      toneExposure: renderer.webgl.toneMappingExposure,
      bloomStrength: renderer.bloom.strength,
      bloomRadius: renderer.bloom.radius,
      bloomThreshold: renderer.bloom.threshold,
    });
    renderer.applyGraphicsOptions?.(this.game.optionState?.graphics);

    this.createSky(theme);
    this.createStars(theme);
    this.createGround(theme);
    this.createAmbient(theme);
    this.createBoundaryVeil(theme);
    this.createDecor(mission.id);
    if (mission.id === 'frost') {
      this.createSnow();
      this.createFrostMist();
      this.createFrostBlizzardDome();
    }
  };

  EnvironmentBuilder.prototype.createDecor = function createDecor(missionId) {
    this.staticDecorGroup = new THREE.Group();
    this.decorGroup = new THREE.Group();
    this.game.renderer.groups.world.add(this.staticDecorGroup);
    this.game.renderer.groups.world.add(this.decorGroup);
    createDecorForMission(this, missionId);
  };

  EnvironmentBuilder.prototype.update = function update(dt) {
    this.localTime += dt;
    this.updateGroundFollow();
    if (this.skyMaterial) this.skyMaterial.uniforms.time.value = this.localTime;
    this.updateBoundaryVeil(dt);
    if (this.starField) this.starField.rotation.y += dt * (this.currentTheme?.decor === 'astral' ? 0.018 : this.currentTheme?.decor === 'voidcrown' ? 0.012 : 0.008);
    if (this.ambientPoints) this.ambientPoints.rotation.y -= dt * (this.currentTheme?.decor === 'mirror' ? 0.012 : this.currentTheme?.decor === 'voidcrown' ? 0.01 : 0.02);
    if (this.decorGroup) this.decorGroup.rotation.y += dt * (this.currentTheme?.decor === 'astral' ? 0.006 : this.currentTheme?.decor === 'voidcrown' ? 0.0012 : 0.0025);
    this.updateAstralDecor?.(dt);
    this.updateFrostWeather?.(dt);
    this.updateFinalBossSkyReveal(dt);
  };
}

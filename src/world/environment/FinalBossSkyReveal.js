/**
 * Responsibility:
 * - 最終ボス撃破後の空演出 state と補間更新を担当する。
 */
import { THREE } from '../EnvironmentBuilderShared.js';

const FINAL_BOSS_CLEAR_SKY_PROFILE = Object.freeze({
  skyTop: 0x4e78ba,
  skyBottom: 0x98c6ff,
  accent: 0xaecfff,
  secondaryAccent: 0x6f9eff,
  fogColor: 0x93b8ea,
  fogDensity: 0.0034,
  hemiSky: 0x9cc7ff,
  hemiGround: 0x40516f,
  hemiIntensity: 0.88,
  sunColor: 0xf3f8ff,
  sunIntensity: 0.82,
  accentGlowColor: 0x7fb1ff,
  accentGlowIntensity: 0.72,
  ambientColor: 0xb5d6ff,
  ambientOpacity: 0.018,
  starColor: 0xd9e8ff,
  starOpacity: 0,
  boundaryColorA: 0xc0d8ff,
  boundaryColorB: 0xe3f0ff,
  boundaryOpacity: 0,
  boundaryParticleColor: 0xd5e6ff,
  boundaryParticleOpacity: 0,
  toneExposure: 0.9,
  bloomStrength: 0.24,
  bloomRadius: 0.28,
  bloomThreshold: 0.82,
});

function easeInOut(t) {
  const clamped = THREE.MathUtils.clamp(t, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

export function installFinalBossSkyReveal(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.startFinalBossDefeatSkyReveal = function startFinalBossDefeatSkyReveal({ delay = 0, duration = 2.0 } = {}) {
    if (this.currentMissionId !== 'voidcrown' || !this.skyMaterial) return false;

    const { renderer } = this.game;
    const fog = renderer.scene?.fog;
    const starMaterial = this.starField?.material ?? null;
    const ambientMaterial = this.ambientPoints?.material ?? null;
    const boundaryUniforms = this.boundaryVeilMaterial?.uniforms ?? null;
    const boundaryPointMaterial = this.boundaryVeilPoints?.material ?? null;
    const adjustedFinalVisualProfile = renderer.getAdjustedVisualProfile?.(FINAL_BOSS_CLEAR_SKY_PROFILE) ?? FINAL_BOSS_CLEAR_SKY_PROFILE;

    this.finalBossSkyReveal = {
      time: 0,
      delay: Math.max(0, Number(delay) || 0),
      duration: Math.max(0.001, Number(duration) || 2.0),
      from: {
        skyTop: this.skyMaterial.uniforms.topColor.value.clone(),
        skyBottom: this.skyMaterial.uniforms.bottomColor.value.clone(),
        accent: this.skyMaterial.uniforms.accentColor.value.clone(),
        secondaryAccent: this.skyMaterial.uniforms.secondaryAccent.value.clone(),
        fogColor: fog?.color?.clone?.() ?? new THREE.Color(this.currentTheme?.fogColor ?? 0x05050a),
        fogDensity: Number.isFinite(fog?.density) ? fog.density : (this.currentTheme?.fogDensity ?? 0.01),
        hemiSky: renderer.hemi.color.clone(),
        hemiGround: renderer.hemi.groundColor.clone(),
        hemiIntensity: renderer.hemi.intensity,
        sunColor: renderer.sun.color.clone(),
        sunIntensity: renderer.sun.intensity,
        accentGlowColor: renderer.accentGlow.color.clone(),
        accentGlowIntensity: renderer.accentGlow.intensity,
        ambientColor: ambientMaterial?.color?.clone?.() ?? new THREE.Color(this.currentTheme?.ambientColor ?? 0xffffff),
        ambientOpacity: Number.isFinite(ambientMaterial?.opacity) ? ambientMaterial.opacity : 0,
        starColor: starMaterial?.color?.clone?.() ?? new THREE.Color(this.currentTheme?.starColor ?? 0xffffff),
        starOpacity: Number.isFinite(starMaterial?.opacity) ? starMaterial.opacity : 0,
        boundaryColorA: boundaryUniforms?.colorA?.value?.clone?.() ?? new THREE.Color(this.currentTheme?.boundaryVeil?.primaryColor ?? this.currentTheme?.accent ?? 0xffffff),
        boundaryColorB: boundaryUniforms?.colorB?.value?.clone?.() ?? new THREE.Color(this.currentTheme?.boundaryVeil?.secondaryColor ?? this.currentTheme?.secondaryAccent ?? this.currentTheme?.accent ?? 0xffffff),
        boundaryOpacity: Number.isFinite(boundaryUniforms?.opacity?.value) ? boundaryUniforms.opacity.value : 0,
        boundaryParticleColor: boundaryPointMaterial?.color?.clone?.() ?? new THREE.Color(this.currentTheme?.boundaryVeilParticles?.color ?? this.currentTheme?.accent ?? 0xffffff),
        boundaryParticleOpacity: Number.isFinite(boundaryPointMaterial?.opacity) ? boundaryPointMaterial.opacity : 0,
        toneExposure: renderer.webgl.toneMappingExposure,
        bloomStrength: renderer.bloom.strength,
        bloomRadius: renderer.bloom.radius,
        bloomThreshold: renderer.bloom.threshold,
      },
      to: {
        skyTop: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.skyTop),
        skyBottom: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.skyBottom),
        accent: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.accent),
        secondaryAccent: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.secondaryAccent),
        fogColor: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.fogColor),
        fogDensity: FINAL_BOSS_CLEAR_SKY_PROFILE.fogDensity,
        hemiSky: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.hemiSky),
        hemiGround: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.hemiGround),
        hemiIntensity: FINAL_BOSS_CLEAR_SKY_PROFILE.hemiIntensity,
        sunColor: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.sunColor),
        sunIntensity: FINAL_BOSS_CLEAR_SKY_PROFILE.sunIntensity,
        accentGlowColor: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.accentGlowColor),
        accentGlowIntensity: FINAL_BOSS_CLEAR_SKY_PROFILE.accentGlowIntensity,
        ambientColor: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.ambientColor),
        ambientOpacity: FINAL_BOSS_CLEAR_SKY_PROFILE.ambientOpacity,
        starColor: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.starColor),
        starOpacity: FINAL_BOSS_CLEAR_SKY_PROFILE.starOpacity,
        boundaryColorA: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.boundaryColorA),
        boundaryColorB: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.boundaryColorB),
        boundaryOpacity: FINAL_BOSS_CLEAR_SKY_PROFILE.boundaryOpacity,
        boundaryParticleColor: new THREE.Color(FINAL_BOSS_CLEAR_SKY_PROFILE.boundaryParticleColor),
        boundaryParticleOpacity: FINAL_BOSS_CLEAR_SKY_PROFILE.boundaryParticleOpacity,
        toneExposure: adjustedFinalVisualProfile.toneExposure,
        bloomStrength: adjustedFinalVisualProfile.bloomStrength,
        bloomRadius: adjustedFinalVisualProfile.bloomRadius,
        bloomThreshold: adjustedFinalVisualProfile.bloomThreshold,
      },
    };
    return true;
  };

  EnvironmentBuilder.prototype.updateFinalBossSkyReveal = function updateFinalBossSkyReveal(dt) {
    const reveal = this.finalBossSkyReveal;
    if (!reveal) return;

    const totalDuration = Math.max(0, reveal.delay || 0) + Math.max(0.001, reveal.duration || 0);
    reveal.time = Math.min(totalDuration, reveal.time + dt);
    const revealElapsed = Math.max(0, reveal.time - Math.max(0, reveal.delay || 0));
    const t = easeInOut(revealElapsed / Math.max(0.001, reveal.duration));
    const { from, to } = reveal;
    const { renderer } = this.game;

    this.skyMaterial?.uniforms?.topColor?.value.copy(from.skyTop).lerp(to.skyTop, t);
    this.skyMaterial?.uniforms?.bottomColor?.value.copy(from.skyBottom).lerp(to.skyBottom, t);
    this.skyMaterial?.uniforms?.accentColor?.value.copy(from.accent).lerp(to.accent, t);
    this.skyMaterial?.uniforms?.secondaryAccent?.value.copy(from.secondaryAccent).lerp(to.secondaryAccent, t);

    if (renderer.scene?.fog) {
      renderer.scene.fog.color.copy(from.fogColor).lerp(to.fogColor, t);
      renderer.scene.fog.density = THREE.MathUtils.lerp(from.fogDensity, to.fogDensity, t);
    }

    renderer.hemi.color.copy(from.hemiSky).lerp(to.hemiSky, t);
    renderer.hemi.groundColor.copy(from.hemiGround).lerp(to.hemiGround, t);
    renderer.hemi.intensity = THREE.MathUtils.lerp(from.hemiIntensity, to.hemiIntensity, t);
    renderer.sun.color.copy(from.sunColor).lerp(to.sunColor, t);
    renderer.sun.intensity = THREE.MathUtils.lerp(from.sunIntensity, to.sunIntensity, t);
    renderer.accentGlow.color.copy(from.accentGlowColor).lerp(to.accentGlowColor, t);
    renderer.accentGlow.intensity = THREE.MathUtils.lerp(from.accentGlowIntensity, to.accentGlowIntensity, t);
    renderer.webgl.toneMappingExposure = THREE.MathUtils.lerp(from.toneExposure, to.toneExposure, t);
    renderer.bloom.strength = THREE.MathUtils.lerp(from.bloomStrength, to.bloomStrength, t);
    renderer.bloom.radius = THREE.MathUtils.lerp(from.bloomRadius, to.bloomRadius, t);
    renderer.bloom.threshold = THREE.MathUtils.lerp(from.bloomThreshold, to.bloomThreshold, t);

    if (this.starField?.material) {
      this.starField.material.color.copy(from.starColor).lerp(to.starColor, t);
      this.starField.material.opacity = THREE.MathUtils.lerp(from.starOpacity, to.starOpacity, t);
    }
    if (this.ambientPoints?.material) {
      this.ambientPoints.material.color.copy(from.ambientColor).lerp(to.ambientColor, t);
      this.ambientPoints.material.opacity = THREE.MathUtils.lerp(from.ambientOpacity, to.ambientOpacity, t);
    }
    if (this.boundaryVeilMaterial?.uniforms) {
      this.boundaryVeilMaterial.uniforms.colorA.value.copy(from.boundaryColorA).lerp(to.boundaryColorA, t);
      this.boundaryVeilMaterial.uniforms.colorB.value.copy(from.boundaryColorB).lerp(to.boundaryColorB, t);
      this.boundaryVeilMaterial.uniforms.opacity.value = THREE.MathUtils.lerp(from.boundaryOpacity, to.boundaryOpacity, t);
    }
    if (this.boundaryVeilPoints?.material) {
      this.boundaryVeilPoints.material.color.copy(from.boundaryParticleColor).lerp(to.boundaryParticleColor, t);
      this.boundaryVeilPoints.material.opacity = THREE.MathUtils.lerp(from.boundaryParticleOpacity, to.boundaryParticleOpacity, t);
    }

    if (reveal.time >= totalDuration) this.finalBossSkyReveal = null;
  };
}

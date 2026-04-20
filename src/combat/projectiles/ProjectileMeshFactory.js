import * as THREE from 'three';
import { COLORS } from '../../data/balance.js';
import { PROJECTILE_VISUAL_FAMILY } from './ProjectileShared.js';

function resolveProjectileVisualFamily({ fromPlayer, plasma, isShowBullet, useNormalShowBulletVisuals, isMindriftMine }) {
  if (fromPlayer) return plasma ? PROJECTILE_VISUAL_FAMILY.playerPlasma : PROJECTILE_VISUAL_FAMILY.playerPrimary;
  if (isMindriftMine) return PROJECTILE_VISUAL_FAMILY.enemyMine;
  if (isShowBullet && !useNormalShowBulletVisuals) return PROJECTILE_VISUAL_FAMILY.enemyShowBullet;
  return PROJECTILE_VISUAL_FAMILY.enemyBullet;
}

function buildProjectileVisualDefaults(options, fromPlayer, { displayColor, ringColor, isMindriftMine, isShowBullet, useNormalShowBulletVisuals }) {
  const coreScale = isMindriftMine ? options.radius * 0.78 : (options.plasma ? options.radius : (fromPlayer ? options.radius : options.radius * 1.14));
  const haloScale = (isMindriftMine ? 2.4 : (fromPlayer ? 1.55 : 2.0)) * options.radius;
  const ringScale = fromPlayer ? 0 : options.radius * (isMindriftMine ? 2.2 : 1.75);
  const ringEuler = new THREE.Euler(Math.PI / 2, 0, isMindriftMine ? Math.PI / 5 : 0);
  return {
    coreColor: new THREE.Color(displayColor),
    haloColor: new THREE.Color(displayColor),
    ringColor: new THREE.Color(ringColor),
    coreScale,
    haloScale,
    ringScale,
    coreAlpha: isMindriftMine ? 0.38 : ((isShowBullet && !useNormalShowBulletVisuals) ? 0.42 : (options.plasma ? 0.96 : fromPlayer ? 0.9 : 0.97)),
    coreGlow: isMindriftMine ? 0.34 : ((isShowBullet && !useNormalShowBulletVisuals) ? 1.35 : (options.plasma ? 2.1 : fromPlayer ? 1.6 : 2.25)),
    haloAlpha: isMindriftMine ? 0.14 : (fromPlayer ? (options.plasma ? 0.22 : 0.16) : ((isShowBullet && !useNormalShowBulletVisuals) ? 0.16 : 0.34)),
    haloGlow: 1,
    ringAlpha: isMindriftMine ? 0.18 : (fromPlayer ? 0 : ((isShowBullet && !useNormalShowBulletVisuals) ? 0.28 : 0.72)),
    ringGlow: 1,
    ringEuler,
  };
}

/**
 * Responsibility:
 * - Projectile spawning and visual-family selection.
 *
 * Rules:
 * - projectile.mesh is a logic anchor only. Do not add it to the scene or attach visible child meshes here.
 * - The visible bullet body is allocated through Renderer.batches.projectiles and keyed by visualFamily.
 * - Per-projectile appearance differences must be written into visualState so the batch renderer can mirror the old look.
 */
export const projectileMeshFactoryMethods = {
inferEnemyProjectileSfxId(options = {}) {
  if (options.showBullet) return null;
  if (options.audioCue) return options.audioCue;
  if (options.mindriftMine || options.mineBallistic) return 'enemyMineDeploy';
  if (options.splashRadius || options.gravity) return 'enemyMortar';

  const speed = options.speed ?? options.initialVelocity?.length?.() ?? 0;
  const radius = options.radius ?? 0;
  if (speed >= 50 && radius <= 0.36) return 'enemyLaser';
  if (radius >= 0.56) return 'enemyShotHeavy';
  return 'enemyShot';
},

getEnemyProjectileSfxCooldownMs(trackId) {
  switch (trackId) {
    case 'enemyMineDeploy': return 90;
    case 'enemyMortar': return 70;
    case 'enemyLaser': return 55;
    case 'enemyShotHeavy': return 65;
    default: return 45;
  }
},

spawnPlayerProjectile(options) {
  const projectile = this.createProjectileMesh(options, true);
  if (!projectile) return null;
  this.game.store.playerProjectiles.push(projectile);
  this.syncProjectileVisual(projectile);
  return projectile;
},

spawnEnemyProjectile(options) {
  const projectile = this.createProjectileMesh(options, false);
  if (!projectile) return null;
  this.game.store.enemyProjectiles.push(projectile);
  this.syncProjectileVisual(projectile);

  const sfxId = this.inferEnemyProjectileSfxId(options);
  if (sfxId) this.game.audio?.playSfx(sfxId, {
    cooldownMs: this.getEnemyProjectileSfxCooldownMs(sfxId),
    worldPosition: projectile.mesh.position,
  });
  return projectile;
},

createProjectileMesh(options, fromPlayer) {
  const isShowBullet = !!options.showBullet;
  const useNormalShowBulletVisuals = !!(isShowBullet && options.showBulletUseNormalVisuals);
  const isMindriftMine = !!options.mindriftMine;
  const isBallisticMine = !!options.mineBallistic;
  const enemyWarmColor = options.splashRadius ? 0xffcf58 : options.radius >= 0.56 ? 0xffb347 : COLORS.enemyShot;
  const displayColor = fromPlayer
    ? options.color
    : (isMindriftMine
      ? (options.color ?? 0x8ff8ff)
      : ((isShowBullet && !useNormalShowBulletVisuals) ? 0x8fd8ff : enemyWarmColor));
  const ringColor = isMindriftMine
    ? 0xffffff
    : ((isShowBullet && !useNormalShowBulletVisuals) ? 0xdff4ff : (options.splashRadius ? 0xfff0be : 0xffd074));

  const projectileOrigin = options.origin?.clone?.() ?? new THREE.Vector3();
  const projectileDirection = options.direction?.clone?.() ?? new THREE.Vector3(0, 0, -1);
  const projectileInitialVelocity = options.initialVelocity?.clone?.() ?? null;
  const anchor = new THREE.Object3D();
  anchor.position.copy(projectileOrigin);

  const visualFamily = resolveProjectileVisualFamily({
    fromPlayer,
    plasma: !!options.plasma,
    isShowBullet,
    useNormalShowBulletVisuals,
    isMindriftMine,
  });
  const visualState = buildProjectileVisualDefaults(options, fromPlayer, {
    displayColor,
    ringColor,
    isMindriftMine,
    isShowBullet,
    useNormalShowBulletVisuals,
  });
  const visualHandle = this.game.renderer?.batches?.projectiles?.allocate?.(visualFamily, { fromPlayer, plasma: !!options.plasma }) ?? null;
  if (!visualHandle) {
    console.warn(`[ProjectileBatchRenderer] capacity exhausted for ${visualFamily}`);
    return null;
  }

  return {
    ...options,
    origin: projectileOrigin,
    direction: projectileDirection,
    initialVelocity: projectileInitialVelocity,
    color: displayColor,
    fromPlayer,
    mesh: anchor,
    visualFamily,
    visualHandle,
    visualState,
    visualBase: {
      coreColor: visualState.coreColor.clone(),
      haloColor: visualState.haloColor.clone(),
      ringColor: visualState.ringColor.clone(),
      coreScale: visualState.coreScale,
      haloScale: visualState.haloScale,
      ringScale: visualState.ringScale,
      coreAlpha: visualState.coreAlpha,
      haloAlpha: visualState.haloAlpha,
      ringAlpha: visualState.ringAlpha,
      coreGlow: visualState.coreGlow,
      haloGlow: visualState.haloGlow,
      ringGlow: visualState.ringGlow,
      ringEuler: visualState.ringEuler.clone(),
    },
    velocity: (projectileInitialVelocity ? projectileInitialVelocity.clone() : projectileDirection.clone().multiplyScalar(options.speed)),
    speed: options.speed ?? (options.initialVelocity ? options.initialVelocity.length() : 0),
    gravity: options.gravity ?? 0,
    life: options.life,
    alive: true,
    splashTriggered: false,
    pierceLeft: options.pierce ?? 0,
    hitSet: new Set(),
    target: options.target ?? null,
    aimPoint: options.aimPoint ? options.aimPoint.clone() : null,
    turnRate: options.turnRate ?? 0,
    visualAge: 0,
    clearEnemyProjectiles: !!options.clearEnemyProjectiles,
    splashClearsEnemyProjectiles: options.splashClearsEnemyProjectiles ?? false,
    bulletClearRadius: options.bulletClearRadius ?? options.radius,
    enemyPierceUnlimited: !!options.enemyPierceUnlimited,
    ignoreWorldHit: !!options.ignoreWorldHit,
    showBullet: isShowBullet,
    mindriftMine: isMindriftMine,
    mineBallistic: isBallisticMine,
    mindriftOwnerId: options.mindriftOwnerId ?? null,
    mineAge: 0,
    armDelay: options.armDelay ?? 1.0,
    mineArmed: false,
    mineTriggerRadius: options.mineTriggerRadius ?? 5.2,
    minePrimeDelay: options.minePrimeDelay ?? 0.24,
    minePrimeTimer: null,
    mineDetonating: false,
    mineArmSoundPlayed: false,
    mineHoverHeight: options.mineHoverHeight ?? 0.92,
    mineDriftDamping: options.mineDriftDamping ?? 4.0,
    mineBobAmp: options.mineBobAmp ?? 0.2,
    mineArmPulse: options.mineArmPulse ?? 1.0,
    astralGelDebuffed: false,
    reflectionCooldown: 0,
    ricochetCount: 0,
    maxRicochets: options.maxRicochets ?? 16,
    fadingOut: false,
    fadeElapsed: 0,
    fadeDuration: 0,
  };
}
};

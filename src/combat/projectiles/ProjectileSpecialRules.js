import * as THREE from 'three';
import { COLORS } from '../../data/balance.js';
import {
  REFLECT_NORMAL,
  HIT_POINT,
  UP,
  PROJECTILE_CULL_LIMIT,
} from './ProjectileShared.js';

/**
 * Responsibility:
 * - Projectile visual state updates, splash behavior, and special-world interactions.
 *
 * Rules:
 * - visualState is the single source of truth for projectile appearance. Do not edit child meshes or materials directly.
 * - syncProjectileVisual() is the bridge into Renderer.batches.projectiles. Gameplay code should update state first, then sync.
 * - projectile.mesh is still the logic anchor used by collision, targeting, and audio world positions.
 */
export const projectileSpecialRulesMethods = {
spawnPlayerProjectileImpactExplosion(projectile, position, scaleMultiplier = 1) {
  if (!projectile?.fromPlayer || projectile.plasma || projectile.splashRadius) return;
  const effectPosition = position?.clone?.() ?? projectile.mesh.position.clone();
  const effectScale = Math.max(0.48, (projectile.radius ?? 0.42) * 1.4 * scaleMultiplier);
  this.game.effects.spawnExplosion(effectPosition, projectile.color ?? COLORS.player, effectScale);
},

shouldApplyAstralGelDebuff(projectile) {
  return !!(projectile?.fromPlayer && !projectile.astralGelDebuffed);
},

syncProjectileVisual(projectile) {
  this.game.renderer?.batches?.projectiles?.syncProjectile?.(projectile);
},

applyAstralGelDebuffVisual(projectile) {
  const state = projectile?.visualState;
  if (!state) return;
  state.coreColor.multiplyScalar(projectile.plasma ? 0.42 : 0.48);
  state.haloColor.multiplyScalar(projectile.plasma ? 0.34 : 0.4);
  state.ringColor.multiplyScalar(projectile.plasma ? 0.34 : 0.4);
  state.coreGlow *= projectile.plasma ? 0.58 : 0.62;
  state.haloGlow *= projectile.plasma ? 0.72 : 0.76;
  state.ringGlow *= projectile.plasma ? 0.72 : 0.76;
},

applyAstralGelDebuff(projectile) {
  if (!this.shouldApplyAstralGelDebuff(projectile)) return false;
  projectile.astralGelDebuffed = true;
  projectile.speed = Math.max(1, (projectile.speed ?? projectile.velocity.length()) * 0.5);
  projectile.velocity.multiplyScalar(0.5);
  projectile.damage *= 0.5;
  if (Number.isFinite(projectile.splashDamage)) projectile.splashDamage *= 0.5;
  if (Number.isFinite(projectile.splashRadius)) projectile.splashRadius *= 0.5;
  if (Number.isFinite(projectile.bulletClearRadius)) projectile.bulletClearRadius *= 0.5;
  this.applyAstralGelDebuffVisual(projectile);
  this.syncProjectileVisual(projectile);
  return true;
},

clearEnemyProjectilesInRadius(center, radius, { detonateMines = false } = {}) {
  if (radius <= 0) return 0;

  let cleared = 0;
  for (let i = this.game.store.enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const enemyProjectile = this.game.store.enemyProjectiles[i];
    if (!enemyProjectile?.alive) continue;
    if (!this.collision.sphereHit(center, radius, enemyProjectile.mesh.position, enemyProjectile.radius ?? 0.4)) continue;
    if (enemyProjectile.mindriftMine) {
      if (!detonateMines) continue;
      this.detonateMindriftMine(enemyProjectile, i);
      cleared += 1;
      continue;
    }
    this.game.effects.spawnHitSpark(enemyProjectile.mesh.position.clone(), enemyProjectile.color ?? COLORS.plasma, Math.max(0.65, (enemyProjectile.radius ?? 0.4) * 2.0));
    this.removeProjectile(enemyProjectile, this.game.store.enemyProjectiles, i);
    cleared += 1;
  }
  return cleared;
},

detonateMindriftMine(projectile, index = -1) {
  if (!projectile?.alive) return false;
  this.triggerSplash(projectile);
  this.removeProjectile(projectile, this.game.store.enemyProjectiles, index);
  return true;
},

handlePlayerProjectileMineHit(projectile) {
  const canClearMine = projectile.plasma || projectile.clearEnemyProjectiles || projectile.splashRadius;
  if (!canClearMine) return false;

  for (let i = this.game.store.enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const enemyProjectile = this.game.store.enemyProjectiles[i];
    if (!enemyProjectile?.alive || !enemyProjectile.mindriftMine) continue;
    if (!this.collision.sphereHit(projectile.mesh.position, projectile.radius, enemyProjectile.mesh.position, enemyProjectile.radius ?? 0.4)) continue;
    this.detonateMindriftMine(enemyProjectile, i);
    if (projectile.plasma || projectile.splashRadius) this.triggerSplash(projectile);
    return true;
  }
  return false;
},

isMirrorCitadelActive() {
  return this.game.missionSystem?.currentMission?.id === 'mirror';
},

tryReflectProjectile(projectile, worldHit) {
  if (!this.isMirrorCitadelActive() || !worldHit?.reflective) return false;
  if ((projectile.ricochetCount ?? 0) >= (projectile.maxRicochets ?? 16)) return false;
  if ((projectile.reflectionCooldown ?? 0) > 0) return true;

  REFLECT_NORMAL.copy(worldHit.normal ?? UP);
  if (REFLECT_NORMAL.lengthSq() < 0.0001) REFLECT_NORMAL.copy(UP);
  else REFLECT_NORMAL.normalize();
  if (projectile.velocity.dot(REFLECT_NORMAL) > 0) REFLECT_NORMAL.negate();

  projectile.velocity.reflect(REFLECT_NORMAL).setLength(projectile.speed);
  HIT_POINT.copy(worldHit.point ?? projectile.mesh.position);
  projectile.mesh.position.copy(HIT_POINT).addScaledVector(REFLECT_NORMAL, projectile.radius + 0.08);
  projectile.reflectionCooldown = 0.06;
  projectile.ricochetCount = (projectile.ricochetCount ?? 0) + 1;
  if (projectile.fromPlayer) this.retargetPlayerProjectileAfterReflection(projectile);
  this.game.effects.spawnHitSpark(HIT_POINT.clone(), projectile.color, Math.max(0.9, projectile.radius * 1.5));
  this.syncProjectileVisual(projectile);
  return true;
},

shouldPlayerProjectilePassThroughObstacle(projectile) {
  if (projectile.plasma) return true;
  return (projectile.pierceLeft ?? 0) > 0;
},

getProjectileTravelScale(projectile) {
  if (projectile?.fromPlayer) return 1;
  return this.game.world.getProjectileSpeedScaleAt?.(projectile?.mesh?.position, projectile?.radius ?? 0) ?? 1;
},

applyBaseProjectileVisual(projectile, fadeFactor) {
  const base = projectile.visualBase;
  const state = projectile.visualState;
  if (!base || !state) return;

  state.coreScale = base.coreScale;
  state.haloScale = base.haloScale;
  state.ringScale = base.ringScale;
  state.coreAlpha = base.coreAlpha * fadeFactor;
  state.haloAlpha = base.haloAlpha * fadeFactor;
  state.ringAlpha = base.ringAlpha * fadeFactor;
  state.coreGlow = base.coreGlow * fadeFactor;
  state.haloGlow = base.haloGlow;
  state.ringGlow = base.ringGlow;
  state.coreColor.copy(base.coreColor);
  state.haloColor.copy(base.haloColor);
  state.ringColor.copy(base.ringColor);
  state.ringEuler.copy(base.ringEuler);
  if (projectile.astralGelDebuffed) this.applyAstralGelDebuffVisual(projectile);
},

updateProjectileVisual(projectile, dt, fromPlayer) {
  projectile.visualAge += dt;
  const fadeProgress = projectile.fadingOut
    ? THREE.MathUtils.clamp((projectile.fadeElapsed ?? 0) / Math.max(0.01, projectile.fadeDuration ?? 0.01), 0, 1)
    : 0;
  const fadeFactor = 1 - fadeProgress;

  this.applyBaseProjectileVisual(projectile, fadeFactor);

  if (projectile.mindriftMine) {
    const pulse = 0.94 + Math.sin(projectile.visualAge * (projectile.mineArmed ? 10 : 5)) * 0.08;
    projectile.visualState.haloScale = projectile.visualBase.haloScale * pulse;
    projectile.visualState.ringEuler.z += dt * 1.8;
    projectile.visualState.ringEuler.y -= dt * 0.9;
    return;
  }

  const pulse = fromPlayer ? 0.96 + Math.sin(projectile.visualAge * 18) * 0.06 : 1.05 + Math.sin(projectile.visualAge * 14) * 0.14;
  projectile.visualState.haloScale = projectile.visualBase.haloScale * pulse;
  projectile.visualState.haloAlpha = (
    fromPlayer
      ? ((projectile.plasma ? 0.22 : 0.16) + Math.sin(projectile.visualAge * 16) * 0.02)
      : (0.34 + Math.sin(projectile.visualAge * 12) * 0.05)
  ) * fadeFactor;
  projectile.visualState.haloGlow = fromPlayer ? 1.05 : 1.15;

  if (projectile.visualBase.ringScale > 0) {
    projectile.visualState.ringEuler.z += dt * 7.5;
    projectile.visualState.ringEuler.y += dt * 3.5;
    projectile.visualState.ringAlpha = (0.62 + Math.sin(projectile.visualAge * 12) * 0.1) * fadeFactor;
    projectile.visualState.ringGlow = 1.12;
  }
},

isOutOfBounds(projectile) {
  const pos = projectile.mesh.position;
  return Math.abs(pos.x) > PROJECTILE_CULL_LIMIT || Math.abs(pos.z) > PROJECTILE_CULL_LIMIT || pos.y < -32 || pos.y > 180;
},

shouldInstantDetonateMindriftMine(projectile, playerMesh) {
  if (!playerMesh) return false;
  if (!projectile.mineArmed) return false;

  const triggerRadius = Math.max(
    projectile.mineTriggerRadius ?? 0,
    (projectile.splashRadius ?? 0) + 2.0,
  );
  if (triggerRadius <= 0) return false;

  return projectile.mesh.position.distanceToSquared(playerMesh.position) <= triggerRadius * triggerRadius;
},

updateBallisticMindriftMine(projectile, dt) {
  projectile.mineAge += dt;
  const groundY = this.game.world.getHeight(projectile.mesh.position.x, projectile.mesh.position.z);
  const landed = projectile.mesh.position.y <= groundY + 0.38 && projectile.velocity.y <= 0;

  projectile.visualState.coreAlpha = 0.34;
  projectile.visualState.coreGlow = 0.4 + Math.sin(projectile.visualAge * 8) * 0.08;
  projectile.visualState.haloAlpha = 0.12 + Math.sin(projectile.visualAge * 7) * 0.03;
  projectile.visualState.ringAlpha = 0.18 + Math.sin(projectile.visualAge * 9) * 0.04;

  const playerMesh = this.game.store.playerMesh;
  if (this.shouldInstantDetonateMindriftMine(projectile, playerMesh)) {
    this.triggerSplash(projectile);
    return true;
  }

  if (landed) {
    projectile.mineBallistic = false;
    projectile.mineAge = 0;
    projectile.mineArmed = false;
    projectile.minePrimeTimer = null;
    projectile.mineDetonating = false;
    projectile.mineArmSoundPlayed = false;
    projectile.velocity.set(0, 0, 0);
    projectile.mesh.position.y = groundY + (projectile.mineHoverHeight ?? 0.92);
    projectile.life = Math.max(projectile.life, projectile.mineGroundLife ?? 6.4);
    this.game.effects.spawnHitSpark(projectile.mesh.position.clone(), projectile.color, Math.max(0.95, projectile.radius * 1.8));
  }

  if (projectile.life <= 0) {
    this.triggerSplash(projectile);
    return true;
  }

  return false;
},

updateMindriftMine(projectile, dt) {
  projectile.mineAge += dt;
  const wasArmed = projectile.mineArmed;
  projectile.mineArmed = projectile.mineArmed || projectile.mineAge >= (projectile.armDelay ?? 1.0);
  if (!wasArmed && projectile.mineArmed && !projectile.mineArmSoundPlayed) {
    projectile.mineArmSoundPlayed = true;
    this.game.audio?.playSfx('enemyMineArmed', { cooldownMs: 90, worldPosition: projectile.mesh.position });
  }
  const groundY = this.game.world.getHeight(projectile.mesh.position.x, projectile.mesh.position.z);
  const hoverY = groundY + (projectile.mineHoverHeight ?? 0.92);

  const drag = Math.exp(-(projectile.mineDriftDamping ?? 4.0) * dt);
  projectile.velocity.x *= drag;
  projectile.velocity.z *= drag;
  projectile.velocity.y = 0;
  projectile.mesh.position.y = THREE.MathUtils.damp(projectile.mesh.position.y, hoverY, projectile.mineArmed ? 8.0 : 6.2, dt);

  projectile.visualState.coreAlpha = projectile.mineArmed ? 0.54 : 0.3;
  projectile.visualState.coreGlow = projectile.mineArmed
    ? 0.72 + Math.sin(projectile.visualAge * 10) * 0.14 * (projectile.mineArmPulse ?? 1)
    : 0.28 + Math.sin(projectile.visualAge * 6) * 0.04;
  projectile.visualState.haloAlpha = projectile.mineArmed
    ? 0.18 + Math.sin(projectile.visualAge * 9) * 0.04
    : 0.09 + Math.sin(projectile.visualAge * 6) * 0.02;
  projectile.visualState.ringAlpha = projectile.mineArmed
    ? 0.26 + Math.sin(projectile.visualAge * 8) * 0.05
    : 0.14 + Math.sin(projectile.visualAge * 5) * 0.03;

  const playerMesh = this.game.store.playerMesh;
  if (this.shouldInstantDetonateMindriftMine(projectile, playerMesh)) {
    this.triggerSplash(projectile);
    return true;
  }

  const shouldPrime = projectile.mineDetonating
    || (projectile.mineArmed && playerMesh && projectile.mesh.position.distanceToSquared(playerMesh.position) <= (projectile.mineTriggerRadius ?? 5.2) ** 2);
  if (shouldPrime && projectile.minePrimeTimer == null) projectile.minePrimeTimer = projectile.minePrimeDelay ?? 0.24;
  if (projectile.minePrimeTimer != null) {
    projectile.minePrimeTimer -= dt;
    if (projectile.minePrimeTimer <= 0) {
      this.triggerSplash(projectile);
      return true;
    }
  }

  if (projectile.life <= 0) {
    if (projectile.mineArmed) this.triggerSplash(projectile);
    return true;
  }

  return false;
},

triggerSplash(projectile, options = null) {
  if (projectile.splashTriggered) return;
  projectile.splashTriggered = true;
  if (projectile.fromPlayer && projectile.plasma) this.game.audio?.playSfx('playerPlasmaBurst', {
    cooldownMs: 70,
    worldPosition: projectile.mesh.position,
  });
  this.game.effects.spawnExplosion(projectile.mesh.position.clone(), projectile.color, projectile.plasma ? 2.2 : 1.15);
  this.game.effects.spawnShockwave(projectile.mesh.position.clone(), projectile.color, projectile.splashRadius ?? 5);
  if (projectile.fromPlayer) {
    const splashHits = this.game.enemies.damageEnemiesInRadius(projectile.mesh.position.clone(), projectile.splashRadius, projectile.splashDamage ?? projectile.damage, {
      shotId: projectile.shotId ?? null,
      shotGroupId: projectile.shotGroupId ?? null,
      weaponType: projectile.weaponType ?? null,
      directHitEnemy: options?.directHitEnemy ?? null,
    });
    if (splashHits > 0) this.game.missionAchievements?.registerShotGroupHit?.(projectile.shotGroupId);
    if (projectile.splashClearsEnemyProjectiles) this.clearEnemyProjectilesInRadius(projectile.mesh.position, projectile.splashRadius ?? 0, { detonateMines: true });
  } else {
    const playerMesh = this.game.store.playerMesh;
    if (playerMesh && playerMesh.position.distanceTo(projectile.mesh.position) <= (projectile.splashRadius ?? 0) + 2.0) {
      this.game.playerSystem.applyDamage(projectile.splashDamage ?? projectile.damage * 0.7, { sourcePosition: projectile.mesh.position });
    }
  }
},

removeProjectile(projectile, array, index = -1) {
  if (projectile) projectile.alive = false;
  if (index >= 0 && array[index] === projectile) array.splice(index, 1);
  else {
    const fallbackIndex = array.indexOf(projectile);
    if (fallbackIndex >= 0) array.splice(fallbackIndex, 1);
  }
  projectile?.visualHandle && this.game.renderer?.batches?.projectiles?.release?.(projectile.visualHandle);
  projectile.visualHandle = null;
  projectile.mesh?.parent?.remove?.(projectile.mesh);
}
};

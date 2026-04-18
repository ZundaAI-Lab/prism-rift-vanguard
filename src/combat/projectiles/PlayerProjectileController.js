import * as THREE from 'three';
import {
  CURRENT_DIR,
  PREDICTED,
  DESIRED,
  PREVIOUS_PROJECTILE_POS,
  UP,
  PRIMARY_VERTICAL_STEER,
  PRIMARY_VERTICAL_TURN_BOOST,
  PLASMA_VERTICAL_STEER,
  PLASMA_VERTICAL_TURN_BOOST,
  getHomingLevelFactor,
  getClosestPointOnEnemyHitShape,
  getEnemyHitHalfHeight,
  getEnemyHitShape,
} from './ProjectileShared.js';

const PROJECTILE_ENEMY_CONTACT = new THREE.Vector3();

export const playerProjectileControllerMethods = {
isPlayerProjectileTargetValid(target) {
  return !!(target && target.alive && target.mesh?.visible !== false && this.game.enemies.isEnemyInCurrentFrameView(target));
},

acquirePlayerProjectileTarget(projectile, forward, { allowWideRetarget = false, excludeSet = projectile.hitSet ?? null } = {}) {
  const homingAssist = THREE.MathUtils.clamp(projectile.homing ?? 0, 0, 1);
  if (projectile.plasma) {
    const lockWindow = this.game.aimAssist.getPlasmaLockWindow(homingAssist, { allowWideRetarget, homingLevel: projectile.homingLevel ?? null });
    const target = this.game.aimAssist.findForwardPriorityTarget(projectile.mesh.position, forward, {
      ...lockWindow,
      excludeSet,
    });
    if (target) return target;
  }

  const lockWindow = this.game.aimAssist.getPrimaryLockWindow(homingAssist, { allowWideRetarget, homingLevel: projectile.homingLevel ?? null });
  return this.game.aimAssist.findTarget(projectile.mesh.position, forward, lockWindow.maxDistance, {
    minAlignment: lockWindow.minAlignment,
    maxLateralError: lockWindow.maxLateralError,
    maxVerticalError: lockWindow.maxVerticalError,
    verticalWeight: lockWindow.verticalWeight,
    excludeSet,
  });
},

updatePlayerProjectilePostHitTracking(projectile, hitEnemy) {
  if ((projectile.homing ?? 0) <= 0) return;

  if (projectile.target === hitEnemy || projectile.hitSet?.has(projectile.target)) {
    projectile.target = null;
    projectile.aimPoint = null;
  }

  if (!projectile.enemyPierceUnlimited && (projectile.pierceLeft ?? 0) <= 0) return;

  CURRENT_DIR.copy(projectile.velocity);
  if (CURRENT_DIR.lengthSq() < 0.000001) return;
  CURRENT_DIR.normalize();

  const retarget = this.acquirePlayerProjectileTarget(projectile, CURRENT_DIR, {
    allowWideRetarget: true,
    excludeSet: projectile.hitSet ?? null,
  });
  projectile.target = retarget;
  if (!retarget) projectile.aimPoint = null;
},

retargetPlayerProjectileAfterReflection(projectile) {
  if (!projectile?.fromPlayer) return;

  projectile.target = null;
  projectile.aimPoint = null;
  if ((projectile.homing ?? 0) <= 0) return;

  CURRENT_DIR.copy(projectile.velocity);
  if (CURRENT_DIR.lengthSq() < 0.000001) return;
  CURRENT_DIR.normalize();

  projectile.target = this.acquirePlayerProjectileTarget(projectile, CURRENT_DIR, {
    allowWideRetarget: true,
    excludeSet: projectile.hitSet ?? null,
  });
},

updatePlayerProjectileAim(projectile, dt) {
  if (projectile.homing <= 0) return;

  const currentSpeed = Math.max(1, projectile.velocity.length(), projectile.speed ?? 0);
  CURRENT_DIR.copy(projectile.velocity);
  if (CURRENT_DIR.lengthSq() < 0.000001) return;
  CURRENT_DIR.normalize();

  const previousTarget = projectile.target;
  const targetAlreadyHit = !!previousTarget && projectile.hitSet?.has(previousTarget);
  let target = (!targetAlreadyHit && this.isPlayerProjectileTargetValid(previousTarget)) ? previousTarget : null;
  const lostTarget = !!previousTarget && !target;
  if (!target) target = this.acquirePlayerProjectileTarget(projectile, CURRENT_DIR, { allowWideRetarget: lostTarget });

  if (projectile.plasma && (lostTarget || (target && target !== previousTarget))) {
    projectile.aimPoint = null;
  }
  projectile.target = target;

  const aimPoint = projectile.aimPoint;
  if (target) {
    const timeToTarget = projectile.mesh.position.distanceTo(target.mesh.position) / currentSpeed;
    PREDICTED.copy(target.mesh.position).addScaledVector(target.velocity || target.localVelocity || UP, timeToTarget * 0.45);
    getClosestPointOnEnemyHitShape(projectile.mesh.position, target, PREDICTED, PREDICTED);
    if (aimPoint && !projectile.plasma) PREDICTED.lerp(aimPoint, 0.28);
  } else if (aimPoint) {
    PREDICTED.copy(aimPoint);
  } else {
    return;
  }

  DESIRED.copy(PREDICTED).sub(projectile.mesh.position);
  if (DESIRED.lengthSq() < 0.0001) return;

  const homingLevelFactor = getHomingLevelFactor(projectile);
  const verticalDelta = PREDICTED.y - projectile.mesh.position.y;
  const verticalFactor = projectile.plasma
    ? THREE.MathUtils.clamp(Math.abs(verticalDelta) / 12, 0, 1)
    : THREE.MathUtils.clamp(Math.abs(verticalDelta) / 8, 0, 1);
  const verticalSteerWindow = projectile.plasma
    ? {
      min: THREE.MathUtils.lerp(PLASMA_VERTICAL_STEER.minAtLv0, PLASMA_VERTICAL_STEER.minAtMax, homingLevelFactor),
      max: THREE.MathUtils.lerp(PLASMA_VERTICAL_STEER.maxAtLv0, PLASMA_VERTICAL_STEER.maxAtMax, homingLevelFactor),
    }
    : {
      min: THREE.MathUtils.lerp(PRIMARY_VERTICAL_STEER.minAtLv0, PRIMARY_VERTICAL_STEER.minAtMax, homingLevelFactor),
      max: THREE.MathUtils.lerp(PRIMARY_VERTICAL_STEER.maxAtLv0, PRIMARY_VERTICAL_STEER.maxAtMax, homingLevelFactor),
    };
  const verticalSteerScale = THREE.MathUtils.lerp(verticalSteerWindow.min, verticalSteerWindow.max, verticalFactor);
  DESIRED.y *= verticalSteerScale;
  DESIRED.normalize();

  const targetDistance = projectile.mesh.position.distanceTo(PREDICTED);
  const closeRangeFactor = projectile.plasma
    ? THREE.MathUtils.clamp(1 - targetDistance / 84, 0, 1)
    : THREE.MathUtils.clamp(1 - targetDistance / 48, 0, 1);
  const angleError = CURRENT_DIR.angleTo(DESIRED);
  const angleFactor = THREE.MathUtils.clamp(angleError / (projectile.plasma ? 0.9 : 0.7), 0, 1);
  const baseResponsiveness = Math.max(0, projectile.turnRate ?? 0);
  const proximityResponsiveness = projectile.plasma
    ? THREE.MathUtils.lerp(3.5, 9.5, closeRangeFactor)
    : THREE.MathUtils.lerp(5.5, 15.5, closeRangeFactor);
  const correctionResponsiveness = projectile.plasma
    ? THREE.MathUtils.lerp(0.8, 4.0, angleFactor)
    : THREE.MathUtils.lerp(1.2, 6.2, angleFactor);
  const verticalTurnBoostWindow = projectile.plasma
    ? {
      min: THREE.MathUtils.lerp(PLASMA_VERTICAL_TURN_BOOST.minAtLv0, PLASMA_VERTICAL_TURN_BOOST.minAtMax, homingLevelFactor),
      max: THREE.MathUtils.lerp(PLASMA_VERTICAL_TURN_BOOST.maxAtLv0, PLASMA_VERTICAL_TURN_BOOST.maxAtMax, homingLevelFactor),
    }
    : {
      min: THREE.MathUtils.lerp(PRIMARY_VERTICAL_TURN_BOOST.minAtLv0, PRIMARY_VERTICAL_TURN_BOOST.minAtMax, homingLevelFactor),
      max: THREE.MathUtils.lerp(PRIMARY_VERTICAL_TURN_BOOST.maxAtLv0, PRIMARY_VERTICAL_TURN_BOOST.maxAtMax, homingLevelFactor),
    };
  const verticalResponsiveness = THREE.MathUtils.lerp(verticalTurnBoostWindow.min, verticalTurnBoostWindow.max, verticalFactor);
  const trackingResponsiveness = baseResponsiveness + proximityResponsiveness + correctionResponsiveness + verticalResponsiveness;
  const assistStrength = THREE.MathUtils.clamp(1 - Math.exp(-trackingResponsiveness * dt), 0, 0.9);
  CURRENT_DIR.lerp(DESIRED, assistStrength).normalize();
  projectile.velocity.copy(CURRENT_DIR.multiplyScalar(currentSpeed));
  projectile.speed = currentSpeed;
},

getPlayerProjectileEnemyContactPoint(projectile, enemy, enemyPosition, enemyRadius, out = PROJECTILE_ENEMY_CONTACT) {
  const enemyShape = getEnemyHitShape(enemy);
  const enemyHalfHeight = getEnemyHitHalfHeight(enemy);
  const currentHit = enemyShape === 'capsule'
    ? this.collision.sphereVsVerticalCapsuleHit(projectile.mesh.position, projectile.radius, enemyPosition, enemyRadius, enemyHalfHeight, out)
    : this.collision.sphereHit(projectile.mesh.position, projectile.radius, enemyPosition, enemyRadius);
  if (currentHit) return out.copy(projectile.mesh.position);

  const allowSweptHit = projectile.plasma || projectile.splashRadius || enemy?.def?.isBoss || enemyShape === 'capsule';
  if (!allowSweptHit) return null;
  const sweptHit = enemyShape === 'capsule'
    ? this.collision.sweptSphereVsVerticalCapsuleHit(PREVIOUS_PROJECTILE_POS, projectile.mesh.position, projectile.radius, enemyPosition, enemyRadius, enemyHalfHeight, out)
    : this.collision.sweptSphereHit(PREVIOUS_PROJECTILE_POS, projectile.mesh.position, projectile.radius, enemyPosition, enemyRadius, out);
  if (!sweptHit) return null;
  return out;
},

resolvePlayerProjectileEnemyHits(projectile, enemyFrameView, perf) {
  let remove = false;
  const enemyEntries = enemyFrameView.entries;
  for (let enemyIndex = enemyFrameView.count - 1; enemyIndex >= 0; enemyIndex -= 1) {
    const entry = enemyEntries[enemyIndex];
    const enemy = entry.enemy;
    if (!enemy?.alive || enemy.mesh.visible === false || projectile.hitSet.has(enemy)) continue;
    perf?.count?.('playerProjectileEnemyHitTests', 1);
    PREDICTED.set(entry.x, entry.y, entry.z);
    const contactPoint = this.getPlayerProjectileEnemyContactPoint(projectile, enemy, PREDICTED, entry.radius, PROJECTILE_ENEMY_CONTACT);
    if (!contactPoint) continue;

    if (projectile.plasma || projectile.splashRadius) projectile.mesh.position.copy(contactPoint);
    projectile.hitSet.add(enemy);
    this.game.audio?.playSfx('playerShotHit', {
      cooldownMs: projectile.plasma ? 70 : 35,
      worldPosition: enemy.mesh.position,
    });
    const damageApplied = this.game.enemies.damageEnemy(enemy, projectile.damage, {
      shotId: projectile.shotId ?? null,
      shotGroupId: projectile.shotGroupId ?? null,
      weaponType: projectile.weaponType ?? null,
    });
    if (damageApplied) this.game.missionAchievements?.registerShotGroupHit?.(projectile.shotGroupId);
    if (projectile.splashRadius && !projectile.splashTriggered) {
      this.triggerSplash(projectile, { directHitEnemy: enemy });
      remove = true;
      break;
    }

    if (projectile.enemyPierceUnlimited) {
      this.updatePlayerProjectilePostHitTracking(projectile, enemy);
      continue;
    }

    if (projectile.pierceLeft > 0) {
      projectile.pierceLeft -= 1;
      this.updatePlayerProjectilePostHitTracking(projectile, enemy);
    } else {
      this.spawnPlayerProjectileImpactExplosion(projectile, contactPoint);
      remove = true;
      break;
    }
  }

  return remove;
},

updatePlayerProjectiles(dt) {
  const perf = this.game.debug?.getPerformanceMonitor?.();
  for (let i = this.game.store.playerProjectiles.length - 1; i >= 0; i -= 1) {
    const projectile = this.game.store.playerProjectiles[i];
    projectile.life -= dt;
    projectile.reflectionCooldown = Math.max(0, (projectile.reflectionCooldown ?? 0) - dt);
    if (this.shouldApplyAstralGelDebuff(projectile)
      && this.game.world.isPointInsideAstralGel?.(projectile.mesh.position, projectile.radius ?? 0)) {
      this.applyAstralGelDebuff(projectile);
    }
    this.updatePlayerProjectileAim(projectile, dt);

    PREVIOUS_PROJECTILE_POS.copy(projectile.mesh.position);
    if (projectile.gravity) projectile.velocity.y -= projectile.gravity * dt;
    const travelScale = this.getProjectileTravelScale(projectile);
    projectile.mesh.position.addScaledVector(projectile.velocity, dt * travelScale);
    if (this.shouldApplyAstralGelDebuff(projectile)
      && this.game.world.isPointInsideAstralGel?.(projectile.mesh.position, projectile.radius ?? 0)) {
      this.applyAstralGelDebuff(projectile);
    }
    projectile.mesh.rotation.x += dt * (projectile.plasma ? 2.8 : 5.0);
    projectile.mesh.rotation.y += dt * (projectile.plasma ? 5.5 : 6.5);
    this.updateProjectileVisual(projectile, dt, true);
    this.syncProjectileVisual(projectile);

    if (projectile.clearEnemyProjectiles) this.clearEnemyProjectilesInRadius(projectile.mesh.position, projectile.bulletClearRadius ?? projectile.radius);

    if (this.isOutOfBounds(projectile)) {
      this.removeProjectile(projectile, this.game.store.playerProjectiles, i);
      continue;
    }

    if (!(projectile.plasma || projectile.splashRadius)) {
      const groundY = this.game.world.getHeight(projectile.mesh.position.x, projectile.mesh.position.z);
      if (projectile.mesh.position.y < groundY + 0.35) {
        if (projectile.plasma || projectile.splashRadius) this.triggerSplash(projectile);
        this.removeProjectile(projectile, this.game.store.playerProjectiles, i);
        continue;
      }
    }

    const worldHit = this.game.world.hitStaticObstacle?.(projectile.mesh.position, projectile.radius, PREVIOUS_PROJECTILE_POS) ?? null;
    if (worldHit) {
      if (this.tryReflectProjectile(projectile, worldHit)) continue;
      if (!this.shouldPlayerProjectilePassThroughObstacle(projectile)) {
        this.spawnPlayerProjectileImpactExplosion(projectile, worldHit.point ?? projectile.mesh.position);
        this.removeProjectile(projectile, this.game.store.playerProjectiles, i);
        continue;
      }
    }

    if (this.handlePlayerProjectileMineHit(projectile)) {
      this.removeProjectile(projectile, this.game.store.playerProjectiles, i);
      continue;
    }

    let remove = this.resolvePlayerProjectileEnemyHits(projectile, this.game.enemies.getEnemyFrameView(), perf);

    if (!remove && (projectile.plasma || projectile.splashRadius)) {
      const groundY = this.game.world.getHeight(projectile.mesh.position.x, projectile.mesh.position.z);
      if (projectile.mesh.position.y < groundY + 0.35) {
        this.triggerSplash(projectile);
        remove = true;
      }
    }

    if (projectile.life <= 0) {
      if (projectile.plasma || projectile.splashRadius) this.triggerSplash(projectile);
      remove = true;
    }

    if (remove) this.removeProjectile(projectile, this.game.store.playerProjectiles, i);
  }
}
};

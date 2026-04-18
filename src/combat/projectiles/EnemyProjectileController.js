import {
  VIEW_PROJECTION,
  CAMERA_FRUSTUM,
  FRUSTUM_SPHERE,
  PREVIOUS_PROJECTILE_POS,
  WAVE_END_PROJECTILE_FADE_DURATION,
} from './ProjectileShared.js';

/**
 * Responsibility:
 * - Enemy projectile lifetime, fade-out, and on-screen cleanup.
 *
 * Rules:
 * - ProjectileSystem.update must keep calling both player and enemy paths every frame.
 * - Projectile fade-out changes visualState first, then syncs the instanced renderer in the same frame.
 * - clearProjectiles removes visual handles through removeProjectile()/batch clear semantics; projectile anchors are not visible scene meshes.
 */
export const enemyProjectileControllerMethods = {
clearProjectiles(array) {
  for (let i = array.length - 1; i >= 0; i -= 1) this.removeProjectile(array[i], array, i);
  array.length = 0;
},

clearEnemyProjectiles() {
  this.clearProjectiles(this.game.store.enemyProjectiles);
},

buildEnemyProjectileFrustum() {
  const camera = this.game.renderer?.camera;
  if (!camera) return null;
  camera.updateMatrixWorld?.();
  camera.updateProjectionMatrix?.();
  VIEW_PROJECTION.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  CAMERA_FRUSTUM.setFromProjectionMatrix(VIEW_PROJECTION);
  return CAMERA_FRUSTUM;
},

isEnemyProjectileOnScreen(projectile, frustum = null) {
  const mesh = projectile?.mesh;
  const resolvedFrustum = frustum ?? this.buildEnemyProjectileFrustum();
  if (!resolvedFrustum || !mesh) return false;

  FRUSTUM_SPHERE.center.copy(mesh.position);
  FRUSTUM_SPHERE.radius = Math.max(0.2, projectile?.radius ?? 0.4);
  return resolvedFrustum.intersectsSphere(FRUSTUM_SPHERE);
},

startEnemyProjectileFadeOut(projectile, duration = WAVE_END_PROJECTILE_FADE_DURATION) {
  if (!projectile?.alive || projectile.fadingOut) return false;
  projectile.fadingOut = true;
  projectile.fadeElapsed = 0;
  projectile.fadeDuration = Math.max(0.01, duration);
  projectile.velocity.set(0, 0, 0);
  projectile.gravity = 0;
  projectile.life = Math.max(projectile.life ?? 0, projectile.fadeDuration);
  projectile.minePrimeTimer = null;
  projectile.mineDetonating = false;
  return true;
},

clearEnemyProjectilesForWaveEnd() {
  const frustum = this.buildEnemyProjectileFrustum();
  let faded = 0;
  for (let i = this.game.store.enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const projectile = this.game.store.enemyProjectiles[i];
    if (!projectile?.alive) continue;
    if (this.isEnemyProjectileOnScreen(projectile, frustum)) {
      if (this.startEnemyProjectileFadeOut(projectile)) faded += 1;
      continue;
    }
    this.removeProjectile(projectile, this.game.store.enemyProjectiles, i);
  }
  return faded;
},

update(dt) {
  this.updatePlayerProjectiles(dt);
  this.updateEnemyProjectiles(dt);
},

updateEnemyProjectiles(dt) {
  for (let i = this.game.store.enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const projectile = this.game.store.enemyProjectiles[i];
    projectile.life -= dt;
    projectile.reflectionCooldown = Math.max(0, (projectile.reflectionCooldown ?? 0) - dt);
    PREVIOUS_PROJECTILE_POS.copy(projectile.mesh.position);

    if (projectile.fadingOut) {
      projectile.fadeElapsed = (projectile.fadeElapsed ?? 0) + dt;
      projectile.mesh.rotation.y += dt * 1.4;
      projectile.mesh.rotation.x += dt * 1.8;
      this.updateProjectileVisual(projectile, dt, false);
      this.syncProjectileVisual(projectile);
      if (projectile.fadeElapsed >= Math.max(0.01, projectile.fadeDuration ?? 0.01)) {
        this.removeProjectile(projectile, this.game.store.enemyProjectiles, i);
      }
      continue;
    }

    if (projectile.gravity) projectile.velocity.y -= projectile.gravity * dt;
    const travelScale = this.getProjectileTravelScale(projectile);
    projectile.mesh.position.addScaledVector(projectile.velocity, dt * travelScale);
    projectile.mesh.rotation.y += dt * 2.6;
    projectile.mesh.rotation.x += dt * 3.2;
    this.updateProjectileVisual(projectile, dt, false);

    if (projectile.mindriftMine) {
      const removeMine = projectile.mineBallistic
        ? this.updateBallisticMindriftMine(projectile, dt)
        : this.updateMindriftMine(projectile, dt);
      this.syncProjectileVisual(projectile);
      if (removeMine) {
        this.removeProjectile(projectile, this.game.store.enemyProjectiles, i);
        continue;
      }
    } else {
      this.syncProjectileVisual(projectile);
    }

    if (this.isOutOfBounds(projectile)) {
      this.removeProjectile(projectile, this.game.store.enemyProjectiles, i);
      continue;
    }

    if (!projectile.mindriftMine) {
      const groundY = this.game.world.getHeight(projectile.mesh.position.x, projectile.mesh.position.z);
      if (projectile.mesh.position.y < groundY + 0.35) {
        if (projectile.splashRadius && !projectile.splashTriggered) this.triggerSplash(projectile);
        this.removeProjectile(projectile, this.game.store.enemyProjectiles, i);
        continue;
      }
    }

    const worldHit = projectile.ignoreWorldHit
      ? null
      : (this.game.world.hitStaticObstacle?.(projectile.mesh.position, projectile.radius, PREVIOUS_PROJECTILE_POS) ?? null);
    if (worldHit) {
      if (this.tryReflectProjectile(projectile, worldHit)) continue;
      this.removeProjectile(projectile, this.game.store.enemyProjectiles, i);
      continue;
    }

    let remove = false;
    const playerMesh = this.game.store.playerMesh;
    if (!projectile.showBullet && playerMesh && this.collision.sphereHit(projectile.mesh.position, projectile.radius, playerMesh.position, 2.0)) {
      const appliedDirectDamage = projectile.damage > 0
        ? this.game.playerSystem.applyDamage(projectile.damage, { sourcePosition: projectile.mesh.position })
        : false;
      if (appliedDirectDamage) {
        this.game.effects.spawnExplosion(projectile.mesh.position.clone(), projectile.color, 0.7);
      }
      if (projectile.mindriftMine) {
        if (projectile.splashRadius && !projectile.splashTriggered) this.triggerSplash(projectile);
      } else if (appliedDirectDamage && projectile.splashRadius && !projectile.splashTriggered) {
        this.triggerSplash(projectile);
      }
      remove = true;
    }

    if (projectile.life <= 0) {
      if (projectile.splashRadius && !projectile.splashTriggered) this.triggerSplash(projectile);
      remove = true;
    }

    if (remove) this.removeProjectile(projectile, this.game.store.enemyProjectiles, i);
  }
}
};

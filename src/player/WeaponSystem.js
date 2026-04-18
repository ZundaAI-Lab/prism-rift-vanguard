import * as THREE from 'three';
import { clamp } from '../utils/math.js';
import { COLORS } from '../data/balance.js';
import { getClosestPointOnEnemyHitShape } from '../combat/projectiles/ProjectileShared.js';

const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const PLASMA_FORWARD = new THREE.Vector3();
const PLASMA_PLANAR = new THREE.Vector3();
const PLASMA_TARGET_POS = new THREE.Vector3();
const PLASMA_TARGET_POINT = new THREE.Vector3();
const ORIGIN_OFFSET = new THREE.Vector3(0, 0.15, 0);
const PLASMA_ORIGIN_OFFSET = new THREE.Vector3(0, 0.18, 0);
const PRIMARY_LANE_SPACING = 0.52;
const PLASMA_LANE_SPACING = 0.82;
const EVEN_CENTER_GAP_EXTRA = 0.35;
const MAX_SHOT_PITCH_DOWN = THREE.MathUtils.degToRad(5);
const MAX_SHOT_PITCH_UP = THREE.MathUtils.degToRad(15);
const PLASMA_INPUT_BUFFER = 0.18;
const PRIMARY_ARC_GRAVITY = 20.0;
const PRIMARY_ARC_LIFT = 1.05;
const RETICLE_PREVIEW_ORIGIN = new THREE.Vector3();
const RETICLE_PREVIEW_POINT = new THREE.Vector3();
const RETICLE_PREVIEW_SUM = new THREE.Vector3();
const RETICLE_PREVIEW_TARGET = new THREE.Vector3();
const RETICLE_PREVIEW_LANE = new THREE.Vector3();
const RETICLE_PREVIEW_DIRECTION = new THREE.Vector3();
const RETICLE_PREVIEW_UP = new THREE.Vector3(0, 1, 0);
const MUZZLE_WORLD = new THREE.Vector3();
const PLAYER_POSITION = new THREE.Vector3();
const SHOT_BASE_ORIGIN = new THREE.Vector3();
const PRIMARY_LANE_ORIGIN = new THREE.Vector3();
const PRIMARY_DIRECTION = new THREE.Vector3();
const PRIMARY_SHOT_ANCHOR = new THREE.Vector3();
const PRIMARY_FORWARD_PUSH = new THREE.Vector3();
const PRIMARY_SHOCKWAVE_POINT = new THREE.Vector3();
const PLASMA_BASE_ORIGIN = new THREE.Vector3();
const PLASMA_LANE_ORIGIN = new THREE.Vector3();
const PLASMA_ORIGIN = new THREE.Vector3();
const PLASMA_FORWARD_PUSH = new THREE.Vector3();
const PRIMARY_ARC_SHOT = {
  initialVelocity: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  gravity: PRIMARY_ARC_GRAVITY,
  speed: 0,
};
const PLASMA_ARC_SHOT = {
  target: null,
  aimPoint: new THREE.Vector3(),
  initialVelocity: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  gravity: 30,
  speed: 0,
  life: 0,
};

/**
 * Responsibility:
 * - Turns input into primary fire and plasma shots.
 *
 * Rules:
 * - Reads upgrades only through UpgradeSystem.
 * - Projectile entities are created through ProjectileSystem, never directly appended elsewhere.
 * - Do not edit mission flow here.
 * - Firing is aligned to the camera-facing combat direction.
 * - Plasma is bound to right click. Do not remap alternate-fire elsewhere or UI prompts and cooldown logic will drift.
 * - Shot vertical angle is intentionally clamped independently. Camera pitch may move further,
 *   but projectile pitch must stay limited here so aim feel does not drift during later camera tweaks.
 * - Firing must not add camera shake. Keep recoil-free here and do not sneak visual kick back through player state.
 */
export class WeaponSystem {
  constructor(game) {
    this.game = game;
    this.plasmaBufferTimer = 0;
  }

  update(dt = 0) {
    if (!this.game.input.pointerLocked) {
      this.plasmaBufferTimer = 0;
      return;
    }
    if (this.game.state.progression.missionStatus === 'bossIntro') {
      this.plasmaBufferTimer = 0;
      return;
    }

    if (this.game.input.mouseDown) this.firePrimary();

    this.plasmaBufferTimer = Math.max(0, this.plasmaBufferTimer - dt);
    if (this.game.input.wasMousePressed(2)) this.plasmaBufferTimer = PLASMA_INPUT_BUFFER;
    if (this.plasmaBufferTimer > 0 && this.firePlasma()) this.plasmaBufferTimer = 0;
  }

  getForward() {
    const { player } = this.game.state;
    const shotPitch = clamp(player.pitch, MAX_SHOT_PITCH_DOWN, MAX_SHOT_PITCH_UP);
    return FORWARD.set(0, 0, -1).applyEuler(new THREE.Euler(shotPitch, player.yaw, 0, 'YXZ')).normalize();
  }

  getReticleWorldPoint(distance = 0, out = RETICLE_PREVIEW_POINT) {
    const playerMesh = this.game.store.playerMesh;
    if (!playerMesh) return null;

    const forward = this.getForward();
    const stats = this.game.upgrades.getPrimaryStats();
    const shotCount = Math.max(1, stats.wayCount | 0);
    const travelDistance = Math.max(0, Number(distance) || 0);
    const homingFactor = Number.isFinite(stats.homingLevel)
      ? THREE.MathUtils.clamp(stats.homingLevel / 5, 0, 1)
      : THREE.MathUtils.clamp(stats.homing ?? 0, 0, 1);
    const assistBlend = THREE.MathUtils.lerp(0.18, 0.52, homingFactor);

    RIGHT.crossVectors(forward, RETICLE_PREVIEW_UP);
    if (RIGHT.lengthSq() < 0.000001) RIGHT.set(1, 0, 0);
    else RIGHT.normalize();

    RETICLE_PREVIEW_SUM.set(0, 0, 0);

    for (let i = 0; i < shotCount; i += 1) {
      const laneOffset = i - (shotCount - 1) / 2;
      let spreadIndex = laneOffset;
      if (shotCount % 2 === 0) {
        if (Math.abs(laneOffset) === 0.5) spreadIndex = 0;
        else spreadIndex = laneOffset - Math.sign(laneOffset) * 0.5;
      }

      const lanePosition = this.getPrimaryLaneOffset(shotCount, i);
      RETICLE_PREVIEW_LANE.copy(RIGHT).multiplyScalar(lanePosition * PRIMARY_LANE_SPACING);
      RETICLE_PREVIEW_DIRECTION.copy(forward).addScaledVector(RIGHT, spreadIndex * stats.spread).normalize();

      RETICLE_PREVIEW_ORIGIN.copy(playerMesh.position)
        .add(ORIGIN_OFFSET)
        .add(RETICLE_PREVIEW_LANE)
        .addScaledVector(RETICLE_PREVIEW_DIRECTION, 1.9);

      const assisted = this.game.aimAssist?.bendDirection?.(RETICLE_PREVIEW_ORIGIN, RETICLE_PREVIEW_DIRECTION, stats.homing, stats.homingLevel) ?? null;
      const arcShot = this.buildPrimaryArcShot(RETICLE_PREVIEW_DIRECTION, stats.speed);
      const planarSpeed = Math.hypot(arcShot.initialVelocity.x, arcShot.initialVelocity.z);
      const travelTime = planarSpeed > 0.0001 ? travelDistance / planarSpeed : 0;

      RETICLE_PREVIEW_POINT.copy(RETICLE_PREVIEW_ORIGIN)
        .addScaledVector(arcShot.initialVelocity, travelTime);
      RETICLE_PREVIEW_POINT.y -= 0.5 * arcShot.gravity * travelTime * travelTime;

      if (assisted?.target?.mesh) {
        RETICLE_PREVIEW_TARGET.copy(assisted.target.mesh.position);
        const targetVelocity = assisted.target.velocity || assisted.target.localVelocity || null;
        if (targetVelocity) RETICLE_PREVIEW_TARGET.addScaledVector(targetVelocity, travelTime * 0.35);
        getClosestPointOnEnemyHitShape(RETICLE_PREVIEW_ORIGIN, assisted.target, RETICLE_PREVIEW_TARGET, RETICLE_PREVIEW_TARGET);
        RETICLE_PREVIEW_POINT.lerp(RETICLE_PREVIEW_TARGET, assistBlend);
      }

      RETICLE_PREVIEW_SUM.add(RETICLE_PREVIEW_POINT);
    }

    return out.copy(RETICLE_PREVIEW_SUM).multiplyScalar(1 / shotCount);
  }

  buildPlasmaArcShot(origin, forward, stats, { preferredTarget = null, allowCluster = true } = {}, out = PLASMA_ARC_SHOT) {
    const fallbackForward = PLASMA_FORWARD.set(forward.x, 0, forward.z);
    if (fallbackForward.lengthSq() < 0.000001) fallbackForward.set(0, 0, -1);
    else fallbackForward.normalize();

    const plasmaLockWindow = this.game.aimAssist.getPlasmaLockWindow(stats.homing, { homingLevel: stats.homingLevel });
    const cluster = allowCluster ? this.game.aimAssist.findPlasmaClusterTarget(origin, forward, {
      maxDistance: plasmaLockWindow.maxDistance,
      minAlignment: plasmaLockWindow.minAlignment,
      maxLateralError: Math.max(64, plasmaLockWindow.maxLateralError),
      clusterRadius: Math.max(15, stats.radius * 1.55),
    }) : null;
    const target = preferredTarget ?? cluster?.target ?? this.game.aimAssist.findForwardPriorityTarget(origin, forward, plasmaLockWindow);

    const planarDirection = PLASMA_PLANAR.copy(fallbackForward);
    let landingDistance = THREE.MathUtils.clamp(stats.speed * stats.life * 0.78, 54, 132);
    let aimX = origin.x + planarDirection.x * landingDistance;
    let aimZ = origin.z + planarDirection.z * landingDistance;
    let aimY = this.game.world.getHeight(aimX, aimZ) + 0.6;

    if (cluster?.point) {
      PLASMA_TARGET_POS.copy(cluster.point).sub(origin);
      PLASMA_PLANAR.set(PLASMA_TARGET_POS.x, 0, PLASMA_TARGET_POS.z);
      const planarDistance = PLASMA_PLANAR.length();
      if (planarDistance > 0.001) {
        planarDirection.copy(PLASMA_PLANAR).multiplyScalar(1 / planarDistance);
        landingDistance = THREE.MathUtils.clamp(planarDistance, 8, 132);
      }
      aimX = cluster.point.x;
      aimZ = cluster.point.z;
      aimY = cluster.point.y;
    } else if (target) {
      getClosestPointOnEnemyHitShape(origin, target, target.mesh.position, PLASMA_TARGET_POINT);
      PLASMA_TARGET_POS.copy(PLASMA_TARGET_POINT).sub(origin);
      PLASMA_PLANAR.set(PLASMA_TARGET_POS.x, 0, PLASMA_TARGET_POS.z);
      const planarDistance = PLASMA_PLANAR.length();
      if (planarDistance > 0.001) {
        planarDirection.copy(PLASMA_PLANAR).multiplyScalar(1 / planarDistance);
        landingDistance = THREE.MathUtils.clamp(planarDistance, 8, 132);
      }
      aimX = PLASMA_TARGET_POINT.x;
      aimZ = PLASMA_TARGET_POINT.z;
      aimY = PLASMA_TARGET_POINT.y;
    }

    const gravity = 30;
    const horizontalSpeed = Math.max(42, stats.speed * 0.92);
    const flightTime = THREE.MathUtils.clamp(landingDistance / horizontalSpeed, 0.38, 1.9);
    const initialVelocity = out.initialVelocity.copy(planarDirection).multiplyScalar(landingDistance / flightTime);
    initialVelocity.y = (aimY - origin.y + 0.5 * gravity * flightTime * flightTime) / flightTime;
    out.target = target;
    out.aimPoint.set(aimX, aimY, aimZ);
    out.gravity = gravity;
    out.direction.copy(initialVelocity).normalize();
    out.speed = initialVelocity.length();
    out.life = Math.max(stats.life, flightTime + 0.18);
    return out;
  }

  getPrimaryLaneOffset(shotCount, index) {
    const laneOffset = index - (shotCount - 1) / 2;
    if (shotCount % 2 !== 0) return laneOffset;
    return laneOffset + Math.sign(laneOffset) * EVEN_CENTER_GAP_EXTRA;
  }

  buildPrimaryArcShot(direction, speed, out = PRIMARY_ARC_SHOT) {
    const initialVelocity = out.initialVelocity.copy(direction).multiplyScalar(speed);
    initialVelocity.y += PRIMARY_ARC_LIFT;
    out.gravity = PRIMARY_ARC_GRAVITY;
    out.speed = initialVelocity.length();
    out.direction.copy(initialVelocity).normalize();
    return out;
  }

  firePrimary() {
    const { player } = this.game.state;
    if (player.primaryCooldown > 0) return;

    const stats = this.game.upgrades.getPrimaryStats();
    player.primaryCooldown = stats.fireCooldown;
    player.recoil = 0;
    player.weaponHeat = clamp(player.weaponHeat + 0.18, 0, 1.2);

    const forward = this.getForward();
    RIGHT.crossVectors(forward, UP).normalize();

    const playerMesh = this.game.store.playerMesh;
    const muzzleWorld = playerMesh.userData.muzzle.getWorldPosition(MUZZLE_WORLD);
    const shotCount = stats.wayCount;
    const isEvenShotCount = shotCount % 2 === 0;
    const shotGroupId = this.game.missionAchievements?.registerWeaponVolley?.('main') ?? null;
    PLAYER_POSITION.copy(playerMesh.position);
    SHOT_BASE_ORIGIN.copy(PLAYER_POSITION).add(ORIGIN_OFFSET);
    for (let i = 0; i < shotCount; i += 1) {
      const laneOffset = i - (shotCount - 1) / 2;
      const lanePosition = this.getPrimaryLaneOffset(shotCount, i);
      PRIMARY_LANE_ORIGIN.copy(RIGHT).multiplyScalar(lanePosition * PRIMARY_LANE_SPACING);
      let spreadIndex = laneOffset;
      if (isEvenShotCount) {
        if (Math.abs(laneOffset) === 0.5) {
          spreadIndex = 0;
        } else {
          spreadIndex = laneOffset - Math.sign(laneOffset) * 0.5;
        }
      }
      PRIMARY_DIRECTION.copy(forward).addScaledVector(RIGHT, spreadIndex * stats.spread).normalize();
      PRIMARY_SHOT_ANCHOR.copy(muzzleWorld).add(PRIMARY_LANE_ORIGIN);
      const assisted = this.game.aimAssist.bendDirection(PRIMARY_SHOT_ANCHOR, PRIMARY_DIRECTION, stats.homing, stats.homingLevel);
      const arcShot = this.buildPrimaryArcShot(PRIMARY_DIRECTION, stats.speed);
      const origin = SHOT_BASE_ORIGIN.copy(PLAYER_POSITION).add(ORIGIN_OFFSET).add(PRIMARY_LANE_ORIGIN).add(PRIMARY_FORWARD_PUSH.copy(PRIMARY_DIRECTION).multiplyScalar(1.9));
      const shotMeta = this.game.missionAchievements?.createShotMeta?.('main', shotGroupId) ?? { shotId: null, shotGroupId, weaponType: 'main' };
      this.game.projectiles.spawnPlayerProjectile({
        origin,
        direction: arcShot.direction,
        initialVelocity: arcShot.initialVelocity,
        gravity: arcShot.gravity,
        speed: arcShot.speed,
        damage: stats.damage,
        radius: 0.42,
        life: stats.life,
        color: COLORS.player,
        emissive: COLORS.player,
        homing: stats.homing,
        homingLevel: stats.homingLevel,
        target: assisted.target,
        turnRate: stats.turnRate,
        pierce: stats.pierce,
        enemyPierceUnlimited: stats.pierce > 0,
        shotId: shotMeta.shotId,
        shotGroupId: shotMeta.shotGroupId,
        weaponType: shotMeta.weaponType,
      });
    }

    this.game.effects.spawnMuzzleFlash(muzzleWorld, 0x86fff0, 0.9 + shotCount * 0.08);
    this.game.audio?.playSfx('playerShot');
  }

  firePlasma() {
    const { player } = this.game.state;
    if (player.plasmaCooldown > 0) return false;

    const stats = this.game.upgrades.getPlasmaStats();
    player.plasmaCooldown = stats.cooldown;
    player.recoil = 0;
    player.weaponHeat = clamp(player.weaponHeat + 0.34 + Math.max(0, stats.wayCount - 1) * 0.05, 0, 1.45);

    const forward = this.getForward();
    RIGHT.crossVectors(forward, UP);
    if (RIGHT.lengthSq() < 0.000001) RIGHT.set(1, 0, 0);
    else RIGHT.normalize();

    const shotCount = stats.wayCount ?? 1;
    const shotGroupId = this.game.missionAchievements?.registerWeaponVolley?.('plasma') ?? null;
    const playerMesh = this.game.store.playerMesh;
    PLAYER_POSITION.copy(playerMesh.position);
    PLASMA_BASE_ORIGIN.copy(PLAYER_POSITION).add(PLASMA_ORIGIN_OFFSET).add(PLASMA_FORWARD_PUSH.copy(forward).multiplyScalar(2.2));
    const plasmaLockWindow = this.game.aimAssist.getPlasmaLockWindow(stats.homing, { homingLevel: stats.homingLevel });
    const preferredTargets = shotCount > 1 ? this.game.aimAssist.findPlasmaVolleyTargets(PLASMA_BASE_ORIGIN, forward, {
      shotCount,
      maxDistance: plasmaLockWindow.maxDistance,
      minAlignment: plasmaLockWindow.minAlignment,
      maxLateralError: Math.max(84, plasmaLockWindow.maxLateralError),
    }) : [];

    for (let i = 0; i < shotCount; i += 1) {
      const lanePosition = this.getPrimaryLaneOffset(shotCount, i);
      PLASMA_LANE_ORIGIN.copy(RIGHT).multiplyScalar(lanePosition * PLASMA_LANE_SPACING);
      const origin = PLASMA_ORIGIN.copy(PLAYER_POSITION).add(PLASMA_ORIGIN_OFFSET).add(PLASMA_LANE_ORIGIN).add(PLASMA_FORWARD_PUSH.copy(forward).multiplyScalar(2.2));
      const preferredTarget = preferredTargets[i] ?? null;
      const arcShot = this.buildPlasmaArcShot(origin, forward, stats, {
        preferredTarget,
        allowCluster: shotCount <= 1,
      }, PLASMA_ARC_SHOT);
      const shotMeta = this.game.missionAchievements?.createShotMeta?.('plasma', shotGroupId) ?? { shotId: null, shotGroupId, weaponType: 'plasma' };

      this.game.projectiles.spawnPlayerProjectile({
        origin,
        direction: arcShot.direction,
        initialVelocity: arcShot.initialVelocity,
        gravity: arcShot.gravity,
        speed: arcShot.speed,
        damage: stats.damage,
        radius: 2.0,
        life: arcShot.life,
        color: COLORS.plasma,
        emissive: COLORS.plasma,
        homing: stats.homing,
        homingLevel: stats.homingLevel,
        target: arcShot.target,
        turnRate: stats.turnRate,
        pierce: 999,
        splashRadius: stats.radius,
        splashDamage: stats.damage * stats.splashDamageScale,
        plasma: true,
        aimPoint: arcShot.aimPoint,
        clearEnemyProjectiles: true,
        splashClearsEnemyProjectiles: true,
        bulletClearRadius: 2.0,
        shotId: shotMeta.shotId,
        shotGroupId: shotMeta.shotGroupId,
        weaponType: shotMeta.weaponType,
      });
    }

    this.game.effects.spawnMuzzleFlash(PLASMA_BASE_ORIGIN, COLORS.plasma, 1.8 + Math.max(0, shotCount - 1) * 0.18);
    this.game.effects.spawnShockwave(PRIMARY_SHOCKWAVE_POINT.copy(playerMesh.position).setY(playerMesh.position.y - 0.9), COLORS.plasma, 3.8 + Math.max(0, shotCount - 1) * 0.22);
    this.game.audio?.playSfx('playerPlasmaFire');
    return true;
  }
}

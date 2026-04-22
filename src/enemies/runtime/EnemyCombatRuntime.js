import { alignShotToPlayerHeight as alignShotToPlayerHeightShared, solveLeadTime as solveLeadTimeShared, writePlayerVelocity } from '../shared/ShotAimMath.js';
import * as Shared from '../EnemySystemShared.js';

const {
  THREE,
  sampleRange,
  clampPointToPlayerTravelBounds,
  TO_PLAYER,
  DESIRED,
  SIDE,
  UP,
  HEIGHT_ALIGNED,
  HEIGHT_FORWARD,
  LEAD_TARGET,
  DIRECT_FORWARD,
  DIRECT_SIDE,
  SHOT_DIR,
  PLAYER_VELOCITY,
  SHOT_SPREAD,
  ARC_TARGET,
  ARC_HORIZONTAL,
  ARC_VELOCITY,
  BALLISTIC_MINE_TARGET,
  BALLISTIC_MINE_FORWARD,
  BALLISTIC_MINE_SIDE,
  BALLISTIC_MINE_ORIGIN,
  BALLISTIC_MINE_VELOCITY,
  BALLISTIC_MINE_FALLBACK,
  PREDICTIVE_ENEMY_RULES,
} = Shared;

export function installEnemyCombatRuntime(EnemySystem) {
  EnemySystem.prototype.update = function update(dt) {
    const playerMesh = this.game.store.playerMesh;
    if (!playerMesh) return;

    this.beginEnemyFrame();

    for (let i = this.game.store.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.game.store.enemies[i];
      if (!enemy.alive) continue;
      if (this.updateSpawnIntro(enemy, dt)) {
        this.syncEnemyFrameEntry(enemy);
        this.syncEnemySpatialEntry(enemy);
        continue;
      }
      enemy.age += dt;
      enemy.cooldown -= dt;
      enemy.blinkTimer -= dt;
      enemy.hitShakeTimer = Math.max(0, enemy.hitShakeTimer - dt);
      if (enemy.hitShakeTimer <= 0) enemy.hitShakeStrength = 0;
      enemy.mesh.position.y = this.game.world.getHeight(enemy.mesh.position.x, enemy.mesh.position.z) + enemy.def.hover + Math.sin(enemy.age * 2.8 + enemy.id) * 0.38;

      if (enemy.tutorialFrozen) {
        enemy.velocity.set(0, 0, 0);
        enemy.localVelocity.set(0, 0, 0);
        enemy.mesh.lookAt(playerMesh.position.x, enemy.mesh.position.y, playerMesh.position.z);
        enemy.mesh.rotation.z += Math.sin(enemy.age * 2.4) * 0.003;
        this.applyDamageShake(enemy);
        this.syncEnemyFrameEntry(enemy);
        this.syncEnemySpatialEntry(enemy);
        continue;
      }

      if (enemy.def.isBoss) {
        this.updateBossMovement(enemy, dt);
      } else {
        this.updateRegularMovement(enemy, dt);
      }

      if (enemy.def.isBoss) this.bossSystem.faceBossToPlayerUpright(enemy, playerMesh.position);
      else enemy.mesh.lookAt(playerMesh.position.x, enemy.mesh.position.y, playerMesh.position.z);
      enemy.mesh.rotation.z += Math.sin(enemy.age * 2.4) * 0.003;

      if (!enemy.def.isBoss) this.tryAttack(enemy);
      else this.bossSystem.updateBoss(enemy, dt);

      this.applyDamageShake(enemy);
      this.syncEnemyFrameEntry(enemy);
      this.syncEnemySpatialEntry(enemy);
    }
  }

  EnemySystem.prototype.updateRegularMovement = function updateRegularMovement(enemy, dt) {
    const playerPos = this.game.store.playerMesh.position;
    TO_PLAYER.copy(playerPos).sub(enemy.mesh.position);
    const distance = Math.max(0.001, TO_PLAYER.length());
    TO_PLAYER.normalize();
    SIDE.crossVectors(TO_PLAYER, UP).normalize();

    DESIRED.set(0, 0, 0);
    switch (enemy.def.behavior) {
      case 'hunter': {
        const forwardStrength = distance > enemy.def.preferredDist ? 1 : -0.42;
        DESIRED.addScaledVector(TO_PLAYER, forwardStrength);
        DESIRED.addScaledVector(SIDE, enemy.strafeDir * 0.36);
        break;
      }
      case 'sniper': {
        DESIRED.addScaledVector(TO_PLAYER, distance > enemy.def.preferredDist ? 0.54 : -0.8);
        DESIRED.addScaledVector(SIDE, Math.sin(enemy.age * 0.8 + enemy.id) * 0.65);
        break;
      }
      case 'orbit': {
        DESIRED.addScaledVector(TO_PLAYER, distance > enemy.def.preferredDist ? 0.5 : -0.35);
        DESIRED.addScaledVector(SIDE, enemy.strafeDir * 0.95);
        break;
      }
      case 'rusher': {
        DESIRED.addScaledVector(TO_PLAYER, 1.2);
        DESIRED.addScaledVector(SIDE, Math.sin(enemy.age * 2.8) * 0.3);
        break;
      }
      case 'artillery': {
        DESIRED.addScaledVector(TO_PLAYER, distance > enemy.def.preferredDist ? 0.38 : -0.95);
        DESIRED.addScaledVector(SIDE, Math.sin(enemy.age * 0.65 + enemy.id) * 0.32);
        break;
      }
      case 'sweeper': {
        DESIRED.addScaledVector(TO_PLAYER, distance > enemy.def.preferredDist ? 0.65 : -0.2);
        DESIRED.addScaledVector(SIDE, enemy.strafeDir * 1.25);
        break;
      }
      case 'kamikaze': {
        DESIRED.addScaledVector(TO_PLAYER, 1.6);
        break;
      }
      case 'heavy': {
        DESIRED.addScaledVector(TO_PLAYER, distance > enemy.def.preferredDist ? 0.55 : -0.2);
        DESIRED.addScaledVector(SIDE, enemy.strafeDir * 0.25);
        break;
      }
      case 'blink': {
        DESIRED.addScaledVector(TO_PLAYER, distance > enemy.def.preferredDist ? 0.82 : -0.18);
        DESIRED.addScaledVector(SIDE, enemy.strafeDir * 0.65);
        if (enemy.blinkTimer <= 0) {
          const blinkMinDistance = this.getEnemyNoSpawnDistance(enemy, 4);
          const blinkFrom = enemy.mesh.position.clone();
          const blinkTarget = this.resolveDuelistBlinkPoint(enemy, playerPos, TO_PLAYER, SIDE, blinkMinDistance);
          const blinkTo = new THREE.Vector3(blinkTarget.x, enemy.mesh.position.y, blinkTarget.z);
          enemy.mesh.position.x = blinkTarget.x;
          enemy.mesh.position.z = blinkTarget.z;
          enemy.blinkTimer = THREE.MathUtils.randFloat(1.4, 2.6);
          enemy.strafeDir *= -1;
          this.game.effects.spawnHitSpark(blinkFrom, enemy.def.accent, 0.72);
          this.game.effects.spawnMirrorWarpStream(blinkFrom, blinkTo, enemy.def.accent, 0.75, 0.2);
          this.game.effects.spawnHitSpark(blinkTo, enemy.def.accent, 0.95);
        }
        break;
      }
      default:
        DESIRED.addScaledVector(TO_PLAYER, 0.5);
        break;
    }

    if (DESIRED.lengthSq() > 0.0001) DESIRED.normalize();
    enemy.velocity.copy(DESIRED).multiplyScalar(enemy.def.speed);
    enemy.localVelocity.copy(enemy.velocity);
    enemy.mesh.position.addScaledVector(enemy.velocity, dt);

    const enemyX = enemy.mesh.position.x;
    const enemyZ = enemy.mesh.position.z;
    clampPointToPlayerTravelBounds(enemy.mesh.position, enemy.def.radius + 2);
    if (enemy.mesh.position.x !== enemyX || enemy.mesh.position.z !== enemyZ) enemy.strafeDir *= -1;

    if (enemy.def.behavior === 'kamikaze' && distance < enemy.def.radius + 1.8) {
      if (this.game.playerSystem.applyDamage(16, { sourcePosition: enemy.mesh.position })) this.killEnemy(enemy);
    }
  }

  EnemySystem.prototype.alignShotToPlayerHeight = function alignShotToPlayerHeight(origin, direction) {
    return alignShotToPlayerHeightShared(
      origin,
      direction,
      this.game.store.playerMesh?.position,
      HEIGHT_FORWARD,
      HEIGHT_ALIGNED,
    );
  }

  EnemySystem.prototype.getPredictiveAttackRule = function getPredictiveAttackRule(enemy) {
    const rule = PREDICTIVE_ENEMY_RULES[this.game.state.missionIndex];
    if (!rule) return null;
    return rule.types.has(enemy.typeKey) ? rule : null;
  }

  EnemySystem.prototype.getPlayerVelocity = function getPlayerVelocity() {
    return writePlayerVelocity(this.game.state.player, PLAYER_VELOCITY);
  }

  EnemySystem.prototype.solveLeadTime = function solveLeadTime(origin, projectileSpeed, leadStrength = 1) {
    return solveLeadTimeShared(
      origin,
      projectileSpeed,
      leadStrength,
      this.game.store.playerMesh?.position,
      this.getPlayerVelocity(),
      1.8,
    );
  }

  EnemySystem.prototype.getLeadTargetDirection = function getLeadTargetDirection(origin, projectileSpeed, leadStrength = 1) {
    const playerPos = this.game.store.playerMesh?.position;
    if (!playerPos) return this.alignShotToPlayerHeight(origin, TO_PLAYER);

    const t = this.solveLeadTime(origin, projectileSpeed, leadStrength);
    const vel = this.getPlayerVelocity();
    LEAD_TARGET.set(
      playerPos.x + vel.x * leadStrength * t,
      playerPos.y,
      playerPos.z + vel.z * leadStrength * t,
    ).sub(origin);

    if (LEAD_TARGET.lengthSq() < 0.000001) return this.alignShotToPlayerHeight(origin, TO_PLAYER);
    return LEAD_TARGET.normalize();
  }

  EnemySystem.prototype.buildAttackDirection = function buildAttackDirection(enemy, sideOffset = 0, verticalBias = 0, speed = enemy.def.bulletSpeed, leadRule = null, spread = null, radialDirection = null) {
    if (radialDirection) DIRECT_FORWARD.copy(radialDirection).normalize();
    else if (leadRule) DIRECT_FORWARD.copy(this.getLeadTargetDirection(enemy.mesh.position, speed, leadRule.leadStrength));
    else DIRECT_FORWARD.copy(TO_PLAYER).normalize();

    HEIGHT_FORWARD.set(DIRECT_FORWARD.x, 0, DIRECT_FORWARD.z);
    if (HEIGHT_FORWARD.lengthSq() < 0.000001) HEIGHT_FORWARD.set(TO_PLAYER.x, 0, TO_PLAYER.z);
    if (HEIGHT_FORWARD.lengthSq() < 0.000001) HEIGHT_FORWARD.set(0, 0, 1);
    HEIGHT_FORWARD.normalize();

    DIRECT_SIDE.crossVectors(HEIGHT_FORWARD, UP);
    if (DIRECT_SIDE.lengthSq() < 0.000001) DIRECT_SIDE.set(1, 0, 0);
    else DIRECT_SIDE.normalize();

    SHOT_DIR.copy(HEIGHT_FORWARD);
    if (sideOffset) SHOT_DIR.addScaledVector(DIRECT_SIDE, sideOffset);
    if (spread) {
      SHOT_SPREAD.set(spread.x, 0, spread.z);
      SHOT_DIR.add(SHOT_SPREAD);
    }
    if (SHOT_DIR.lengthSq() < 0.000001) SHOT_DIR.copy(HEIGHT_FORWARD);
    SHOT_DIR.normalize();

    const heightOffset = verticalBias * 0.35;
    const aligned = this.alignShotToPlayerHeight(enemy.mesh.position, SHOT_DIR);
    if (!heightOffset) return aligned.clone();

    const playerPos = this.game.store.playerMesh?.position;
    if (!playerPos) return aligned.clone();

    HEIGHT_ALIGNED.copy(SHOT_DIR).multiplyScalar(Math.max(1, Math.hypot(playerPos.x - enemy.mesh.position.x, playerPos.z - enemy.mesh.position.z)));
    HEIGHT_ALIGNED.y = (playerPos.y + heightOffset) - enemy.mesh.position.y;
    if (HEIGHT_ALIGNED.lengthSq() < 0.000001) return aligned.clone();
    return HEIGHT_ALIGNED.normalize().clone();
  }


  EnemySystem.prototype.buildArcedSplashShot = function buildArcedSplashShot(enemy, {
    sideOffset = 0,
    forwardOffset = 0,
    speed = enemy.def.bulletSpeed,
    leadRule = null,
    gravity = 24,
    minFlight = 1.1,
    maxFlight = 1.8,
    horizontalSpeedScale = 0.72,
    targetClampPadding = 0,
  } = {}) {
    const playerPos = this.game.store.playerMesh?.position;
    if (!playerPos) {
      return {
        direction: this.buildAttackDirection(enemy, sideOffset, 0.12, speed, leadRule),
        initialVelocity: null,
        gravity,
        speed,
      };
    }

    const target = ARC_TARGET.copy(playerPos);
    const leadStrength = leadRule?.leadStrength ?? 0;
    if (leadStrength > 0) {
      const t = this.solveLeadTime(enemy.mesh.position, speed, leadStrength * 0.8);
      const vel = this.getPlayerVelocity();
      target.x += vel.x * leadStrength * t;
      target.z += vel.z * leadStrength * t;
    }

    ARC_HORIZONTAL.set(target.x - enemy.mesh.position.x, 0, target.z - enemy.mesh.position.z);
    if (ARC_HORIZONTAL.lengthSq() < 0.000001) ARC_HORIZONTAL.set(0, 0, 1);
    ARC_HORIZONTAL.normalize();
    DIRECT_SIDE.crossVectors(ARC_HORIZONTAL, UP);
    if (DIRECT_SIDE.lengthSq() < 0.000001) DIRECT_SIDE.set(1, 0, 0);
    else DIRECT_SIDE.normalize();

    const horizontalDistance = Math.max(6, Math.hypot(playerPos.x - enemy.mesh.position.x, playerPos.z - enemy.mesh.position.z));
    const sideDistance = sideOffset * Math.max(9, Math.min(18, horizontalDistance * 0.22));
    const forwardDistance = forwardOffset * Math.max(4, Math.min(12, horizontalDistance * 0.12));
    target.addScaledVector(DIRECT_SIDE, sideDistance);
    target.addScaledVector(ARC_HORIZONTAL, forwardDistance);

    clampPointToPlayerTravelBounds(target, targetClampPadding);

    target.y = this.game.world.getHeight(target.x, target.z) + 0.35;
    ARC_HORIZONTAL.set(target.x - enemy.mesh.position.x, 0, target.z - enemy.mesh.position.z);
    const planarDistance = Math.max(4, ARC_HORIZONTAL.length());
    ARC_HORIZONTAL.normalize();

    const horizontalSpeed = Math.max(10, speed * horizontalSpeedScale);
    const flightTime = THREE.MathUtils.clamp(planarDistance / horizontalSpeed, minFlight, maxFlight);
    const verticalVelocity = (target.y - enemy.mesh.position.y + 0.5 * gravity * flightTime * flightTime) / flightTime;
    ARC_VELOCITY.copy(ARC_HORIZONTAL).multiplyScalar(planarDistance / flightTime);
    ARC_VELOCITY.y = verticalVelocity;

    const direction = ARC_VELOCITY.clone().normalize();
    return {
      direction,
      initialVelocity: ARC_VELOCITY.clone(),
      gravity,
      speed: ARC_VELOCITY.length(),
    };
  }

  EnemySystem.prototype.makeBallisticVelocity = function makeBallisticVelocity(origin, target, flightTime, gravity) {
    const t = Math.max(0.4, flightTime);
    BALLISTIC_MINE_VELOCITY.set(
      (target.x - origin.x) / t,
      ((target.y - origin.y) + (0.5 * gravity * t * t)) / t,
      (target.z - origin.z) / t,
    );
    if (BALLISTIC_MINE_VELOCITY.lengthSq() < 0.000001) {
      BALLISTIC_MINE_FALLBACK.set(0, 1, 0).multiplyScalar(12);
      return BALLISTIC_MINE_FALLBACK.clone();
    }
    return BALLISTIC_MINE_VELOCITY.clone();
  }

  EnemySystem.prototype.spawnDrifterMindriftMineVolley = function spawnDrifterMindriftMineVolley(enemy) {
    const playerPos = this.game.store.playerMesh?.position;
    if (!playerPos) return;

    const splashRadius = 5.6;
    const landingPadding = Math.max(2.4, splashRadius * 0.45);
    const leadTime = 0.34;
    const playerVel = this.getPlayerVelocity();
    BALLISTIC_MINE_TARGET.copy(playerPos).addScaledVector(playerVel, leadTime);
    clampPointToPlayerTravelBounds(BALLISTIC_MINE_TARGET, landingPadding);

    BALLISTIC_MINE_FORWARD.set(
      BALLISTIC_MINE_TARGET.x - enemy.mesh.position.x,
      0,
      BALLISTIC_MINE_TARGET.z - enemy.mesh.position.z,
    );
    if (BALLISTIC_MINE_FORWARD.lengthSq() < 0.000001) BALLISTIC_MINE_FORWARD.set(TO_PLAYER.x, 0, TO_PLAYER.z);
    if (BALLISTIC_MINE_FORWARD.lengthSq() < 0.000001) BALLISTIC_MINE_FORWARD.set(0, 0, 1);
    BALLISTIC_MINE_FORWARD.normalize();
    BALLISTIC_MINE_SIDE.crossVectors(BALLISTIC_MINE_FORWARD, UP);
    if (BALLISTIC_MINE_SIDE.lengthSq() < 0.000001) BALLISTIC_MINE_SIDE.set(1, 0, 0);
    else BALLISTIC_MINE_SIDE.normalize();

    const lateralOffsets = [-3.4, 3.4];
    for (let i = 0; i < lateralOffsets.length; i += 1) {
      const target = BALLISTIC_MINE_TARGET.clone().addScaledVector(BALLISTIC_MINE_SIDE, lateralOffsets[i]);
      clampPointToPlayerTravelBounds(target, landingPadding);

      BALLISTIC_MINE_ORIGIN.copy(enemy.mesh.position).addScaledVector(BALLISTIC_MINE_FORWARD, enemy.def.radius * 0.44);
      BALLISTIC_MINE_ORIGIN.y += enemy.def.hover * 0.08;
      target.y = this.game.world.getHeight(target.x, target.z) + 0.12;

      const flightTime = 1.16 + Math.abs(lateralOffsets[i]) * 0.012;
      const gravity = 20.5 + Math.abs(lateralOffsets[i]) * 0.14;
      const velocity = this.makeBallisticVelocity(BALLISTIC_MINE_ORIGIN, target, flightTime, gravity);

      this.game.projectiles.spawnEnemyProjectile({
        origin: BALLISTIC_MINE_ORIGIN.clone(),
        initialVelocity: velocity,
        direction: velocity.clone().normalize(),
        speed: velocity.length(),
        gravity,
        damage: enemy.def.bulletDamage + 2,
        radius: 0.8,
        life: flightTime + 9.6,
        color: Math.random() < 0.5 ? 0x7df6ff : 0xff9bee,
        emissive: Math.random() < 0.5 ? 0xb8fdff : 0xffd0fb,
        ignoreWorldHit: true,
        mindriftMine: true,
        mineBallistic: true,
        mineGroundLife: 7.4,
        armDelay: 0.6,
        mineTriggerRadius: 5.8,
        minePrimeDelay: 0.24,
        mineHoverHeight: THREE.MathUtils.randFloat(0.84, 1.14),
        mineDriftDamping: 4.2,
        mineBobAmp: 0.22,
        mineArmPulse: 1.22,
        splashRadius,
        splashDamage: enemy.def.bulletDamage + 2,
      });
    }
  }

  EnemySystem.prototype.updateBossMovement = function updateBossMovement(enemy, dt) {
    const playerPos = this.game.store.playerMesh.position;
    TO_PLAYER.copy(playerPos).sub(enemy.mesh.position);
    const distance = Math.max(0.001, TO_PLAYER.length());
    TO_PLAYER.normalize();
    SIDE.crossVectors(TO_PLAYER, UP).normalize();

    DESIRED.set(0, 0, 0)
      .addScaledVector(TO_PLAYER, distance > enemy.def.preferredDist ? 0.42 : -0.18)
      .addScaledVector(SIDE, Math.sin(enemy.age * 0.55) * 0.22);
    if (DESIRED.lengthSq() > 0.0001) DESIRED.normalize();
    enemy.velocity.copy(DESIRED).multiplyScalar(enemy.def.speed);
    enemy.localVelocity.copy(enemy.velocity);
    enemy.mesh.position.addScaledVector(enemy.velocity, dt);

    clampPointToPlayerTravelBounds(enemy.mesh.position, 52);
  }

  EnemySystem.prototype.tryAttack = function tryAttack(enemy) {
    if (enemy.cooldown > 0) return;
    const playerPos = this.game.store.playerMesh.position;
    TO_PLAYER.copy(playerPos).sub(enemy.mesh.position);
    const distance = TO_PLAYER.length();
    if (distance > enemy.def.attackRange) return;

    enemy.cooldown = sampleRange(enemy.def.shootCd);
    TO_PLAYER.normalize();
    SIDE.crossVectors(TO_PLAYER, UP).normalize();
    const leadRule = this.getPredictiveAttackRule(enemy);
    const fire = (dir, extra = {}) => this.game.projectiles.spawnEnemyProjectile({
      origin: enemy.mesh.position.clone(),
      direction: dir,
      speed: enemy.def.bulletSpeed,
      damage: enemy.def.bulletDamage,
      radius: 0.4,
      life: 5.2,
      color: enemy.def.accent,
      ...extra,
    });

    switch (enemy.def.attack) {
      case 'single':
        fire(this.buildAttackDirection(enemy, 0, 0, enemy.def.bulletSpeed, leadRule));
        break;
      case 'lance':
        fire(this.buildAttackDirection(enemy, 0, 0, enemy.def.bulletSpeed + 8, leadRule), { speed: enemy.def.bulletSpeed + 8, radius: 0.34 });
        break;
      case 'spread':
        for (let i = -1; i <= 1; i += 1) fire(this.buildAttackDirection(enemy, i * 0.12, 0, enemy.def.bulletSpeed, leadRule));
        break;
      case 'burst':
        for (let i = 0; i < 3; i += 1) {
          fire(this.buildAttackDirection(
            enemy,
            0,
            0,
            enemy.def.bulletSpeed,
            leadRule,
            new THREE.Vector3(THREE.MathUtils.randFloatSpread(0.05), THREE.MathUtils.randFloatSpread(0.03), THREE.MathUtils.randFloatSpread(0.05)),
          ));
        }
        break;
      case 'mortar': {
        const shot = this.buildArcedSplashShot(enemy, {
          sideOffset: 0,
          speed: enemy.def.bulletSpeed - 6,
          leadRule,
          gravity: 24,
          minFlight: 1.15,
          maxFlight: 1.75,
          horizontalSpeedScale: 0.68,
        });
        fire(shot.direction, { radius: 0.62, splashRadius: 4.6, splashDamage: 9, speed: shot.speed, initialVelocity: shot.initialVelocity, gravity: shot.gravity, life: 5.6 });
        break;
      }
      case 'twin':
        fire(this.buildAttackDirection(enemy, 0.08, 0, enemy.def.bulletSpeed, leadRule));
        fire(this.buildAttackDirection(enemy, -0.08, 0, enemy.def.bulletSpeed, leadRule));
        break;
      case 'spray':
        for (let i = -2; i <= 2; i += 1) fire(this.buildAttackDirection(enemy, i * 0.08, 0, enemy.def.bulletSpeed - Math.abs(i) * 2, leadRule), { speed: enemy.def.bulletSpeed - Math.abs(i) * 2 });
        break;
      case 'triple':
        fire(this.buildAttackDirection(enemy, 0, 0, enemy.def.bulletSpeed, leadRule));
        fire(this.buildAttackDirection(enemy, 0.12, 0, enemy.def.bulletSpeed, leadRule));
        fire(this.buildAttackDirection(enemy, -0.12, 0, enemy.def.bulletSpeed, leadRule));
        break;
      case 'bomb': {
        const shot = this.buildArcedSplashShot(enemy, {
          sideOffset: 0,
          speed: enemy.def.bulletSpeed - 4,
          leadRule,
          gravity: 25,
          minFlight: 1.2,
          maxFlight: 1.9,
          horizontalSpeedScale: 0.66,
        });
        fire(shot.direction, { radius: 0.72, splashRadius: 5.6, splashDamage: 12, speed: shot.speed, initialVelocity: shot.initialVelocity, gravity: shot.gravity, life: 5.9 });
        break;
      }
      case 'fan':
        for (let i = -2; i <= 2; i += 1) fire(this.buildAttackDirection(enemy, i * 0.16, 0, enemy.def.bulletSpeed, leadRule));
        break;
      case 'cross': {
        fire(this.buildAttackDirection(enemy, 0, 0, enemy.def.bulletSpeed, leadRule));
        fire(this.buildAttackDirection(enemy, 1.0, 0, enemy.def.bulletSpeed, leadRule));
        fire(this.buildAttackDirection(enemy, -1.0, 0, enemy.def.bulletSpeed, leadRule));
        fire(this.buildAttackDirection(enemy, 0, 0, enemy.def.bulletSpeed, leadRule).multiplyScalar(-1));
        break;
      }
      case 'split': {
        fire(this.buildAttackDirection(enemy, 0, 0, enemy.def.bulletSpeed + 6, leadRule), { speed: enemy.def.bulletSpeed + 6, radius: 0.36 });
        fire(this.buildAttackDirection(enemy, 0.18, 0, enemy.def.bulletSpeed - 4, leadRule), { speed: enemy.def.bulletSpeed - 4 });
        fire(this.buildAttackDirection(enemy, -0.18, 0, enemy.def.bulletSpeed - 4, leadRule), { speed: enemy.def.bulletSpeed - 4 });
        break;
      }
      case 'beamlet':
        for (let i = -2; i <= 2; i += 1) fire(this.buildAttackDirection(enemy, i * 0.06, 0, enemy.def.bulletSpeed + 10, leadRule), { speed: enemy.def.bulletSpeed + 10, radius: 0.28, life: 4.1 });
        break;
      case 'shardfall':
        for (let i = -1; i <= 1; i += 1) {
          const shot = this.buildArcedSplashShot(enemy, {
            sideOffset: i * 0.9,
            speed: enemy.def.bulletSpeed - 2,
            leadRule,
            gravity: 26,
            minFlight: 1.05,
            maxFlight: 1.65,
            horizontalSpeedScale: 0.7,
          });
          fire(shot.direction, { radius: 0.56, splashRadius: 3.8, splashDamage: 10, speed: shot.speed, initialVelocity: shot.initialVelocity, gravity: shot.gravity, life: 5.3 });
        }
        break;
      case 'nova':
        for (let i = 0; i < 8; i += 1) {
          const angle = (i / 8) * Math.PI * 2 + enemy.age * 0.2;
          fire(this.buildAttackDirection(enemy, 0, 0, enemy.def.bulletSpeed + (i % 2 === 0 ? 0 : 4), null, null, new THREE.Vector3(Math.cos(angle), 0.05, Math.sin(angle))), { speed: enemy.def.bulletSpeed + (i % 2 === 0 ? 0 : 4) });
        }
        break;
      case 'mine': {
        this.spawnDrifterMindriftMineVolley(enemy);
        break;
      }
      default:
        break;
    }
  }

}

/**
 * Responsibility:
 * - 星礁心臓ボスの dash / mine / barrage すべての固有制御を担当する。
 *
 * Rules:
 * - astral 系の状態遷移はこの Controller に閉じ込める。
 * - travel bounds への clamp 規則も astral 固有仕様としてここで扱う。
 */
import {
  ASTRAL_BARRAGE_DIR,
  ASTRAL_DASH_FROM_PLAYER,
  ASTRAL_DASH_POINT,
  ASTRAL_DASH_POSITION,
  ASTRAL_DASH_WOBBLE,
  ASTRAL_RING_TARGET,
  BALLISTIC_TARGET,
  SIDE,
  TARGET_DIR,
  THREE,
  UP,
  clampPointToPlayerTravelBounds,
} from '../BossSystemShared.js';

export function installAstralBossController(BossSystem) {
  BossSystem.prototype.setupAstralBossState = function setupAstralBossState(enemy) {
      enemy.astralBossState = {
        dashState: 'idle',
        dashTimer: 0,
        dashDuration: 0,
        dashFrom: enemy.mesh.position.clone(),
        dashTo: enemy.mesh.position.clone(),
        dashDir: new THREE.Vector3(0, 0, 1),
        dashSide: new THREE.Vector3(1, 0, 0),
        dashDistance: 0,
        dashWobble: 0,
        dashCooldown: THREE.MathUtils.randFloat(1.6, 2.2),
        mineTimer: 0,
        volley: 0,
        triangleIndex: 0,
        triangleBaseAngle: Math.random() * Math.PI * 2,
        ambientTimer: 0.24,
      };
      enemy.cooldown = Math.min(enemy.cooldown, 0.42);
    }

  BossSystem.prototype.getAstralDashCooldown = function getAstralDashCooldown(phaseTier) {
      if (phaseTier === 2) return THREE.MathUtils.randFloat(2.2, 3.0);
      if (phaseTier === 1) return THREE.MathUtils.randFloat(2.9, 3.9);
      return THREE.MathUtils.randFloat(3.6, 4.8);
    }

  BossSystem.prototype.getAstralMineInterval = function getAstralMineInterval(phaseTier) {
      if (phaseTier === 2) return THREE.MathUtils.randFloat(0.09, 0.12);
      if (phaseTier === 1) return THREE.MathUtils.randFloat(0.11, 0.15);
      return THREE.MathUtils.randFloat(0.087, 0.12);
    }

  BossSystem.prototype.getAstralDashDestination = function getAstralDashDestination(enemy, phaseTier) {
      const playerPos = this.game.store.playerMesh?.position;
      if (!playerPos) return enemy.mesh.position.clone();
  
      const state = enemy.astralBossState ?? (this.setupAstralBossState(enemy), enemy.astralBossState);
      if (phaseTier === 0) {
        const angle = state.triangleBaseAngle + state.triangleIndex * (Math.PI * 2 / 3);
        const radius = THREE.MathUtils.randFloat(48, 66);
        ASTRAL_DASH_POINT.set(
          playerPos.x + Math.cos(angle) * radius,
          enemy.mesh.position.y,
          playerPos.z + Math.sin(angle) * radius,
        );
        clampPointToPlayerTravelBounds(ASTRAL_DASH_POINT, 44);
        ASTRAL_DASH_POINT.y = this.getGroundY(ASTRAL_DASH_POINT.x, ASTRAL_DASH_POINT.z) + enemy.def.hover;
        state.triangleIndex = (state.triangleIndex + 1) % 3;
        if (state.triangleIndex === 0) state.triangleBaseAngle += enemy.strafeDir * THREE.MathUtils.randFloat(0.2, 0.42);
        return ASTRAL_DASH_POINT.clone();
      }
  
      ASTRAL_DASH_FROM_PLAYER.copy(enemy.mesh.position).sub(playerPos).setY(0);
      if (ASTRAL_DASH_FROM_PLAYER.lengthSq() < 0.0001) ASTRAL_DASH_FROM_PLAYER.set(0, 0, -1);
      else ASTRAL_DASH_FROM_PLAYER.normalize();
  
      const rotate = enemy.strafeDir * THREE.MathUtils.randFloat(0.28, phaseTier === 2 ? 0.92 : 0.76);
      ASTRAL_DASH_FROM_PLAYER.negate().applyAxisAngle(UP, rotate).normalize();
  
      const radius = phaseTier === 2
        ? THREE.MathUtils.randFloat(34, 54)
        : phaseTier === 1
          ? THREE.MathUtils.randFloat(42, 66)
          : THREE.MathUtils.randFloat(52, 82);
  
      ASTRAL_DASH_POINT.copy(playerPos).addScaledVector(ASTRAL_DASH_FROM_PLAYER, radius);
      clampPointToPlayerTravelBounds(ASTRAL_DASH_POINT, 44);
      ASTRAL_DASH_POINT.y = this.getGroundY(ASTRAL_DASH_POINT.x, ASTRAL_DASH_POINT.z) + enemy.def.hover;
      return ASTRAL_DASH_POINT.clone();
    }

  BossSystem.prototype.startAstralDash = function startAstralDash(enemy, phaseTier) {
      const state = enemy.astralBossState ?? (this.setupAstralBossState(enemy), enemy.astralBossState);
      state.dashState = 'active';
      state.dashTimer = 0;
      state.dashFrom.copy(enemy.mesh.position);
      state.dashTo.copy(this.getAstralDashDestination(enemy, phaseTier));
      state.dashTo.y = enemy.mesh.position.y;
      state.dashDir.copy(state.dashTo).sub(state.dashFrom).setY(0);
      state.dashDistance = Math.max(18, state.dashDir.length());
      if (state.dashDir.lengthSq() < 0.0001) state.dashDir.set(0, 0, -1);
      else state.dashDir.normalize();
      state.dashSide.crossVectors(state.dashDir, UP);
      if (state.dashSide.lengthSq() < 0.0001) state.dashSide.set(1, 0, 0);
      else state.dashSide.normalize();
      state.dashDuration = phaseTier === 2
        ? THREE.MathUtils.randFloat(1.0, 1.2)
        : phaseTier === 1
          ? THREE.MathUtils.randFloat(1.1, 1.32)
          : THREE.MathUtils.randFloat(1.18, 1.42);
      state.dashWobble = phaseTier === 2 ? 7.2 : phaseTier === 1 ? 5.8 : 4.4;
      state.mineTimer = 0;
      enemy.cooldown = Math.max(enemy.cooldown, state.dashDuration * 0.55);
      enemy.velocity.copy(state.dashDir).multiplyScalar(state.dashDistance / state.dashDuration);
      enemy.localVelocity.copy(enemy.velocity);
      this.game.effects.spawnHitSpark(enemy.mesh.position.clone(), 0x9deaff, 1.2 + phaseTier * 0.18);
    }

  BossSystem.prototype.spawnAstralMindriftMine = function spawnAstralMindriftMine(enemy, phaseTier) {
      const state = enemy.astralBossState;
      if (!state) return;
  
      const trailDir = state.dashDir.clone().negate();
      const sideSpread = phaseTier === 0 ? 1.02 : 0.7;
      const lateralOriginScale = phaseTier === 0 ? 0.82 : 0.55;
      const lateralVelocityScale = phaseTier === 0 ? 6.2 : 4.6;
      const sideOffset = THREE.MathUtils.randFloatSpread(sideSpread);
      const origin = enemy.mesh.position.clone()
        .addScaledVector(trailDir, enemy.def.radius * THREE.MathUtils.randFloat(0.22, 0.44))
        .addScaledVector(state.dashSide, sideOffset * enemy.def.radius * lateralOriginScale);
      origin.y = this.getGroundY(origin.x, origin.z) + enemy.def.hover * THREE.MathUtils.randFloat(0.7, 0.92);
  
      const initialVelocity = trailDir.clone().multiplyScalar(phaseTier === 2 ? 7.4 : phaseTier === 1 ? 6.2 : 5.2)
        .addScaledVector(state.dashSide, sideOffset * lateralVelocityScale);
  
      this.game.projectiles.spawnEnemyProjectile({
        origin,
        direction: trailDir.clone(),
        speed: initialVelocity.length(),
        initialVelocity,
        damage: enemy.def.bulletDamage + 2 + phaseTier,
        radius: phaseTier === 2 ? 0.82 : 0.74,
        life: phaseTier === 2 ? 10.8 : phaseTier === 1 ? 9.8 : 8.8,
        color: Math.random() < 0.5 ? 0x7df6ff : 0xff9bee,
        emissive: Math.random() < 0.5 ? 0xb8fdff : 0xffd0fb,
        splashRadius: (phaseTier === 2 ? 5.4 : phaseTier === 1 ? 5.0 : 4.6) * 2,
        splashDamage: enemy.def.bulletDamage + 2 + phaseTier,
        ignoreWorldHit: true,
        mindriftMine: true,
        mindriftOwnerId: enemy.id,
        armDelay: phaseTier === 2 ? 0.8 : phaseTier === 1 ? 0.95 : 1.12,
        mineTriggerRadius: phaseTier === 2 ? 6.4 : phaseTier === 1 ? 5.9 : 5.3,
        minePrimeDelay: phaseTier === 2 ? 0.18 : phaseTier === 1 ? 0.22 : 0.28,
        mineHoverHeight: THREE.MathUtils.randFloat(0.82, 1.18),
        mineDriftDamping: phaseTier === 2 ? 4.6 : 4.0,
        mineBobAmp: phaseTier === 2 ? 0.24 : 0.2,
        mineArmPulse: phaseTier === 2 ? 1.35 : 1.15,
      });
    }

  BossSystem.prototype.getAstralLobPattern = function getAstralLobPattern(phaseTier) {
      if (phaseTier === 2) {
        return {
          count: 9,
          crossRadius: 18,
          extraRadiusMin: 26,
          extraRadiusMax: 36,
          edgeJitter: 3.2,
          gravity: 24.5,
          flightTime: 1.32,
          cooldown: 0.48,
          triggerRadius: 7.4,
          splashRadius: 7.6,
        };
      }
      if (phaseTier === 1) {
        return {
          count: 7,
          crossRadius: 14,
          extraRadiusMin: 20,
          extraRadiusMax: 28,
          edgeJitter: 2.4,
          gravity: 22.5,
          flightTime: 1.24,
          cooldown: 0.62,
          triggerRadius: 6.6,
          splashRadius: 6.6,
        };
      }
      return {
        count: 5,
        crossRadius: 10,
        extraRadiusMin: 0,
        extraRadiusMax: 0,
        edgeJitter: 1.8,
        gravity: 20.5,
        flightTime: 1.16,
        cooldown: 0.82,
        triggerRadius: 5.8,
        splashRadius: 5.6,
      };
    }

  BossSystem.prototype.throwAstralBallisticMine = function throwAstralBallisticMine(enemy, target, phaseTier, flightTime, gravity) {
      const origin = enemy.mesh.position.clone().addScaledVector(TARGET_DIR, enemy.def.radius * 0.44);
      origin.y += enemy.def.hover * 0.08;
      target.y = this.getGroundY(target.x, target.z) + 0.12;
      const velocity = this.makeBallisticVelocity(origin, target, flightTime, gravity);
  
      this.game.projectiles.spawnEnemyProjectile({
        origin,
        initialVelocity: velocity,
        direction: velocity.clone().normalize(),
        speed: velocity.length(),
        gravity,
        damage: enemy.def.bulletDamage + 2 + phaseTier,
        radius: phaseTier === 2 ? 0.98 : phaseTier === 1 ? 0.88 : 0.8,
        life: flightTime + 9.6,
        color: Math.random() < 0.5 ? 0x7df6ff : 0xff9bee,
        emissive: Math.random() < 0.5 ? 0xb8fdff : 0xffd0fb,
        ignoreWorldHit: true,
        mindriftMine: true,
        mineBallistic: true,
        mineGroundLife: phaseTier === 2 ? 9.0 : phaseTier === 1 ? 8.2 : 7.4,
        mindriftOwnerId: enemy.id,
        armDelay: phaseTier === 2 ? 0.34 : phaseTier === 1 ? 0.46 : 0.6,
        mineTriggerRadius: this.getAstralLobPattern(phaseTier).triggerRadius,
        minePrimeDelay: phaseTier === 2 ? 0.16 : phaseTier === 1 ? 0.2 : 0.24,
        mineHoverHeight: THREE.MathUtils.randFloat(0.84, 1.14),
        mineDriftDamping: phaseTier === 2 ? 4.8 : 4.2,
        mineBobAmp: phaseTier === 2 ? 0.26 : 0.22,
        mineArmPulse: phaseTier === 2 ? 1.42 : 1.22,
        splashRadius: this.getAstralLobPattern(phaseTier).splashRadius,
        splashDamage: enemy.def.bulletDamage + 2 + phaseTier,
      });
    }

  BossSystem.prototype.spawnAstralLobbedMineVolley = function spawnAstralLobbedMineVolley(enemy, phaseTier) {
      const playerPos = this.game.store.playerMesh?.position;
      if (!playerPos) return null;
  
      const state = enemy.astralBossState ?? (this.setupAstralBossState(enemy), enemy.astralBossState);
      const pattern = this.getAstralLobPattern(phaseTier);
      const landingPadding = Math.max(2.4, pattern.splashRadius * 0.45);
      const playerVel = this.getPlayerVelocity();
      const leadTime = phaseTier === 2 ? 0.5 : phaseTier === 1 ? 0.42 : 0.34;
      BALLISTIC_TARGET.copy(playerPos).addScaledVector(playerVel, leadTime);
  
      const forward = playerVel.lengthSq() > 4
        ? playerVel.clone().setY(0)
        : BALLISTIC_TARGET.clone().sub(enemy.mesh.position).setY(0);
      if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
      else forward.normalize();
      const side = new THREE.Vector3().crossVectors(forward, UP);
      if (side.lengthSq() < 0.0001) side.set(1, 0, 0);
      else side.normalize();
  
      const targets = [
        BALLISTIC_TARGET.clone(),
        BALLISTIC_TARGET.clone().addScaledVector(forward, pattern.crossRadius),
        BALLISTIC_TARGET.clone().addScaledVector(forward, -pattern.crossRadius),
        BALLISTIC_TARGET.clone().addScaledVector(side, pattern.crossRadius),
        BALLISTIC_TARGET.clone().addScaledVector(side, -pattern.crossRadius),
      ];
  
      const extraCount = Math.max(0, pattern.count - targets.length);
      const angleBase = state.volley * 0.46 + enemy.phase * (0.2 + phaseTier * 0.05);
      for (let i = 0; i < extraCount; i += 1) {
        const angle = angleBase + (i / Math.max(1, extraCount)) * Math.PI * 2 + THREE.MathUtils.randFloatSpread(0.32);
        const radial = THREE.MathUtils.randFloat(pattern.extraRadiusMin, pattern.extraRadiusMax);
        const lateral = THREE.MathUtils.randFloatSpread(pattern.edgeJitter);
        const target = BALLISTIC_TARGET.clone()
          .addScaledVector(forward, Math.cos(angle) * radial)
          .addScaledVector(side, Math.sin(angle) * radial + lateral);
        targets.push(target);
      }
  
      for (let i = 0; i < targets.length; i += 1) {
        const target = targets[i];
        clampPointToPlayerTravelBounds(target, landingPadding);
        this.throwAstralBallisticMine(
          enemy,
          target,
          phaseTier,
          pattern.flightTime + Math.random() * 0.18,
          pattern.gravity + Math.random() * 2.1,
        );
      }
  
      this.game.effects.spawnHitSpark(enemy.mesh.position.clone().addScaledVector(TARGET_DIR, enemy.def.radius * 0.6), 0x9deaff, 1.18 + phaseTier * 0.18);
      return pattern;
    }

  BossSystem.prototype.updateAstralDash = function updateAstralDash(enemy, dt, phaseTier) {
      const state = enemy.astralBossState ?? (this.setupAstralBossState(enemy), enemy.astralBossState);
      if (state.dashState !== 'active') {
        state.dashCooldown -= dt;
        if (state.dashCooldown <= 0) this.startAstralDash(enemy, phaseTier);
        return state.dashState === 'active';
      }
  
      state.dashTimer += dt;
      const progress = THREE.MathUtils.clamp(state.dashTimer / Math.max(0.001, state.dashDuration), 0, 1);
      const eased = THREE.MathUtils.smootherstep(progress, 0, 1);
      ASTRAL_DASH_POSITION.lerpVectors(state.dashFrom, state.dashTo, eased);
      ASTRAL_DASH_WOBBLE.copy(state.dashSide).multiplyScalar(Math.sin(progress * Math.PI * 2) * state.dashWobble * (1 - progress * 0.22));
      ASTRAL_DASH_POSITION.add(ASTRAL_DASH_WOBBLE);
      clampPointToPlayerTravelBounds(ASTRAL_DASH_POSITION, 44);
      enemy.mesh.position.x = ASTRAL_DASH_POSITION.x;
      enemy.mesh.position.z = ASTRAL_DASH_POSITION.z;
      enemy.velocity.copy(state.dashDir).multiplyScalar(state.dashDistance / Math.max(0.001, state.dashDuration));
      enemy.localVelocity.copy(enemy.velocity);
  
      state.mineTimer -= dt;
      while (state.mineTimer <= 0) {
        this.spawnAstralMindriftMine(enemy, phaseTier);
        state.mineTimer += this.getAstralMineInterval(phaseTier);
      }
  
      if (progress < 1) return true;
  
      enemy.mesh.position.copy(state.dashTo);
      state.dashState = 'idle';
      state.dashCooldown = this.getAstralDashCooldown(phaseTier);
      enemy.cooldown = Math.max(enemy.cooldown, phaseTier === 2 ? 0.3 : 0.42);
      this.game.effects.spawnHitSpark(enemy.mesh.position.clone(), 0xff9bee, 1.1 + phaseTier * 0.16);
      this.spawnAstralDashEndFan(enemy, phaseTier);
      return false;
    }

  BossSystem.prototype.getAstralAmbientBarrageInterval = function getAstralAmbientBarrageInterval(phaseTier, moving) {
      if (moving) {
        if (phaseTier === 2) return 0.2;
        if (phaseTier === 1) return 0.25;
        return 0.32;
      }
      if (phaseTier === 2) return 0.26;
      if (phaseTier === 1) return 0.34;
      return 0.58;
    }

  BossSystem.prototype.getAstralRingDirection = function getAstralRingDirection(enemy, angle, radiusOffset = 0) {
      const origin = enemy.mesh.position;
      const playerPos = this.game.store.playerMesh?.position;
      const baseRadius = playerPos
        ? Math.max(18, Math.hypot(playerPos.x - origin.x, playerPos.z - origin.z))
        : 72;
      const radius = Math.max(18, baseRadius + radiusOffset);
      const targetY = playerPos?.y ?? this.getGroundY(origin.x, origin.z);
  
      ASTRAL_RING_TARGET.set(
        origin.x + Math.cos(angle) * radius,
        targetY,
        origin.z + Math.sin(angle) * radius,
      ).sub(origin);
  
      if (ASTRAL_RING_TARGET.lengthSq() < 0.000001) {
        ASTRAL_RING_TARGET.set(Math.cos(angle), 0, Math.sin(angle));
      }
      return ASTRAL_RING_TARGET.normalize().clone();
    }

  BossSystem.prototype.spawnAstralAmbientBarrage = function spawnAstralAmbientBarrage(enemy, phaseTier, moving) {
      const count = moving
        ? (phaseTier === 2 ? 14 : phaseTier === 1 ? 12 : 10)
        : (phaseTier === 2 ? 12 : 10);
      const speed = enemy.def.bulletSpeed + (moving ? 4 : 1) + phaseTier * 2;
      const radius = moving ? 0.3 : 0.32;
      const damage = enemy.def.bulletDamage + (phaseTier >= 2 ? 1 : 0);
      const rotation = enemy.phase * (moving ? 2.4 : 1.6) + (enemy.astralBossState?.volley ?? 0) * 0.22 + (moving ? Math.PI / Math.max(1, count) : 0);
  
      for (let i = 0; i < count; i += 1) {
        const angle = rotation + (i / count) * Math.PI * 2;
        const ringOffset = moving
          ? (i % 2 === 0 ? 8 : -8)
          : (i % 2 === 0 ? 6 : -6);
        ASTRAL_BARRAGE_DIR.copy(this.getAstralRingDirection(enemy, angle, ringOffset));
        this.fireBossShot(
          enemy,
          ASTRAL_BARRAGE_DIR.clone(),
          i % 2 === 0 ? 0x86f7ff : 0xff9bee,
          radius,
          damage,
          {
            speed,
            life: moving ? 4.2 : 4.8,
            showBulletRatio: moving ? 0.18 : 0.24,
            preserveDirection: true,
          },
        );
      }
    }

  BossSystem.prototype.spawnAstralDashEndFan = function spawnAstralDashEndFan(enemy, phaseTier) {
      const playerPos = this.game.store.playerMesh?.position;
      if (!playerPos) return;
  
      const forward = playerPos.clone().sub(enemy.mesh.position).setY(0);
      if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
      else forward.normalize();
      const side = new THREE.Vector3().crossVectors(forward, UP);
      if (side.lengthSq() < 0.0001) side.set(1, 0, 0);
      else side.normalize();
  
      const spread = phaseTier === 2 ? 0.18 : phaseTier === 1 ? 0.16 : 0.14;
      for (let i = -2; i <= 2; i += 1) {
        const direction = forward.clone().addScaledVector(side, i * spread).normalize();
        this.fireBossShot(
          enemy,
          direction,
          i % 2 === 0 ? 0x8df7ff : 0xff9bee,
          0.34,
          enemy.def.bulletDamage + (phaseTier >= 1 ? 1 : 0),
          {
            speed: enemy.def.bulletSpeed + 5 + phaseTier * 2,
            life: 4.3,
            leadRatio: 0.22,
            leadStrength: 0.28,
            showBulletRatio: 0.18,
          },
        );
      }
    }

  BossSystem.prototype.updateAstralAmbientBarrage = function updateAstralAmbientBarrage(enemy, dt, phaseTier, moving) {
      const state = enemy.astralBossState ?? (this.setupAstralBossState(enemy), enemy.astralBossState);
      state.ambientTimer = (state.ambientTimer ?? 0.24) - dt;
      const interval = this.getAstralAmbientBarrageInterval(phaseTier, moving);
      while (state.ambientTimer <= 0) {
        this.spawnAstralAmbientBarrage(enemy, phaseTier, moving);
        state.ambientTimer += interval;
      }
    }

  BossSystem.prototype.getAstralBossVisualState = function getAstralBossVisualState(enemy) {
      const rig = enemy.mesh.userData?.astralBossRig;
      if (!rig) return null;
      const state = enemy.astralBossVisualState ??= {
        rig,
        hullBaseY: rig.hull?.position.y ?? 0,
        broadsideBaseY: rig.broadside?.position.y ?? 0,
        crownBaseY: rig.crown?.position.y ?? 0,
      };
      if (state.rig !== rig) {
        state.rig = rig;
        state.hullBaseY = rig.hull?.position.y ?? 0;
        state.broadsideBaseY = rig.broadside?.position.y ?? 0;
        state.crownBaseY = rig.crown?.position.y ?? 0;
      }
      return state;
    }

  BossSystem.prototype.animateAstralBossModel = function animateAstralBossModel(enemy, dt, phaseTier, dashing) {
      const visual = this.getAstralBossVisualState(enemy);
      if (!visual) return;
      const rig = visual.rig;
      const phase = enemy.phase * (0.92 + phaseTier * 0.08);
      const tierBlend = phaseTier * 0.2;
      const dashBlend = dashing ? 1 : 0;

      if (rig.hull) {
        rig.hull.position.y = visual.hullBaseY + Math.sin(phase * 1.15) * 0.28 + dashBlend * 0.18;
        rig.hull.rotation.x = Math.sin(phase * 0.7) * 0.035 + dashBlend * 0.065;
        rig.hull.rotation.z = Math.sin(phase * 1.35) * 0.02;
      }
      if (rig.finRack) {
        rig.finRack.rotation.y += dt * (0.18 + tierBlend + dashBlend * 0.82);
        rig.finRack.rotation.z = Math.sin(phase * 1.95) * 0.055 + dashBlend * 0.04;
      }
      if (rig.broadside) {
        rig.broadside.rotation.y += dt * (0.12 + tierBlend * 0.7 + dashBlend * 0.56);
        rig.broadside.position.y = visual.broadsideBaseY + Math.sin(phase * 1.48) * 0.26;
      }
      if (rig.crown) {
        rig.crown.rotation.y -= dt * (0.34 + tierBlend * 1.3 + dashBlend * 1.1);
        rig.crown.position.y = visual.crownBaseY + dashBlend * 0.24;
      }
      if (rig.engineCluster) {
        rig.engineCluster.rotation.y += dt * (0.44 + tierBlend * 1.4 + dashBlend * 2.2);
        rig.engineCluster.rotation.z = Math.sin(phase * 1.36) * 0.07;
        const scaleXY = 1 + dashBlend * 0.08 + Math.sin(phase * 2.5) * 0.015;
        const scaleZ = 1 + dashBlend * 0.2 + Math.sin(phase * 3.1) * 0.03;
        rig.engineCluster.scale.set(scaleXY, 1 + dashBlend * 0.1, scaleZ);
      }
    }

  BossSystem.prototype.updateAstralBoss = function updateAstralBoss(enemy, dt, phaseTier, hpRatio) {
      const state = enemy.astralBossState ?? (this.setupAstralBossState(enemy), enemy.astralBossState);
      const mul = phaseTier === 2 ? 1.18 : phaseTier === 1 ? 1.08 : 1;
      const dashing = this.updateAstralDash(enemy, dt, phaseTier);
      if (!dashing) {
        enemy.mesh.position.x += Math.sin(enemy.phase * (0.22 + phaseTier * 0.04)) * dt * 3.6 * mul;
        enemy.mesh.position.z += Math.cos(enemy.phase * (0.18 + phaseTier * 0.05)) * dt * 4.1 * mul;
      }
      enemy.mesh.rotation.y -= dt * (dashing ? 1.28 + phaseTier * 0.18 : 0.32 + phaseTier * 0.08);
      enemy.mesh.rotation.z = Math.sin(enemy.phase * (dashing ? 8.2 : 4.1)) * (dashing ? 0.085 : 0.024);
      this.animateAstralBossModel(enemy, dt, phaseTier, dashing);
  
      TARGET_DIR.copy(this.game.store.playerMesh.position).sub(enemy.mesh.position).normalize();
      SIDE.crossVectors(TARGET_DIR, UP).normalize();
      this.updateAstralAmbientBarrage(enemy, dt, phaseTier, dashing);
  
      if (dashing || enemy.cooldown > 0) return;
  
      state.volley = (state.volley ?? 0) + 1;
  
      if (phaseTier === 0) {
        enemy.cooldown = 0.72 + hpRatio * 0.26;
        for (let i = -2; i <= 2; i += 1) {
          this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, i * 0.12).normalize(), 0x8df7ff, 0.4, enemy.def.bulletDamage + 1, { speed: enemy.def.bulletSpeed + 6, leadRatio: 0.54, leadStrength: 0.64, showBulletRatio: 0.2 });
          this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, i * 0.12 + 0.06).normalize(), 0x8df7ff, 0.4, enemy.def.bulletDamage + 1, { speed: enemy.def.bulletSpeed + 6, leadRatio: 0.54, leadStrength: 0.64, showBulletRatio: 0.2 });
        }
        if (state.volley % 2 === 0) {
          for (let i = 0; i < 12; i += 1) {
            const angle = (i / 12) * Math.PI * 2 + enemy.phase * 0.34;
            this.fireBossShot(enemy, this.getAstralRingDirection(enemy, angle, i % 2 === 0 ? 6 : -6), i % 2 === 0 ? 0xff9bee : 0x8df7ff, 0.32, enemy.def.bulletDamage, { speed: enemy.def.bulletSpeed + 1, showBulletRatio: 0.26, preserveDirection: true });
          }
        }
        this.spawnAstralLobbedMineVolley(enemy, phaseTier);
        return;
      }
  
      if (phaseTier === 1) {
        enemy.cooldown = 0.56 + hpRatio * 0.16;
        for (let i = -3; i <= 3; i += 1) {
          this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, i * 0.108).normalize(), i % 2 === 0 ? 0xff9bee : 0x87f7ff, 0.38, enemy.def.bulletDamage + 1, { speed: enemy.def.bulletSpeed + 8, leadRatio: 0.66, leadStrength: 0.76, showBulletRatio: 0.22 });
        }
        for (let i = 0; i < 10; i += 1) {
          const angle = (i / 10) * Math.PI * 2 + enemy.phase * 0.42;
          this.fireBossShot(enemy, this.getAstralRingDirection(enemy, angle, i % 2 === 0 ? 8 : -8), i % 2 === 0 ? 0x76f2ff : 0xffa9f1, 0.34, enemy.def.bulletDamage, { speed: enemy.def.bulletSpeed + (i % 2 === 0 ? 0 : 3), showBulletRatio: 0.28, preserveDirection: true });
        }
        this.spawnAstralLobbedMineVolley(enemy, phaseTier);
        return;
      }
  
      enemy.cooldown = 0.42 + hpRatio * 0.12;
      for (let sweep = -1; sweep <= 1; sweep += 1) {
        for (let i = -3; i <= 3; i += 1) {
          this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, i * 0.09 + sweep * 0.038).normalize(), sweep === 0 ? 0xffffff : (sweep < 0 ? 0x78f8ff : 0xff8fe9), 0.34, enemy.def.bulletDamage + 2, { speed: enemy.def.bulletSpeed + 10, leadRatio: 0.72, leadStrength: 0.86, life: 4.4, showBulletRatio: 0.24 });
        }
      }
      for (let i = 0; i < 14; i += 1) {
        const angle = (i / 14) * Math.PI * 2 + enemy.phase * 0.55;
        this.fireBossShot(enemy, this.getAstralRingDirection(enemy, angle, i % 2 === 0 ? 10 : -10), i % 2 === 0 ? 0x7bf8ff : 0xff9df0, 0.3, enemy.def.bulletDamage + 1, { speed: enemy.def.bulletSpeed + 4, showBulletRatio: 0.3, preserveDirection: true });
      }
      this.spawnAstralLobbedMineVolley(enemy, phaseTier);
    }

}

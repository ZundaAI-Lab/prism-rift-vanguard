/**
 * Responsibility:
 * - 通常プレイから外れる player 専用シーケンスを担当する。
 *
 * Rules:
 * - clear cinematic / gameover crash のような状態遷移つき演出はこの runtime に集約する。
 * - Game.js や Mission flow から呼ばれる公開入口名は維持し、外側の進行制御を壊さない。
 * - 通常プレイの移動更新はここへ追加しない。
 */
import * as THREE from 'three';
import { clamp, lerp } from '../../utils/math.js';
import { clampPointToPlayerTravelBounds } from '../shared/PlayerTravelBounds.js';

const CINEMATIC_START = new THREE.Vector3();
const CINEMATIC_MID = new THREE.Vector3();
const CINEMATIC_END = new THREE.Vector3();
const CINEMATIC_CONTROL = new THREE.Vector3();
const CINEMATIC_POS = new THREE.Vector3();
const CINEMATIC_TANGENT = new THREE.Vector3();
const CINEMATIC_TAIL_LOCAL = new THREE.Vector3(0, -0.08, 1.12);
const CINEMATIC_TAIL_WORLD = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const CRASH_FORWARD = new THREE.Vector3();
const CRASH_IMPACT_POSITION = new THREE.Vector3();
const PLAYER_GAMEOVER_CRASH_DURATION = 1.05;
const PLAYER_GAMEOVER_IMPACT_HOLD = 0.36;
const PLAYER_GAMEOVER_GRAVITY = 18;
const PLAYER_GAMEOVER_GROUND_CLEARANCE = 0.16;

export function installPlayerSequenceRuntime(PlayerSystem) {
  PlayerSystem.prototype.updateFinalClearCinematic = function updateFinalClearCinematic(player, mesh, dt) {
    const cinematic = this.game.state.progression?.finalClearCinematic;
    if (!cinematic?.active) return false;

    cinematic.timer = Math.min(cinematic.duration || 0, (cinematic.timer || 0) + dt);

    CINEMATIC_START.set(
      cinematic.shipStart?.x || 0,
      cinematic.shipStart?.y || 0,
      cinematic.shipStart?.z || 0,
    );
    CINEMATIC_MID.set(
      cinematic.shipMid?.x || 0,
      cinematic.shipMid?.y || 0,
      cinematic.shipMid?.z || 0,
    );
    CINEMATIC_CONTROL.set(
      cinematic.shipCurveControl?.x || 0,
      cinematic.shipCurveControl?.y || 0,
      cinematic.shipCurveControl?.z || 0,
    );
    CINEMATIC_END.set(
      cinematic.shipEnd?.x || 0,
      cinematic.shipEnd?.y || 0,
      cinematic.shipEnd?.z || 0,
    );

    const previousX = player.x;
    const previousZ = player.z;
    const flightDelay = Math.max(0, cinematic.flightDelay || 0);
    const travelDuration = Math.max(0.001, (cinematic.duration || 0) - flightDelay);
    const moveTime = Math.max(0, (cinematic.timer || 0) - flightDelay);
    const straightDuration = Math.max(0.001, Math.min(travelDuration * 0.42, cinematic.straightDuration || 0.001));
    const curveDuration = Math.max(0.001, travelDuration - straightDuration);
    const moveRatio = clamp(moveTime / travelDuration, 0, 1);
    const easedRatio = moveRatio * moveRatio * (3 - (2 * moveRatio));

    player.shooting = false;
    player.vx = 0;
    player.vz = 0;

    if (moveTime <= 0.0001) {
      CINEMATIC_POS.copy(CINEMATIC_START);
      CINEMATIC_TANGENT.subVectors(CINEMATIC_MID, CINEMATIC_START);
    } else if (moveTime < straightDuration) {
      const riseRatio = clamp(moveTime / straightDuration, 0, 1);
      const easedRiseRatio = riseRatio * riseRatio * (3 - (2 * riseRatio));
      CINEMATIC_POS.copy(CINEMATIC_START).lerp(CINEMATIC_MID, easedRiseRatio);
      CINEMATIC_TANGENT.subVectors(CINEMATIC_MID, CINEMATIC_START);
    } else {
      const flyTime = moveTime - straightDuration;
      const flyRatio = clamp(flyTime / curveDuration, 0, 1);
      const easedFlyRatio = flyRatio * flyRatio * (3 - (2 * flyRatio));
      const inverseFlyRatio = 1 - easedFlyRatio;
      CINEMATIC_POS.set(
        (inverseFlyRatio * inverseFlyRatio * CINEMATIC_MID.x)
          + (2 * inverseFlyRatio * easedFlyRatio * CINEMATIC_CONTROL.x)
          + (easedFlyRatio * easedFlyRatio * CINEMATIC_END.x),
        (inverseFlyRatio * inverseFlyRatio * CINEMATIC_MID.y)
          + (2 * inverseFlyRatio * easedFlyRatio * CINEMATIC_CONTROL.y)
          + (easedFlyRatio * easedFlyRatio * CINEMATIC_END.y),
        (inverseFlyRatio * inverseFlyRatio * CINEMATIC_MID.z)
          + (2 * inverseFlyRatio * easedFlyRatio * CINEMATIC_CONTROL.z)
          + (easedFlyRatio * easedFlyRatio * CINEMATIC_END.z),
      );
      CINEMATIC_TANGENT.set(
        2 * inverseFlyRatio * (CINEMATIC_CONTROL.x - CINEMATIC_MID.x)
          + 2 * easedFlyRatio * (CINEMATIC_END.x - CINEMATIC_CONTROL.x),
        2 * inverseFlyRatio * (CINEMATIC_CONTROL.y - CINEMATIC_MID.y)
          + 2 * easedFlyRatio * (CINEMATIC_END.y - CINEMATIC_CONTROL.y),
        2 * inverseFlyRatio * (CINEMATIC_CONTROL.z - CINEMATIC_MID.z)
          + 2 * easedFlyRatio * (CINEMATIC_END.z - CINEMATIC_CONTROL.z),
      );
    }

    player.x = CINEMATIC_POS.x;
    player.y = CINEMATIC_POS.y;
    player.z = CINEMATIC_POS.z;
    player.vx = dt > 0 ? (player.x - previousX) / dt : 0;
    player.vz = dt > 0 ? (player.z - previousZ) / dt : 0;

    player.yaw = cinematic.shipYaw || 0;
    player.pitch = 0;
    player.bob += dt * 4.5;

    const vanishScale = lerp(1, 0.02, easedRatio);

    mesh.position.set(player.x, player.y, player.z);
    mesh.scale.setScalar(vanishScale);
    mesh.rotation.y = player.yaw;
    mesh.rotation.z = 0;
    mesh.rotation.x = 0;

    if (moveTime > 0.0001 && vanishScale > 0.045) {
      cinematic.sparkleEmitTimer = (cinematic.sparkleEmitTimer || 0) + dt;
      const sparkleInterval = 0.034;
      while (cinematic.sparkleEmitTimer >= sparkleInterval) {
        cinematic.sparkleEmitTimer -= sparkleInterval;
        CINEMATIC_TAIL_WORLD.copy(CINEMATIC_TAIL_LOCAL);
        mesh.localToWorld(CINEMATIC_TAIL_WORLD);
        this.game.effects?.spawnCinematicTrailSparkle?.(CINEMATIC_TAIL_WORLD, CINEMATIC_TANGENT, Math.max(0.32, vanishScale));
      }
    }

    const hoverRing = mesh.userData.hoverRing;
    if (hoverRing) {
      hoverRing.rotation.z += dt * 2.2;
      if (hoverRing.material) {
        const baseOpacity = mesh.userData.hoverRingBaseOpacity ?? 0.42;
        hoverRing.material.opacity = baseOpacity * vanishScale;
      }
    }
    return true;
  };

  PlayerSystem.prototype.startGameOverSequence = function startGameOverSequence() {
    const { state, store } = this.game;
    const { player } = state;
    const mesh = store.playerMesh;
    if (!mesh) return false;

    player.shooting = false;
    player.primaryCooldown = 0;
    player.plasmaCooldown = 0;
    player.weaponHeat = 0;
    player.recoil = 0;
    player.crashTimer = 0;
    player.crashDuration = PLAYER_GAMEOVER_CRASH_DURATION;
    player.crashImpactTimer = PLAYER_GAMEOVER_IMPACT_HOLD;
    player.crashFallVelocity = Math.max(2.6, Math.hypot(player.vx, player.vz) * 0.55 + 2.1);

    CRASH_FORWARD.set(0, 0, 1).applyAxisAngle(UP, player.yaw);
    player.crashDriftX = player.vx * 0.34 + CRASH_FORWARD.x * 4.4;
    player.crashDriftZ = player.vz * 0.34 + CRASH_FORWARD.z * 4.4;
    player.crashSpinX = -4.8;
    player.crashSpinY = 1.45 * (player.vx >= 0 ? 1 : -1);
    player.crashSpinZ = (player.vx >= 0 ? -1 : 1) * 6.4;
    player.crashImpacted = false;

    const hoverRing = mesh.userData.hoverRing;
    if (hoverRing?.material) hoverRing.material.opacity = Math.min(hoverRing.material.opacity ?? 0, 0.18);

    this.game.effects?.spawnExplosion?.(mesh.position.clone(), 0xff8c72, 0.95);
    return true;
  };

  PlayerSystem.prototype.updateGameOverSequence = function updateGameOverSequence(dt) {
    const { state, store } = this.game;
    const { player } = state;
    const mesh = store.playerMesh;
    if (!mesh) return true;

    const groundY = this.game.world.getHeight(player.x, player.z);
    const impactY = groundY + PLAYER_GAMEOVER_GROUND_CLEARANCE;

    if (!player.crashImpacted) {
      player.crashTimer = Math.min(player.crashDuration, player.crashTimer + dt);
      player.crashFallVelocity += PLAYER_GAMEOVER_GRAVITY * dt;
      player.crashDriftX *= Math.max(0, 1 - dt * 0.65);
      player.crashDriftZ *= Math.max(0, 1 - dt * 0.65);

      player.x += player.crashDriftX * dt;
      player.z += player.crashDriftZ * dt;
      clampPointToPlayerTravelBounds(player);
      player.y = Math.max(impactY, player.y - player.crashFallVelocity * dt);

      mesh.position.set(player.x, player.y, player.z);
      mesh.rotation.x += player.crashSpinX * dt;
      mesh.rotation.y += player.crashSpinY * dt;
      mesh.rotation.z += player.crashSpinZ * dt;

      const hoverRing = mesh.userData.hoverRing;
      if (hoverRing?.material) {
        hoverRing.material.opacity = Math.max(0, (hoverRing.material.opacity ?? 0) - dt * 0.5);
      }

      if (player.y <= impactY + 0.001 || player.crashTimer >= player.crashDuration) {
        player.crashImpacted = true;
        player.y = impactY;
        mesh.position.set(player.x, impactY, player.z);
        mesh.rotation.x = -1.18;
        mesh.rotation.z = player.crashSpinZ < 0 ? -1.06 : 1.06;

        CRASH_IMPACT_POSITION.copy(mesh.position);
        this.game.effects?.spawnExplosion?.(CRASH_IMPACT_POSITION.clone().add(new THREE.Vector3(0, 0.45, 0)), 0xffb784, 1.35);
        this.game.effects?.spawnShockwave?.(CRASH_IMPACT_POSITION.setY(groundY + 0.08), 0xff8c72, 5.4);
      }
      return false;
    }

    player.crashImpactTimer = Math.max(0, player.crashImpactTimer - dt);
    if (player.crashImpactTimer > 0) return false;
    return true;
  };
}

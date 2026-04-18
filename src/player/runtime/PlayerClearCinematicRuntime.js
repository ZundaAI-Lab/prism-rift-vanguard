import * as THREE from 'three';
import { clamp, lerp } from '../../utils/math.js';

const CINEMATIC_START = new THREE.Vector3();
const CINEMATIC_MID = new THREE.Vector3();
const CINEMATIC_END = new THREE.Vector3();
const CINEMATIC_CONTROL = new THREE.Vector3();
const CINEMATIC_POS = new THREE.Vector3();
const CINEMATIC_TANGENT = new THREE.Vector3();
const CINEMATIC_TAIL_LOCAL = new THREE.Vector3(0, -0.08, 1.12);
const CINEMATIC_TAIL_WORLD = new THREE.Vector3();

export function installPlayerClearCinematicRuntime(PlayerSystem) {
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
}

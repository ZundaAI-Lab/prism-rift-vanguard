import * as THREE from 'three';
import { PLAYER_BASE } from '../../data/balance.js';
import { clamp, lerp } from '../../utils/math.js';
import { clampPointToPlayerTravelBounds } from '../shared/PlayerTravelBounds.js';

const CAMERA_MOVE_FORWARD = new THREE.Vector3();
const CAMERA_MOVE_RIGHT = new THREE.Vector3();
const MOVE = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const LOOK_YAW_SENSITIVITY = 0.0024;
const LOOK_PITCH_SENSITIVITY = 0.0028;
const DEFAULT_MOUSE_SENSITIVITY = 1;
const PLASMA_READY_BURST_OFFSET = new THREE.Vector3(0, 0.14, 0);
const AXIS_MOVE_EPSILON = 0.0001;

function didReachAxisTarget(currentValue, targetValue) {
  return Math.abs(currentValue - targetValue) <= AXIS_MOVE_EPSILON;
}

export function installPlayerMovementRuntime(PlayerSystem) {
  PlayerSystem.prototype.movePlayerWithFieldSlide = function movePlayerWithFieldSlide(player, deltaX, deltaZ) {
    const startX = player.x;
    const startZ = player.z;
    const targetX = startX + deltaX;
    const targetZ = startZ + deltaZ;

    player.x = targetX;
    player.z = targetZ;
    this.resolveFieldCollisions(player);
    clampPointToPlayerTravelBounds(player);

    const reachedFullTarget = didReachAxisTarget(player.x, targetX)
      && didReachAxisTarget(player.z, targetZ);
    if (reachedFullTarget) {
      return { movedX: true, movedZ: true };
    }

    player.x = startX;
    player.z = startZ;

    const axisOrder = Math.abs(deltaX) >= Math.abs(deltaZ)
      ? [['x', deltaX], ['z', deltaZ]]
      : [['z', deltaZ], ['x', deltaX]];

    const result = {
      movedX: Math.abs(deltaX) <= AXIS_MOVE_EPSILON,
      movedZ: Math.abs(deltaZ) <= AXIS_MOVE_EPSILON,
    };

    for (let i = 0; i < axisOrder.length; i += 1) {
      const [axis, delta] = axisOrder[i];
      if (Math.abs(delta) <= AXIS_MOVE_EPSILON) continue;

      const beforeAxisValue = axis === 'x' ? player.x : player.z;
      const targetValue = beforeAxisValue + delta;

      if (axis === 'x') {
        player.x = targetValue;
      } else {
        player.z = targetValue;
      }

      this.resolveFieldCollisions(player);
      clampPointToPlayerTravelBounds(player);

      const resolvedValue = axis === 'x' ? player.x : player.z;
      const reachedTarget = didReachAxisTarget(resolvedValue, targetValue);
      if (axis === 'x') {
        result.movedX = reachedTarget;
      } else {
        result.movedZ = reachedTarget;
      }
    }

    return result;
  };

  PlayerSystem.prototype.update = function update(dt) {
    const { state, input, store } = this.game;
    const { player } = state;
    const mesh = store.playerMesh;
    if (!mesh) return;

    const look = input.consumeLookDelta();
    const optionControls = this.game.optionState?.controls ?? null;
    const sensitivityScale = Number.isFinite(optionControls?.mouseSensitivity)
      ? optionControls.mouseSensitivity
      : DEFAULT_MOUSE_SENSITIVITY;
    const invertY = optionControls?.invertY === true ? -1 : 1;
    player.yaw -= look.x * LOOK_YAW_SENSITIVITY * sensitivityScale;
    player.pitch = clamp(player.pitch - (look.y * LOOK_PITCH_SENSITIVITY * sensitivityScale * invertY), -1.1, 0.85);
    player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    player.primaryCooldown = Math.max(0, player.primaryCooldown - dt);
    player.plasmaCooldown = Math.max(0, player.plasmaCooldown - dt);
    const plasmaReady = player.plasmaCooldown <= 0.0001;
    const plasmaReadyTriggered = !this.wasPlasmaReady && plasmaReady;
    this.wasPlasmaReady = plasmaReady;
    player.weaponHeat = Math.max(0, player.weaponHeat - dt * 0.55);
    player.recoil = Math.max(0, player.recoil - dt * 8.5);

    if (this.updateFinalClearCinematic(player, mesh, dt)) {
      return;
    }

    this.game.renderer.camera.getWorldDirection(CAMERA_MOVE_FORWARD);
    CAMERA_MOVE_FORWARD.y = 0;
    if (CAMERA_MOVE_FORWARD.lengthSq() < 0.0001) {
      CAMERA_MOVE_FORWARD.set(0, 0, -1).applyAxisAngle(UP, player.yaw);
    }
    CAMERA_MOVE_FORWARD.normalize();
    CAMERA_MOVE_RIGHT.crossVectors(CAMERA_MOVE_FORWARD, UP).negate().normalize();

    MOVE.set(0, 0, 0);
    if (input.isDown('KeyW')) MOVE.add(CAMERA_MOVE_FORWARD);
    if (input.isDown('KeyS')) MOVE.sub(CAMERA_MOVE_FORWARD);
    if (input.isDown('KeyD')) MOVE.sub(CAMERA_MOVE_RIGHT);
    if (input.isDown('KeyA')) MOVE.add(CAMERA_MOVE_RIGHT);
    if (MOVE.lengthSq() > 0) MOVE.normalize();

    const frostMoveScale = this.game.enemies?.getFrostBlizzardMoveScale?.() ?? 1;
    const astralGelMoveScale = this.game.world.getPlayerMoveScaleAt?.(player.x, player.y, player.z) ?? 1;
    const moveScale = frostMoveScale * astralGelMoveScale;
    const accel = MOVE.multiplyScalar(PLAYER_BASE.moveSpeed * 3.2 * moveScale);
    player.vx = lerp(player.vx, accel.x, dt * 4.8);
    player.vz = lerp(player.vz, accel.z, dt * 4.8);
    const drag = 1 - Math.min(dt * 0.22, 0.08);
    player.vx *= drag;
    player.vz *= drag;

    const moveResult = this.movePlayerWithFieldSlide(player, player.vx * dt, player.vz * dt);
    if (!moveResult.movedX) {
      player.vx = 0;
    }
    if (!moveResult.movedZ) {
      player.vz = 0;
    }

    const groundY = this.game.world.getHeight(player.x, player.z);
    player.bob += dt * (5 + Math.hypot(player.vx, player.vz) * 0.1);
    const targetY = groundY + PLAYER_BASE.hoverHeight + Math.sin(player.bob) * 0.18;
    player.y = lerp(player.y, targetY, dt * 8);

    mesh.position.set(player.x, player.y, player.z);
    if (plasmaReadyTriggered) {
      this.game.effects?.spawnPlasmaReadyBurst?.(mesh, 0x8ff6ff, 1, PLASMA_READY_BURST_OFFSET);
      this.game.audio?.playSfx('playerPlasmaReady', { cooldownMs: 120 });
    }
    mesh.rotation.y = lerp(mesh.rotation.y, player.yaw, dt * 10);
    mesh.rotation.z = lerp(mesh.rotation.z, -player.vx * 0.018, dt * 8);
    mesh.rotation.x = lerp(mesh.rotation.x, player.pitch * 0.16 + player.vz * 0.01, dt * 8);

    const hoverRing = mesh.userData.hoverRing;
    if (hoverRing) {
      hoverRing.rotation.z += dt * 1.8;
    }
    this.updatePlasmaGlowFeedback(player, mesh, state);
  };
}

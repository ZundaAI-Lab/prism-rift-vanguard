/**
 * Responsibility:
 * - playing 中の player 1 フレーム更新順を司る orchestration runtime。
 *
 * Rules:
 * - ここは呼び出し順の制御だけを持ち、衝突解決や回避 planner 本体を抱え込まない。
 * - playing update に新機能を足すときは、まず対応する sub-runtime を作れるかを検討し、
 *   司令塔であるこの file にロジック本体を肥大化させない。
 * - clear cinematic / gameover sequence への分岐は公開入口を通して先頭で処理する。
 */
import * as THREE from 'three';
import { clamp } from '../../utils/math.js';

const CAMERA_MOVE_FORWARD = new THREE.Vector3();
const CAMERA_MOVE_RIGHT = new THREE.Vector3();
const MOVE = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const LOOK_YAW_SENSITIVITY = 0.0024;
const LOOK_PITCH_SENSITIVITY = 0.0028;
const DEFAULT_MOUSE_SENSITIVITY = 1;

export function installPlayerFrameRuntime(PlayerSystem) {
  PlayerSystem.prototype.updateLookFromInput = function updateLookFromInput(player, input) {
    const look = input.consumeLookDelta();
    const optionControls = this.game.optionState?.controls ?? null;
    const sensitivityScale = Number.isFinite(optionControls?.mouseSensitivity)
      ? optionControls.mouseSensitivity
      : DEFAULT_MOUSE_SENSITIVITY;
    const invertY = optionControls?.invertY === true ? -1 : 1;

    player.yaw -= look.x * LOOK_YAW_SENSITIVITY * sensitivityScale;
    player.pitch = clamp(player.pitch - (look.y * LOOK_PITCH_SENSITIVITY * sensitivityScale * invertY), -1.1, 0.85);
  };

  PlayerSystem.prototype.tickPlayerFrameState = function tickPlayerFrameState(player, dt) {
    player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    player.primaryCooldown = Math.max(0, player.primaryCooldown - dt);
    player.plasmaCooldown = Math.max(0, player.plasmaCooldown - dt);
    const plasmaReady = player.plasmaCooldown <= 0.0001;
    const plasmaReadyTriggered = !this.wasPlasmaReady && plasmaReady;
    this.wasPlasmaReady = plasmaReady;
    player.weaponHeat = Math.max(0, player.weaponHeat - dt * 0.55);
    player.recoil = Math.max(0, player.recoil - dt * 8.5);
    return plasmaReadyTriggered;
  };

  PlayerSystem.prototype.composePlayerMoveInput = function composePlayerMoveInput(input, cameraForward, cameraRight, out = MOVE) {
    let moveInputMask = 0;
    out.set(0, 0, 0);

    if (input.isDown('KeyW')) {
      out.add(cameraForward);
      moveInputMask |= 1;
    }
    if (input.isDown('KeyS')) {
      out.sub(cameraForward);
      moveInputMask |= 2;
    }
    if (input.isDown('KeyD')) {
      out.sub(cameraRight);
      moveInputMask |= 4;
    }
    if (input.isDown('KeyA')) {
      out.add(cameraRight);
      moveInputMask |= 8;
    }
    if (out.lengthSq() > 0) out.normalize();
    return moveInputMask;
  };

  PlayerSystem.prototype.update = function update(dt) {
    const { state, input, store } = this.game;
    const { player } = state;
    const mesh = store.playerMesh;
    if (!mesh) return;

    const avoidanceState = this.ensureAvoidanceState();
    avoidanceState.time += dt;

    this.updateLookFromInput(player, input);
    const plasmaReadyTriggered = this.tickPlayerFrameState(player, dt);

    if (this.updateFinalClearCinematic(player, mesh, dt)) return;

    this.game.renderer.camera.getWorldDirection(CAMERA_MOVE_FORWARD);
    CAMERA_MOVE_FORWARD.y = 0;
    if (CAMERA_MOVE_FORWARD.lengthSq() < 0.0001) {
      CAMERA_MOVE_FORWARD.set(0, 0, -1).applyAxisAngle(UP, player.yaw);
    }
    CAMERA_MOVE_FORWARD.normalize();
    this.updateAvoidanceMode(CAMERA_MOVE_FORWARD, dt);
    CAMERA_MOVE_RIGHT.crossVectors(CAMERA_MOVE_FORWARD, UP).negate().normalize();

    const moveInputMask = this.composePlayerMoveInput(input, CAMERA_MOVE_FORWARD, CAMERA_MOVE_RIGHT, MOVE);
    this.handleMoveInputChange(player, MOVE, moveInputMask);

    const frostMoveScale = this.game.enemies?.getFrostBlizzardMoveScale?.() ?? 1;
    const astralGelMoveScale = this.game.world.getPlayerMoveScaleAt?.(player.x, player.y, player.z) ?? 1;
    const moveScale = frostMoveScale * astralGelMoveScale;

    this.updatePlanarMotion(player, MOVE, moveScale, dt);
    this.updatePlayerHoverHeight(player, dt);
    this.updatePlayingPlayerView(player, mesh, state, dt, plasmaReadyTriggered);
  };
}

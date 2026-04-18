import * as THREE from 'three';
import { lerp } from '../utils/math.js';

const UP = new THREE.Vector3(0, 1, 0);
const CAM_FORWARD = new THREE.Vector3();
const CAM_OFFSET = new THREE.Vector3();
const TARGET_CAM_POS = new THREE.Vector3();
const LOOK_TARGET = new THREE.Vector3();
const CAM_EULER = new THREE.Euler(0, 0, 0, 'YXZ');
const LOOK_OFFSET = new THREE.Vector3(0, 1.15, 0);
const GLOW_OFFSET = new THREE.Vector3(0, 2, 0);
const CINEMATIC_LOOK = new THREE.Vector3();
const CINEMATIC_CAMERA_POS = new THREE.Vector3();
const CINEMATIC_LOOK_DIR = new THREE.Vector3();
const CINEMATIC_LOOK_RIGHT = new THREE.Vector3();
const CINEMATIC_TILTED_LOOK = new THREE.Vector3();
const CINEMATIC_LOOK_MATRIX = new THREE.Matrix4();
const CINEMATIC_TARGET_QUAT = new THREE.Quaternion();
const CINEMATIC_ALTAR_TILT_RAD = THREE.MathUtils.degToRad(10);
const DEFAULT_PLAYER_GLOW_INTENSITY = 4.4;
const DEFAULT_PLAYER_GLOW_HEAT_BOOST = 1.15;
const DEFAULT_PLAYER_GLOW_DISTANCE = 28;
const DEFAULT_PLAYER_GLOW_DECAY = 2;

/**
 * Responsibility:
 * - Converts player orientation into a smooth third-person camera.
 *
 * Rules:
 * - Read player state only.
 * - Never mutate gameplay values such as health, waves, or projectiles.
 * - Keep the camera basis aligned so firing and movement stay consistent.
 * - Combat shots must not shake the camera. Weapon heat may still brighten player-local visuals, but screen-wide post effects do not belong here.
 */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
  }

  update(game, dt) {
    const { player, progression } = game.state;
    const mesh = game.store.playerMesh;
    if (!mesh) return;

    const cinematic = progression?.finalClearCinematic;
    if (cinematic?.active) {
      CINEMATIC_CAMERA_POS.set(
        cinematic.cameraPosition?.x || 0,
        cinematic.cameraPosition?.y || 0,
        cinematic.cameraPosition?.z || 0,
      );
      CINEMATIC_LOOK.set(
        cinematic.lookTarget?.x || 0,
        cinematic.lookTarget?.y || 0,
        cinematic.lookTarget?.z || 0,
      );
      this.camera.position.copy(CINEMATIC_CAMERA_POS);
      CINEMATIC_LOOK_DIR.copy(CINEMATIC_LOOK).sub(CINEMATIC_CAMERA_POS);
      const cinematicLookDistance = CINEMATIC_LOOK_DIR.length();
      if (cinematicLookDistance > 0.0001) {
        CINEMATIC_LOOK_DIR.multiplyScalar(1 / cinematicLookDistance);
        CINEMATIC_LOOK_RIGHT.crossVectors(CINEMATIC_LOOK_DIR, UP);
        const cinematicRightLengthSq = CINEMATIC_LOOK_RIGHT.lengthSq();
        if (cinematicRightLengthSq > 0.000001) {
          CINEMATIC_LOOK_RIGHT.multiplyScalar(1 / Math.sqrt(cinematicRightLengthSq));
          CINEMATIC_LOOK_DIR.applyAxisAngle(CINEMATIC_LOOK_RIGHT, CINEMATIC_ALTAR_TILT_RAD);
          CINEMATIC_TILTED_LOOK.copy(CINEMATIC_CAMERA_POS)
            .addScaledVector(CINEMATIC_LOOK_DIR, cinematicLookDistance);
          CINEMATIC_LOOK_MATRIX.lookAt(CINEMATIC_CAMERA_POS, CINEMATIC_TILTED_LOOK, UP);
        } else {
          CINEMATIC_LOOK_MATRIX.lookAt(CINEMATIC_CAMERA_POS, CINEMATIC_LOOK, UP);
        }
      } else {
        CINEMATIC_LOOK_MATRIX.lookAt(CINEMATIC_CAMERA_POS, CINEMATIC_LOOK, UP);
      }
      CINEMATIC_TARGET_QUAT.setFromRotationMatrix(CINEMATIC_LOOK_MATRIX);
      const blendDuration = Math.max(0.001, cinematic.cameraBlendDuration || 0.001);
      const blendProgress = THREE.MathUtils.clamp((cinematic.timer || 0) / blendDuration, 0, 1);
      const blend = blendProgress >= 1 ? 1 : (1 - Math.exp(-dt * 5.4));
      this.camera.quaternion.slerp(CINEMATIC_TARGET_QUAT, blend);
    } else {
      CAM_EULER.set(player.pitch * 0.32, player.yaw, 0, 'YXZ');
      CAM_FORWARD.set(0, 0, 1).applyEuler(CAM_EULER);
      CAM_OFFSET.set(0, 5.3, 12.8).applyAxisAngle(UP, player.yaw);
      TARGET_CAM_POS.copy(mesh.position).add(CAM_OFFSET);

      this.camera.position.x = lerp(this.camera.position.x, TARGET_CAM_POS.x, dt * 6);
      this.camera.position.y = lerp(this.camera.position.y, TARGET_CAM_POS.y, dt * 6);
      this.camera.position.z = lerp(this.camera.position.z, TARGET_CAM_POS.z, dt * 6);

      LOOK_TARGET.copy(mesh.position)
        .add(LOOK_OFFSET)
        .addScaledVector(CAM_FORWARD, -16);
      this.camera.lookAt(LOOK_TARGET);
    }

    const theme = game.missionSystem?.currentMission?.theme ?? {};
    const heat = THREE.MathUtils.clamp(player.weaponHeat ?? 0, 0, 1.45);
    const glowHeight = theme.playerGlowHeight ?? GLOW_OFFSET.y;
    const glowDistance = theme.playerGlowDistance ?? DEFAULT_PLAYER_GLOW_DISTANCE;
    const glowDecay = theme.playerGlowDecay ?? DEFAULT_PLAYER_GLOW_DECAY;
    const glowBaseIntensity = theme.playerGlowIntensity ?? DEFAULT_PLAYER_GLOW_INTENSITY;
    const glowHeatBoost = theme.playerGlowHeatBoost ?? DEFAULT_PLAYER_GLOW_HEAT_BOOST;

    game.renderer.playerGlow.position.copy(mesh.position).addScaledVector(UP, glowHeight);
    game.renderer.playerGlow.distance = glowDistance;
    game.renderer.playerGlow.decay = glowDecay;
    game.renderer.playerGlow.intensity = glowBaseIntensity + heat * glowHeatBoost;
  }
}

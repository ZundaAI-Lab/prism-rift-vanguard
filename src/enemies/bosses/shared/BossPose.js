/**
 * Responsibility:
 * - 通常ボスの向き制御を安定化する共通 pose helper を担当する。
 *
 * Rules:
 * - lookAt の直接適用はここに閉じ込め、各 Controller へ Euler 反転由来の不安定さを漏らさない。
 * - ここではボスの基本 yaw 姿勢だけを決め、個別の roll / pitch 演出は各 Controller に残す。
 */
import {
  LOOK_EULER,
  LOOK_MATRIX,
  LOOK_QUAT,
  LOOK_TARGET,
  THREE,
  UP,
} from '../../BossSystemShared.js';

export function installBossPose(BossSystem) {
  BossSystem.prototype.faceBossToPlayerUpright = function faceBossToPlayerUpright(enemy, target, pitchClamp = 0) {
    if (!enemy?.mesh || !target) return;

    LOOK_TARGET.copy(target);
    LOOK_TARGET.y = enemy.mesh.position.y;
    LOOK_MATRIX.lookAt(enemy.mesh.position, LOOK_TARGET, UP);
    LOOK_QUAT.setFromRotationMatrix(LOOK_MATRIX);
    LOOK_EULER.setFromQuaternion(LOOK_QUAT, 'YXZ');
    LOOK_EULER.x = THREE.MathUtils.clamp(LOOK_EULER.x, -pitchClamp, pitchClamp);
    LOOK_EULER.z = 0;

    enemy.mesh.rotation.order = 'YXZ';
    enemy.mesh.rotation.set(LOOK_EULER.x, LOOK_EULER.y, 0);
  };
}

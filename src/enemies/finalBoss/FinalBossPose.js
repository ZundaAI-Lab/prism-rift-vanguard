import * as Shared from '../FinalBossSystemShared.js';

const {
  THREE,
  TARGET_DIR,
  SIDE,
  UP,
  LOOK_MATRIX,
  LOOK_QUAT,
  LOOK_EULER,
} = Shared;

export function installFinalBossPose(FinalBossSystem) {
  FinalBossSystem.prototype.computeAim = function computeAim(enemy) {
    const playerPos = this.game.store.playerMesh.position;
    TARGET_DIR.copy(playerPos).sub(enemy.mesh.position).normalize();
    SIDE.crossVectors(TARGET_DIR, UP).normalize();
  }

  FinalBossSystem.prototype.lookAtUpright = function lookAtUpright(enemy, target, pitchClamp = 0.52) {
    LOOK_MATRIX.lookAt(enemy.mesh.position, target, UP);
    LOOK_QUAT.setFromRotationMatrix(LOOK_MATRIX);
    LOOK_EULER.setFromQuaternion(LOOK_QUAT, 'YXZ');
    LOOK_EULER.x = THREE.MathUtils.clamp(LOOK_EULER.x, -pitchClamp, pitchClamp);
    LOOK_EULER.z = 0;
    enemy.mesh.rotation.order = 'YXZ';
    enemy.mesh.rotation.set(LOOK_EULER.x, LOOK_EULER.y, 0);
  }

  FinalBossSystem.prototype.getVoidDaisTopY = function getVoidDaisTopY() {
    return this.game.world.getHeight(0, 0) + 2.4;
  }

  FinalBossSystem.prototype.getVoidFortressHoverY = function getVoidFortressHoverY(enemy) {
    return this.getVoidDaisTopY() + enemy.def.hover;
  }

}

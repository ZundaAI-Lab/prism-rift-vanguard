import * as Shared from '../FinalBossSystemShared.js';

const {
  THREE,
  clampPointToPlayerTravelBounds,
  TARGET_DIR,
  SIDE,
  UP,
  DESIRED,
  TEMP,
  TEMP2,
  PLAYER_FORWARD,
  PLAYER_RIGHT,
} = Shared;

export function installFinalBossFighterRoute(FinalBossSystem) {
  FinalBossSystem.prototype.updatePlayerBasis = function updatePlayerBasis() {
    PLAYER_FORWARD.set(0, 0, -1).applyAxisAngle(UP, this.game.state.player.yaw || 0).normalize();
    PLAYER_RIGHT.crossVectors(PLAYER_FORWARD, UP).normalize();
  }

  FinalBossSystem.prototype.setupFighterModeRoute = function setupFighterModeRoute(enemy, phaseTier) {
    const data = enemy.finalBoss;
    const playerPos = this.game.store.playerMesh.position;
    data.focus = data.focus || new THREE.Vector3();
    data.focus.copy(playerPos);
    this.updatePlayerBasis();
    this.computeAim(enemy);

    const side = data.sideSign || 1;
    const holdRange = 30 + phaseTier * 3;
    const farRange = 40 + phaseTier * 5;
    const offsetRange = 18 + phaseTier * 2;

    if (data.mode === 'throne') {
      TEMP.copy(playerPos).addScaledVector(PLAYER_RIGHT, side * holdRange).addScaledVector(PLAYER_FORWARD, -8 + phaseTier * 2);
      data.anchor.copy(this.placeFighterPoint(enemy, TEMP, 0.4));
      data.anchorB.copy(data.anchor);
      data.anchorC.copy(data.anchor);
      return;
    }

    if (data.mode === 'sweep') {
      TEMP.copy(playerPos).addScaledVector(PLAYER_RIGHT, side * farRange).addScaledVector(PLAYER_FORWARD, -10);
      TEMP2.copy(playerPos).addScaledVector(PLAYER_RIGHT, -side * (farRange - 4)).addScaledVector(PLAYER_FORWARD, 12 + phaseTier * 3);
      data.anchor.copy(this.placeFighterPoint(enemy, TEMP, 0.8));
      data.anchorB.copy(this.placeFighterPoint(enemy, TEMP2, 0.8));
      data.anchorC.copy(data.anchorB);
      return;
    }

    if (data.mode === 'lance') {
      TEMP.copy(playerPos).addScaledVector(PLAYER_RIGHT, side * offsetRange).addScaledVector(PLAYER_FORWARD, -(28 + phaseTier * 3));
      TEMP2.copy(playerPos).addScaledVector(PLAYER_FORWARD, 24 + phaseTier * 5).addScaledVector(PLAYER_RIGHT, -side * 8);
      DESIRED.copy(playerPos).addScaledVector(PLAYER_RIGHT, -side * (34 + phaseTier * 4)).addScaledVector(PLAYER_FORWARD, 10 + phaseTier * 2);
      data.anchor.copy(this.placeFighterPoint(enemy, TEMP, 0.2));
      data.anchorB.copy(this.placeFighterPoint(enemy, TEMP2, -0.2));
      data.anchorC.copy(this.placeFighterPoint(enemy, DESIRED, 0.6));
      return;
    }

    if (data.mode === 'cage') {
      TEMP.copy(playerPos).addScaledVector(PLAYER_FORWARD, -(farRange + 6)).addScaledVector(PLAYER_RIGHT, side * (offsetRange + 8));
      data.anchor.copy(this.placeFighterPoint(enemy, TEMP, 1.4));
      data.anchorB.copy(data.anchor);
      data.anchorC.copy(data.anchor);
      return;
    }

    TEMP.copy(playerPos).addScaledVector(TARGET_DIR, -(46 + phaseTier * 8)).addScaledVector(SIDE, side * 22);
    data.anchor.copy(this.placeFighterPoint(enemy, TEMP, 1.6));
    data.anchorB.copy(data.anchor);
    data.anchorC.copy(data.anchor);
  }

  FinalBossSystem.prototype.placeFighterPoint = function placeFighterPoint(enemy, point, extraHeight = 0) {
    const out = point.clone();
    clampPointToPlayerTravelBounds(out, 42);
    out.y = this.game.world.getHeight(out.x, out.z) + enemy.def.hover + extraHeight;
    return out;
  }

  FinalBossSystem.prototype.enforceFighterSpacing = function enforceFighterSpacing(desired, playerPos, minDist) {
    TEMP.copy(desired).sub(playerPos).setY(0);
    const planar = TEMP.length();
    if (planar >= minDist) return;
    if (planar < 0.0001) TEMP.set((this.game.state.player.yaw ? Math.sin(this.game.state.player.yaw) : 1), 0, (this.game.state.player.yaw ? Math.cos(this.game.state.player.yaw) : 0));
    else TEMP.multiplyScalar(1 / planar);
    desired.addScaledVector(TEMP, minDist - planar + 0.5);
  }

}

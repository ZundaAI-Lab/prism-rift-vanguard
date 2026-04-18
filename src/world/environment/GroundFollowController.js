export function installGroundFollowController(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.getGroundFollowCenter = function getGroundFollowCenter() {
      const snap = this.groundFollowState?.snap ?? 12;
      const playerMesh = this.game.store.playerMesh;
      const playerState = this.game.state?.player;
      const rawX = playerMesh?.position?.x ?? playerState?.x ?? 0;
      const rawZ = playerMesh?.position?.z ?? playerState?.z ?? 0;
      return {
        x: Math.round(rawX / snap) * snap,
        z: Math.round(rawZ / snap) * snap,
      };
    }

  EnvironmentBuilder.prototype.updateGroundFollow = function updateGroundFollow(force = false) {
      if (!this.groundMesh || !this.terrain) return;
      const center = this.getGroundFollowCenter();
      const previous = this.groundFollowState;
      if (!force && previous && previous.centerX === center.x && previous.centerZ === center.z) return;
  
      this.terrain.updateGroundMesh(this.groundMesh, center.x, center.z, force);
      this.groundFollowState = {
        ...(previous ?? {}),
        snap: previous?.snap ?? 12,
        centerX: center.x,
        centerZ: center.z,
      };
    }

}

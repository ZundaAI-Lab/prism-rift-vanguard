import * as THREE from 'three';
import { clampPointToPlayerTravelBounds } from '../shared/PlayerTravelBounds.js';

const UP = new THREE.Vector3(0, 1, 0);
const CRASH_FORWARD = new THREE.Vector3();
const CRASH_IMPACT_POSITION = new THREE.Vector3();
const PLAYER_GAMEOVER_CRASH_DURATION = 1.05;
const PLAYER_GAMEOVER_IMPACT_HOLD = 0.36;
const PLAYER_GAMEOVER_GRAVITY = 18;
const PLAYER_GAMEOVER_GROUND_CLEARANCE = 0.16;

export function installPlayerGameOverRuntime(PlayerSystem) {
  PlayerSystem.prototype.startGameOverSequence = function startGameOverSequence() {
    const { state, store } = this.game;
    const { player } = state;
    const mesh = store.playerMesh;
    if (!mesh) {
      return false;
    }

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

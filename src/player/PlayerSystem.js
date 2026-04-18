import { PLAYER_BASE } from '../data/balance.js';
import { installPlayerCollisionRuntime } from './runtime/PlayerCollisionRuntime.js';
import { installPlayerFeedbackRuntime } from './runtime/PlayerFeedbackRuntime.js';
import { installPlayerGameOverRuntime } from './runtime/PlayerGameOverRuntime.js';
import { installPlayerClearCinematicRuntime } from './runtime/PlayerClearCinematicRuntime.js';
import { installPlayerMovementRuntime } from './runtime/PlayerMovementRuntime.js';
import { installPlayerDamageRuntime } from './runtime/PlayerDamageRuntime.js';

/**
 * Responsibility:
 * - PlayerSystem はプレイヤー関連 runtime の façade としてふるまう。
 *
 * Rules:
 * - プレイヤー位置・向き・無敵時間の最終所有者は常にこのドメインに置く。
 * - Weapon 作成は WeaponSystem 側に残し、このファイルから発射処理を直接増やさない。
 *
 * 更新ルール:
 * - PlayerSystem.js には constructor / reset / runtime install だけを置く。
 * - 通常移動は PlayerMovementRuntime、被弾は PlayerDamageRuntime、演出は PlayerFeedbackRuntime か
 *   PlayerGameOverRuntime / PlayerClearCinematicRuntime に追加する。
 * - プレイヤー移動範囲の規約は player/shared/PlayerTravelBounds.js を正として扱い、
 *   utils 側にプレイヤー専用ルールを増やさない。
 */
export class PlayerSystem {
  constructor(game) {
    this.game = game;
    this.wasPlasmaReady = true;
  }

  resetForMission(spawn = { x: 0, z: 0 }) {
    const { player } = this.game.state;
    player.x = spawn.x;
    player.y = PLAYER_BASE.hoverHeight;
    player.z = spawn.z;
    player.vx = 0;
    player.vz = 0;
    player.yaw = 0;
    player.pitch = -0.16;
    player.recoil = 0;
    player.bob = 0;
    player.primaryCooldown = 0;
    player.plasmaCooldown = 0;
    this.wasPlasmaReady = true;
    player.invulnTimer = 0;
    player.weaponHeat = 0;
    player.crashTimer = 0;
    player.crashDuration = 0;
    player.crashImpactTimer = 0;
    player.crashFallVelocity = 0;
    player.crashDriftX = 0;
    player.crashDriftZ = 0;
    player.crashSpinX = 0;
    player.crashSpinY = 0;
    player.crashSpinZ = 0;
    player.crashImpacted = false;
    if (this.game.store.playerMesh) {
      this.game.store.playerMesh.position.set(spawn.x, PLAYER_BASE.hoverHeight, spawn.z);
      this.game.store.playerMesh.rotation.set(0, 0, 0);
      this.game.store.playerMesh.scale.setScalar(1);
      const hoverRing = this.game.store.playerMesh.userData?.hoverRing;
      if (hoverRing?.material) hoverRing.material.opacity = this.game.store.playerMesh.userData?.hoverRingBaseOpacity ?? 0.42;
    }
  }
}

installPlayerCollisionRuntime(PlayerSystem);
installPlayerFeedbackRuntime(PlayerSystem);
installPlayerGameOverRuntime(PlayerSystem);
installPlayerClearCinematicRuntime(PlayerSystem);
installPlayerMovementRuntime(PlayerSystem);
installPlayerDamageRuntime(PlayerSystem);

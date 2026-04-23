import { PLAYER_BASE } from '../data/balance.js';
import { installPlayerCollisionRuntime } from './runtime/PlayerCollisionRuntime.js';
import { installPlayerMotionRuntime } from './runtime/PlayerMotionRuntime.js';
import { installPlayerAvoidanceRuntime } from './runtime/PlayerAvoidanceRuntime.js';
import { installPlayerViewRuntime } from './runtime/PlayerViewRuntime.js';
import { installPlayerSequenceRuntime } from './runtime/PlayerSequenceRuntime.js';
import { installPlayerDamageRuntime } from './runtime/PlayerDamageRuntime.js';
import { installPlayerFrameRuntime } from './runtime/PlayerFrameRuntime.js';

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
 * - playing 中の update 順制御は PlayerFrameRuntime、通常移動は PlayerMotionRuntime、
 *   回避アシストは PlayerAvoidanceRuntime、見た目は PlayerViewRuntime、
 *   clear/gameover 系は PlayerSequenceRuntime、被弾は PlayerDamageRuntime に追加する。
 * - PlayerCollisionRuntime は実衝突解決の truth source として維持し、
 *   PlayerMotionRuntime に押し戻しロジック本体を複製しない。
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
    this.resetAvoidanceState?.();
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
installPlayerMotionRuntime(PlayerSystem);
installPlayerAvoidanceRuntime(PlayerSystem);
installPlayerViewRuntime(PlayerSystem);
installPlayerSequenceRuntime(PlayerSystem);
installPlayerDamageRuntime(PlayerSystem);
installPlayerFrameRuntime(PlayerSystem);

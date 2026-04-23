/**
 * Responsibility:
 * - 通常プレイ中の player mesh / hoverRing / plasma ready 演出を担当する。
 *
 * Rules:
 * - 見た目の更新だけを持ち、移動判定や回避 plan の状態はここで作らない。
 * - playing 中の視覚フィードバックはこの runtime に寄せ、旧 Feedback runtime へ新規実装を増やさない。
 */
import * as THREE from 'three';
import { clamp, lerp } from '../../utils/math.js';

const PLASMA_READY_BURST_OFFSET = new THREE.Vector3(0, 0.14, 0);

export function installPlayerViewRuntime(PlayerSystem) {
  PlayerSystem.prototype.updatePlasmaGlowFeedback = function updatePlasmaGlowFeedback(player, mesh, state) {
    const plasmaStats = this.game.upgrades?.getPlasmaStats?.();
    const cooldown = plasmaStats?.cooldown ?? 0;
    const plasmaRatio = cooldown <= 0 ? 1 : clamp(1 - player.plasmaCooldown / cooldown, 0, 1);
    const plasmaReady = player.plasmaCooldown <= 0.0001 || plasmaRatio >= 0.999;
    const glowScale = plasmaReady ? 1 : lerp(0.24, 0.62, plasmaRatio);

    const glowMaterials = mesh.userData.glowMaterials;
    if (Array.isArray(glowMaterials)) {
      for (const entry of glowMaterials) {
        if (!entry?.material) continue;
        entry.material.emissiveIntensity = entry.baseEmissiveIntensity * glowScale;
      }
    }

    const hoverRing = mesh.userData.hoverRing;
    if (hoverRing?.material) {
      const baseOpacity = mesh.userData.hoverRingBaseOpacity ?? 0.42;
      const pulse = Math.sin(state.elapsed * 6) * 0.08;
      const opacityScale = plasmaReady ? 1 : lerp(0.4, 0.72, plasmaRatio);
      hoverRing.material.opacity = (baseOpacity + pulse) * opacityScale;
    }
  };

  PlayerSystem.prototype.updatePlayingPlayerView = function updatePlayingPlayerView(player, mesh, state, dt, plasmaReadyTriggered) {
    mesh.position.set(player.x, player.y, player.z);
    if (plasmaReadyTriggered) {
      this.game.effects?.spawnPlasmaReadyBurst?.(mesh, 0x8ff6ff, 1, PLASMA_READY_BURST_OFFSET);
      this.game.audio?.playSfx('playerPlasmaReady', { cooldownMs: 120 });
    }

    mesh.rotation.y = lerp(mesh.rotation.y, player.yaw, dt * 10);
    mesh.rotation.z = lerp(mesh.rotation.z, -player.vx * 0.018, dt * 8);
    mesh.rotation.x = lerp(mesh.rotation.x, player.pitch * 0.16 + player.vz * 0.01, dt * 8);

    const hoverRing = mesh.userData.hoverRing;
    if (hoverRing) hoverRing.rotation.z += dt * 1.8;
    this.updatePlasmaGlowFeedback(player, mesh, state);
  };
}

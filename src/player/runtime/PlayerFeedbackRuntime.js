import { clamp, lerp } from '../../utils/math.js';

export function installPlayerFeedbackRuntime(PlayerSystem) {
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
}

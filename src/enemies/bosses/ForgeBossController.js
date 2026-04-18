/**
 * Responsibility:
 * - 鍛炉巨兵ボスの固有パターンを担当する。
 *
 * Rules:
 * - meteor / ring / forge 移動はこの Controller に閉じ込める。
 */
import { SIDE, TARGET_DIR, THREE } from '../BossSystemShared.js';

export function installForgeBossController(BossSystem) {
  BossSystem.prototype.updateForgeBoss = function updateForgeBoss(enemy, dt, phaseTier, hpRatio) {
      const speedMul = phaseTier === 2 ? 1.5 : phaseTier === 1 ? 1.2 : 1;
      enemy.mesh.position.x += Math.sin(enemy.phase * (0.38 + phaseTier * 0.08)) * dt * 4.6 * speedMul;
      enemy.mesh.position.z += Math.cos(enemy.phase * (0.31 + phaseTier * 0.06)) * dt * 4.6 * speedMul;
      enemy.mesh.rotation.x += dt * (0.2 + phaseTier * 0.08);
      enemy.mesh.rotation.y += dt * (0.35 + phaseTier * 0.1);
      if (enemy.cooldown > 0) return;
  
      if (phaseTier === 0) {
        enemy.cooldown = 0.7 + hpRatio * 0.3;
        for (let i = 0; i < 10; i += 1) {
          const angle = (i / 10) * Math.PI * 2 + enemy.phase * 0.56;
          this.fireBossShot(enemy, new THREE.Vector3(Math.cos(angle), i % 2 === 0 ? 0.08 : 0.02, Math.sin(angle)).normalize(), i % 2 === 0 ? 0xffa466 : 0xffc97a, 0.58, enemy.def.bulletDamage + 4, { showBulletRatio: 0.22 });
        }
        this.spawnForgeMeteorShower(enemy, 6, 16, 2, phaseTier);
        return;
      }
  
      if (phaseTier === 1) {
        enemy.cooldown = 0.54 + hpRatio * 0.18;
        for (let ring = 0; ring < 2; ring += 1) {
          const ringCount = ring === 0 ? 11 : 13;
          for (let i = 0; i < ringCount; i += 1) {
            const angle = (i / ringCount) * Math.PI * 2 + enemy.phase * (0.62 + ring * 0.1) + ring * 0.16;
            this.fireBossShot(enemy, new THREE.Vector3(Math.cos(angle), ring === 0 ? 0.06 : 0.14, Math.sin(angle)).normalize(), ring === 0 ? 0xffa466 : 0xff7c55, 0.6, enemy.def.bulletDamage + 4, { showBulletRatio: 0.22 });
          }
        }
        for (let i = -1; i <= 1; i += 1) {
          this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, i * 0.12).normalize(), 0xffe28a, 0.46, enemy.def.bulletDamage + 1, { leadRatio: 0.34, leadStrength: 0.58 });
        }
        this.spawnForgeMeteorShower(enemy, 9, 22, 3, phaseTier);
        return;
      }
  
      enemy.cooldown = 0.46 + hpRatio * 0.12;
      for (let ring = 0; ring < 2; ring += 1) {
        const ringCount = ring === 0 ? 11 : 13;
        for (let i = 0; i < ringCount; i += 1) {
          const angle = (i / ringCount) * Math.PI * 2 + enemy.phase * (0.82 + ring * 0.12) + ring * 0.12;
          this.fireBossShot(enemy, new THREE.Vector3(Math.cos(angle), i % 2 === 0 ? 0.16 : 0.04, Math.sin(angle)).normalize(), i % 2 === 0 ? 0xff7c55 : 0xffd58a, 0.6, enemy.def.bulletDamage + 5, { showBulletRatio: 0.24 });
        }
      }
      for (const offset of [-1.5, -0.5, 0.5, 1.5]) {
        this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, offset * 0.13).normalize(), 0xfff0a5, 0.48, enemy.def.bulletDamage + 2, { leadRatio: 0.34, leadStrength: 0.62 });
      }
      this.spawnForgeMeteorShower(enemy, 10, 26, 4, phaseTier);
    }

}

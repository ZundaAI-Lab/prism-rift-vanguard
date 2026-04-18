/**
 * Responsibility:
 * - 胞子女王ボスの固有パターンを担当する。
 *
 * Rules:
 * - swamp 系の迫撃・リング制御だけを持ち、他ボスの分岐を混ぜない。
 */
import { SIDE, TARGET_DIR, THREE } from '../BossSystemShared.js';

export function installSwampBossController(BossSystem) {
  BossSystem.prototype.updateSwampBoss = function updateSwampBoss(enemy, dt, phaseTier, hpRatio) {
      const speedMul = phaseTier === 2 ? 1.38 : phaseTier === 1 ? 1.16 : 1;
      enemy.mesh.position.x += Math.sin(enemy.phase * (0.46 + phaseTier * 0.08)) * dt * 5.2 * speedMul;
      enemy.mesh.position.z += Math.cos(enemy.phase * (0.52 + phaseTier * 0.08)) * dt * 5.8 * speedMul;
      enemy.mesh.rotation.y -= dt * (0.24 + phaseTier * 0.08);
      if (enemy.cooldown > 0) return;
  
      if (phaseTier === 0) {
        enemy.cooldown = 0.82 + hpRatio * 0.36;
        this.spawnSwampMortarCluster(enemy, 2, 5.8, 1, phaseTier);
        for (let i = -2; i <= 2; i += 1) {
          const dir = TARGET_DIR.clone().addScaledVector(SIDE, i * 0.11).normalize();
          this.fireBossShot(enemy, dir, 0xc9ff7b, 0.44, enemy.def.bulletDamage + 1, { showBulletRatio: 0.16 });
        }
        return;
      }
  
      if (phaseTier === 1) {
        enemy.cooldown = 0.62 + hpRatio * 0.22;
        this.spawnSwampMortarCluster(enemy, 4, 7.4, 2, phaseTier);
        for (let ring = 0; ring < 2; ring += 1) {
          const ringCount = ring === 0 ? 8 : 10;
          for (let i = 0; i < ringCount; i += 1) {
            const angle = (i / ringCount) * Math.PI * 2 + enemy.phase * (0.3 + ring * 0.06) + ring * 0.24;
            this.fireBossShot(enemy, new THREE.Vector3(Math.cos(angle), 0.04 + ring * 0.03, Math.sin(angle)).normalize(), ring === 0 ? 0x8cffbb : 0xc9ff7b, 0.46, enemy.def.bulletDamage + 1, { showBulletRatio: 0.18 });
          }
        }
        for (let i = -2; i <= 2; i += 1) {
          const dir = TARGET_DIR.clone().addScaledVector(SIDE, i * 0.11).normalize();
          this.fireBossShot(enemy, dir, 0xe0ff8f, 0.48, enemy.def.bulletDamage + 1);
        }
        return;
      }
  
      enemy.cooldown = 0.5 + hpRatio * 0.14;
      this.spawnSwampMortarCluster(enemy, 4, 8.4, 3, phaseTier);
      for (let ring = 0; ring < 2; ring += 1) {
        const ringCount = ring === 0 ? 8 : 10;
        for (let i = 0; i < ringCount; i += 1) {
          const angle = (i / ringCount) * Math.PI * 2 + enemy.phase * (0.42 + ring * 0.07) + ring * 0.2;
          const yBias = ring === 0 ? 0.06 : 0.14;
          this.fireBossShot(enemy, new THREE.Vector3(Math.cos(angle), yBias, Math.sin(angle)).normalize(), ring === 0 ? 0x8cffbb : 0xb8ff6d, 0.5, enemy.def.bulletDamage + 2, { showBulletRatio: 0.2 });
        }
      }
      for (let i = -2; i <= 2; i += 1) {
        const dir = TARGET_DIR.clone().addScaledVector(SIDE, i * 0.11).normalize();
        this.fireBossShot(enemy, dir, 0xeaff98, 0.5, enemy.def.bulletDamage + 2);
      }
    }

}

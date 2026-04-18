/**
 * Responsibility:
 * - 砂塵王ボスの移動・射撃パターンを担当する。
 *
 * Rules:
 * - boss_desert の固有挙動だけを置く。
 * - 共通照準や発射処理は shared モジュールを使う。
 */
import { SIDE, TARGET_DIR, THREE } from '../BossSystemShared.js';

export function installDesertBossController(BossSystem) {
  BossSystem.prototype.updateDesertBoss = function updateDesertBoss(enemy, dt, phaseTier, hpRatio) {
      const speedMul = phaseTier === 2 ? 1.55 : phaseTier === 1 ? 1.22 : 1;
      enemy.mesh.position.x += Math.sin(enemy.phase * (0.34 + phaseTier * 0.07)) * dt * 8.2 * speedMul;
      enemy.mesh.position.z += Math.cos(enemy.phase * (0.28 + phaseTier * 0.05)) * dt * 7.1 * speedMul;
      enemy.mesh.rotation.y += dt * (0.28 + phaseTier * 0.12);
      if (enemy.cooldown > 0) return;
  
      enemy.desertVolley = (enemy.desertVolley ?? 0) + 1;
      const volley = enemy.desertVolley;
  
      if (phaseTier === 0) {
        enemy.cooldown = 0.78 + hpRatio * 0.5;
        for (let i = -2; i <= 2; i += 1) this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, i * 0.1).normalize(), 0xffc285, 0.54, enemy.def.bulletDamage + 2);
        return;
      }
  
      if (phaseTier === 1) {
        enemy.cooldown = 0.6 + hpRatio * 0.22;
  
        for (let i = 0; i < 8; i += 1) {
          const angle = (i / 8) * Math.PI * 2 + enemy.phase * 0.3;
          this.fireBossShot(enemy, new THREE.Vector3(Math.cos(angle), 0.04, Math.sin(angle)).normalize(), 0xff8eea, 0.48, enemy.def.bulletDamage + 1, { showBulletRatio: 0.22 });
        }
  
        for (let i = -1; i <= 1; i += 1) {
          const dir = TARGET_DIR.clone().addScaledVector(SIDE, i * 0.1).normalize();
          this.fireBossShot(enemy, dir, 0xffc285, 0.54, enemy.def.bulletDamage + 2, { showBulletRatio: 0.16 });
        }
  
        if (volley % 3 === 0) {
          for (let i = -1; i <= 1; i += 1) {
            this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, i * 0.12).normalize(), 0xffedb5, 0.5, enemy.def.bulletDamage + 3);
          }
        }
        return;
      }
  
      enemy.cooldown = 0.5 + hpRatio * 0.14;
  
      for (let burst = 0; burst < 2; burst += 1) {
        for (const offset of [-1.5, -0.5, 0.5, 1.5]) {
          const dir = TARGET_DIR.clone().addScaledVector(SIDE, offset * 0.095).add(new THREE.Vector3(0, 0.018 * burst, 0)).normalize();
          this.fireBossShot(enemy, dir, burst === 0 ? 0xffc285 : 0xff76de, 0.56, enemy.def.bulletDamage + 3, { showBulletRatio: burst === 0 ? 0.14 : 0.18 });
        }
      }
  
      if (volley % 2 === 0) {
        for (let i = 0; i < 8; i += 1) {
          const angle = (i / 8) * Math.PI * 2 + enemy.phase * 0.4;
          this.fireBossShot(enemy, new THREE.Vector3(Math.cos(angle), 0.05, Math.sin(angle)).normalize(), 0xffa86c, 0.48, enemy.def.bulletDamage + 1, { showBulletRatio: 0.18 });
        }
      }
  
      if (volley % 4 === 0) {
        for (const offset of [-0.5, 0.5]) {
          this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, offset * 0.12).normalize(), 0xffffc6, 0.48, enemy.def.bulletDamage + 4);
        }
      }
    }

}

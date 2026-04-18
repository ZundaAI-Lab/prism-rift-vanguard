import * as Shared from '../FinalBossSystemShared.js';

const {
  THREE,
  randRange,
  TARGET_DIR,
  SIDE,
  UP,
  TEMP,
} = Shared;

export function installFinalBossFighterPatterns(FinalBossSystem) {
  FinalBossSystem.prototype.fireFighterTwin = function fireFighterTwin(enemy, bursts, color, radius, damage, extra = {}) {
    this.computeAim(enemy);
    for (let burst = 0; burst < bursts; burst += 1) {
      this.bossSystem.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, 0.06 + burst * 0.015).normalize(), color, radius, damage, extra);
      this.bossSystem.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, -0.06 - burst * 0.015).normalize(), color, radius, damage, extra);
    }
  }

  FinalBossSystem.prototype.fireFighterSpray = function fireFighterSpray(enemy, count, spacing, color, radius, damage, extra = {}) {
    this.computeAim(enemy);
    for (let i = -(count >> 1); i <= (count >> 1); i += 1) {
      this.bossSystem.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, i * spacing).normalize(), color, radius, damage, { showBulletRatio: extra.showBulletRatio ?? 0.4, ...extra });
    }
  }

  FinalBossSystem.prototype.fireFighterNova = function fireFighterNova(enemy, count, color, radius, damage, extra = {}) {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + enemy.phase * 0.8;
      this.bossSystem.fireBossShot(enemy, new THREE.Vector3(Math.cos(angle), i % 2 === 0 ? 0.04 : 0.12, Math.sin(angle)).normalize(), color, radius, damage, { showBulletRatio: extra.showBulletRatio ?? 0.4, ...extra });
    }
  }

  FinalBossSystem.prototype.fireFighterLance = function fireFighterLance(enemy, count, color, radius, damage, extra = {}) {
    this.computeAim(enemy);
    for (let i = -(count >> 1); i <= (count >> 1); i += 1) {
      this.bossSystem.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, i * 0.04).normalize(), color, radius, damage, extra);
    }
  }

  FinalBossSystem.prototype.fireFighterShotgun = function fireFighterShotgun(enemy, count, spacing, color, radius, damage, extra = {}) {
    this.computeAim(enemy);
    for (let i = -(count >> 1); i <= (count >> 1); i += 1) {
      TEMP.copy(TARGET_DIR)
        .addScaledVector(SIDE, i * spacing)
        .addScaledVector(UP, randRange(-0.035, 0.035))
        .normalize();
      this.bossSystem.fireBossShot(enemy, TEMP.clone(), color, radius, damage, { showBulletRatio: extra.showBulletRatio ?? 0.4, ...extra });
    }
  }

  FinalBossSystem.prototype.fireFighterCross = function fireFighterCross(enemy, phaseTier) {
    this.computeAim(enemy);
    const shots = 6 + phaseTier * 2;
    for (let i = 0; i < shots; i += 1) {
      const dir = TARGET_DIR.clone().applyAxisAngle(UP, (-0.34 + (i / Math.max(1, shots - 1)) * 0.68));
      this.bossSystem.fireBossShot(enemy, dir.normalize(), i % 2 === 0 ? 0xffd087 : 0x76c2ff, 0.28, enemy.def.bulletDamage + phaseTier, { speed: enemy.def.bulletSpeed + 12, life: 3.3, showBulletRatio: 0.4 });
    }
  }

}

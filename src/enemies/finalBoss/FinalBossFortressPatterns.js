import * as Shared from '../FinalBossSystemShared.js';

const {
  THREE,
  randRange,
  TARGET_DIR,
  SIDE,
  UP,
  TEMP,
} = Shared;

export function installFinalBossFortressPatterns(FinalBossSystem) {
  FinalBossSystem.prototype.fireFortressCurtain = function fireFortressCurtain(enemy, count, spacing, color, radius, damage, extra = {}) {
    this.computeAim(enemy);
    for (let i = -(count >> 1); i <= (count >> 1); i += 1) {
      const dir = TARGET_DIR.clone().addScaledVector(SIDE, i * spacing).normalize();
      this.fireFortressPatternShot(enemy, dir, color, radius, damage, extra);
    }
  }

  FinalBossSystem.prototype.fireFortressNova = function fireFortressNova(enemy, count, color, radius, damage, extra = {}) {
    const verticalBias = extra.verticalBias ?? 0.08;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + enemy.phase * 0.25;
      const dir = new THREE.Vector3(
        Math.cos(angle),
        (i % 3 === 0 ? 0.12 : i % 2 === 0 ? 0.07 : 0.03) + verticalBias,
        Math.sin(angle),
      ).normalize();
      this.fireFortressPatternShot(enemy, dir, color, radius, damage, extra);
    }
  }

  FinalBossSystem.prototype.fireFortressPatternShot = function fireFortressPatternShot(enemy, direction, color, radius, damage, extra = {}) {
    const {
      showBulletRatio = 0,
      highShowBulletRatio = 0,
      speed = enemy.def.bulletSpeed,
      ...bossShotExtra
    } = extra;

    this.bossSystem.fireBossShot(enemy, direction, color, radius, damage, { speed, showBulletRatio, showBulletUseNormalVisuals: true, ...bossShotExtra });

    if (highShowBulletRatio <= 0 || Math.random() >= highShowBulletRatio) return;

    const showDir = direction.clone().normalize();
    TEMP.crossVectors(showDir, UP);
    if (TEMP.lengthSq() < 1e-5) TEMP.set(1, 0, 0);
    else TEMP.normalize();

    const elevateRad = THREE.MathUtils.degToRad(randRange(3.0, 5.0));
    const lateralRad = THREE.MathUtils.degToRad(randRange(-1.2, 1.2));
    showDir.applyAxisAngle(TEMP, elevateRad);
    showDir.applyAxisAngle(UP, lateralRad).normalize();

    this.game.projectiles.spawnEnemyProjectile({
      origin: enemy.mesh.position.clone(),
      direction: showDir,
      speed,
      damage: 0,
      radius: Math.max(0.18, radius * 0.88),
      life: bossShotExtra.life ?? 5.5,
      color,
      ignoreWorldHit: true,
      showBullet: true,
      showBulletUseNormalVisuals: true,
      ...bossShotExtra,
    });
  }

  FinalBossSystem.prototype.fireFortressLances = function fireFortressLances(enemy, count, color, radius, damage, extra = {}) {
    this.computeAim(enemy);
    for (let i = -(count >> 1); i <= (count >> 1); i += 1) {
      const dir = TARGET_DIR.clone().addScaledVector(SIDE, i * 0.045).setY(0.02 + Math.abs(i) * 0.01).normalize();
      this.bossSystem.fireBossShot(enemy, dir, color, radius, damage, extra);
    }
  }

  FinalBossSystem.prototype.fireFortressMortars = function fireFortressMortars(enemy, count, color, radius, damage, extra = {}) {
    this.computeAim(enemy);
    for (let i = 0; i < count; i += 1) {
      const dir = TARGET_DIR.clone().add(new THREE.Vector3(randRange(-0.14, 0.14), randRange(0.08, 0.2), randRange(-0.14, 0.14))).normalize();
      this.bossSystem.fireBossShot(enemy, dir, color, radius, damage, extra);
    }
  }

}

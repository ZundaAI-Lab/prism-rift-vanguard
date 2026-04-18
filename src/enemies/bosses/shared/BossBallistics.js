/**
 * Responsibility:
 * - ボス共通の弾生成・放物射出ユーティリティを担当する。
 *
 * Rules:
 * - ProjectileSystem を通して弾を出し、衝突処理はここで持たない。
 * - 個別の volley 構成は Controller から呼び出す。
 */
import {
  BALLISTIC_FALLBACK,
  BALLISTIC_TARGET,
  BALLISTIC_VELOCITY,
  RAIN_TARGET,
  THREE,
  clampPointToPlayerTravelBounds,
  resolvePlayerTravelBounds,
} from '../../BossSystemShared.js';

export function installBossBallistics(BossSystem) {
  BossSystem.prototype.makeBallisticVelocity = function makeBallisticVelocity(origin, target, flightTime, gravity) {
      const t = Math.max(0.4, flightTime);
      BALLISTIC_VELOCITY.set(
        (target.x - origin.x) / t,
        ((target.y - origin.y) + (0.5 * gravity * t * t)) / t,
        (target.z - origin.z) / t,
      );
      if (BALLISTIC_VELOCITY.lengthSq() < 0.000001) {
        BALLISTIC_FALLBACK.set(0, 1, 0).multiplyScalar(12);
        return BALLISTIC_FALLBACK.clone();
      }
      return BALLISTIC_VELOCITY.clone();
    }

  BossSystem.prototype.fireBallisticBossShot = function fireBallisticBossShot(enemy, target, color, radius, damage, extra = {}) {
      const {
        gravity = 18,
        flightTime = 1.9,
        life = flightTime + 1.2,
        splashRadius,
        splashDamage,
        ...projectileExtra
      } = extra;
      const isFinalMissionBoss = enemy?.def?.behavior === 'boss_final_fortress' || enemy?.def?.behavior === 'boss_final_fighter' || !!enemy?.finalBoss;
      const origin = enemy.mesh.position.clone();
      const velocity = this.makeBallisticVelocity(origin, target, flightTime, gravity);
  
      this.game.projectiles.spawnEnemyProjectile({
        origin,
        initialVelocity: velocity,
        direction: velocity.clone().normalize(),
        speed: velocity.length(),
        gravity,
        damage,
        radius,
        life,
        color,
        ignoreWorldHit: isFinalMissionBoss,
        splashRadius,
        splashDamage,
        ...projectileExtra,
      });
    }

  BossSystem.prototype.spawnSwampMortarCluster = function spawnSwampMortarCluster(enemy, count, spreadRadius, damageBonus, phaseTier) {
      const playerPos = this.game.store.playerMesh?.position;
      if (!playerPos) return;
  
      const baseGravity = phaseTier === 2 ? 16 : phaseTier === 1 ? 15 : 14;
      const baseFlight = phaseTier === 2 ? 2.15 : phaseTier === 1 ? 2.0 : 1.85;
  
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + enemy.phase * (0.35 + phaseTier * 0.08) + THREE.MathUtils.randFloatSpread(0.18);
        const radiusOffset = spreadRadius * (0.24 + Math.random() * 0.82);
        BALLISTIC_TARGET.set(
          playerPos.x + Math.cos(angle) * radiusOffset,
          0,
          playerPos.z + Math.sin(angle) * radiusOffset,
        );
        clampPointToPlayerTravelBounds(BALLISTIC_TARGET, 0);
        BALLISTIC_TARGET.y = this.getGroundY(BALLISTIC_TARGET.x, BALLISTIC_TARGET.z) + 0.12;
        this.fireBallisticBossShot(enemy, BALLISTIC_TARGET.clone(), 0xa7ff9f, 0.68 + phaseTier * 0.03, enemy.def.bulletDamage + damageBonus, {
          gravity: baseGravity + Math.random() * 2.5,
          flightTime: baseFlight + Math.random() * 0.28,
          splashRadius: 4.8 + phaseTier * 0.35,
          splashDamage: enemy.def.bulletDamage + damageBonus,
        });
      }
    }

  BossSystem.prototype.spawnForgeMeteorShower = function spawnForgeMeteorShower(enemy, count, spreadRadius, damageBonus, phaseTier) {
      const playerPos = this.game.store.playerMesh?.position;
      if (!playerPos) return;
  
      const gravityBase = phaseTier === 2 ? 20 : phaseTier === 1 ? 18.5 : 17.5;
      const timeBase = phaseTier === 2 ? 3.9 : phaseTier === 1 ? 3.55 : 3.2;
      const rainBounds = resolvePlayerTravelBounds({ x: 0, z: 0 }, 0);
  
      for (let i = 0; i < count; i += 1) {
        const focusPlayer = Math.random() < 0.35;
        if (focusPlayer) {
          const angle = Math.random() * Math.PI * 2;
          const radiusOffset = spreadRadius * (0.35 + Math.random() * 1.15);
          RAIN_TARGET.set(
            playerPos.x + Math.cos(angle) * radiusOffset,
            0,
            playerPos.z + Math.sin(angle) * radiusOffset,
          );
        } else {
          RAIN_TARGET.set(
            THREE.MathUtils.randFloat(rainBounds.minX, rainBounds.maxX),
            0,
            THREE.MathUtils.randFloat(rainBounds.minZ, rainBounds.maxZ),
          );
        }
        clampPointToPlayerTravelBounds(RAIN_TARGET, 0);
        RAIN_TARGET.y = this.getGroundY(RAIN_TARGET.x, RAIN_TARGET.z) + 0.12;
        this.fireBallisticBossShot(enemy, RAIN_TARGET.clone(), 0xff3b22, 0.64 + phaseTier * 0.035, enemy.def.bulletDamage + damageBonus, {
          gravity: gravityBase + Math.random() * 3.5,
          flightTime: timeBase + Math.random() * 0.65,
          splashRadius: 4.4 + phaseTier * 0.5,
          splashDamage: enemy.def.bulletDamage + damageBonus,
          color: 0xff3b22,
        });
      }
    }

  BossSystem.prototype.fireBossShot = function fireBossShot(enemy, direction, color, radius, damage, extra = {}) {
      const {
        showBulletRatio = 0,
        leadRatio = 0,
        leadStrength = 1,
        speed = enemy.def.bulletSpeed,
        splashRadius,
        splashDamage,
        preserveDirection = false,
        ...projectileExtra
      } = extra;
      const isFinalMissionBoss = enemy?.def?.behavior === 'boss_final_fortress' || enemy?.def?.behavior === 'boss_final_fighter' || !!enemy?.finalBoss;
      const origin = enemy.mesh.position.clone();
      const patternDirection = direction.clone().normalize();
      const heightAlignedPattern = preserveDirection ? patternDirection.clone() : this.alignShotToPlayerHeight(enemy.mesh.position, patternDirection);
  
      if (showBulletRatio > 0 && Math.random() < showBulletRatio) {
        this.game.projectiles.spawnEnemyProjectile({
          origin: origin.clone(),
          direction: heightAlignedPattern.clone(),
          speed,
          damage: 0,
          radius: Math.max(0.18, radius * 0.9),
          life: projectileExtra.life ?? 5.5,
          color,
          ignoreWorldHit: isFinalMissionBoss,
          showBullet: true,
          ...projectileExtra,
        });
      }
  
      this.game.projectiles.spawnEnemyProjectile({
        origin,
        direction: preserveDirection ? patternDirection.clone() : this.resolveBossShotDirection(enemy, patternDirection, speed, leadRatio, leadStrength),
        speed,
        damage,
        radius,
        life: projectileExtra.life ?? 5.5,
        color,
        ignoreWorldHit: isFinalMissionBoss,
        splashRadius,
        splashDamage,
        ...projectileExtra,
      });
    }

}

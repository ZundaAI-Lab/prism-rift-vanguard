/**
 * Responsibility:
 * - 氷霧聖歌隊ボスと吹雪状態管理を担当する。
 *
 * Rules:
 * - frost ボス固有の演出状態はここで開始・更新・解除まで完結させる。
 * - Environment 側へ見た目を依頼しても、吹雪トリガー条件の決定はここに残す。
 */
import { FROST_BLIZZARD_SOURCE, SIDE, TARGET_DIR, THREE } from '../BossSystemShared.js';

export function installFrostBossController(BossSystem) {
  BossSystem.prototype.setupFrostBossState = function setupFrostBossState(enemy) {
      enemy.frostBlizzardSchedule = {
        introDelay: 3,
        introTriggered: false,
        halfTriggered: false,
        quarterTriggered: false,
        lastHpRatio: 1,
      };
      enemy.frostBossModelRig = null;
      this.clearFrostBlizzardState();
    }

  BossSystem.prototype.getFrostBossModelRig = function getFrostBossModelRig(enemy) {
      if (!enemy?.mesh) return null;
      const cached = enemy.frostBossModelRig;
      if (cached?.root === enemy.mesh) return cached;
      const rig = enemy.mesh.userData?.frostBossRig;
      if (!rig) return null;
      enemy.frostBossModelRig = {
        root: enemy.mesh,
        sanctum: rig.sanctum ?? null,
        wingCrown: rig.wingCrown ?? null,
        haloStack: rig.haloStack ?? null,
        choir: rig.choir ?? null,
        stormVeil: rig.stormVeil ?? null,
      };
      return enemy.frostBossModelRig;
    }

  BossSystem.prototype.animateFrostBossModel = function animateFrostBossModel(enemy, dt) {
      const rig = this.getFrostBossModelRig(enemy);
      if (!rig) return;
      const blizzard = this.getFrostBlizzardState();
      const telegraphRatio = blizzard?.telegraphActive
        ? 1 - ((blizzard.telegraphTimer ?? 0) / Math.max(0.0001, blizzard.telegraphDuration ?? 1.25))
        : 0;
      const stormBlend = blizzard?.active ? 1 : telegraphRatio * 0.78;
      const phase = enemy.phase ?? 0;

      if (rig.sanctum) {
        rig.sanctum.position.y = Math.sin(phase * 1.35) * 0.18;
        rig.sanctum.rotation.z = Math.sin(phase * 0.72) * 0.045;
      }
      if (rig.wingCrown) {
        rig.wingCrown.rotation.y += dt * (0.2 + stormBlend * 0.62);
        rig.wingCrown.rotation.x = Math.sin(phase * 0.9) * (0.03 + stormBlend * 0.025);
        rig.wingCrown.rotation.z = Math.sin(phase * 1.6) * 0.04;
      }
      if (rig.haloStack) {
        rig.haloStack.rotation.y -= dt * (0.16 + stormBlend * 0.94);
        rig.haloStack.rotation.x = Math.sin(phase * 0.55) * 0.05;
        const haloScale = 1 + stormBlend * 0.09;
        rig.haloStack.scale.set(haloScale, 1 + stormBlend * 0.05, haloScale);
      }
      if (rig.choir) {
        rig.choir.rotation.y += dt * (0.24 + stormBlend * 0.82);
        rig.choir.position.y = Math.sin(phase * 1.2) * 0.34 + stormBlend * 0.42;
        rig.choir.rotation.z = Math.sin(phase * 0.84) * 0.05;
      }
      if (rig.stormVeil) {
        rig.stormVeil.rotation.y -= dt * (0.38 + stormBlend * 1.85);
        rig.stormVeil.rotation.x = 0.1 + Math.sin(phase * 0.68) * 0.07 + stormBlend * 0.08;
        rig.stormVeil.rotation.z = Math.cos(phase * 0.74) * 0.05;
        const veilScale = 1 + stormBlend * 0.14;
        rig.stormVeil.scale.set(veilScale, 1 + stormBlend * 0.08, veilScale);
        rig.stormVeil.position.y = Math.sin(phase * 1.8) * 0.24;
      }
    }

  BossSystem.prototype.isFrostBlizzardBusy = function isFrostBlizzardBusy(blizzard) {
      return Boolean(blizzard?.telegraphActive || blizzard?.active);
    }

  BossSystem.prototype.tryTriggerFrostBlizzard = function tryTriggerFrostBlizzard(enemy, blizzard, schedule, key) {
      if (schedule[key]) return false;
      schedule[key] = true;
      if (this.isFrostBlizzardBusy(blizzard)) return false;
      this.startFrostBlizzardTelegraph(enemy, blizzard);
      return true;
    }

  BossSystem.prototype.startFrostBlizzardTelegraph = function startFrostBlizzardTelegraph(enemy, blizzard) {
      FROST_BLIZZARD_SOURCE.copy(enemy.mesh.position);
      blizzard.active = false;
      blizzard.timer = 0;
      blizzard.moveScale = 1;
      blizzard.telegraphActive = true;
      blizzard.telegraphTimer = blizzard.telegraphDuration ?? 1.25;
      blizzard.sourceX = FROST_BLIZZARD_SOURCE.x;
      blizzard.sourceY = FROST_BLIZZARD_SOURCE.y;
      blizzard.sourceZ = FROST_BLIZZARD_SOURCE.z;
    }

  BossSystem.prototype.updateFrostBlizzardState = function updateFrostBlizzardState(enemy, dt, hpRatio) {
      const blizzard = this.getFrostBlizzardState();
      if (!blizzard || !enemy?.mesh) return;
  
      const schedule = enemy.frostBlizzardSchedule ?? (enemy.frostBlizzardSchedule = {
        introDelay: 3,
        introTriggered: false,
        halfTriggered: false,
        quarterTriggered: false,
        lastHpRatio: 1,
      });
  
      FROST_BLIZZARD_SOURCE.copy(enemy.mesh.position);
      blizzard.sourceX = FROST_BLIZZARD_SOURCE.x;
      blizzard.sourceY = FROST_BLIZZARD_SOURCE.y;
      blizzard.sourceZ = FROST_BLIZZARD_SOURCE.z;
  
      const previousHpRatio = schedule.lastHpRatio ?? 1;
      const crossedHalf = !schedule.halfTriggered && previousHpRatio > 0.5 && hpRatio <= 0.5;
      const crossedQuarter = !schedule.quarterTriggered && previousHpRatio > 0.25 && hpRatio <= 0.25;
      schedule.lastHpRatio = hpRatio;
  
      if (!schedule.introTriggered) {
        schedule.introDelay = Math.max(0, (schedule.introDelay ?? 3) - dt);
        if (schedule.introDelay <= 0) {
          if (this.tryTriggerFrostBlizzard(enemy, blizzard, schedule, 'introTriggered')) return;
        }
      }
  
      if (blizzard.telegraphActive) {
        blizzard.telegraphTimer = Math.max(0, blizzard.telegraphTimer - dt);
        if (blizzard.telegraphTimer <= 0) {
          blizzard.telegraphActive = false;
          blizzard.active = true;
          blizzard.timer = 5;
          blizzard.moveScale = 0.5;
        }
        if (crossedHalf) schedule.halfTriggered = true;
        if (crossedQuarter) schedule.quarterTriggered = true;
        return;
      }
  
      if (blizzard.active) {
        blizzard.timer = Math.max(0, blizzard.timer - dt);
        if (blizzard.timer <= 0) {
          blizzard.active = false;
          blizzard.moveScale = 1;
        }
        if (crossedHalf) schedule.halfTriggered = true;
        if (crossedQuarter) schedule.quarterTriggered = true;
        return;
      }
  
      if (crossedHalf) {
        if (this.tryTriggerFrostBlizzard(enemy, blizzard, schedule, 'halfTriggered')) return;
      }
  
      if (crossedQuarter) {
        this.tryTriggerFrostBlizzard(enemy, blizzard, schedule, 'quarterTriggered');
      }
    }

  BossSystem.prototype.clearFrostBlizzardState = function clearFrostBlizzardState() {
      const blizzard = this.getFrostBlizzardState();
      if (!blizzard) return;
      blizzard.active = false;
      blizzard.timer = 0;
      blizzard.moveScale = 1;
      blizzard.telegraphActive = false;
      blizzard.telegraphTimer = 0;
      blizzard.sourceX = 0;
      blizzard.sourceY = 0;
      blizzard.sourceZ = 0;
    }

  BossSystem.prototype.updateFrostBoss = function updateFrostBoss(enemy, dt, phaseTier, hpRatio) {
      this.updateFrostBlizzardState(enemy, dt, hpRatio);
      const mul = phaseTier === 2 ? 1.46 : phaseTier === 1 ? 1.2 : 1;
      enemy.mesh.position.x += Math.sin(enemy.phase * (0.44 + phaseTier * 0.07)) * dt * 6.4 * mul;
      enemy.mesh.position.z += Math.cos(enemy.phase * (0.36 + phaseTier * 0.09)) * dt * 7.2 * mul;
      enemy.mesh.rotation.y -= dt * (0.28 + phaseTier * 0.09);
      this.animateFrostBossModel(enemy, dt);
      if (enemy.cooldown > 0) return;
  
      enemy.frostVolley = (enemy.frostVolley ?? 0) + 1;
      const volley = enemy.frostVolley;
  
      if (phaseTier === 0) {
        enemy.cooldown = 0.66 + hpRatio * 0.28;
        for (let i = -4; i <= 4; i += 1) {
          const dir = TARGET_DIR.clone().addScaledVector(SIDE, i * 0.076).normalize();
          this.fireBossShot(enemy, dir, 0xb6ebff, 0.42, enemy.def.bulletDamage + 2, { speed: enemy.def.bulletSpeed + 9, life: 4.8, leadRatio: 0.68, leadStrength: 0.76 });
        }
        if (volley % 2 === 0) {
          for (let i = 0; i < 6; i += 1) {
            const angle = (i / 6) * Math.PI * 2 + enemy.phase * 0.42;
            this.fireBossShot(enemy, new THREE.Vector3(Math.cos(angle), 0.08, Math.sin(angle)).normalize(), 0xe8fbff, 0.38, enemy.def.bulletDamage + 1, { speed: enemy.def.bulletSpeed + 4, showBulletRatio: 0.3 });
          }
        }
        return;
      }
  
      if (phaseTier === 1) {
        enemy.cooldown = 0.46 + hpRatio * 0.14;
        const layerOffsets = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
        for (let layer = 0; layer < 2; layer += 1) {
          for (const offset of layerOffsets) {
            const dir = TARGET_DIR.clone().addScaledVector(SIDE, offset * 0.12).setY(0.1 + layer * 0.05).normalize();
            this.fireBossShot(enemy, dir, layer === 0 ? 0xdffcff : 0x9edcff, 0.48 + layer * 0.02, enemy.def.bulletDamage + 2, { splashRadius: 3.8 + layer * 0.2, splashDamage: enemy.def.bulletDamage + 1, leadRatio: 0.66, leadStrength: 0.76 });
          }
        }
        if (volley % 2 === 1) {
          for (const offset of [-1.5, -0.5, 0.5, 1.5]) {
            this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, offset * 0.09).normalize(), 0xf6ffff, 0.36, enemy.def.bulletDamage + 1, { speed: enemy.def.bulletSpeed + 12, leadRatio: 0.72, leadStrength: 0.82 });
          }
        }
        return;
      }
  
      enemy.cooldown = 0.34 + hpRatio * 0.1;
      for (let i = 0; i < 14; i += 1) {
        const angle = (i / 14) * Math.PI * 2 + enemy.phase * 0.72;
        const yBias = i % 2 === 0 ? 0.14 : 0.04;
        this.fireBossShot(enemy, new THREE.Vector3(Math.cos(angle), yBias, Math.sin(angle)).normalize(), i % 2 === 0 ? 0xffffff : 0x8ad8ff, 0.44, enemy.def.bulletDamage + 2, { speed: enemy.def.bulletSpeed + (i % 2 === 0 ? 10 : 5), showBulletRatio: 0.34 });
      }
      for (let i = -2; i <= 2; i += 1) {
        const dir = TARGET_DIR.clone().addScaledVector(SIDE, i * 0.09).normalize();
        this.fireBossShot(enemy, dir, 0xe7fbff, 0.38, enemy.def.bulletDamage + 2, { speed: enemy.def.bulletSpeed + 14, life: 4.6, leadRatio: 0.74, leadStrength: 0.84 });
      }
    }

}

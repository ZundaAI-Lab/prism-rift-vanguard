/**
 * Responsibility:
 * - 鏡都玉座ボスのワープ・可視状態・再出現演出を担当する。
 *
 * Rules:
 * - mirror ボスの opacity / visibility / warp 目標選定はこの Controller に集約する。
 * - 共通射撃補助は shared を使い、warp 状態機械だけに集中する。
 */
import {
  MINIMAP,
  MIRROR_WARP_JITTER,
  MIRROR_WARP_POINT,
  SIDE,
  TARGET_DIR,
  THREE,
  clampPointToPlayerTravelBounds,
  resolvePlayerTravelBounds,
} from '../BossSystemShared.js';

export function installMirrorBossController(BossSystem) {
  BossSystem.prototype.setupMirrorBossState = function setupMirrorBossState(enemy) {
      const materials = [];
      const seen = new Set();
      enemy.mesh.traverse((node) => {
        const source = node?.material;
        if (!source) return;
        const list = Array.isArray(source) ? source : [source];
        for (const material of list) {
          if (!material || seen.has(material)) continue;
          seen.add(material);
          materials.push({
            material,
            opacity: material.opacity ?? 1,
            transparent: !!material.transparent,
            depthWrite: material.depthWrite !== false,
          });
        }
      });
  
      enemy.mirrorBossState = {
        materials,
        openingBurstPending: true,
        warpState: 'idle',
        warpTimer: THREE.MathUtils.randFloat(4.6, 5.4),
        warpElapsed: 0,
        warpFadeOut: 0.34,
        warpTransit: 0.22,
        warpFadeIn: 0.42,
        warpFrom: enemy.mesh.position.clone(),
        warpTo: enemy.mesh.position.clone(),
        warpHidden: false,
      };
      enemy.mirrorBossModelRig = null;
      this.setMirrorBossVisibility(enemy, true);
      this.applyMirrorBossOpacity(enemy, 1);
      enemy.cooldown = Math.min(enemy.cooldown, 0.32);
    }

  BossSystem.prototype.setMirrorBossVisibility = function setMirrorBossVisibility(enemy, visible) {
      const state = enemy.mirrorBossState;
      enemy.mesh.visible = visible;
      if (state) state.warpHidden = !visible;
    }

  BossSystem.prototype.applyMirrorBossOpacity = function applyMirrorBossOpacity(enemy, alpha) {
      const state = enemy.mirrorBossState;
      if (!state?.materials) return;
      const clamped = THREE.MathUtils.clamp(alpha, 0, 1);
      for (const entry of state.materials) {
        entry.material.transparent = entry.transparent || clamped < 0.999;
        entry.material.opacity = entry.opacity * clamped;
        entry.material.depthWrite = entry.depthWrite && clamped > 0.58;
      }
    }

  BossSystem.prototype.getMirrorBossModelRig = function getMirrorBossModelRig(enemy) {
      if (!enemy?.mesh) return null;
      const cached = enemy.mirrorBossModelRig;
      if (cached?.root === enemy.mesh) return cached;
      const rig = enemy.mesh.userData?.mirrorBossRig;
      if (!rig) return null;
      enemy.mirrorBossModelRig = {
        root: enemy.mesh,
        throne: rig.throne ?? null,
        bladeRack: rig.bladeRack ?? null,
        calculator: rig.calculator ?? null,
        lattice: rig.lattice ?? null,
        crown: rig.crown ?? null,
      };
      return enemy.mirrorBossModelRig;
    }

  BossSystem.prototype.animateMirrorBossModel = function animateMirrorBossModel(enemy, dt, phaseTier, warping) {
      const rig = this.getMirrorBossModelRig(enemy);
      if (!rig) return;
      const state = enemy.mirrorBossState;
      const warpState = state?.warpState ?? 'idle';
      const warpBlend = warping || warpState === 'fadeOut' || warpState === 'fadeIn' ? 1 : 0;
      const tierBlend = phaseTier * 0.16;
      const phase = enemy.phase ?? 0;

      if (rig.throne) {
        rig.throne.position.y = Math.sin(phase * 0.9) * 0.26;
        rig.throne.rotation.z = Math.sin(phase * 0.55) * 0.035;
      }
      if (rig.bladeRack) {
        rig.bladeRack.rotation.y += dt * (0.22 + tierBlend + warpBlend * 0.7);
        rig.bladeRack.rotation.x = Math.sin(phase * 1.2) * 0.04;
        rig.bladeRack.rotation.z = Math.cos(phase * 1.6) * 0.05;
      }
      if (rig.calculator) {
        rig.calculator.rotation.y -= dt * (0.4 + tierBlend * 1.6 + warpBlend * 1.5);
        rig.calculator.rotation.x = Math.sin(phase * 0.68) * 0.06;
        const calcScale = 1 + warpBlend * 0.1 + Math.sin(phase * 1.35) * 0.015;
        rig.calculator.scale.set(calcScale, 1 + warpBlend * 0.05, calcScale);
      }
      if (rig.lattice) {
        rig.lattice.rotation.y += dt * (0.28 + tierBlend * 1.4 + warpBlend * 0.92);
        rig.lattice.position.y = Math.sin(phase * 1.45) * 0.3 + warpBlend * 0.2;
        rig.lattice.rotation.z = Math.sin(phase * 0.82) * 0.05;
      }
      if (rig.crown) {
        rig.crown.rotation.y -= dt * (0.16 + tierBlend + warpBlend * 0.66);
        rig.crown.rotation.x = Math.cos(phase * 0.74) * 0.04;
        rig.crown.position.y = warpBlend * 0.32;
      }
    }

  BossSystem.prototype.getMirrorWarpDelay = function getMirrorWarpDelay(phaseTier) {
      if (phaseTier === 2) return THREE.MathUtils.randFloat(4.0, 4.8);
      if (phaseTier === 1) return THREE.MathUtils.randFloat(4.6, 5.3);
      return THREE.MathUtils.randFloat(5.2, 6.0);
    }

  BossSystem.prototype.placeMirrorWarpVisual = function placeMirrorWarpVisual(position, anchor, pulse, jitterScale) {
      MIRROR_WARP_JITTER.set(
        Math.sin(pulse * 1.13),
        Math.cos(pulse * 0.91) * 0.24,
        Math.cos(pulse * 1.29),
      ).multiplyScalar(jitterScale);
      position.copy(anchor).add(MIRROR_WARP_JITTER);
    }

  BossSystem.prototype.pickMirrorWarpTarget = function pickMirrorWarpTarget(enemy) {
      const playerPos = this.game.store.playerMesh?.position;
      if (!playerPos) return enemy.mesh.position.clone();
  
      const minDistance = MINIMAP.range * MINIMAP.innerRingRatio + 7;
      const maxDistance = Math.min(MINIMAP.range - 8, minDistance + 18);
      const padding = enemy.def.radius + 12;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = THREE.MathUtils.randFloat(minDistance, maxDistance);
        MIRROR_WARP_POINT.set(
          playerPos.x + Math.cos(angle) * distance,
          0,
          playerPos.z + Math.sin(angle) * distance,
        );
        if (resolvePlayerTravelBounds(MIRROR_WARP_POINT, padding + 30).isInside) {
          MIRROR_WARP_POINT.y = this.getGroundY(MIRROR_WARP_POINT.x, MIRROR_WARP_POINT.z) + enemy.def.hover;
          return MIRROR_WARP_POINT.clone();
        }
      }
  
      MIRROR_WARP_POINT.set(-playerPos.x, 0, -playerPos.z);
      if (MIRROR_WARP_POINT.lengthSq() < 0.0001) MIRROR_WARP_POINT.set(0, 0, -1);
      MIRROR_WARP_POINT.normalize().multiplyScalar((minDistance + maxDistance) * 0.5).add(playerPos);
      clampPointToPlayerTravelBounds(MIRROR_WARP_POINT, padding + 30);
      MIRROR_WARP_POINT.y = this.getGroundY(MIRROR_WARP_POINT.x, MIRROR_WARP_POINT.z) + enemy.def.hover;
      return MIRROR_WARP_POINT.clone();
    }

  BossSystem.prototype.beginMirrorWarp = function beginMirrorWarp(enemy) {
      const state = enemy.mirrorBossState;
      if (!state || state.warpState !== 'idle') return;
      this.setMirrorBossVisibility(enemy, true);
      state.warpState = 'fadeOut';
      state.warpElapsed = 0;
      state.warpFrom.copy(enemy.mesh.position);
      state.warpTo.copy(this.pickMirrorWarpTarget(enemy));
      enemy.cooldown = Math.max(enemy.cooldown, 0.16);
    }

  BossSystem.prototype.updateMirrorWarp = function updateMirrorWarp(enemy, dt, phaseTier) {
      const state = enemy.mirrorBossState;
      if (!state) return false;
  
      if (state.warpState === 'idle') {
        state.warpTimer -= dt;
        if (state.warpTimer <= 0) this.beginMirrorWarp(enemy);
        if (state.warpState === 'idle') {
          this.setMirrorBossVisibility(enemy, true);
          this.applyMirrorBossOpacity(enemy, 1);
          return false;
        }
      }
  
      state.warpElapsed += dt;
      const pulse = enemy.phase * 6.4 + state.warpElapsed * 18.0;
  
      if (state.warpState === 'fadeOut') {
        const t = Math.min(1, state.warpElapsed / state.warpFadeOut);
        const eased = THREE.MathUtils.smoothstep(t, 0, 1);
        this.placeMirrorWarpVisual(enemy.mesh.position, state.warpFrom, pulse, 0.82 * (1 - eased));
        this.applyMirrorBossOpacity(enemy, 1 - eased);
        enemy.mesh.rotation.y += dt * 1.8;
        enemy.mesh.rotation.z += Math.sin(pulse * 0.8) * dt * 0.18;
        if (t >= 1) {
          this.game.effects.spawnHitSpark(state.warpFrom.clone(), enemy.def.accent, 1.1);
          this.game.effects.spawnMirrorWarpStream(
            state.warpFrom.clone(),
            state.warpTo.clone(),
            enemy.def.accent,
            Math.max(1.2, enemy.def.radius * 0.34),
            state.warpTransit,
          );
          this.applyMirrorBossOpacity(enemy, 0);
          this.setMirrorBossVisibility(enemy, false);
          state.warpState = 'transit';
          state.warpElapsed = 0;
        }
        return true;
      }
  
      if (state.warpState === 'transit') {
        if (state.warpElapsed >= state.warpTransit) {
          enemy.mesh.position.copy(state.warpTo);
          this.applyMirrorBossOpacity(enemy, 0);
          this.setMirrorBossVisibility(enemy, true);
          state.warpState = 'fadeIn';
          state.warpElapsed = 0;
        }
        return true;
      }
  
      this.setMirrorBossVisibility(enemy, true);
      const t = Math.min(1, state.warpElapsed / state.warpFadeIn);
      const eased = THREE.MathUtils.smoothstep(t, 0, 1);
      this.placeMirrorWarpVisual(enemy.mesh.position, state.warpTo, pulse, 0.64 * (1 - eased));
      this.applyMirrorBossOpacity(enemy, eased);
      enemy.mesh.rotation.y += dt * 2.1;
      enemy.mesh.rotation.z += Math.sin(pulse) * dt * 0.16;
      if (t >= 1) {
        enemy.mesh.position.copy(state.warpTo);
        this.applyMirrorBossOpacity(enemy, 1);
        this.setMirrorBossVisibility(enemy, true);
        this.game.effects.spawnHitSpark(state.warpTo.clone(), enemy.def.accent, 1.25);
        state.warpState = 'idle';
        state.warpElapsed = 0;
        state.warpTimer = this.getMirrorWarpDelay(phaseTier);
        enemy.cooldown = Math.min(enemy.cooldown, 0.16);
      }
      return true;
    }

  BossSystem.prototype.updateMirrorBoss = function updateMirrorBoss(enemy, dt, phaseTier, hpRatio) {
      const state = enemy.mirrorBossState;
      const mul = phaseTier === 2 ? 1.48 : phaseTier === 1 ? 1.24 : 1;
      const warping = this.updateMirrorWarp(enemy, dt, phaseTier);
      if (!warping) {
        enemy.mesh.position.x += Math.sin(enemy.phase * (0.52 + phaseTier * 0.08)) * dt * 6.8 * mul;
        enemy.mesh.position.z += Math.cos(enemy.phase * (0.46 + phaseTier * 0.06)) * dt * 6.0 * mul;
      }
      this.animateMirrorBossModel(enemy, dt, phaseTier, warping);
      enemy.mesh.rotation.x += dt * (0.12 + phaseTier * 0.04);
      enemy.mesh.rotation.y += dt * (0.42 + phaseTier * 0.12);
      if (warping || enemy.cooldown > 0) return;
      if (phaseTier === 0) {
        const openingBurst = !!state?.openingBurstPending;
        enemy.cooldown = openingBurst ? 0.92 : 0.66 + hpRatio * 0.28;
        for (let i = -3; i <= 3; i += 1) {
          this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, i * 0.065).normalize(), 0xff8cd8, 0.36, enemy.def.bulletDamage + 1, { speed: enemy.def.bulletSpeed + 10, life: 4.2, leadRatio: 0.72, leadStrength: 0.8 });
        }
        for (let i = -2; i <= 2; i += 1) {
          this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, i * 0.14).normalize(), 0xbfd0ff, 0.48, enemy.def.bulletDamage + 1, { leadRatio: 0.72, leadStrength: 0.8 });
        }
        if (openingBurst) {
          for (let i = 0; i < 10; i += 1) {
            const angle = (i / 10) * Math.PI * 2 + enemy.phase * 0.24;
            this.fireBossShot(enemy, new THREE.Vector3(Math.cos(angle), 0.03, Math.sin(angle)).normalize(), i % 2 === 0 ? 0xff9ede : 0xd9e3ff, 0.34, enemy.def.bulletDamage, { speed: enemy.def.bulletSpeed + 6, life: 4.6, showBulletRatio: 0.36, preserveDirection: true });
          }
          state.openingBurstPending = false;
        }
        return;
      }
      if (phaseTier === 1) {
        if (state) state.openingBurstPending = false;
        enemy.cooldown = 0.48 + hpRatio * 0.16;
        for (let i = 0; i < 8; i += 1) {
          const angle = (i / 8) * Math.PI * 2 + enemy.phase * 0.6;
          this.fireBossShot(enemy, new THREE.Vector3(Math.cos(angle), 0.03, Math.sin(angle)).normalize(), i % 2 === 0 ? 0xff8cd8 : 0xbfd0ff, 0.42, enemy.def.bulletDamage + 1, { speed: enemy.def.bulletSpeed + (i % 2 === 0 ? 8 : 0), showBulletRatio: 0.4 });
        }
        return;
      }
      if (state) state.openingBurstPending = false;
      enemy.cooldown = 0.34 + hpRatio * 0.1;
      for (let sweep = -1; sweep <= 1; sweep += 1) {
        for (let i = -4; i <= 4; i += 1) this.fireBossShot(enemy, TARGET_DIR.clone().addScaledVector(SIDE, i * 0.08 + sweep * 0.04).normalize(), sweep === 0 ? 0xffffff : 0xff78c8, 0.34, enemy.def.bulletDamage + 2, { speed: enemy.def.bulletSpeed + 12, life: 4.0, leadRatio: 0.72, leadStrength: 0.8 });
      }
    }

}

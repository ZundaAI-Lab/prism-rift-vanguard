import * as THREE from 'three';
import { randRange } from '../utils/math.js';
import { clearAndDisposeChildren, detachAndDispose } from '../utils/three-dispose.js';
import { PLAYER_XZ, TEMP_XZ } from './gimmicks/StageGimmickShared.js';
import { icefallGimmickMethods } from './gimmicks/IcefallGimmick.js';
import { mirrorSweepGimmickMethods } from './gimmicks/MirrorSweepGimmick.js';
import { astralBloomGimmickMethods } from './gimmicks/AstralBloomGimmick.js';
import { voidJudgementGimmickMethods } from './gimmicks/VoidJudgementGimmick.js';

/**
 * Responsibility:
 * - Mission-specific arena gimmicks and hazard telegraphs.
 *
 * Rules:
 * - Visual telegraphs and damage windows for biome gimmicks belong here.
 * - Permanent biome art belongs in EnvironmentBuilder, not here.
 * - This system may damage the player, but it must not award score or alter mission progression directly.
 * - Internal timers stay local to this class because no other module is allowed to depend on gimmick timing.
 * - Final mission hazards may be dramatic, but must stay fair: every damaging event needs a visible telegraph first.
 */
export class StageGimmickSystem {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.ensureAttached();
    this.gimmickKey = null;
    this.eventTimer = 999;
    this.damageGate = 0;
    this.hazards = [];
    this.voidJudgementArmed = false;
  }

  ensureAttached() {
    if (this.group.parent !== this.game.renderer.groups.fx) this.game.renderer.groups.fx.add(this.group);
  }

  applyMission(mission) {
    this.ensureAttached();
    this.clear();
    this.gimmickKey = mission.gimmick ?? null;
    this.voidJudgementArmed = false;
    this.eventTimer = this.gimmickKey ? randRange(4.0, 5.8) : 999;
  }

  clear() {
    clearAndDisposeChildren(this.group);
    this.hazards = [];
    this.damageGate = 0;
    this.voidJudgementArmed = false;
  }

  onMissionClear() {
    this.clear();
    this.gimmickKey = null;
    this.voidJudgementArmed = false;
    this.eventTimer = 999;
  }

  update(dt) {
    if (!this.gimmickKey || !this.game.store.playerMesh) return;
    if (this.game.state.progression.missionStatus === 'clearSequence') return;
    if (this.game.state.mode !== 'playing') return;

    if (this.gimmickKey === 'voidJudgement' && this.isSeraphWraithBattleActive()) {
      this.clearCentralVoidRingHazards();
    }

    this.damageGate = Math.max(0, this.damageGate - dt);
    if (this.gimmickKey === 'voidJudgement' && !this.voidJudgementArmed) {
      if (this.hasVoidJudgementStarted()) {
        this.voidJudgementArmed = true;
        this.eventTimer = randRange(4.8, 6.6);
      }
    } else {
      this.eventTimer -= dt;
      if (this.eventTimer <= 0) {
        if (this.gimmickKey === 'icefall') this.spawnIcefall();
        if (this.gimmickKey === 'mirrorSweep') this.spawnMirrorSweep();
        if (this.gimmickKey === 'astralBloom') this.spawnAstralBloom();
        if (this.gimmickKey === 'voidJudgement') this.spawnVoidJudgement();
        if (this.gimmickKey === 'mirrorSweep') this.eventTimer = randRange(7.4, 9.2);
        else if (this.gimmickKey === 'voidJudgement') this.eventTimer = randRange(4.8, 6.6);
        else this.eventTimer = randRange(5.2, 7.6);
      }
    }

    for (let i = this.hazards.length - 1; i >= 0; i -= 1) {
      const hazard = this.hazards[i];
      if (!hazard) continue;

      hazard.age += dt;
      if (hazard.kind === 'icefall') this.updateIcefall(hazard, dt);
      if (hazard.kind === 'mirrorSweep') this.updateMirrorSweep(hazard, dt);
      if (hazard.kind === 'astralBloom') this.updateAstralBloom(hazard, dt);
      if (hazard.kind === 'voidPillar') this.updateVoidPillar(hazard, dt);
      if (hazard.kind === 'voidRing') this.updateVoidRing(hazard, dt);

      if (this.game.state.mode !== 'playing') return;
      if (!this.hazards[i] || this.hazards[i] !== hazard) continue;

      if (hazard.age >= hazard.life) {
        detachAndDispose(hazard.root);
        this.hazards.splice(i, 1);
      }
    }
  }

  getActiveFinalBoss() {
    return this.game.store.enemies.find((enemy) => enemy?.alive && (
      enemy.def?.behavior === 'boss_final_fortress'
      || enemy.def?.behavior === 'boss_final_fighter'
      || !!enemy.finalBoss
    )) ?? null;
  }

  isSeraphWraithBattleActive() {
    const boss = this.getActiveFinalBoss();
    if (!boss) return false;

    const bossData = boss.finalBoss;
    if (bossData?.form === 'fighter') return true;
    return boss.def?.behavior === 'boss_final_fighter';
  }

  hasVoidJudgementStarted() {
    const boss = this.getActiveFinalBoss();
    if (!boss) return false;

    const bossData = boss.finalBoss;
    if (!bossData) return false;
    if (bossData.form === 'fortress') {
      if (bossData.state === 'intro') return false;
      if (bossData.state !== 'fortress') return true;
      return this.game.enemies?.bossSystem?.finalBoss?.hasFortressAttackStarted(boss) === true;
    }
    return true;
  }

  clearCentralVoidRingHazards() {
    for (let i = this.hazards.length - 1; i >= 0; i -= 1) {
      const hazard = this.hazards[i];
      if (!hazard || hazard.kind !== 'voidRing') continue;
      detachAndDispose(hazard.root);
      this.hazards.splice(i, 1);
    }
  }

  tryDamagePlayerAt(x, z, radius, damage) {
    const playerMesh = this.game.store.playerMesh;
    if (!playerMesh) return;

    PLAYER_XZ.set(playerMesh.position.x, playerMesh.position.z);
    TEMP_XZ.set(x, z);
    if (PLAYER_XZ.distanceTo(TEMP_XZ) <= radius) this.game.playerSystem.applyDamage(damage, { sourcePosition: { x, y: playerMesh.position.y, z } });
  }
}

Object.assign(
  StageGimmickSystem.prototype,
  icefallGimmickMethods,
  mirrorSweepGimmickMethods,
  astralBloomGimmickMethods,
  voidJudgementGimmickMethods,
);

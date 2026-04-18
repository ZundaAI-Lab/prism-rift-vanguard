import * as Shared from '../MissionSystemShared.js';

const {
  PLAYER_BASE,
  CAMPAIGN_START_MISSION_INDEX,
  MISSIONS,
  getMissionLabel,
  getMissionName,
  translate,
  CLEAR_SEQUENCE_TRANSITION_LEAD,
  TUTORIAL_STEP_COUNT,
} = Shared;

export function installMissionLifecycle(MissionSystem) {
  MissionSystem.prototype.setNotice = function setNotice(text, seconds = 1.2, options = {}) {
    this.game.bus?.emit('ui:notice', { text, seconds, options });
  }

  MissionSystem.prototype.clearNotice = function clearNotice() {
    this.game.bus?.emit('ui:notice:clear');
  }

  MissionSystem.prototype.armIntervalTransition = function armIntervalTransition(duration = 1.45) {
    this.game.bus?.emit('ui:interval-transition:arm', { duration });
  }

  MissionSystem.prototype.cancelIntervalTransition = function cancelIntervalTransition() {
    this.game.bus?.emit('ui:interval-transition:cancel');
  }

  MissionSystem.prototype.resetFinalClearCinematicState = function resetFinalClearCinematicState() {
    const cinematic = this.game.state.progression.finalClearCinematic;
    cinematic.active = false;
    cinematic.started = false;
    cinematic.timer = 0;
    cinematic.duration = 0;
    cinematic.cameraBlendDuration = 0;
    cinematic.flightDelay = 0;
    cinematic.straightDuration = 0;
    cinematic.curveDuration = 0;
    cinematic.shipYaw = 0;
    cinematic.cameraPosition.x = 0;
    cinematic.cameraPosition.y = 0;
    cinematic.cameraPosition.z = 0;
    cinematic.lookTarget.x = 0;
    cinematic.lookTarget.y = 0;
    cinematic.lookTarget.z = 0;
    cinematic.shipStart.x = 0;
    cinematic.shipStart.y = 0;
    cinematic.shipStart.z = 0;
    cinematic.shipMid.x = 0;
    cinematic.shipMid.y = 0;
    cinematic.shipMid.z = 0;
    cinematic.shipCurveControl.x = 0;
    cinematic.shipCurveControl.y = 0;
    cinematic.shipCurveControl.z = 0;
    cinematic.shipEnd.x = 0;
    cinematic.shipEnd.y = 0;
    cinematic.shipEnd.z = 0;
    cinematic.sparkleEmitTimer = 0;

    const mesh = this.game.store?.playerMesh;
    if (mesh) {
      mesh.scale.setScalar(1);
      const hoverRing = mesh.userData?.hoverRing;
      if (hoverRing?.material) {
        hoverRing.material.opacity = mesh.userData?.hoverRingBaseOpacity ?? 0.42;
      }
    }
  }

  MissionSystem.prototype.resetCampaign = function resetCampaign() {
    this.game.debug?.finalizeMissionPerformance?.(this.game, 'reset', { reason: 'resetCampaign' });
    this.cancelIntervalTransition();
    this.game.state.score = 0;
    this.game.state.crystals = 0;
    this.game.state.missionIndex = 0;
    this.game.state.elapsed = 0;
    this.clearNotice();
    this.game.state.progression.lastMissionSummary = null;
    this.game.state.progression.medalCollection = {};
    this.game.state.progression.clearResultForcedVisibleCount = 0;
    this.game.state.progression.clearIntelUnlockPending = false;
    this.game.state.progression.clearSequenceTimer = 0;
    this.game.state.progression.clearSequenceDuration = 0;
    this.game.state.progression.clearAnnouncementDelay = 1;
    this.game.state.progression.clearResultDelay = 3;
    this.game.state.progression.clearAnnouncementPlayed = false;
    this.game.state.progression.clearResultReached = false;
    this.game.state.progression.clearBgmTrackId = null;
    this.game.state.progression.clearBgmCueDelay = 0;
    this.game.state.progression.clearBgmPlayed = false;
    this.game.state.progression.suppressMissionClearSfx = false;
    this.game.state.progression.bossPreAlertPending = false;
    this.game.state.progression.bossAlertCueTimer = 0;
    this.game.state.progression.bossAlertCueDuration = 0;
    this.game.state.progression.missionTimer = 0;
    this.game.state.progression.missionTimerActive = false;
    this.game.state.progression.missionTargetTime = 0;
    this.game.state.progression.campaignClearTime = 0;
    this.resetFinalClearCinematicState();
    this.game.state.progression.missionTimeBonus = 0;
    this.game.state.progression.missionNoDownBonus = 0;
    this.game.state.progression.noDownBlockedMissions = {};
    this.game.state.progression.missionNoDownEligible = true;
    this.game.state.progression.missionFinalCrystalBonus = 0;
    this.game.state.progression.missionFailCrystalAward = 0;
    this.game.state.progression.missionFailCrystalBanked = 0;
    this.game.state.progression.intervalMissionIndex = 0;
    this.game.state.progression.intervalContext = 'advance';
    this.game.state.progression.pausedStatus = 'idle';
    this.game.enemies.clearEncounterRuntimeState();
    this.game.missionAchievements?.resetCampaign?.();
    this.game.upgrades.reset();
    this.game.state.player.maxHealth = PLAYER_BASE.maxHealth;
    this.game.state.player.health = PLAYER_BASE.maxHealth;
    if (this.game.debug.isInvincible()) {
      this.game.upgrades.applyDebugInvinciblePreset();
    }
    this.game.store.clearCombatEntities();
    this.game.enemies.clearEncounterRuntimeState();
    this.game.stageGimmicks.clear();
    this.game.enemies.reset();
  }

  MissionSystem.prototype.startNewRun = function startNewRun(startMissionIndex = CAMPAIGN_START_MISSION_INDEX) {
    this.resetCampaign();
    const clampedIndex = Math.max(0, Math.min(MISSIONS.length - 1, Number(startMissionIndex) || 0));
    this.beginMission(clampedIndex);
  }

  MissionSystem.prototype.beginMission = function beginMission(index) {
    const mission = MISSIONS[index];
    const { state } = this.game;
    state.mode = 'playing';
    state.missionIndex = index;
    state.missionIntroTimer = mission.bossOnly ? 6.6 : 2.0;
    state.progression.wave = 0;
    state.progression.waveTarget = 0;
    state.progression.waveBaseTarget = 0;
    state.progression.waveSpawned = 0;
    state.progression.waveAliveAtStart = 0;
    state.progression.spawnTimer = 0;
    state.progression.waveBurstPlan = [];
    state.progression.waveBurstIndex = 0;
    state.progression.interWaveTimer = 1.4;
    state.progression.bossPreAlertPending = false;
    state.progression.bossAlertCueTimer = 0;
    state.progression.bossAlertCueDuration = 0;
    state.progression.clearSequenceTimer = 0;
    state.progression.clearSequenceDuration = 0;
    state.progression.clearResultForcedVisibleCount = 0;
    state.progression.clearIntelUnlockPending = false;
    state.progression.clearAnnouncementDelay = 1;
    state.progression.clearResultDelay = 3;
    state.progression.clearAnnouncementPlayed = false;
    state.progression.clearResultReached = false;
    state.progression.clearBgmTrackId = null;
    state.progression.clearBgmCueDelay = 0;
    state.progression.clearBgmPlayed = false;
    state.progression.suppressMissionClearSfx = false;
    state.progression.missionTimer = 0;
    state.progression.missionTimerActive = !mission.finalMission;
    state.progression.missionTargetTime = this.getMissionTargetTime(mission, index);
    if (!Number.isFinite(state.progression.campaignClearTime)) state.progression.campaignClearTime = 0;
    this.resetFinalClearCinematicState();
    state.progression.missionTimeBonus = 0;
    state.progression.missionNoDownBonus = 0;
    state.progression.missionNoDownEligible = !(state.progression.noDownBlockedMissions?.[mission.id] ?? false);
    state.progression.missionFinalCrystalBonus = 0;
    state.progression.missionFailCrystalAward = 0;
    state.progression.missionFailCrystalBanked = 0;
    state.progression.missionStatus = mission.bossOnly ? 'bossIntro' : 'intro';
    state.progression.intervalMissionIndex = index;
    state.progression.intervalContext = 'advance';
    state.progression.pausedStatus = 'idle';
    state.progression.bossActive = mission.bossOnly;
    state.progression.bossDefeated = false;
    this.game.enemies.clearEncounterRuntimeState();
    this.resetTutorialState();
    this.game.missionAchievements?.beginMission?.(mission);
    state.progression.missionCheckpoint = {
      missionIndex: index,
      score: state.score,
      crystals: state.crystals,
    };
    state.player.health = state.player.maxHealth;

    this.game.audio?.setPlayerSfxSuppressed(false);
    this.game.store.clearCombatEntities();
    this.game.enemies.clearEncounterRuntimeState();
    this.game.world.applyMission(mission);
    this.game.stageGimmicks.applyMission(mission);
    this.game.playerSystem.resetForMission(mission.bossOnly ? { x: 0, z: 82 } : { x: 0, z: 0 });
    this.game.debug?.beginMissionPerformance?.(this.game, mission, index);
    this.setNotice(getMissionLabel(this.game, mission), mission.bossOnly ? 2.6 : 1.9);

    if (mission.isTutorial) {
      state.missionIntroTimer = 0.6;
      state.progression.missionStatus = 'tutorial';
      state.progression.wave = 1;
      state.progression.waveTarget = TUTORIAL_STEP_COUNT;
      this.enterTutorialStep(0);
      return;
    }

    if (mission.bossOnly) {
      this.spawnBoss({ x: 0, z: 0 });
    }
  }

  MissionSystem.prototype.update = function update(dt) {
    const { state } = this.game;
    if (state.mode !== 'playing') return;

    if (state.progression.missionTimerActive) {
      state.progression.missionTimer += dt;
    }
    state.progression.bossAlertCueTimer = Math.max(0, (state.progression.bossAlertCueTimer || 0) - dt);
    state.missionIntroTimer = Math.max(0, state.missionIntroTimer - dt);

    if (state.progression.missionStatus === 'clearSequence') {
      state.progression.clearSequenceTimer = Math.max(0, state.progression.clearSequenceTimer - dt);
      const clearSequenceDuration = Math.max(state.progression.clearSequenceDuration || 0, 0);
      const clearElapsed = Math.max(0, clearSequenceDuration - state.progression.clearSequenceTimer);
      if (!state.progression.clearAnnouncementPlayed && clearElapsed >= (state.progression.clearAnnouncementDelay || 0)) {
        state.progression.clearAnnouncementPlayed = true;
        this.setNotice(translate(this.game, 'notices.missionClear', { mission: getMissionName(this.game, this.currentMission) }), 6);
        if (!state.progression.suppressMissionClearSfx) {
          this.game.audio?.playSfx('missionClear', { cooldownMs: 600 });
        }
      }
      if (!state.progression.clearResultReached && clearElapsed >= (state.progression.clearResultDelay || 0)) {
        state.progression.clearResultReached = true;
      }
      if (!state.progression.clearBgmPlayed && state.progression.clearBgmTrackId && clearElapsed >= (state.progression.clearBgmCueDelay || 0)) {
        state.progression.clearBgmPlayed = true;
        this.game.audio?.playBgm?.(state.progression.clearBgmTrackId, { restart: true, loop: false });
      }
      this.tryStartFinalClearCinematic(clearElapsed);
      if (state.progression.clearSequenceTimer > CLEAR_SEQUENCE_TRANSITION_LEAD) {
        this.tryResolveLateCrystalComplete();
      }
      if (state.progression.clearSequenceTimer <= 0) this.finalizeMissionClear();
      return;
    }

    if (state.progression.missionStatus === 'bossIntro') {
      const boss = this.game.store.enemies.find((enemy) => enemy.def.isBoss);
      if (boss?.introDone) {
        state.progression.missionStatus = 'boss';
        if (this.currentMission?.finalMission) state.progression.missionTimerActive = true;
      }
      return;
    }

    if (this.currentMission?.isTutorial) {
      this.updateTutorial(dt);
      return;
    }

    if (state.progression.missionStatus === 'intro' && state.missionIntroTimer <= 0) {
      if (this.shouldStartDebugBossMode()) this.startDebugBossMode();
      else this.startWave(1);
    }

    if (state.progression.missionStatus === 'spawning') {
      state.progression.spawnTimer -= dt;
      this.processWaveBurstSpawns();
      if (state.progression.waveSpawned < state.progression.waveTarget && state.progression.spawnTimer <= 0) {
        this.spawnWaveEnemy();
        state.progression.spawnTimer = 0.42;
        this.processWaveBurstSpawns();
      }
      if (state.progression.waveSpawned >= state.progression.waveTarget && this.game.store.enemies.length === 0) this.finishWave();
    }

    if (state.progression.missionStatus === 'betweenWaves') {
      state.progression.interWaveTimer -= dt;
      if (state.progression.interWaveTimer <= 0) this.startWave(state.progression.wave + 1);
    }

    if (state.progression.missionStatus === 'awaitingBoss') {
      state.progression.interWaveTimer -= dt;
      if (state.progression.interWaveTimer <= 0 && this.game.store.enemies.length === 0) {
        if (state.progression.bossPreAlertPending) {
          state.progression.bossPreAlertPending = false;
          state.progression.interWaveTimer = 0.5;
          this.triggerBossAlertCue();
        } else {
          this.spawnBoss();
        }
      }
    }
  }

  MissionSystem.prototype.startNextMission = function startNextMission() {
    const progression = this.game.state.progression;
    const nextIndex = Number.isFinite(progression.intervalMissionIndex)
      ? progression.intervalMissionIndex
      : (this.game.state.missionIndex + 1);
    this.cancelIntervalTransition();
    if (nextIndex >= MISSIONS.length) {
      this.game.state.mode = 'clear';
      this.game.input.releasePointerLock();
      return;
    }
    this.beginMission(nextIndex);
  }

  MissionSystem.prototype.returnToMissionHangar = function returnToMissionHangar() {
    this.game.debug?.finalizeMissionPerformance?.(this.game, 'hangar', { reason: 'returnToMissionHangar' });
    const checkpoint = this.game.state.progression.missionCheckpoint ?? {
      missionIndex: this.game.state.missionIndex,
      score: this.game.state.score,
      crystals: this.game.state.crystals,
    };
    const mission = MISSIONS[checkpoint.missionIndex] ?? this.currentMission;
    this.cancelIntervalTransition();
    this.game.state.score = checkpoint.score;
    this.game.state.crystals = checkpoint.crystals;
    this.game.state.progression.missionTimer = 0;
    this.game.state.progression.missionTimerActive = false;
    this.game.state.progression.missionTimeBonus = 0;
    this.game.state.progression.missionNoDownBonus = 0;
    this.game.state.progression.missionFinalCrystalBonus = 0;
    this.game.state.progression.clearIntelUnlockPending = false;
    this.game.state.progression.intervalMissionIndex = checkpoint.missionIndex;
    this.game.state.progression.intervalContext = 'retry';
    this.game.state.progression.missionStatus = 'idle';
    this.game.store.clearCombatEntities();
    this.game.enemies.clearEncounterRuntimeState();
    this.game.world.applyMission(mission);
    this.game.stageGimmicks.clear();
    this.game.playerSystem.resetForMission(mission?.bossOnly ? { x: 0, z: 82 } : { x: 0, z: 0 });
    this.game.state.mode = 'interval';
  }

  MissionSystem.prototype.failRun = function failRun() {
    const { state } = this.game;
    if (state.mode === 'gameoverSequence' || state.mode === 'gameover') return;

    this.cancelIntervalTransition();
    const missionId = this.currentMission?.id;
    if (missionId) state.progression.noDownBlockedMissions[missionId] = true;
    state.progression.missionNoDownEligible = false;
    state.progression.missionNoDownBonus = 0;
    state.progression.missionTimerActive = false;
    this.applyMissionFailCrystalRecovery();
    this.game.stageGimmicks.clear();
    this.setNotice(translate(this.game, 'notices.systemDown'), 1.3);
    this.game.audio?.playSfx('systemDown', { cooldownMs: 600 });
    this.beginGameOverSequence();
    this.game.input.releasePointerLock();
  }



  MissionSystem.prototype.shouldStartDebugBossMode = function shouldStartDebugBossMode() {
    const mission = this.currentMission;
    if (!this.game.debug?.isBossMode?.()) return false;
    if (!mission || mission.isTutorial || mission.bossOnly) return false;
    return !!mission.boss;
  }

  MissionSystem.prototype.startDebugBossMode = function startDebugBossMode() {
    const mission = this.currentMission;
    const { state } = this.game;
    if (!mission || mission.isTutorial || mission.bossOnly || !mission.boss) {
      this.startWave(1);
      return false;
    }

    state.progression.wave = Math.max(0, mission.waves || 0);
    state.progression.waveTarget = 0;
    state.progression.waveBaseTarget = 0;
    state.progression.waveSpawned = 0;
    state.progression.waveAliveAtStart = 0;
    state.progression.spawnTimer = 0;
    state.progression.waveBurstPlan = [];
    state.progression.waveBurstIndex = 0;
    state.progression.missionStatus = 'awaitingBoss';
    state.progression.interWaveTimer = 0.75;
    state.progression.bossPreAlertPending = true;

    this.game.projectiles.clearEnemyProjectilesForWaveEnd();
    this.game.audio?.fadeOutBgm();
    return true;
  }

}

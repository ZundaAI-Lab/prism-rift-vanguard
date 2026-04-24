import * as Shared from '../MissionSystemShared.js';

const {
  CAMPAIGN_START_MISSION_INDEX,
  MISSIONS,
  getMissionName,
  translate,
  CLEAR_SEQUENCE_TRANSITION_LEAD,
  TUTORIAL_CLEAR_CRYSTALS,
  SERAPH_WRAITH_CLEAR_SPECIAL_DURATION,
  SERAPH_WRAITH_CLEAR_SKY_REVEAL_DELAY,
  SERAPH_WRAITH_CLEAR_SKY_REVEAL_DURATION,
  SERAPH_WRAITH_CLEAR_ANNOUNCEMENT_DELAY,
  SERAPH_WRAITH_CLEAR_RESULT_DELAY,
  SERAPH_WRAITH_CLEAR_FLYAWAY_START,
  SERAPH_WRAITH_CLEAR_FLYAWAY_DURATION,
  SERAPH_WRAITH_CLEAR_CAMERA_BLEND_DURATION,
  SERAPH_WRAITH_CLEAR_FLIGHT_DELAY,
  SERAPH_WRAITH_CLEAR_STRAIGHT_DURATION,
  SERAPH_WRAITH_CLEAR_CURVE_DURATION,
  SERAPH_WRAITH_CLEAR_PATH_DEPTH,
  SERAPH_WRAITH_CLEAR_PATH_SCREEN_RISE,
} = Shared;

const MISSION_TARGET_TIMES = Object.freeze({
  tutorial: 30,
  desert: 120,
  swamp: 140,
  forge: 150,
  frost: 180,
  mirror: 200,
  astral: 220,
  voidcrown: 120,
});

export function installMissionClearFlow(MissionSystem) {
  MissionSystem.prototype.getClearResultVisibleLineCount = function getClearResultVisibleLineCount(totalLines) {
    const { state } = this.game;
    const progression = state.progression;
    if (totalLines <= 0) return 0;
    if (state.mode !== 'playing') return 0;
    if (progression.missionStatus !== 'clearSequence') return 0;
    if ((state.ui?.notice?.timer || 0) <= 0) return 0;

    const clearSequenceDuration = Math.max(progression.clearSequenceDuration || 0, 0);
    const clearElapsed = Math.max(0, clearSequenceDuration - progression.clearSequenceTimer);
    const revealStart = progression.clearResultDelay || 0;
    const revealElapsed = clearElapsed - revealStart;
    if (revealElapsed < 0) return 0;

    const lineRevealInterval = 0.28;
    const baseVisibleCount = Math.max(0, Math.min(totalLines, 1 + Math.floor(revealElapsed / lineRevealInterval)));
    const forcedVisibleCount = Math.max(0, Number(progression.clearResultForcedVisibleCount) || 0);
    return Math.max(baseVisibleCount, Math.min(totalLines, forcedVisibleCount));
  }

  MissionSystem.prototype.tryResolveLateCrystalComplete = function tryResolveLateCrystalComplete() {
    const { state } = this.game;
    const progression = state.progression;
    if (state.mode !== 'playing') return false;
    if (progression.missionStatus !== 'clearSequence') return false;
    if ((progression.clearSequenceTimer || 0) <= CLEAR_SEQUENCE_TRANSITION_LEAD) return false;

    const summary = progression.lastMissionSummary;
    if (!summary) return false;

    const existingEntries = Array.isArray(summary.resultEntries) ? summary.resultEntries : [];
    const visibleLineCountBeforeAppend = this.getClearResultVisibleLineCount(existingEntries.length + 1);
    const visibleResultEntryCountBeforeAppend = Math.min(existingEntries.length, visibleLineCountBeforeAppend);
    const allCurrentResultEntriesVisible = visibleResultEntryCountBeforeAppend >= existingEntries.length;

    const entry = this.game.missionAchievements?.tryAppendLateCrystalComplete?.(summary);
    if (!entry) return false;

    state.score += entry.score;
    summary.score = state.score;
    if (entry.isMedal && entry.medalId) {
      const medalCollection = progression.medalCollection ?? {};
      medalCollection[entry.medalId] = Math.max(0, Math.floor(medalCollection[entry.medalId] || 0)) + 1;
      progression.medalCollection = medalCollection;
      summary.medalCollectionSnapshot = { ...medalCollection };
    }
    if (allCurrentResultEntriesVisible) {
      progression.clearResultForcedVisibleCount = Math.max(
        progression.clearResultForcedVisibleCount || 0,
        visibleLineCountBeforeAppend + 1,
      );
    }
    return true;
  }

  MissionSystem.prototype.getMissionTargetTime = function getMissionTargetTime(mission, index = this.game.state.missionIndex) {
    if (!mission) return 0;
    const missionId = typeof mission.id === 'string' && mission.id ? mission.id : MISSIONS[index]?.id;
    return MISSION_TARGET_TIMES[missionId] ?? 0;
  }

  MissionSystem.prototype.tryStartFinalClearCinematic = function tryStartFinalClearCinematic(clearElapsed) {
    const { state } = this.game;
    const progression = state.progression;
    const mission = this.currentMission;
    const cinematic = progression.finalClearCinematic;
    if (!mission?.finalMission) return false;
    if (progression.missionStatus !== 'clearSequence') return false;
    if (!cinematic || cinematic.started) return false;
    if ((state.ui?.notice?.timer || 0) > 0.0001) return false;
    const flyawayStart = progression.clearFlyawayStartDelay ?? SERAPH_WRAITH_CLEAR_FLYAWAY_START;
    if (clearElapsed < flyawayStart) return false;

    const mesh = this.game.store.playerMesh;
    const camera = this.game.renderer?.camera;
    if (!mesh || !camera) return false;

    const throneY = this.game.world.getHeight(0, 0) + 4.6;
    const lookX = 0;
    const lookY = throneY;
    const lookZ = 0;
    const cameraToTargetX = lookX - camera.position.x;
    const cameraToTargetY = lookY - camera.position.y;
    const cameraToTargetZ = lookZ - camera.position.z;
    const cameraToTargetLength = Math.hypot(cameraToTargetX, cameraToTargetY, cameraToTargetZ) || 1;
    const cameraForwardX = cameraToTargetX / cameraToTargetLength;
    const cameraForwardY = cameraToTargetY / cameraToTargetLength;
    const cameraForwardZ = cameraToTargetZ / cameraToTargetLength;
    const horizontalForwardLength = Math.hypot(cameraForwardX, cameraForwardZ) || 1;
    const screenBackForwardX = cameraForwardX / horizontalForwardLength;
    const screenBackForwardZ = cameraForwardZ / horizontalForwardLength;
    const cameraRightXRaw = cameraForwardZ;
    const cameraRightZRaw = -cameraForwardX;
    const cameraRightLength = Math.hypot(cameraRightXRaw, cameraRightZRaw) || 1;
    const cameraRightX = cameraRightXRaw / cameraRightLength;
    const cameraRightZ = cameraRightZRaw / cameraRightLength;
    const cameraUpX = -cameraForwardY * cameraRightZ;
    const cameraUpY = (cameraForwardZ * cameraRightX) - (cameraForwardX * cameraRightZ);
    const cameraUpZ = cameraForwardY * cameraRightX;
    const shipStartX = mesh.position.x;
    const shipStartY = mesh.position.y;
    const shipStartZ = mesh.position.z;
    const shipRiseHeight = Math.max(10, SERAPH_WRAITH_CLEAR_PATH_SCREEN_RISE * 1.2, (lookY - shipStartY) + 5);
    const shipCruiseRise = Math.max(10, SERAPH_WRAITH_CLEAR_PATH_SCREEN_RISE * 1.35);
    const shipMidX = shipStartX;
    const shipMidY = shipStartY + shipRiseHeight;
    const shipMidZ = shipStartZ;
    const shipEndX = shipMidX + (screenBackForwardX * SERAPH_WRAITH_CLEAR_PATH_DEPTH) + (cameraUpX * 2.2);
    const shipEndY = shipMidY + shipCruiseRise;
    const shipEndZ = shipMidZ + (screenBackForwardZ * SERAPH_WRAITH_CLEAR_PATH_DEPTH) + (cameraUpZ * 2.2);
    const shipCurveControlX = shipMidX + (screenBackForwardX * SERAPH_WRAITH_CLEAR_PATH_DEPTH * 0.58);
    const shipCurveControlY = shipMidY + (shipCruiseRise * 0.72);
    const shipCurveControlZ = shipMidZ + (screenBackForwardZ * SERAPH_WRAITH_CLEAR_PATH_DEPTH * 0.58);
    const shipYaw = Math.atan2(-screenBackForwardX, -screenBackForwardZ);

    cinematic.active = true;
    cinematic.started = true;
    cinematic.timer = 0;
    cinematic.duration = SERAPH_WRAITH_CLEAR_FLYAWAY_DURATION;
    cinematic.cameraBlendDuration = SERAPH_WRAITH_CLEAR_CAMERA_BLEND_DURATION;
    cinematic.flightDelay = SERAPH_WRAITH_CLEAR_FLIGHT_DELAY;
    cinematic.straightDuration = SERAPH_WRAITH_CLEAR_STRAIGHT_DURATION;
    cinematic.curveDuration = SERAPH_WRAITH_CLEAR_CURVE_DURATION;
    cinematic.shipYaw = shipYaw;
    cinematic.cameraPosition.x = camera.position.x;
    cinematic.cameraPosition.y = camera.position.y;
    cinematic.cameraPosition.z = camera.position.z;
    cinematic.lookTarget.x = lookX;
    cinematic.lookTarget.y = lookY;
    cinematic.lookTarget.z = lookZ;
    cinematic.shipStart.x = shipStartX;
    cinematic.shipStart.y = shipStartY;
    cinematic.shipStart.z = shipStartZ;
    cinematic.shipMid.x = shipMidX;
    cinematic.shipMid.y = shipMidY;
    cinematic.shipMid.z = shipMidZ;
    cinematic.shipCurveControl.x = shipCurveControlX;
    cinematic.shipCurveControl.y = shipCurveControlY;
    cinematic.shipCurveControl.z = shipCurveControlZ;
    cinematic.shipEnd.x = shipEndX;
    cinematic.shipEnd.y = shipEndY;
    cinematic.shipEnd.z = shipEndZ;
    this.clearNotice();
    return true;
  }

  MissionSystem.prototype.handleMissionClear = function handleMissionClear(defeatedBoss = null) {
    const mission = this.currentMission;
    const progression = this.game.state.progression;
    const isSeraphWraithDefeat = !!defeatedBoss && (
      defeatedBoss.typeKey === 'voidFighter'
      || defeatedBoss.def?.behavior === 'boss_final_fighter'
      || defeatedBoss.finalBoss?.form === 'fighter'
    );
    const useSeraphWraithClearSpecial = !!mission?.finalMission && isSeraphWraithDefeat;
    progression.missionTimerActive = false;
    this.game.debug?.finalizeMissionPerformance?.(this.game, 'clear', { reason: mission?.id ?? 'missionClear' });

    if (mission?.isTutorial) {
      progression.missionTimeBonus = 0;
      progression.missionNoDownBonus = 0;
      progression.missionFinalCrystalBonus = TUTORIAL_CLEAR_CRYSTALS;
      this.game.state.crystals += TUTORIAL_CLEAR_CRYSTALS;
      progression.lastMissionSummary = {
        missionId: mission.id,
        missionName: getMissionName(this.game, mission),
        missionScore: 0,
        score: this.game.state.score,
        crystals: this.game.state.crystals,
        clearTime: progression.missionTimer,
        targetTime: progression.missionTargetTime || this.getMissionTargetTime(mission),
        timeBonus: 0,
        noDownBonus: 0,
        noDownAchieved: progression.missionNoDownEligible,
        crystalBonus: TUTORIAL_CLEAR_CRYSTALS,
        resultEntries: [
          { key: 'tutorialComplete', label: translate(this.game, 'resultEntries.tutorialComplete.label'), score: 0 },
          { key: 'tutorialReady', label: translate(this.game, 'resultEntries.tutorialReady.label'), score: 0 },
        ],
        achievedKeys: [],
        awardedMedalKeys: [],
        achievementStats: null,
        medalCollectionSnapshot: { ...progression.medalCollection },
      };
      progression.clearResultForcedVisibleCount = 2;
      progression.missionStatus = 'clearSequence';
      progression.clearSequenceDuration = 5.4;
      progression.clearSequenceTimer = 5.4;
      progression.clearAnnouncementDelay = 0.75;
      progression.clearResultDelay = 1.6;
      progression.clearAnnouncementPlayed = false;
      progression.clearResultReached = false;
      progression.clearBgmTrackId = null;
      progression.clearBgmCueDelay = 0;
      progression.clearBgmPlayed = false;
      progression.clearFlyawayStartDelay = SERAPH_WRAITH_CLEAR_FLYAWAY_START;
      progression.suppressMissionClearSfx = false;
      this.game.audio?.fadeOutBgm();
      this.game.audio?.setPlayerSfxSuppressed(true);
      this.game.stageGimmicks.onMissionClear();
      this.game.projectiles.clearEnemyProjectiles();
      return;
    }

    const clearTime = progression.missionTimer;
    const targetTime = progression.missionTargetTime || this.getMissionTargetTime(mission);
    const missionStartScore = Math.max(0, Math.floor(progression.missionCheckpoint?.score || 0));
    const bonus = this.game.missionAchievements.buildMissionSummary({
      mission,
      clearTime,
      targetTime,
      noDownEligible: progression.missionNoDownEligible,
      crystals: this.game.state.crystals,
    });
    progression.missionTimeBonus = bonus.timeBonus;
    progression.missionNoDownBonus = bonus.noDownBonus;
    progression.missionFinalCrystalBonus = bonus.crystalBonus;
    const medalCollection = progression.medalCollection ?? {};
    for (const medalKey of bonus.awardedMedalKeys ?? []) {
      if (!medalKey) continue;
      medalCollection[medalKey] = Math.max(0, Math.floor(medalCollection[medalKey] || 0)) + 1;
    }
    progression.medalCollection = medalCollection;
    this.game.state.score += bonus.totalBonus;
    progression.campaignClearTime = Math.max(0, Number(progression.campaignClearTime) || 0) + bonus.clearTime;
    const missionScore = Math.max(0, this.game.state.score - missionStartScore);
    this.game.enemies.clearEncounterRuntimeState();
    const hasNextMission = this.game.state.missionIndex < MISSIONS.length - 1;
    this.game.state.progression.lastMissionSummary = {
      missionId: mission.id,
      missionName: getMissionName(this.game, mission),
      missionScore,
      score: this.game.state.score,
      crystals: this.game.state.crystals,
      clearTime: bonus.clearTime,
      targetTime: bonus.targetTime,
      timeBonus: bonus.timeBonus,
      noDownBonus: bonus.noDownBonus,
      noDownAchieved: bonus.noDownAchieved,
      crystalBonus: bonus.crystalBonus,
      resultEntries: bonus.resultEntries,
      achievedKeys: bonus.achievedKeys,
      awardedMedalKeys: bonus.awardedMedalKeys,
      achievementStats: bonus.stats,
      medalCollectionSnapshot: { ...progression.medalCollection },
    };
    this.game.state.progression.clearResultForcedVisibleCount = 0;
    this.game.state.progression.missionStatus = 'clearSequence';
    this.resetFinalClearCinematicState();
    const seraphWraithSkyRevealDelay = SERAPH_WRAITH_CLEAR_SKY_REVEAL_DELAY + 1.0;
    const seraphWraithAnnouncementDelay = SERAPH_WRAITH_CLEAR_ANNOUNCEMENT_DELAY + 1.0;
    const seraphWraithResultDelay = SERAPH_WRAITH_CLEAR_RESULT_DELAY + 1.0;
    const seraphWraithFlyawayStartDelay = SERAPH_WRAITH_CLEAR_FLYAWAY_START + 1.0;
    const seraphWraithPostFlyawayClearDelay = 2.0;
    const seraphWraithFinalClearSequenceDuration = seraphWraithFlyawayStartDelay
      + SERAPH_WRAITH_CLEAR_FLYAWAY_DURATION
      + seraphWraithPostFlyawayClearDelay;
    this.game.state.progression.clearSequenceDuration = useSeraphWraithClearSpecial
      ? seraphWraithFinalClearSequenceDuration
      : 8.0;
    this.game.state.progression.clearSequenceTimer = useSeraphWraithClearSpecial
      ? seraphWraithFinalClearSequenceDuration
      : 8.0;
    this.game.state.progression.clearAnnouncementDelay = useSeraphWraithClearSpecial ? seraphWraithAnnouncementDelay : 1.0;
    this.game.state.progression.clearResultDelay = useSeraphWraithClearSpecial ? seraphWraithResultDelay : 3.0;
    this.game.state.progression.clearAnnouncementPlayed = false;
    this.game.state.progression.clearResultReached = false;
    this.game.state.progression.clearBgmTrackId = useSeraphWraithClearSpecial ? 'clear' : null;
    this.game.state.progression.clearBgmCueDelay = useSeraphWraithClearSpecial
      ? seraphWraithSkyRevealDelay
      : 0;
    this.game.state.progression.clearBgmPlayed = false;
    this.game.state.progression.clearFlyawayStartDelay = useSeraphWraithClearSpecial
      ? seraphWraithFlyawayStartDelay
      : SERAPH_WRAITH_CLEAR_FLYAWAY_START;
    this.game.state.progression.suppressMissionClearSfx = useSeraphWraithClearSpecial;
    if (useSeraphWraithClearSpecial) {
      this.clearNotice();
      this.game.audio?.fadeOutBgm({ durationMs: SERAPH_WRAITH_CLEAR_SPECIAL_DURATION * 1000 });
      this.game.world?.startFinalBossDefeatSkyReveal?.({
        delay: seraphWraithSkyRevealDelay,
        duration: SERAPH_WRAITH_CLEAR_SKY_REVEAL_DURATION,
      });
    } else {
      this.game.audio?.fadeOutBgm();
    }
    this.game.audio?.setPlayerSfxSuppressed(true);
    if (hasNextMission) this.armIntervalTransition(CLEAR_SEQUENCE_TRANSITION_LEAD);
    this.game.stageGimmicks.onMissionClear();
    this.game.projectiles.clearEnemyProjectiles();
  }

  MissionSystem.prototype.persistMissionClearRecords = function persistMissionClearRecords() {
    const mission = this.currentMission;
    const progression = this.game.state.progression;
    const summary = progression.lastMissionSummary;
    progression.clearIntelUnlockPending = false;
    if (!mission || mission.isTutorial || !summary) return;

    // 重要:
    // クリスタルコンプリートはミッションクリア確定直後に保存してはいけない。
    // クリア演出中にも残留クリスタルの吸引・回収猶予があり、
    // tryResolveLateCrystalComplete() があとから勲章を追加確定することがある。
    // そのため永続記録への保存は finalizeMissionClear() 到達後だけで行うこと。
    // buildMissionSummary() 直後や handleMissionClear() 内で保存すると再発する。
    const isFinalMission = this.game.state.missionIndex >= MISSIONS.length - 1;
    const hadEnemyIntelUnlocked = isFinalMission && !!this.game.records?.hasFinalClearRecord?.();

    this.game.records?.updateMissionRecord?.({
      missionId: mission.id,
      label: mission.label || mission.name,
      score: summary.missionScore,
      clearTime: summary.clearTime,
      medalKeys: summary.awardedMedalKeys,
    });

    progression.clearIntelUnlockPending = isFinalMission
      && !hadEnemyIntelUnlocked
      && !!this.game.records?.hasFinalClearRecord?.();

    if (!isFinalMission) return;

    const campaignMedalCounts = Object.fromEntries(
      Object.entries(progression.medalCollection ?? {})
        .map(([medalKey, count]) => [medalKey, Math.max(0, Math.floor(Number(count) || 0))])
        .filter(([, count]) => count > 0),
    );
    this.game.records?.updateFinalResult?.({
      score: summary.score,
      clearTime: progression.campaignClearTime,
      medalCounts: campaignMedalCounts,
    });
  }

  MissionSystem.prototype.finalizeMissionClear = function finalizeMissionClear() {
    const mission = this.currentMission;
    // 重要: clear / interval へ出る前に mission BGM を停止し、その後で owner を外す。
    // 先に解放すると現在再生中の object URL revoke が error 扱いになりうる。
    this.game.audio?.stopAndReleaseActiveMissionAudioSet?.();
    if (mission?.isTutorial) {
      const nextMission = MISSIONS[CAMPAIGN_START_MISSION_INDEX] ?? MISSIONS[0];
      if (nextMission) {
        this.game.store.clearCombatEntities();
        this.game.enemies.clearEncounterRuntimeState();
        this.game.world.applyMission(nextMission);
        this.game.stageGimmicks.clear();
        this.game.playerSystem.resetForMission(nextMission.bossOnly ? { x: 0, z: 82 } : { x: 0, z: 0 });
        this.game.state.progression.intervalMissionIndex = CAMPAIGN_START_MISSION_INDEX;
        this.game.state.progression.intervalContext = 'tutorialComplete';
      }
      this.resetTutorialState();
      this.game.state.mode = 'interval';
      this.setNotice(translate(this.game, 'tutorial.completeNotice', { count: TUTORIAL_CLEAR_CRYSTALS }), 1.8);
      this.game.input.releasePointerLock();
      return;
    }

    this.persistMissionClearRecords();

    if (this.game.state.missionIndex >= MISSIONS.length - 1) {
      this.cancelIntervalTransition();
      this.game.state.mode = 'clear';
      this.game.input.releasePointerLock();
      return;
    }

    const nextMission = MISSIONS[this.game.state.missionIndex + 1];
    if (nextMission) {
      this.game.store.clearCombatEntities();
      this.game.enemies.clearEncounterRuntimeState();
      this.game.world.applyMission(nextMission);
      this.game.stageGimmicks.clear();
      this.game.playerSystem.resetForMission(nextMission.bossOnly ? { x: 0, z: 82 } : { x: 0, z: 0 });
      this.game.state.progression.intervalMissionIndex = this.game.state.missionIndex + 1;
      this.game.state.progression.intervalContext = 'advance';
    }

    this.game.state.mode = 'interval';
    this.setNotice(translate(this.game, 'notices.missionClear', { mission: getMissionName(this.game, mission) }), 1.6);
    this.game.input.releasePointerLock();
  }

}

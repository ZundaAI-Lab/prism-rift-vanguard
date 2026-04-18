import * as Shared from '../MissionSystemShared.js';

const {
  clamp,
  randInt,
  getEnemyName,
  translate,
} = Shared;

export function installMissionWaveFlow(MissionSystem) {
  MissionSystem.prototype.triggerBossAlertCue = function triggerBossAlertCue() {
    const mission = this.currentMission;
    if (mission?.finalMission) return;

    const progression = this.game.state.progression;
    progression.bossAlertCueDuration = 1.6;
    progression.bossAlertCueTimer = progression.bossAlertCueDuration;
    this.game.audio?.playSfx('bossAlert', { cooldownMs: 400 });
  }

  MissionSystem.prototype.startWave = function startWave(waveNumber) {
    const { state } = this.game;
    const mission = this.currentMission;
    const effectiveWaveNumber = waveNumber + Math.max(0, mission.waveDifficultyOffset ?? 0);
    const baseWaveTarget = mission.waveSizeBase + (effectiveWaveNumber - 1) * mission.waveGrowth;
    const waveBurstPlan = this.buildWaveBurstPlan(mission, waveNumber, effectiveWaveNumber, baseWaveTarget);
    const burstEnemyTotal = waveBurstPlan.reduce((sum, burst) => sum + burst.count, 0);
    state.progression.wave = waveNumber;
    state.progression.waveBaseTarget = baseWaveTarget;
    state.progression.waveTarget = baseWaveTarget + burstEnemyTotal;
    state.progression.waveSpawned = 0;
    state.progression.spawnTimer = 0.25;
    state.progression.waveBurstPlan = waveBurstPlan;
    state.progression.waveBurstIndex = 0;
    state.progression.missionStatus = 'spawning';
    this.setNotice(translate(this.game, 'notices.wave', { wave: waveNumber }), 1.15);
    this.game.audio?.playSfx('waveStart', { cooldownMs: 120 });
  }

  MissionSystem.prototype.spawnWaveEnemy = function spawnWaveEnemy(position = null) {
    const state = this.game.state;
    const effectiveWaveNumber = state.progression.wave + Math.max(0, this.currentMission.waveDifficultyOffset ?? 0);
    const enemyType = this.game.enemies.pickWaveEnemy(this.currentMission, effectiveWaveNumber);
    this.game.enemies.spawnEnemy(enemyType, position);
    state.progression.waveSpawned += 1;
  }

  MissionSystem.prototype.buildWaveBurstPlan = function buildWaveBurstPlan(mission, waveNumber, effectiveWaveNumber, baseWaveTarget) {
    const rules = mission.waveBurstRules;
    if (!rules || waveNumber < (rules.startWave ?? Infinity)) return [];

    const occurrenceCount = Math.max(
      0,
      (rules.occurrencesBase ?? 0) + Math.max(0, waveNumber - rules.startWave) * (rules.occurrencesPerWave ?? 0),
    );
    if (occurrenceCount <= 0) return [];

    const triggerWindow = rules.triggerWindow ?? [0.48, 0.66];
    const patterns = Array.isArray(rules.patterns) && rules.patterns.length ? rules.patterns : ['cluster'];
    const countRange = rules.countRange ?? [3, 5];
    const startPatternIndex = Math.floor(Math.random() * patterns.length);
    const plan = [];
    let previousTrigger = 1;

    for (let i = 0; i < occurrenceCount; i += 1) {
      const blend = occurrenceCount === 1 ? 0.5 : i / (occurrenceCount - 1);
      const triggerRatio = triggerWindow[0] + (triggerWindow[1] - triggerWindow[0]) * blend;
      const desiredTrigger = Math.round(baseWaveTarget * triggerRatio);
      const triggerAt = clamp(desiredTrigger, previousTrigger + 1, Math.max(previousTrigger + 1, baseWaveTarget - 1));
      previousTrigger = triggerAt;
      plan.push({
        triggerAt,
        count: randInt(countRange[0], countRange[1]),
        pattern: patterns[(startPatternIndex + i) % patterns.length],
        effectiveWaveNumber,
      });
    }

    return plan;
  }

  MissionSystem.prototype.processWaveBurstSpawns = function processWaveBurstSpawns() {
    const progression = this.game.state.progression;
    const burstPlan = progression.waveBurstPlan ?? [];
    while (progression.waveBurstIndex < burstPlan.length) {
      const burst = burstPlan[progression.waveBurstIndex];
      if (progression.waveSpawned < burst.triggerAt) break;
      const positions = this.game.enemies.buildWaveBurstSpawnPoints(burst.pattern, burst.count);
      for (let i = 0; i < burst.count; i += 1) {
        this.spawnWaveEnemy(positions[i] ?? null);
      }
      progression.waveBurstIndex += 1;
    }
  }

  MissionSystem.prototype.finishWave = function finishWave() {
    const { state } = this.game;
    const mission = this.currentMission;
    if (state.progression.wave >= mission.waves) {
      state.progression.missionStatus = 'awaitingBoss';
      state.progression.interWaveTimer = 1.0;
      state.progression.bossPreAlertPending = true;
      this.setNotice(translate(this.game, 'common.warning'), 2.0);
      this.game.audio?.fadeOutBgm();
      this.game.projectiles.clearEnemyProjectilesForWaveEnd();
      this.game.audio?.playSfx('waveClear', { cooldownMs: 120 });
      return;
    }
    state.progression.missionStatus = 'betweenWaves';
    state.progression.interWaveTimer = 2.2;
    this.setNotice(translate(this.game, 'notices.waveClear', { wave: state.progression.wave }), 1.0);
    this.game.projectiles.clearEnemyProjectilesForWaveEnd();
    this.game.audio?.playSfx('waveClear', { cooldownMs: 120 });
  }

  MissionSystem.prototype.spawnBoss = function spawnBoss(position = null) {
    const mission = this.currentMission;
    const progression = this.game.state.progression;
    const boss = this.game.enemies.spawnEnemy(mission.boss, position ?? { x: 0, z: -58 });
    progression.bossActive = true;
    const alreadyPreAlerted = !mission.bossOnly && !progression.bossPreAlertPending;
    if (!mission.bossOnly) {
      progression.missionStatus = 'boss';
      const bossName = getEnemyName(this.game, mission.boss) || translate(this.game, 'common.boss');
      this.setNotice(bossName, 1.6);
    }
    if (mission.bossOnly || !alreadyPreAlerted) {
      this.triggerBossAlertCue();
    }
    progression.bossPreAlertPending = false;
    return boss;
  }

  MissionSystem.prototype.onEnemyDefeated = function onEnemyDefeated(enemy) {
    if (enemy.def.isBoss) {
      this.game.state.progression.bossActive = false;
      this.game.state.progression.bossDefeated = true;
      this.handleMissionClear(enemy);
    }
  }

}

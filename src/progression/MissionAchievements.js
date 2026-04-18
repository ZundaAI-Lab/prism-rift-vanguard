import { MINIMAP } from '../data/balance.js';

export const RESULT_ENTRY_DEFS = {
  timeBonus: {
    label: 'タイムボーナス',
    kind: 'bonus',
    isMedal: false,
    condition: '目標タイムより早くクリアした',
  },
  noDownBonus: {
    label: 'アンブロークン',
    score: 2000,
    kind: 'bonus',
    isMedal: true,
    condition: '一度もダウンせずにクリアした',
  },
  crystalComplete: {
    label: 'クリスタルコンプリート',
    score: 1000,
    kind: 'achievement',
    isMedal: true,
    condition: 'クリスタルをすべて回収した',
  },
  perfectGuard: {
    label: 'パーフェクトガード',
    score: 5000,
    kind: 'achievement',
    isMedal: true,
    condition: '一度もダメージを受けずにクリアした',
  },
  deadlineSurvive: {
    label: 'デッドラインサバイブ',
    score: 1000,
    kind: 'achievement',
    isMedal: true,
    condition: '残り耐久がわずかな状態でクリアした',
  },
  megaMultiKill: {
    label: 'メガマルチキル',
    score: 1800,
    kind: 'achievement',
    isMedal: true,
    condition: '1発の攻撃で5体以上を同時に倒した',
  },
  blitzSweep: {
    label: 'ブリッツスイープ',
    score: 3000,
    kind: 'achievement',
    isMedal: true,
    condition: '多くの敵を速攻で撃破した',
  },
  pointBlank: {
    label: 'ポイントブランク',
    score: 1500,
    kind: 'achievement',
    isMedal: true,
    condition: '多くの敵を近距離で撃破した',
  },
  longRangeHunter: {
    label: 'ロングレンジハンター',
    score: 1200,
    kind: 'achievement',
    isMedal: true,
    condition: '多くの敵を遠距離で撃破した',
  },
  sharpShooter: {
    label: 'シャープシューター',
    score: 1500,
    kind: 'achievement',
    isMedal: true,
    condition: '高い命中率を維持してクリアした',
  },
  mainOnly: {
    label: 'メインオンリー',
    score: 2000,
    kind: 'achievement',
    isMedal: true,
    condition: 'メインショットだけで戦い切った',
  },
  plasmaOnly: {
    label: 'プラズマオンリー',
    score: 3000,
    kind: 'achievement',
    isMedal: true,
    condition: 'プラズマショットだけで戦い切った',
  },
};

export const MEDAL_ENTRY_ORDER = [
  'noDownBonus',
  'perfectGuard',
  'deadlineSurvive',
  'megaMultiKill',
  'blitzSweep',
  'pointBlank',
  'longRangeHunter',
  'sharpShooter',
  'mainOnly',
  'plasmaOnly',
  'crystalComplete',
];

export function getMedalCatalog() {
  return MEDAL_ENTRY_ORDER.map((key) => ({ key, ...RESULT_ENTRY_DEFS[key] }));
}

/**
 * Responsibility:
 * - Owns mission result bonus definitions, mission-local achievement tracking, and summary assembly.
 *
 * Rules:
 * - Existing clear bonuses and newly added achievement bonuses must be defined here together.
 * - Runtime tracking may aggregate data from other systems, but those systems must only report facts in;
 *   they must not evaluate result conditions on their own.
 * - UI reads the summary this module builds. It must not re-implement achievement conditions.
 */
export class MissionAchievements {
  constructor(game) {
    this.game = game;
    this.resetCampaign();
  }

  createRuntime(mission = null) {
    return {
      missionId: mission?.id ?? null,
      missionIsTutorial: !!mission?.isTutorial,
      missionWaves: Math.max(0, Number(mission?.waves) || 0),
      damageTaken: false,
      totalEnemiesSpawned: 0,
      totalEnemiesDefeated: 0,
      nearKills: 0,
      farKills: 0,
      shotGroupsFired: 0,
      shotGroupHits: new Set(),
      usedMain: false,
      usedPlasma: false,
      nextShotGroupId: 1,
      nextShotId: 1,
      killsByShot: new Map(),
      maxKillsByShot: 0,
      crystalsDropped: 0,
      crystalsCollected: 0,
      enemySpawnTimes: new WeakMap(),
      timelyDefeats: 0,
    };
  }

  resetCampaign() {
    this.runtime = this.createRuntime();
  }

  beginMission(mission) {
    this.runtime = this.createRuntime(mission);
  }

  normalizeWeaponType(weaponType) {
    if (weaponType === 'main' || weaponType === 'primary') return 'main';
    if (weaponType === 'plasma') return 'plasma';
    return null;
  }

  registerWeaponVolley(weaponType) {
    const runtime = this.runtime;
    const normalizedWeaponType = this.normalizeWeaponType(weaponType);
    if (!runtime || !normalizedWeaponType) return null;

    runtime.shotGroupsFired += 1;
    if (normalizedWeaponType === 'main') runtime.usedMain = true;
    if (normalizedWeaponType === 'plasma') runtime.usedPlasma = true;

    const shotGroupId = runtime.nextShotGroupId;
    runtime.nextShotGroupId += 1;
    return shotGroupId;
  }

  createShotMeta(weaponType, shotGroupId = null) {
    const runtime = this.runtime;
    const normalizedWeaponType = this.normalizeWeaponType(weaponType);
    if (!runtime || !normalizedWeaponType) {
      return { shotId: null, shotGroupId: null, weaponType: normalizedWeaponType };
    }

    const resolvedShotGroupId = Number.isFinite(shotGroupId)
      ? shotGroupId
      : this.registerWeaponVolley(normalizedWeaponType);

    const shotId = runtime.nextShotId;
    runtime.nextShotId += 1;
    return {
      shotId,
      shotGroupId: resolvedShotGroupId,
      weaponType: normalizedWeaponType,
    };
  }

  registerShotGroupHit(shotGroupId) {
    const runtime = this.runtime;
    if (!runtime) return;
    if (!Number.isFinite(shotGroupId)) return;
    runtime.shotGroupHits.add(shotGroupId);
  }

  registerDamageTaken(amount) {
    if (!(amount > 0)) return;
    if (!this.runtime) return;
    this.runtime.damageTaken = true;
  }

  registerEnemySpawned(enemy) {
    if (!enemy?.def) return;
    const runtime = this.runtime;
    if (!runtime) return;
    runtime.totalEnemiesSpawned += 1;
    runtime.enemySpawnTimes.set(enemy, this.getMissionElapsedTime());
  }

  registerCrystalsDropped(count) {
    const runtime = this.runtime;
    if (!runtime) return;
    runtime.crystalsDropped += Math.max(0, Math.floor(count || 0));
  }

  registerCrystalsCollected(count) {
    const runtime = this.runtime;
    if (!runtime) return;
    runtime.crystalsCollected += Math.max(0, Math.floor(count || 0));
  }

  getMissionElapsedTime() {
    return Math.max(0, Number(this.game.state?.progression?.missionTimer) || 0);
  }

  getPlayerPlanarPosition() {
    const playerMesh = this.game.store?.playerMesh;
    if (playerMesh?.position) return playerMesh.position;
    const player = this.game.state?.player;
    return player ? { x: player.x ?? 0, z: player.z ?? 0 } : { x: 0, z: 0 };
  }

  registerEnemyDefeated(enemy, source = null) {
    if (!enemy?.mesh?.position) return;
    const runtime = this.runtime;
    if (!runtime) return;

    runtime.totalEnemiesDefeated += 1;

    const spawnTime = runtime.enemySpawnTimes.get(enemy);
    const defeatTime = this.getMissionElapsedTime();
    if (Number.isFinite(spawnTime) && (defeatTime - spawnTime) <= 10) {
      runtime.timelyDefeats += 1;
    }
    runtime.enemySpawnTimes.delete(enemy);

    const playerPos = this.getPlayerPlanarPosition();
    const dx = enemy.mesh.position.x - (playerPos.x ?? 0);
    const dz = enemy.mesh.position.z - (playerPos.z ?? 0);
    const planarDistance = Math.hypot(dx, dz);
    const nearThreshold = MINIMAP.range * MINIMAP.centerRingRatio;
    const farThreshold = MINIMAP.range;
    if (planarDistance <= nearThreshold) runtime.nearKills += 1;
    if (planarDistance > farThreshold) runtime.farKills += 1;

    if (source && Number.isFinite(source.shotGroupId)) {
      this.registerShotGroupHit(source.shotGroupId);
    }
    if (source && Number.isFinite(source.shotId)) {
      const killCount = (runtime.killsByShot.get(source.shotId) ?? 0) + 1;
      runtime.killsByShot.set(source.shotId, killCount);
      runtime.maxKillsByShot = Math.max(runtime.maxKillsByShot, killCount);
    }
  }

  calculateTimeBonus(clearTime, targetTime) {
    if (!(targetTime > 0)) return 0;
    if (clearTime > targetTime) return 0;
    return Math.max(0, Math.floor(targetTime - clearTime) * 50);
  }

  createResultEntry(key, score, { alwaysShow = false } = {}) {
    const def = RESULT_ENTRY_DEFS[key];
    if (!def) return null;
    if (!alwaysShow && !(score > 0)) return null;
    return {
      key,
      medalId: def.isMedal ? key : null,
      label: def.label,
      score: Math.max(0, Math.floor(score)),
      kind: def.kind,
      isMedal: !!def.isMedal,
      condition: def.condition ?? '',
    };
  }

  isCrystalCompleteAchieved() {
    const runtime = this.runtime;
    if (!runtime) return false;
    if (runtime.missionIsTutorial) return false;
    return runtime.crystalsDropped > 0 && runtime.crystalsCollected >= runtime.crystalsDropped;
  }

  tryAppendLateCrystalComplete(summary) {
    if (!summary || this.isCrystalCompleteAchieved() !== true) return null;

    const existingEntries = Array.isArray(summary.resultEntries) ? summary.resultEntries : [];
    if (existingEntries.some((entry) => entry?.key === 'crystalComplete')) return null;

    const entry = this.createResultEntry('crystalComplete', RESULT_ENTRY_DEFS.crystalComplete?.score ?? 0);
    if (!entry) return null;

    summary.resultEntries = [...existingEntries, entry];
    const achievedKeys = Array.isArray(summary.achievedKeys) ? summary.achievedKeys : [];
    summary.achievedKeys = achievedKeys.includes('crystalComplete') ? achievedKeys.slice() : [...achievedKeys, 'crystalComplete'];

    const awardedMedalKeys = Array.isArray(summary.awardedMedalKeys) ? summary.awardedMedalKeys : [];
    if (entry.isMedal && entry.medalId) {
      summary.awardedMedalKeys = awardedMedalKeys.includes(entry.medalId) ? awardedMedalKeys.slice() : [...awardedMedalKeys, entry.medalId];
    } else {
      summary.awardedMedalKeys = awardedMedalKeys.slice();
    }

    const runtime = this.runtime ?? this.createRuntime();
    summary.achievementStats = {
      ...(summary.achievementStats ?? {}),
      crystalsDropped: runtime.crystalsDropped,
      crystalsCollected: runtime.crystalsCollected,
    };
    return entry;
  }

  buildMissionSummary({ mission, clearTime, targetTime, noDownEligible = false }) {
    const runtime = this.runtime ?? this.createRuntime(mission);
    const missionWaves = Math.max(0, Number(mission?.waves) || runtime.missionWaves || 0);
    const resultEntries = [];

    const timeBonus = this.calculateTimeBonus(clearTime, targetTime);
    const noDownAchieved = !!noDownEligible;
    const noDownBonus = noDownAchieved ? 2000 : 0;
    const crystalBonus = 0;

    const pushEntry = (entry) => {
      if (entry) resultEntries.push(entry);
    };

    pushEntry(this.createResultEntry('timeBonus', timeBonus, { alwaysShow: true }));
    pushEntry(this.createResultEntry('noDownBonus', noDownBonus));

    const remainingHealth = Math.ceil(this.game.state?.player?.health ?? 0);
    const shotGroupsFired = runtime.shotGroupsFired;
    const shotGroupsHit = runtime.shotGroupHits.size;
    const accuracy = shotGroupsFired > 0 ? (shotGroupsHit / shotGroupsFired) : 0;
    const waveKillRequirement = missionWaves > 0 ? missionWaves * 5 : Number.POSITIVE_INFINITY;
    const achievedKeys = [];

    const achievementChecks = [
      ['crystalComplete', this.isCrystalCompleteAchieved()],
      ['perfectGuard', !runtime.damageTaken],
      ['deadlineSurvive', remainingHealth > 0 && remainingHealth <= 9],
      ['megaMultiKill', runtime.maxKillsByShot >= 5],
      ['blitzSweep', runtime.totalEnemiesSpawned > 0 && runtime.timelyDefeats >= runtime.totalEnemiesSpawned * 0.8],
      ['pointBlank', Number.isFinite(waveKillRequirement) && runtime.nearKills >= waveKillRequirement],
      ['longRangeHunter', Number.isFinite(waveKillRequirement) && runtime.farKills >= waveKillRequirement],
      ['sharpShooter', shotGroupsFired > 0 && accuracy >= 0.7],
      ['mainOnly', runtime.usedMain && !runtime.usedPlasma],
      ['plasmaOnly', runtime.usedPlasma && !runtime.usedMain],
    ];

    for (const [key, achieved] of achievementChecks) {
      if (!achieved) continue;
      achievedKeys.push(key);
      pushEntry(this.createResultEntry(key, RESULT_ENTRY_DEFS[key]?.score ?? 0));
    }

    const totalBonus = resultEntries.reduce((sum, entry) => sum + Math.max(0, entry.score || 0), 0);
    return {
      clearTime,
      targetTime,
      timeBonus,
      noDownBonus,
      noDownAchieved,
      crystalBonus,
      totalBonus,
      resultEntries,
      achievedKeys,
      awardedMedalKeys: resultEntries.filter((entry) => entry?.isMedal).map((entry) => entry.medalId),
      stats: {
        totalEnemiesSpawned: runtime.totalEnemiesSpawned,
        totalEnemiesDefeated: runtime.totalEnemiesDefeated,
        nearKills: runtime.nearKills,
        farKills: runtime.farKills,
        maxKillsByShot: runtime.maxKillsByShot,
        crystalsDropped: runtime.crystalsDropped,
        crystalsCollected: runtime.crystalsCollected,
        timelyDefeats: runtime.timelyDefeats,
        shotGroupsFired,
        shotGroupsHit,
        accuracy,
        usedMain: runtime.usedMain,
        usedPlasma: runtime.usedPlasma,
      },
    };
  }
}

function assetUrl(relativePath) {
  return new URL(`../../assets/audio/${relativePath}`, import.meta.url).href;
}

function bgm(fileName, { loop = true } = {}) {
  return {
    src: assetUrl(`bgm/${fileName}`),
    loop,
  };
}

function sfx(fileName, options = {}) {
  return {
    src: assetUrl(`sfx/${fileName}`),
    spatialProfile: null,
    ...options,
  };
}

function minimapSpatialSfx(fileName, options = {}) {
  return sfx(fileName, {
    spatialProfile: 'enemyMinimapRings',
    outOfRangeVolumeScale: 0.1,
    ...options,
  });
}

/**
 * Responsibility:
 * - Audio file catalog and logical IDs.
 *
 * Rules:
 * - This file is data-only. Do not create Audio instances here.
 * - Paths are resolved from this module so runtime code stays free of stringly-typed asset paths.
 * - SFX overlap policy may be tuned here, but playback mechanics belong to src/audio/AudioManager.js.
 */
export const BGM_TRACKS = {
  title: bgm('bgm-title.mp3'),
  hangar: bgm('bgm-hangar.mp3'),
  clear: bgm('bgm-clear.mp3'),
  gameover: bgm('bgm-gameover.mp3', { loop: false }),
  tutorial: bgm('bgm-tutorial.mp3'),
  missionDesert: bgm('bgm-mission-desert.mp3'),
  missionSwamp: bgm('bgm-mission-swamp.mp3'),
  missionForge: bgm('bgm-mission-forge.mp3'),
  missionFrost: bgm('bgm-mission-frost.mp3'),
  missionMirror: bgm('bgm-mission-mirror.mp3'),
  missionAstral: bgm('bgm-mission-astral.mp3'),
  missionVoidcrown: bgm('bgm-mission-voidcrown.mp3'),
  bossDesert: bgm('bgm-boss-desert.mp3'),
  bossSwamp: bgm('bgm-boss-swamp.mp3'),
  bossForge: bgm('bgm-boss-forge.mp3'),
  bossFrost: bgm('bgm-boss-frost.mp3'),
  bossMirror: bgm('bgm-boss-mirror.mp3'),
  bossAstral: bgm('bgm-boss-astral.mp3'),
  bossVoidFortress: bgm('bgm-boss-void-fortress.mp3'),
  bossVoidFighter: bgm('bgm-boss-void-fighter.mp3'),
};


export const SOUND_TEST_TRACK_IDS = Object.freeze([
  'missionDesert',
  'missionSwamp',
  'missionForge',
  'missionFrost',
  'missionMirror',
  'missionAstral',
]);


export const SFX_TRACKS = {
  uiHover: sfx('sfx-ui-hover.mp3', { maxVoices: 2, burstWindowMs: 50, burstVolumeDecay: 0.85, minVolumeScale: 0.55, duckingGroup: 'uiLight' }),
  uiConfirm: sfx('sfx-ui-confirm.mp3', { maxVoices: 2, burstWindowMs: 60, burstVolumeDecay: 0.84, minVolumeScale: 0.55, duckingGroup: 'uiConfirm' }),
  uiCancel: sfx('sfx-ui-cancel.mp3', { maxVoices: 2, burstWindowMs: 60, burstVolumeDecay: 0.84, minVolumeScale: 0.55, duckingGroup: 'uiCancel' }),
  uiError: sfx('sfx-ui-error.mp3', { maxVoices: 2, burstWindowMs: 80, burstVolumeDecay: 0.82, minVolumeScale: 0.55, duckingGroup: 'uiError' }),
  uiPause: sfx('sfx-ui-pause.mp3', { maxVoices: 1 }),
  uiResume: sfx('sfx-ui-resume.mp3', { maxVoices: 1 }),
  waveStart: sfx('sfx-wave-start.mp3', { maxVoices: 1 }),
  waveClear: sfx('sfx-wave-clear.mp3', { maxVoices: 1 }),
  bossAlert: sfx('sfx-boss-alert.mp3', { maxVoices: 1 }),
  missionClear: sfx('sfx-mission-clear.mp3', { maxVoices: 1 }),
  systemDown: sfx('sfx-system-down.mp3', { maxVoices: 1 }),

  playerShot: sfx('sfx-player-shot.mp3', { maxVoices: 3, burstWindowMs: 90, burstVolumeDecay: 0.84, minVolumeScale: 0.5, duckingGroup: 'playerShot' }),
  playerShotHit: sfx('sfx-player-shot-hit.mp3', { maxVoices: 6, burstWindowMs: 70, burstVolumeDecay: 0.9, minVolumeScale: 0.5, duckingGroup: 'playerHit' }),
  playerPlasmaReady: sfx('sfx-player-plasma-ready.mp3', { maxVoices: 1 }),
  playerPlasmaFire: sfx('sfx-player-plasma-fire.mp3', { maxVoices: 2, burstWindowMs: 120, burstVolumeDecay: 0.88, minVolumeScale: 0.55, duckingGroup: 'playerPlasma' }),
  playerPlasmaBurst: minimapSpatialSfx('sfx-player-plasma-burst.mp3', {
    maxVoices: 4,
    burstWindowMs: 100,
    burstVolumeDecay: 0.85,
    minVolumeScale: 0.45,
    duckingGroup: 'playerPlasmaBurst',
  }),
  playerLockOn: sfx('sfx-player-lock-on.mp3', { maxVoices: 2, burstWindowMs: 90, burstVolumeDecay: 0.88, minVolumeScale: 0.55, duckingGroup: 'playerLockOn' }),
  playerDamage: sfx('sfx-player-damage.mp3', { maxVoices: 2, burstWindowMs: 120, burstVolumeDecay: 0.88, minVolumeScale: 0.55, duckingGroup: 'playerDamage' }),
  playerLowHpAlarm: sfx('sfx-player-low-hp-alarm.mp3', { maxVoices: 1 }),
  playerDestroyed: sfx('sfx-player-destroyed.mp3', { maxVoices: 1 }),

  enemySpawn: minimapSpatialSfx('sfx-enemy-spawn.mp3', { maxVoices: 6, burstWindowMs: 120, burstVolumeDecay: 0.88, minVolumeScale: 0.45, duckingGroup: 'enemySpawn' }),
  enemyShot: minimapSpatialSfx('sfx-enemy-shot.mp3', { maxVoices: 8, burstWindowMs: 90, burstVolumeDecay: 0.9, minVolumeScale: 0.4, duckingGroup: 'enemyShot' }),
  enemyShotHeavy: minimapSpatialSfx('sfx-enemy-shot-heavy.mp3', { maxVoices: 4, burstWindowMs: 120, burstVolumeDecay: 0.86, minVolumeScale: 0.45, duckingGroup: 'enemyHeavyShot' }),
  enemyLaser: minimapSpatialSfx('sfx-enemy-laser.mp3', { maxVoices: 4, burstWindowMs: 120, burstVolumeDecay: 0.86, minVolumeScale: 0.45, duckingGroup: 'enemyLaser' }),
  enemyMortar: minimapSpatialSfx('sfx-enemy-mortar.mp3', { maxVoices: 4, burstWindowMs: 120, burstVolumeDecay: 0.86, minVolumeScale: 0.45, duckingGroup: 'enemyHeavyShot' }),
  enemyMineDeploy: minimapSpatialSfx('sfx-enemy-mine-deploy.mp3', { maxVoices: 4, burstWindowMs: 100, burstVolumeDecay: 0.88, minVolumeScale: 0.5, duckingGroup: 'enemyMine' }),
  enemyMineArmed: minimapSpatialSfx('sfx-enemy-mine-armed.mp3', { maxVoices: 4, burstWindowMs: 100, burstVolumeDecay: 0.88, minVolumeScale: 0.5, duckingGroup: 'enemyMine' }),
  enemyHit: minimapSpatialSfx('sfx-enemy-hit.mp3', { maxVoices: 8, burstWindowMs: 70, burstVolumeDecay: 0.9, minVolumeScale: 0.4, duckingGroup: 'enemyHit' }),
  enemyDestroySmall: minimapSpatialSfx('sfx-enemy-destroy-small.mp3', { maxVoices: 8, burstWindowMs: 140, burstVolumeDecay: 0.82, minVolumeScale: 0.28, duckingGroup: 'enemyDestroy' }),
  enemyDestroyHeavy: minimapSpatialSfx('sfx-enemy-destroy-heavy.mp3', { maxVoices: 5, burstWindowMs: 180, burstVolumeDecay: 0.8, minVolumeScale: 0.35, duckingGroup: 'enemyDestroy' }),

  bossIntro: sfx('sfx-boss-intro.mp3', { maxVoices: 1 }),
  bossPhaseChange: sfx('sfx-boss-phase-change.mp3', { maxVoices: 1 }),
  bossDestroy: sfx('sfx-boss-destroy.mp3', { maxVoices: 1 }),
  finalFormShift: sfx('sfx-final-form-shift.mp3', { maxVoices: 1 }),

  crystalPickup: sfx('sfx-crystal-pickup.mp3', { maxVoices: 6, burstWindowMs: 80, burstVolumeDecay: 0.88, minVolumeScale: 0.45, duckingGroup: 'pickup' }),
  shopPurchase: sfx('sfx-shop-purchase.mp3', { maxVoices: 1 }),
  shopDenied: sfx('sfx-shop-denied.mp3', { maxVoices: 1 }),
  scoreBonus: sfx('sfx-score-bonus.mp3', { maxVoices: 4, burstWindowMs: 90, burstVolumeDecay: 0.88, minVolumeScale: 0.5, duckingGroup: 'scoreBonus' }),

  gimmickIcefallWarning: sfx('sfx-gimmick-icefall-warning.mp3', { maxVoices: 2 }),
  gimmickIcefallImpact: sfx('sfx-gimmick-icefall-impact.mp3', { maxVoices: 4, burstWindowMs: 150, burstVolumeDecay: 0.84, minVolumeScale: 0.4, duckingGroup: 'gimmickImpact' }),
  gimmickMirrorSweepWarning: sfx('sfx-gimmick-mirror-sweep-warning.mp3', { maxVoices: 2 }),
  gimmickMirrorSweepFire: sfx('sfx-gimmick-mirror-sweep-fire.mp3', { maxVoices: 3, burstWindowMs: 150, burstVolumeDecay: 0.85, minVolumeScale: 0.45, duckingGroup: 'gimmickBeam' }),
  gimmickAstralBloomWarning: sfx('sfx-gimmick-astral-bloom-warning.mp3', { maxVoices: 2 }),
  gimmickAstralBloomBurst: sfx('sfx-gimmick-astral-bloom-burst.mp3', { maxVoices: 3, burstWindowMs: 160, burstVolumeDecay: 0.84, minVolumeScale: 0.42, duckingGroup: 'gimmickBurst' }),
  gimmickVoidJudgementWarning: sfx('sfx-gimmick-void-judgement-warning.mp3', { maxVoices: 2 }),
  gimmickVoidPillarImpact: sfx('sfx-gimmick-void-pillar-impact.mp3', { maxVoices: 4, burstWindowMs: 150, burstVolumeDecay: 0.84, minVolumeScale: 0.4, duckingGroup: 'gimmickImpact' }),
  gimmickVoidRingPulse: sfx('sfx-gimmick-void-ring-pulse.mp3', { maxVoices: 3, burstWindowMs: 150, burstVolumeDecay: 0.86, minVolumeScale: 0.45, duckingGroup: 'gimmickPulse' }),
};

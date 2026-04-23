/**
 * Responsibility:
 * - Central tuning constants shared by runtime systems.
 *
 * Rules:
 * - Keep numbers only. No runtime state and no side effects.
 * - Gameplay feel is defined by these values unless a later balance patch intentionally changes it.
 * - Crystal auto-collection feel is controlled only by PICKUP radii here. RewardSystem must read both
 * `magnetRadius` and `collectRadius` directly so CRYSTAL ATTRACT visibly expands pickup reach. * `magnetRadius`
 * is 37.8 units.
 * - Primary fire-rate tuning is expressed as multiplicative pieces so the shop text stays honest:
 * `primaryBaseFireRate` is the real level-0 cadence the player starts with,
 * `primaryRapidMultiplier` is the per-level PRIMARY RAPID bonus,
 * and `primaryMultiWayRatePenalty` is the per-level MULTI-WAY fire-rate penalty.
 * Runtime systems must compose those values in one place instead of smuggling extra cooldown edits elsewhere.
 */

export const GAME_BOUNDS = {
  radius: 170,
  softRadius: 158,
};

export const PLAYER_TRAVEL = {
  boundaryMargin: 18,
  radius: GAME_BOUNDS.radius + 18,
};

export const PLAYER_BASE = {
  maxHealth: 100,
  moveSpeed: 22,
  hoverHeight: 6.8,
  collisionRadius: 2.0,
  invulnAfterHit: 0.08,
};

export const PLAYER_AVOIDANCE = {
  plannerInterval: 0.05,
  straightSettleTime: 0.14,
  minAssistSpeed: 8.0,
  nearTime: 0.32,
  farTime: 0.92,
  nearBase: 2.0,
  farBase: 6.0,
  nearMin: 3.0,
  nearMax: 10.0,
  farMin: 8.0,
  farMax: 28.0,
  corridorPad: 2.8,
  lateralClearance: 2.45,
  forwardClearance: 4.8,
  minPlanSpeed: 7.0,
  minPlanLife: 0.35,
  maxPlanLife: 1.45,
  planFadeWindow: 0.2,
  planTurnRate: 6.8,
  assistWeight: 0.74,
  inputChangeSuppressTime: 0.12,
  modeExitSuppressTime: 0.06,
  assistMaxDeviationAngle: 0.95,
  intentFollowRate: 7.5,
  intentShiftAngle: 0.42,
  intentShiftHold: 0.15,
  straightEnterYawRate: 0.3,
  straightExitYawRate: 0.45,
  manualEnterYawRate: 1.25,
  manualExitYawRate: 0.95,
  // 更新ルール:
  // - stale plan の再 plan 判定は speed drop を見ず、blocked / intent shift / corridor / expiry に限定する。
  emergencyBlockedFrames: 2,
  // 回避 blocked は片軸の停止ではなく、意図方向への前進不足で判定する。
  blockedMinForwardDistance: 0.12,
  blockedMinForwardRatio: 0.35,
  // 回避 target は clamp 後の有効性も検査し、前方距離や到達距離が潰れた候補を捨てる。
  minClampedForwardDistance: 1.0,
  minClampedPlanDistance: 1.2,
  sideStickBias: 0.18,
  minRiskToPlan: 0.085,
  targetPointReachRadius: 1.8,
};

export const WEAPON_BASE = {
  primaryDamage: 12,
  primaryBaseFireRate: 1 / 0.176,
  primaryRapidMultiplier: 1.2,
  primaryMultiWayRatePenalty: 0.85,
  primarySpeed: 112,
  primaryPierce: 0,
  primaryHoming: 0.01,
  primarySpread: 0.06,
  primaryLife: 1.45,
  plasmaDamage: 84,
  plasmaSpeed: 84,
  plasmaRadius: 8.0,
  plasmaCooldown: 5.2,
  plasmaLife: 2.0,
};

export const PICKUP = {
  magnetRadius: 37.8,
  collectRadius: 3.2,
  floatHeight: 1.1,
};

export const CRYSTAL_DROP = {
  fastKillSeconds: 5,
  slowKillSeconds: 15,
  bossTimeScale: 4,
};

export const MINIMAP = {
  range: 105,
  innerRingRatio: 0.66,
  centerRingRatio: 0.36,
};

export const TARGET_LOCK = {
  range: 105,
};

export const COLORS = {
  player: 0x8dffef,
  playerHot: 0xff7adc,
  enemyShot: 0xffa23a,
  plasma: 0x76c2ff,
  crystal: 0xbfefff,
};

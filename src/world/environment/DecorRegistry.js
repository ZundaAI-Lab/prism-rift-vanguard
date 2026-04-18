/**
 * Responsibility:
 * - ミッション ID と decor builder の対応表を管理する。
 *
 * Update Rules:
 * - 新しい mission の decor を追加するときはこの registry を更新する。
 * - EnvironmentBuilder 本体へ if 連鎖を戻さない。
 */
export const DECOR_BUILDERS = Object.freeze({
  desert: (env, group) => env.addDesertDecor(group),
  swamp: (env, group) => env.addSwampDecor(group),
  forge: (env, group) => env.addForgeDecor(group),
  frost: (env, group) => env.addFrostDecor(group),
  mirror: (env, group) => env.addMirrorDecor(group),
  astral: (env, group) => env.addAstralDecor(group),
  voidcrown: (env, group) => env.addVoidCrownDecor(group),
});

export function createDecorForMission(env, missionId) {
  const build = DECOR_BUILDERS[missionId];
  if (typeof build === 'function') build(env, env.decorGroup);
}

/**
 * Responsibility:
 * - 図鑑 / インテル画面が共有する読み取り専用メタ情報 helper をまとめる。
 *
 * Rules:
 * - 図鑑表示用の要約生成だけを担当し、DOM 更新は行わない。
 * - 3D プレビュー向け共有値は UiPreviewShared へ委譲する。
 */
import { ENEMY_LIBRARY } from '../../data/enemies.js';
import { MISSIONS } from '../../data/missions.js';
import { getCurrentLanguage, getEnemyFlavor, getMissionName, getMissionSubtitle, translate } from '../../i18n/index.js';
import {
  COMPENDIUM_BOX,
  COMPENDIUM_CAMERA,
  COMPENDIUM_CENTER,
  COMPENDIUM_LOOK,
  COMPENDIUM_PREVIEW_SIZE,
  COMPENDIUM_SIZE,
  THREE,
  disposeObject3D,
} from '../shared/UiPreviewShared.js';

export {
  COMPENDIUM_BOX,
  COMPENDIUM_CAMERA,
  COMPENDIUM_CENTER,
  COMPENDIUM_LOOK,
  COMPENDIUM_PREVIEW_SIZE,
  COMPENDIUM_SIZE,
  ENEMY_LIBRARY,
  THREE,
  disposeObject3D,
};

function resolveUiLanguage(gameOrLanguage) {
  return typeof gameOrLanguage === 'string' ? gameOrLanguage : getCurrentLanguage(gameOrLanguage);
}

function translateSummary(gameOrLanguage, keyPath) {
  const translated = translate(gameOrLanguage, keyPath);
  return translated === keyPath ? translate(gameOrLanguage, 'common.none') : translated;
}

export function getBehaviorSummary(def, gameOrLanguage = 'ja') {
  return translateSummary(gameOrLanguage, `behavior.${def.behavior}`);
}

export function getAttackSummary(def, gameOrLanguage = 'ja') {
  return translateSummary(gameOrLanguage, `attack.${def.attack}`);
}

export function getCombatSummary(typeKey, def, gameOrLanguage = 'ja') {
  const language = resolveUiLanguage(gameOrLanguage);
  const flavor = getEnemyFlavor(language, typeKey);
  if (flavor) return flavor;
  const parts = [getBehaviorSummary(def, language), getAttackSummary(def, language)];
  if (def.isBoss && def.behavior === 'boss_final_fortress') parts.push(translate(language, 'compendium.extraFinalFortress'));
  if (def.isBoss && def.behavior === 'boss_final_fighter') parts.push(translate(language, 'compendium.extraFinalFighter'));
  if (!def.isBoss && def.behavior === 'kamikaze') parts.push(translate(language, 'compendium.extraKamikaze'));
  return parts.join(' / ');
}

export function getIntelSections(gameOrLanguage = 'ja') {
  const language = resolveUiLanguage(gameOrLanguage);
  return MISSIONS.filter((mission) => !mission.skipIntel).map((mission) => {
    const enemyKeys = Array.isArray(mission.enemies) ? [...mission.enemies] : [];
    const bossKeys = mission.finalMission ? ['voidFortress', 'voidFighter'] : (mission.boss ? [mission.boss] : []);
    return {
      missionId: mission.id,
      title: getMissionName(language, mission),
      subtitle: getMissionSubtitle(language, mission),
      gimmick: mission.gimmick,
      waveText: mission.waves > 0 ? translate(language, 'compendium.waves', { count: mission.waves }) : translate(language, 'compendium.bossDirect'),
      entries: [
        ...enemyKeys.map((key) => ({ key, role: 'enemy' })),
        ...bossKeys.map((key) => ({ key, role: 'boss' })),
      ],
    };
  });
}

import { MISSIONS } from '../data/missions.js';
import { SHOP_ITEMS } from '../data/shop.js';
import { ENEMY_LIBRARY } from '../data/enemies.js';
import ja from './langs/ja.js';
import en from './langs/en.js';
import zh from './langs/zh.js';

export const SUPPORTED_LANGUAGES = Object.freeze(['ja', 'en', 'zh']);
const DICTIONARIES = Object.freeze({ ja, en, zh });

function getByPath(source, path) {
  const parts = String(path || '').split('.');
  let current = source;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

function interpolate(template, params = {}) {
  return String(template).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = getByPath(params, key);
    return value == null ? '' : String(value);
  });
}

export function resolveLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language) ? language : 'ja';
}

export function getCurrentLanguage(game) {
  if (game) return resolveLanguage(game?.optionState?.language ?? game?.options?.getOptions?.()?.language ?? 'ja');
  if (typeof document !== 'undefined') return resolveLanguage(document.documentElement?.lang || 'ja');
  return 'ja';
}

export function translate(gameOrLanguage, key, params = {}) {
  const language = typeof gameOrLanguage === 'string'
    ? resolveLanguage(gameOrLanguage)
    : getCurrentLanguage(gameOrLanguage);
  const value = getByPath(DICTIONARIES[language], key)
    ?? getByPath(DICTIONARIES.en, key)
    ?? getByPath(DICTIONARIES.ja, key);
  if (typeof value === 'function') return value(params);
  if (value == null) return key;
  return interpolate(value, params);
}

export function getLanguageLabel(currentLanguage, languageValue) {
  return translate(currentLanguage, `languages.${resolveLanguage(languageValue)}`);
}

export function getMissionDefinition(missionOrId) {
  if (!missionOrId) return null;
  if (typeof missionOrId === 'object') return missionOrId;
  return MISSIONS.find((mission) => mission.id === missionOrId) ?? null;
}

export function getMissionText(gameOrLanguage, missionOrId, field = 'name') {
  const mission = getMissionDefinition(missionOrId);
  if (!mission) return '';
  const translated = getByPath(DICTIONARIES[typeof gameOrLanguage === 'string' ? resolveLanguage(gameOrLanguage) : getCurrentLanguage(gameOrLanguage)], `missions.${mission.id}.${field}`);
  if (translated != null) return translated;
  return mission[field] ?? mission.name ?? mission.id;
}

export function getMissionName(gameOrLanguage, missionOrId) {
  return getMissionText(gameOrLanguage, missionOrId, 'name');
}

export function getMissionLabel(gameOrLanguage, missionOrId) {
  return getMissionText(gameOrLanguage, missionOrId, 'label');
}

export function getMissionSubtitle(gameOrLanguage, missionOrId) {
  return getMissionText(gameOrLanguage, missionOrId, 'subtitle');
}

export function getMissionBriefing(gameOrLanguage, missionOrId) {
  return getMissionText(gameOrLanguage, missionOrId, 'briefing');
}

export function getShopDefinition(itemOrId) {
  if (!itemOrId) return null;
  if (typeof itemOrId === 'object') return itemOrId;
  return SHOP_ITEMS.find((item) => item.id === itemOrId) ?? null;
}

export function getShopTitle(gameOrLanguage, itemOrId) {
  const item = getShopDefinition(itemOrId);
  if (!item) return '';
  const language = typeof gameOrLanguage === 'string' ? resolveLanguage(gameOrLanguage) : getCurrentLanguage(gameOrLanguage);
  return getByPath(DICTIONARIES[language], `shop.${item.id}.title`) ?? item.title ?? '';
}

export function getShopDescription(gameOrLanguage, itemOrId) {
  const item = getShopDefinition(itemOrId);
  if (!item) return '';
  const language = typeof gameOrLanguage === 'string' ? resolveLanguage(gameOrLanguage) : getCurrentLanguage(gameOrLanguage);
  return getByPath(DICTIONARIES[language], `shop.${item.id}.description`) ?? item.description ?? '';
}

export function getEnemyDefinition(enemyOrTypeKey) {
  if (!enemyOrTypeKey) return null;
  if (typeof enemyOrTypeKey === 'object' && enemyOrTypeKey.name) return enemyOrTypeKey;
  if (typeof enemyOrTypeKey === 'object' && enemyOrTypeKey.def) return enemyOrTypeKey.def;
  return ENEMY_LIBRARY[enemyOrTypeKey] ?? null;
}

export function getEnemyName(gameOrLanguage, enemyOrTypeKey) {
  const def = getEnemyDefinition(enemyOrTypeKey);
  if (!def) return '';
  const typeKey = typeof enemyOrTypeKey === 'string'
    ? enemyOrTypeKey
    : (enemyOrTypeKey?.typeKey ?? enemyOrTypeKey?.def?.typeKey ?? Object.entries(ENEMY_LIBRARY).find(([, value]) => value === def)?.[0]);
  const language = typeof gameOrLanguage === 'string' ? resolveLanguage(gameOrLanguage) : getCurrentLanguage(gameOrLanguage);
  return (typeKey ? getByPath(DICTIONARIES[language], `enemies.${typeKey}.name`) : null) ?? def.name ?? '';
}

export function getEnemyFlavor(gameOrLanguage, enemyOrTypeKey) {
  const def = getEnemyDefinition(enemyOrTypeKey);
  if (!def) return '';
  const typeKey = typeof enemyOrTypeKey === 'string'
    ? enemyOrTypeKey
    : (enemyOrTypeKey?.typeKey ?? enemyOrTypeKey?.def?.typeKey ?? Object.entries(ENEMY_LIBRARY).find(([, value]) => value === def)?.[0]);
  if (!typeKey) return '';
  const language = typeof gameOrLanguage === 'string' ? resolveLanguage(gameOrLanguage) : getCurrentLanguage(gameOrLanguage);
  return getByPath(DICTIONARIES[language], `enemies.${typeKey}.flavor`)
    ?? getByPath(DICTIONARIES.en, `enemies.${typeKey}.flavor`)
    ?? getByPath(DICTIONARIES.ja, `enemies.${typeKey}.flavor`)
    ?? '';
}


export function getResultEntryLabel(gameOrLanguage, entryOrKey, fallback = '-') {
  const key = typeof entryOrKey === 'string' ? entryOrKey : entryOrKey?.key;
  return key ? (translate(gameOrLanguage, `resultEntries.${key}.label`) || fallback) : fallback;
}

export function getResultEntryCondition(gameOrLanguage, entryOrKey, fallback = '') {
  const key = typeof entryOrKey === 'string' ? entryOrKey : entryOrKey?.key;
  return key ? (translate(gameOrLanguage, `resultEntries.${key}.condition`) || fallback) : fallback;
}

export function getSoundTestTrackLabel(gameOrLanguage, trackId, fallback = '') {
  return translate(gameOrLanguage, `soundTest.${trackId}`) || fallback || trackId;
}

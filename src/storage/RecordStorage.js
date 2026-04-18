const STORAGE_KEY = 'prism_rift_vanguard_records_v1';
const STORAGE_VERSION = 2;

function safeClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeScore(score) {
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.floor(score));
}

function normalizeTime(seconds) {
  if (!Number.isFinite(seconds)) return null;
  if (!(seconds > 0)) return null;
  return Math.max(0, Number(seconds));
}

function normalizeMedalKeys(medalKeys) {
  const unique = new Set();
  for (const medalKey of Array.isArray(medalKeys) ? medalKeys : []) {
    if (!medalKey) continue;
    unique.add(String(medalKey));
  }
  return [...unique];
}

function normalizeMedalCounts(medalCounts) {
  const normalized = {};
  if (!medalCounts || typeof medalCounts !== 'object') return normalized;
  for (const [medalKey, count] of Object.entries(medalCounts)) {
    if (!medalKey) continue;
    const normalizedCount = Math.max(0, Math.floor(Number(count) || 0));
    if (normalizedCount <= 0) continue;
    normalized[String(medalKey)] = normalizedCount;
  }
  return normalized;
}

function createEmptyMissionRecord(label = '') {
  return {
    label,
    bestScore: null,
    bestTime: null,
    medalKeys: [],
  };
}

function createEmptyFinalResultRecord(label = 'FINAL RESULT') {
  return {
    label,
    bestScore: null,
    bestTime: null,
    medalCounts: {},
  };
}

/**
 * Responsibility:
 * - localStorage に保存するミッション記録 / 最終結果記録の入出力だけを担当する。
 *
 * Rules:
 * - localStorage の read/write/clear は必ずこのモジュール経由にする。
 * - 保存形式はこの仕様に正規化して扱う。
 * - ミッション記録はスコア最大・タイム最短・勲章ユニーク追加で統合する。
 * - 最終結果の勲章は medalCounts に勲章ごとのベスト取得数を保存し、同一勲章は run 間で最大値を保持する。
 */
export class RecordStorage {
  constructor({ missions = [] } = {}) {
    this.missionMeta = missions
      .filter((mission) => !mission?.isTutorial)
      .map((mission) => ({
        id: mission.id,
        label: mission.label || mission.name || mission.id,
        name: mission.name || mission.label || mission.id,
      }));
    this.finalMissionId = this.missionMeta.length > 0 ? this.missionMeta[this.missionMeta.length - 1].id : null;
    this.cache = this.load();
  }

  createEmptyData() {
    const missions = {};
    for (const mission of this.missionMeta) {
      missions[mission.id] = createEmptyMissionRecord(mission.label);
    }
    return {
      version: STORAGE_VERSION,
      missions,
      finalResult: createEmptyFinalResultRecord('FINAL RESULT'),
    };
  }

  normalizeMissionRecord(rawRecord, fallbackLabel = '') {
    const record = rawRecord && typeof rawRecord === 'object' ? rawRecord : {};
    return {
      label: String(record.label || fallbackLabel || ''),
      bestScore: normalizeScore(record.bestScore),
      bestTime: normalizeTime(record.bestTime),
      medalKeys: normalizeMedalKeys(record.medalKeys),
    };
  }

  normalizeFinalResultRecord(rawRecord, fallbackLabel = 'FINAL RESULT') {
    const record = rawRecord && typeof rawRecord === 'object' ? rawRecord : {};
    return {
      label: String(record.label || fallbackLabel || ''),
      bestScore: normalizeScore(record.bestScore),
      bestTime: normalizeTime(record.bestTime),
      medalCounts: normalizeMedalCounts(record.medalCounts),
    };
  }

  mergeMissionRecord(baseRecord, nextRecord, fallbackLabel = '') {
    const current = this.normalizeMissionRecord(baseRecord, fallbackLabel);
    const next = this.normalizeMissionRecord(nextRecord, fallbackLabel);
    return {
      label: String(next.label || current.label || fallbackLabel || ''),
      bestScore: current.bestScore === null
        ? next.bestScore
        : next.bestScore === null
          ? current.bestScore
          : Math.max(current.bestScore, next.bestScore),
      bestTime: current.bestTime === null
        ? next.bestTime
        : next.bestTime === null
          ? current.bestTime
          : Math.min(current.bestTime, next.bestTime),
      medalKeys: [...new Set([...current.medalKeys, ...next.medalKeys])],
    };
  }

  mergeFinalResultRecord(baseRecord, nextRecord, fallbackLabel = 'FINAL RESULT') {
    const current = this.normalizeFinalResultRecord(baseRecord, fallbackLabel);
    const next = this.normalizeFinalResultRecord(nextRecord, fallbackLabel);
    const mergedMedalCounts = {};
    for (const medalKey of new Set([...Object.keys(current.medalCounts), ...Object.keys(next.medalCounts)])) {
      const bestCount = Math.max(current.medalCounts[medalKey] || 0, next.medalCounts[medalKey] || 0);
      if (bestCount > 0) mergedMedalCounts[medalKey] = bestCount;
    }
    return {
      label: String(next.label || current.label || fallbackLabel || ''),
      bestScore: current.bestScore === null
        ? next.bestScore
        : next.bestScore === null
          ? current.bestScore
          : Math.max(current.bestScore, next.bestScore),
      bestTime: current.bestTime === null
        ? next.bestTime
        : next.bestTime === null
          ? current.bestTime
          : Math.min(current.bestTime, next.bestTime),
      medalCounts: mergedMedalCounts,
    };
  }

  sanitizeData(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const missions = {};
    for (const mission of this.missionMeta) {
      missions[mission.id] = this.normalizeMissionRecord(source.missions?.[mission.id], mission.label);
    }
    return {
      version: STORAGE_VERSION,
      missions,
      finalResult: this.normalizeFinalResultRecord(source.finalResult, 'FINAL RESULT'),
    };
  }

  readRawStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.warn('[RecordStorage] failed to read localStorage:', error);
      return null;
    }
  }

  persist() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('[RecordStorage] failed to write localStorage:', error);
    }
  }

  load() {
    const sanitized = this.sanitizeData(this.readRawStorage());
    this.cache = sanitized;
    return sanitized;
  }

  getData() {
    return safeClone(this.cache);
  }

  getMissionRecord(missionId) {
    return safeClone(this.cache?.missions?.[missionId] ?? createEmptyMissionRecord());
  }

  getFinalResultRecord() {
    return safeClone(this.cache?.finalResult ?? createEmptyFinalResultRecord('FINAL RESULT'));
  }

  hasMissionRecord(missionId) {
    const record = this.cache?.missions?.[missionId];
    if (!record) return false;
    return Number.isFinite(record.bestScore)
      || Number.isFinite(record.bestTime)
      || record.medalKeys.length > 0;
  }

  hasFinalClearRecord() {
    return this.finalMissionId ? this.hasMissionRecord(this.finalMissionId) : false;
  }

  updateMissionRecord({ missionId, label = '', score = null, clearTime = null, medalKeys = [] } = {}) {
    if (!missionId || !this.cache?.missions?.[missionId]) return this.getData();

    const nextRecord = {
      label: label || this.cache.missions[missionId].label,
      bestScore: normalizeScore(score),
      bestTime: normalizeTime(clearTime),
      medalKeys: normalizeMedalKeys(medalKeys),
    };

    this.cache.missions[missionId] = this.mergeMissionRecord(
      this.cache.missions[missionId],
      nextRecord,
      label,
    );
    this.persist();
    return this.getMissionRecord(missionId);
  }

  updateFinalResult({ label = 'FINAL RESULT', score = null, clearTime = null, medalCounts = {} } = {}) {
    const nextRecord = {
      label,
      bestScore: normalizeScore(score),
      bestTime: normalizeTime(clearTime),
      medalCounts: normalizeMedalCounts(medalCounts),
    };
    this.cache.finalResult = this.mergeFinalResultRecord(this.cache.finalResult, nextRecord, label);
    this.persist();
    return this.getFinalResultRecord();
  }

  clearAll() {
    this.cache = this.createEmptyData();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.warn('[RecordStorage] failed to clear localStorage:', error);
    }
    return this.getData();
  }
}

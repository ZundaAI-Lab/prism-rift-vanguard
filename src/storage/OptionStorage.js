import { SOUND_TEST_TRACK_IDS } from '../data/audio.js';

const STORAGE_KEY = 'prism_rift_vanguard_options_v3';
const STORAGE_VERSION = 4;

export const OPTION_LANGUAGES = Object.freeze(['ja', 'en', 'zh']);
export const OPTION_GRAPHICS_QUALITIES = Object.freeze(['low', 'medium', 'high']);
export const OPTION_EFFECT_STRENGTHS = Object.freeze(['standard', 'reduced', 'minimal']);
export const OPTION_CROSSHAIR_PRESETS = Object.freeze(['standard', 'bold', 'contrast']);
export const OPTION_HIT_DIRECTION_INDICATORS = Object.freeze(['off', 'strong']);
export const OPTION_SOUNDTEST_TRACK_IDS = SOUND_TEST_TRACK_IDS;

const DEFAULT_BROWSER_LANGUAGE = 'en';

export const DEFAULT_OPTIONS = Object.freeze({
  version: STORAGE_VERSION,
  language: 'ja',
  soundTestTrackId: OPTION_SOUNDTEST_TRACK_IDS[0] ?? 'title',
  audio: {
    bgmVolume: 0.7,
    sfxVolume: 0.85,
  },
  controls: {
    mouseSensitivity: 1,
    invertY: false,
  },
  graphics: {
    quality: 'high',
    fov: 74,
    effectStrength: 'standard',
  },
  hud: {
    opacity: 1,
    crosshairPreset: 'standard',
    crosshairScale: 1,
    hitDirectionIndicator: 'off',
    highContrast: false,
    minimapVisible: true,
    minimapScale: 1,
    enemyMarkersVisible: true,
  },
});

function safeClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeLanguage(value) {
  return normalizeEnum(value, OPTION_LANGUAGES, DEFAULT_OPTIONS.language);
}

function mapBrowserLanguageToOption(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) return null;
  if (normalized === 'ja' || normalized.startsWith('ja-')) return 'ja';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  if (
    normalized === 'zh'
    || normalized.startsWith('zh-')
    || normalized === 'cmn'
    || normalized.startsWith('cmn-')
  ) return 'zh';
  return null;
}

function getDefaultOptionLanguage() {
  if (typeof navigator === 'undefined') return DEFAULT_BROWSER_LANGUAGE;
  const candidates = Array.isArray(navigator.languages) ? navigator.languages : [];
  const orderedCandidates = [...candidates, navigator.language, navigator.userLanguage];
  for (const candidate of orderedCandidates) {
    const resolved = mapBrowserLanguageToOption(candidate);
    if (resolved) return resolved;
  }
  return DEFAULT_BROWSER_LANGUAGE;
}

function resolveInitialLanguage(rawLanguage) {
  if (OPTION_LANGUAGES.includes(rawLanguage)) return rawLanguage;
  return getDefaultOptionLanguage();
}

function normalizeSoundTestTrackId(value) {
  const trackId = typeof value === 'string' ? value : '';
  return OPTION_SOUNDTEST_TRACK_IDS.includes(trackId)
    ? trackId
    : DEFAULT_OPTIONS.soundTestTrackId;
}

function normalizeVolume(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(numeric, 0, 1);
}

function normalizeMouseSensitivity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_OPTIONS.controls.mouseSensitivity;
  return clamp(numeric, 0.35, 2.5);
}

function normalizeGraphicsQuality(value) {
  return normalizeEnum(value, OPTION_GRAPHICS_QUALITIES, DEFAULT_OPTIONS.graphics.quality);
}

function normalizeFov(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_OPTIONS.graphics.fov;
  return clamp(Math.round(numeric), 68, 84);
}

function normalizeEffectStrength(value) {
  return normalizeEnum(value, OPTION_EFFECT_STRENGTHS, DEFAULT_OPTIONS.graphics.effectStrength);
}


function normalizeHudOpacity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_OPTIONS.hud.opacity;
  return clamp(numeric, 0.35, 1);
}

function normalizeCrosshairPreset(value) {
  return normalizeEnum(value, OPTION_CROSSHAIR_PRESETS, DEFAULT_OPTIONS.hud.crosshairPreset);
}

function normalizeCrosshairScale(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_OPTIONS.hud.crosshairScale;
  return clamp(numeric, 1, 1.4);
}

function normalizeHitDirectionIndicator(value) {
  if (value === 'normal') return 'strong';
  return normalizeEnum(value, OPTION_HIT_DIRECTION_INDICATORS, DEFAULT_OPTIONS.hud.hitDirectionIndicator);
}

function normalizeHudMinimapScale(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_OPTIONS.hud.minimapScale;
  return clamp(numeric, 0.75, 1.4);
}

/**
 * Responsibility:
 * - localStorage に保存するオプション設定の入出力だけを担当する。
 *
 * Rules:
 * - localStorage の read/write は必ずこのモジュール経由にする。
 * - 保存形式は常に最新仕様へ正規化する。
 * - 実際の設定反映先の更新は Game / 各System が担当する。
 */
export class OptionStorage {
  constructor() {
    this.cache = this.load();
  }

  createDefaultData() {
    const defaults = safeClone(DEFAULT_OPTIONS);
    defaults.language = getDefaultOptionLanguage();
    return defaults;
  }

  sanitizeData(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      version: STORAGE_VERSION,
      language: resolveInitialLanguage(source.language),
      soundTestTrackId: normalizeSoundTestTrackId(source.soundTestTrackId),
      audio: {
        bgmVolume: normalizeVolume(source.audio?.bgmVolume, DEFAULT_OPTIONS.audio.bgmVolume),
        sfxVolume: normalizeVolume(source.audio?.sfxVolume, DEFAULT_OPTIONS.audio.sfxVolume),
      },
      controls: {
        mouseSensitivity: normalizeMouseSensitivity(source.controls?.mouseSensitivity),
        invertY: !!source.controls?.invertY,
      },
      graphics: {
        quality: normalizeGraphicsQuality(source.graphics?.quality),
        fov: normalizeFov(source.graphics?.fov),
        effectStrength: normalizeEffectStrength(source.graphics?.effectStrength),
      },
      hud: {
        opacity: normalizeHudOpacity(source.hud?.opacity),
        crosshairPreset: normalizeCrosshairPreset(source.hud?.crosshairPreset),
        crosshairScale: normalizeCrosshairScale(source.hud?.crosshairScale),
        hitDirectionIndicator: normalizeHitDirectionIndicator(source.hud?.hitDirectionIndicator),
        highContrast: !!source.hud?.highContrast,
        minimapVisible: source.hud?.minimapVisible !== false,
        minimapScale: normalizeHudMinimapScale(source.hud?.minimapScale),
        enemyMarkersVisible: source.hud?.enemyMarkersVisible !== false,
      },
    };
  }

  readRawStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.warn('[OptionStorage] failed to read localStorage:', error);
      return null;
    }
  }

  persist() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('[OptionStorage] failed to write localStorage:', error);
    }
  }

  load() {
    const raw = this.readRawStorage();
    this.cache = this.sanitizeData(raw);
    this.persist();
    return this.cache;
  }

  getOptions() {
    return safeClone(this.cache);
  }

  resetToDefaults() {
    this.cache = this.createDefaultData();
    this.persist();
    return this.getOptions();
  }

  setLanguage(language) {
    this.cache.language = normalizeLanguage(language);
    this.persist();
    return this.cache.language;
  }

  setSoundTestTrackId(trackId) {
    this.cache.soundTestTrackId = normalizeSoundTestTrackId(trackId);
    this.persist();
    return this.cache.soundTestTrackId;
  }

  setBgmVolume(volume) {
    this.cache.audio.bgmVolume = normalizeVolume(volume, DEFAULT_OPTIONS.audio.bgmVolume);
    this.persist();
    return this.cache.audio.bgmVolume;
  }

  setSfxVolume(volume) {
    this.cache.audio.sfxVolume = normalizeVolume(volume, DEFAULT_OPTIONS.audio.sfxVolume);
    this.persist();
    return this.cache.audio.sfxVolume;
  }

  setMouseSensitivity(value) {
    this.cache.controls.mouseSensitivity = normalizeMouseSensitivity(value);
    this.persist();
    return this.cache.controls.mouseSensitivity;
  }

  setInvertY(enabled) {
    this.cache.controls.invertY = !!enabled;
    this.persist();
    return this.cache.controls.invertY;
  }

  setGraphicsQuality(quality) {
    this.cache.graphics.quality = normalizeGraphicsQuality(quality);
    this.persist();
    return this.cache.graphics.quality;
  }

  setFov(value) {
    this.cache.graphics.fov = normalizeFov(value);
    this.persist();
    return this.cache.graphics.fov;
  }

  setEffectStrength(value) {
    this.cache.graphics.effectStrength = normalizeEffectStrength(value);
    this.persist();
    return this.cache.graphics.effectStrength;
  }


  setHudOpacity(value) {
    this.cache.hud.opacity = normalizeHudOpacity(value);
    this.persist();
    return this.cache.hud.opacity;
  }

  setCrosshairPreset(value) {
    this.cache.hud.crosshairPreset = normalizeCrosshairPreset(value);
    this.persist();
    return this.cache.hud.crosshairPreset;
  }

  setCrosshairScale(value) {
    this.cache.hud.crosshairScale = normalizeCrosshairScale(value);
    this.persist();
    return this.cache.hud.crosshairScale;
  }

  setHitDirectionIndicator(value) {
    this.cache.hud.hitDirectionIndicator = normalizeHitDirectionIndicator(value);
    this.persist();
    return this.cache.hud.hitDirectionIndicator;
  }
  setHighContrast(enabled) {
    this.cache.hud.highContrast = !!enabled;
    this.persist();
    return this.cache.hud.highContrast;
  }

  setHudMinimapVisible(enabled) {
    this.cache.hud.minimapVisible = !!enabled;
    this.persist();
    return this.cache.hud.minimapVisible;
  }

  setHudMinimapScale(value) {
    this.cache.hud.minimapScale = normalizeHudMinimapScale(value);
    this.persist();
    return this.cache.hud.minimapScale;
  }

  setHudEnemyMarkersVisible(enabled) {
    this.cache.hud.enemyMarkersVisible = !!enabled;
    this.persist();
    return this.cache.hud.enemyMarkersVisible;
  }
}

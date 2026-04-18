/**
 * Responsibility:
 * - オプション画面で使う表示整形と HUD 反映用の値変換を担当する。
 *
 * Update Rules:
 * - 文言の見せ方や数値表示形式を変える場合はこのファイルを更新する。
 * - DOM 構築やイベント bind はここへ持ち込まない。
 * - プリセット追加時は OptionStorage の定義と、このファイルの fallback を同時に更新する。
 */
import {
  OPTION_CROSSHAIR_PRESETS,
  OPTION_EFFECT_STRENGTHS,
  OPTION_GRAPHICS_QUALITIES,
} from '../../../storage/OptionStorage.js';
import { getLanguageLabel } from '../../../i18n/index.js';

export function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

export function formatSensitivity(value) {
  return `${(Number(value) || 0).toFixed(2)}x`;
}

export function formatLanguage(root, value) {
  return root?.getLanguage ? getLanguageLabel(root.getLanguage(), value) : getLanguageLabel('ja', value);
}

export function formatGraphicsQuality(root, value) {
  const key = OPTION_GRAPHICS_QUALITIES.includes(value) ? value : 'high';
  return root?.t ? root.t(`options.graphics.${key}`) : key.toUpperCase();
}

export function formatEffectStrength(root, value) {
  const key = OPTION_EFFECT_STRENGTHS.includes(value) ? value : 'standard';
  return root?.t ? root.t(`options.effectStrengthValues.${key}`) : key;
}

export function formatCrosshairPreset(root, value) {
  const key = OPTION_CROSSHAIR_PRESETS.includes(value) ? value : 'standard';
  return root?.t ? root.t(`options.crosshairPresetValues.${key}`) : key;
}

export function formatFov(value) {
  return `${Math.round(Number(value) || 0)}°`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getEffectVisualTuning(effectStrength = 'standard') {
  if (effectStrength === 'reduced') return { glow: 0.8, damageFlash: 0.72 };
  if (effectStrength === 'minimal') return { glow: 0.6, damageFlash: 0.45 };
  return { glow: 1, damageFlash: 1 };
}

export function getCrosshairPresetStyle(preset = 'standard') {
  switch (preset) {
    case 'bold':
      return {
        size: 50,
        crossLength: 20,
        crossThickness: 3,
        ringWidth: 1.5,
        ringAlpha: 0.26,
        glowAlpha: 0.16,
        centerDotSize: 4,
        outlineAlpha: 0.18,
      };
    case 'contrast':
      return {
        size: 52,
        crossLength: 22,
        crossThickness: 3,
        ringWidth: 2,
        ringAlpha: 0.34,
        glowAlpha: 0.08,
        centerDotSize: 5,
        outlineAlpha: 0.42,
      };
    default:
      return {
        size: 46,
        crossLength: 18,
        crossThickness: 2,
        ringWidth: 1,
        ringAlpha: 0.2,
        glowAlpha: 0.12,
        centerDotSize: 0,
        outlineAlpha: 0,
      };
  }
}

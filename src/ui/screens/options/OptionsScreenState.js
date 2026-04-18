/**
 * Responsibility:
 * - オプション値を UI / HUD / 画面内表示へ反映する責務を担当する。
 *
 * Update Rules:
 * - 保存データから見た目へ反映する処理はこのファイルへ集約する。
 * - イベント登録や DOM 生成はここへ追加しない。
 * - 新しいオプション項目を追加したら applyOptionSettings と refreshOptionsScreenState を同じ turn で更新する。
 */
import { OptionStorage } from '../../../storage/OptionStorage.js';
import { getGameViewportSize } from '../../../utils/dom-layout.js';
import {
  clamp,
  formatCrosshairPreset,
  formatEffectStrength,
  formatFov,
  formatGraphicsQuality,
  formatLanguage,
  formatPercent,
  formatSensitivity,
  getCrosshairPresetStyle,
  getEffectVisualTuning,
} from './OptionsScreenFormatters.js';

const MINIMAP_MAX_VIEWPORT_WIDTH_RATIO = 1 / 3;
const MINIMAP_MAX_VIEWPORT_HEIGHT_RATIO = 1 / 2;

function resolveResponsiveMinimapScale(uiRoot, userScale = 1) {
  const wrap = uiRoot?.refs?.minimapWrap;
  const baseWidth = Math.max(1, Number(wrap?.offsetWidth) || 368);
  const baseHeight = Math.max(1, Number(wrap?.offsetHeight) || 368);
  const { width: viewportWidth, height: viewportHeight } = getGameViewportSize(uiRoot?.game?.renderer?.host);
  const maxWidth = Math.max(1, viewportWidth * MINIMAP_MAX_VIEWPORT_WIDTH_RATIO);
  const maxHeight = Math.max(1, viewportHeight * MINIMAP_MAX_VIEWPORT_HEIGHT_RATIO);
  const widthLimitScale = maxWidth / baseWidth;
  const heightLimitScale = maxHeight / baseHeight;
  return clamp(Math.min(userScale, widthLimitScale, heightLimitScale), 0.08, 1.4);
}

export function installOptionsScreenState(UIRoot) {
  UIRoot.prototype.applyOptionSettings = function applyOptionSettings(snapshot) {
    const options = snapshot ?? this.game.optionState ?? this.game.getOptionsSnapshot?.() ?? new OptionStorage().getOptions();
    const hudOpacity = clamp(Number(options.hud?.opacity) || 1, 0.35, 1);
    const minimapScale = clamp(Number(options.hud?.minimapScale) || 1, 0.75, 1.4);
    const minimapVisible = options.hud?.minimapVisible !== false;
    const enemyMarkersVisible = options.hud?.enemyMarkersVisible !== false;
    const highContrast = options.hud?.highContrast === true;
    const hitDirectionIndicator = options.hud?.hitDirectionIndicator ?? 'off';
    const effectStrength = options.graphics?.effectStrength ?? 'standard';
    const crosshairPreset = options.hud?.crosshairPreset ?? 'standard';
    const crosshairScale = clamp(Number(options.hud?.crosshairScale) || 1, 1, 1.4);
    const effectVisual = getEffectVisualTuning(effectStrength);
    const reticleStyle = getCrosshairPresetStyle(crosshairPreset);
    const reticleSize = reticleStyle.size * crosshairScale;
    const hudRoot = this.refs.hud ?? document.documentElement;

    if (this.refs.topBar) this.refs.topBar.style.opacity = `${hudOpacity}`;
    if (this.refs.bossBarWrap) this.refs.bossBarWrap.style.opacity = `${hudOpacity}`;
    if (this.refs.reticle) {
      this.refs.reticle.style.opacity = `${hudOpacity}`;
      this.refs.reticle.style.setProperty('--reticle-size', `${reticleSize}px`);
      this.refs.reticle.style.setProperty('--reticle-cross-length', `${reticleStyle.crossLength}px`);
      this.refs.reticle.style.setProperty('--reticle-cross-thickness', `${reticleStyle.crossThickness}px`);
      this.refs.reticle.style.setProperty('--reticle-ring-width', `${reticleStyle.ringWidth}px`);
      this.refs.reticle.style.setProperty('--reticle-ring-alpha', `${reticleStyle.ringAlpha}`);
      this.refs.reticle.style.setProperty('--reticle-glow-alpha', `${reticleStyle.glowAlpha * effectVisual.glow}`);
      this.refs.reticle.style.setProperty('--reticle-center-dot-size', `${reticleStyle.centerDotSize}px`);
      this.refs.reticle.style.setProperty('--reticle-outline-alpha', `${Math.max(reticleStyle.outlineAlpha, highContrast ? 0.46 : reticleStyle.outlineAlpha)}`);
    }
    if (this.refs.minimapWrap) {
      const responsiveMinimapScale = resolveResponsiveMinimapScale(this, minimapScale);
      this.refs.minimapWrap.style.opacity = `${hudOpacity}`;
      this.refs.minimapWrap.style.display = minimapVisible ? 'grid' : 'none';
      this.refs.minimapWrap.style.transform = `scale(${responsiveMinimapScale})`;
      this.refs.minimapWrap.style.transformOrigin = 'bottom right';
    }
    if (this.refs.targetLockLayer) {
      this.refs.targetLockLayer.style.opacity = `${hudOpacity}`;
      this.refs.targetLockLayer.style.display = enemyMarkersVisible ? 'block' : 'none';
    }
    if (this.refs.damageIndicatorLayer) {
      this.refs.damageIndicatorLayer.style.opacity = `${hudOpacity}`;
      this.refs.damageIndicatorLayer.style.display = hitDirectionIndicator === 'off' ? 'none' : 'block';
    }

    hudRoot.style.setProperty('--hud-glow-multiplier', `${effectVisual.glow}`);
    hudRoot.style.setProperty('--damage-flash-multiplier', `${effectVisual.damageFlash}`);
    document.body.classList.toggle('ui-high-contrast', highContrast);

    this.refreshOptionsScreenState();
  };

  UIRoot.prototype.refreshOptionsScreenState = function refreshOptionsScreenState(force = false) {
    const snapshot = this.game.optionState ?? this.game.getOptionsSnapshot?.();
    if (!snapshot) return;

    const meta = this.refs.optionsMeta;
    if (meta) {
      meta.eyebrow.textContent = this.t('common.configuration');
      meta.title.textContent = this.t('options.title');
      meta.groupHeadings.system.textContent = this.t('options.groups.system');
      meta.groupHeadings.audio.textContent = this.t('options.groups.audio');
      meta.groupHeadings.controls.textContent = this.t('options.groups.controls');
      meta.groupHeadings.visuals.textContent = this.t('options.groups.visuals');
      meta.groupHeadings.combat.textContent = this.t('options.groups.combat');
      meta.groupHeadings.hud.textContent = this.t('options.groups.hud');

      meta.rows.language.labelNode.textContent = this.t('options.language');
      meta.rows.soundTest.labelNode.textContent = this.t('options.soundTest');
      meta.rows.soundTest.hintNode.textContent = this.t('options.hints.soundTest');
      meta.soundTestPlayBtn.textContent = this.t('common.play');
      meta.soundTestStopBtn.textContent = this.t('common.stop');
      meta.rows.bgmVolume.labelNode.textContent = this.t('options.bgmVolume');
      meta.rows.sfxVolume.labelNode.textContent = this.t('options.sfxVolume');
      meta.rows.mouseSensitivity.labelNode.textContent = this.t('options.mouseSensitivity');
      meta.rows.mouseSensitivity.hintNode.textContent = this.t('options.hints.sensitivity');
      meta.rows.invertY.labelNode.textContent = this.t('options.look');
      meta.rows.invertY.textNode.textContent = this.t('options.invertY');
      meta.rows.graphicsQuality.labelNode.textContent = this.t('options.graphicsQuality');
      meta.rows.graphicsQuality.hintNode.textContent = this.t('options.hints.graphics');
      meta.rows.fov.labelNode.textContent = this.t('options.fov');
      meta.rows.fov.hintNode.textContent = this.t('options.hints.fov');
      meta.rows.effectStrength.labelNode.textContent = this.t('options.effectStrength');
      meta.rows.effectStrength.hintNode.textContent = this.t('options.hints.effectStrength');
      meta.rows.crosshairPreset.labelNode.textContent = this.t('options.crosshairPreset');
      meta.rows.crosshairPreset.hintNode.textContent = this.t('options.hints.crosshairPreset');
      meta.rows.crosshairScale.labelNode.textContent = this.t('options.crosshairScale');
      meta.rows.crosshairScale.hintNode.textContent = this.t('options.hints.crosshairScale');
      meta.rows.hitDirectionIndicator.labelNode.textContent = this.t('options.hitDirectionIndicator');
      meta.rows.hitDirectionIndicator.textNode.textContent = this.t('options.hitDirectionIndicator');
      meta.rows.hitDirectionIndicator.hintNode.textContent = this.t('options.hints.hitDirectionIndicator');
      meta.rows.hudOpacity.labelNode.textContent = this.t('options.hudOpacity');
      meta.rows.minimapVisible.labelNode.textContent = this.t('options.minimapVisible');
      meta.rows.minimapVisible.textNode.textContent = this.t('options.minimapVisible');
      meta.rows.minimapScale.labelNode.textContent = this.t('options.minimapScale');
      meta.rows.minimapScale.hintNode.textContent = this.t('options.hints.minimapScale');
      meta.rows.enemyMarkersVisible.labelNode.textContent = this.t('options.enemyMarkersVisible');
      meta.rows.enemyMarkersVisible.textNode.textContent = this.t('options.enemyMarkersVisible');
      meta.rows.enemyMarkersVisible.hintNode.textContent = this.t('options.hints.enemyMarkers');
      meta.rows.highContrast.labelNode.textContent = this.t('options.highContrast');
      meta.rows.highContrast.textNode.textContent = this.t('options.highContrast');
      meta.rows.highContrast.hintNode.textContent = this.t('options.hints.highContrast');
      meta.resetBtn.textContent = this.t('common.restoreDefaults');
      meta.closeBtn.textContent = this.t('common.back');
    }

    if (this.refs.optionsOpenBtn) this.refs.optionsOpenBtn.textContent = this.t('common.options');
    if (this.refs.pauseOptionsBtn) this.refs.pauseOptionsBtn.textContent = this.t('common.options');
    if (this.refs.hangarOptionsBtn) this.refs.hangarOptionsBtn.textContent = this.t('common.options');

    if (this.refs.optionsLanguageSelect) {
      this.refs.optionsLanguageSelect.value = snapshot.language;
      [...this.refs.optionsLanguageSelect.options].forEach((option) => {
        option.textContent = formatLanguage(this, option.value);
      });
      this.refs.optionsLanguageValue.textContent = formatLanguage(this, snapshot.language);
    }

    if (this.refs.optionsSoundTestSelect) {
      this.refs.optionsSoundTestSelect.value = snapshot.soundTestTrackId;
      [...this.refs.optionsSoundTestSelect.options].forEach((option) => {
        option.textContent = this.getSoundTestTrackLabel(option.value, option.value);
      });
    }

    if (this.refs.optionsBgmVolume) {
      this.refs.optionsBgmVolume.value = String(snapshot.audio.bgmVolume);
      this.refs.optionsBgmVolumeValue.textContent = formatPercent(snapshot.audio.bgmVolume);
    }
    if (this.refs.optionsSfxVolume) {
      this.refs.optionsSfxVolume.value = String(snapshot.audio.sfxVolume);
      this.refs.optionsSfxVolumeValue.textContent = formatPercent(snapshot.audio.sfxVolume);
    }
    if (this.refs.optionsMouseSensitivity) {
      this.refs.optionsMouseSensitivity.value = String(snapshot.controls.mouseSensitivity);
      this.refs.optionsMouseSensitivityValue.textContent = formatSensitivity(snapshot.controls.mouseSensitivity);
    }
    if (this.refs.optionsInvertY) this.refs.optionsInvertY.checked = snapshot.controls.invertY === true;

    if (this.refs.optionsGraphicsQuality) {
      this.refs.optionsGraphicsQuality.value = snapshot.graphics.quality;
      [...this.refs.optionsGraphicsQuality.options].forEach((option) => {
        option.textContent = formatGraphicsQuality(this, option.value);
      });
      this.refs.optionsGraphicsQualityValue.textContent = formatGraphicsQuality(this, snapshot.graphics.quality);
    }
    if (this.refs.optionsFov) {
      this.refs.optionsFov.value = String(snapshot.graphics.fov);
      this.refs.optionsFovValue.textContent = formatFov(snapshot.graphics.fov);
    }
    if (this.refs.optionsEffectStrength) {
      this.refs.optionsEffectStrength.value = snapshot.graphics.effectStrength;
      [...this.refs.optionsEffectStrength.options].forEach((option) => {
        option.textContent = formatEffectStrength(this, option.value);
      });
      this.refs.optionsEffectStrengthValue.textContent = formatEffectStrength(this, snapshot.graphics.effectStrength);
    }

    if (this.refs.optionsCrosshairPreset) {
      this.refs.optionsCrosshairPreset.value = snapshot.hud.crosshairPreset;
      [...this.refs.optionsCrosshairPreset.options].forEach((option) => {
        option.textContent = formatCrosshairPreset(this, option.value);
      });
      this.refs.optionsCrosshairPresetValue.textContent = formatCrosshairPreset(this, snapshot.hud.crosshairPreset);
    }
    if (this.refs.optionsCrosshairScale) {
      this.refs.optionsCrosshairScale.value = String(snapshot.hud.crosshairScale);
      this.refs.optionsCrosshairScaleValue.textContent = formatPercent(snapshot.hud.crosshairScale);
    }
    if (this.refs.optionsHitDirectionIndicator) {
      this.refs.optionsHitDirectionIndicator.checked = snapshot.hud.hitDirectionIndicator !== 'off';
    }
    if (this.refs.optionsHudOpacity) {
      this.refs.optionsHudOpacity.value = String(snapshot.hud.opacity);
      this.refs.optionsHudOpacityValue.textContent = formatPercent(snapshot.hud.opacity);
    }
    if (this.refs.optionsHudMinimapVisible) this.refs.optionsHudMinimapVisible.checked = snapshot.hud.minimapVisible !== false;
    if (this.refs.optionsHudMinimapScale) {
      this.refs.optionsHudMinimapScale.value = String(snapshot.hud.minimapScale);
      this.refs.optionsHudMinimapScaleValue.textContent = formatPercent(snapshot.hud.minimapScale);
    }
    if (this.refs.optionsHudEnemyMarkersVisible) this.refs.optionsHudEnemyMarkersVisible.checked = snapshot.hud.enemyMarkersVisible !== false;
    if (this.refs.optionsHighContrast) this.refs.optionsHighContrast.checked = snapshot.hud.highContrast === true;

    const selectedTrackId = this.refs.optionsSoundTestSelect?.value || snapshot.soundTestTrackId;
    const trackLabel = this.getSoundTestTrackLabel(selectedTrackId, selectedTrackId ?? '-');
    if (this.refs.optionsSoundTestStatus) {
      this.refs.optionsSoundTestStatus.textContent = this.soundTestPlaying ? this.t('common.playing') : this.t('common.stopped');
      this.refs.optionsSoundTestStatus.style.color = this.soundTestPlaying ? '#8fffd2' : '#effcff';
    }
    if (this.refs.optionsSoundTestNowPlaying) {
      this.refs.optionsSoundTestNowPlaying.textContent = this.soundTestPlaying
        ? this.t('common.nowPlaying', { value: trackLabel })
        : this.t('common.selected', { value: trackLabel });
    }
    if (this.refs.optionsSoundTestStopBtn) this.refs.optionsSoundTestStopBtn.disabled = !this.soundTestPlaying;
    if (force) this.refs.optionsSoundTestPlayBtn?.removeAttribute?.('disabled');
  };
}

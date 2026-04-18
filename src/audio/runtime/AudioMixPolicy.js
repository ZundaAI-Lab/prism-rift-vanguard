import { clamp, getAudioRuntime, PAUSE_BGM_VOLUME_SCALE, PAUSE_SFX_VOLUME_SCALE } from './AudioManagerShared.js';

export const audioMixPolicyMethods = {
getBgmVolume() {
  return this.bgmVolume;
},

getSfxVolume() {
  return this.sfxVolume;
},

getEffectiveBgmVolume() {
  return clamp(this.bgmVolume * this.bgmStateVolumeScale * this.bgmFadeVolumeScale, 0, 1);
},

applyCurrentBgmVolume() {
  if (!this.currentBgmAudio) return;
  try {
    this.currentBgmAudio.volume = this.getEffectiveBgmVolume();
  } catch {
    // no-op
  }
},

applyActiveSfxVolumes() {
  for (const audio of this.activeSfx) {
    const runtime = getAudioRuntime(audio);
    try {
      audio.volume = clamp(this.sfxVolume * this.sfxStateVolumeScale * (runtime?.volumeScale ?? 1), 0, 1);
    } catch {
      // no-op
    }
  }
},

updateRuntimeMix({ mode } = {}) {
  const nextBgmScale = mode === 'paused' ? PAUSE_BGM_VOLUME_SCALE : 1;
  const nextSfxScale = mode === 'paused' ? PAUSE_SFX_VOLUME_SCALE : 1;

  if (nextBgmScale !== this.bgmStateVolumeScale) {
    this.bgmStateVolumeScale = nextBgmScale;
    this.applyCurrentBgmVolume();
  }
  if (nextSfxScale !== this.sfxStateVolumeScale) {
    this.sfxStateVolumeScale = nextSfxScale;
    this.applyActiveSfxVolumes();
  }
},

setBgmVolume(volume) {
  this.bgmVolume = clamp(Number(volume) || 0, 0, 1);
  this.applyCurrentBgmVolume();
  return this.bgmVolume;
},

setSfxVolume(volume) {
  this.sfxVolume = clamp(Number(volume) || 0, 0, 1);
  this.applyActiveSfxVolumes();
  return this.sfxVolume;
},

setGroupVolume(group, volume) {
  if (group === 'bgm') return this.setBgmVolume(volume);
  if (group === 'sfx') return this.setSfxVolume(volume);
  return null;
}
};

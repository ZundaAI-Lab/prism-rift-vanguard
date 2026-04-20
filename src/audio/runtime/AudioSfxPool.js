import {
  clamp,
  DEFAULT_SFX_POLICY,
  isAutoplayError,
  isVoiceReusable,
  getAudioRuntime,
  safePause,
  safeCurrentTime,
  disposeAudio,
} from './AudioManagerShared.js';

export const audioSfxPoolMethods = {
isSfxCoolingDown(trackId, cooldownMs = 0) {
  if (!trackId || !(cooldownMs > 0)) return false;
  const now = this.getNowMs();
  const lastPlayedAt = this.sfxLastPlayAt.get(trackId) ?? -Infinity;
  if ((now - lastPlayedAt) < cooldownMs) return true;
  this.sfxLastPlayAt.set(trackId, now);
  return false;
},

getSfxPolicy(trackId) {
  const track = this.sfxTracks[trackId];
  if (!track) return null;
  return {
    ...DEFAULT_SFX_POLICY,
    ...track,
    maxVoices: Math.max(1, Math.floor(track.maxVoices ?? DEFAULT_SFX_POLICY.maxVoices)),
    burstWindowMs: Math.max(0, Number(track.burstWindowMs ?? DEFAULT_SFX_POLICY.burstWindowMs) || 0),
    burstVolumeDecay: clamp(Number(track.burstVolumeDecay ?? DEFAULT_SFX_POLICY.burstVolumeDecay) || 1, 0.05, 1),
    minVolumeScale: clamp(Number(track.minVolumeScale ?? DEFAULT_SFX_POLICY.minVolumeScale) || DEFAULT_SFX_POLICY.minVolumeScale, 0.05, 1),
    duckingGroup: track.duckingGroup ?? null,
    spatialProfile: track.spatialProfile ?? null,
  };
},

ensureSfxPool(trackId, policy) {
  let pool = this.sfxPools.get(trackId);
  if (pool) return pool;
  pool = { trackId, maxVoices: policy.maxVoices, voices: [] };
  this.sfxPools.set(trackId, pool);
  return pool;
},

createSfxVoice(trackId, policy, pool) {
  const audio = this.createAudioElementForSource(policy.src);
  audio.preload = 'auto';
  audio.loop = false;
  audio.volume = 0;

  const runtime = getAudioRuntime(audio);
  runtime.trackId = trackId;
  runtime.voiceSerial = ++this.voiceSerialCounter;

  audio.addEventListener('ended', () => {
    this.releaseSfxVoice(audio, { keepReusable: true });
  });
  audio.addEventListener('error', () => {
    this.handleSfxVoiceError(trackId, audio);
  }, { once: true });

  pool.voices.push(audio);
  return audio;
},

findReusableSfxVoice(pool) {
  if (!pool?.voices?.length) return null;
  return pool.voices.find((voice) => isVoiceReusable(voice)) ?? null;
},

findStealableSfxVoice(pool) {
  if (!pool?.voices?.length) return null;

  let candidate = null;
  let oldestStartedAt = Infinity;
  for (const voice of pool.voices) {
    const runtime = getAudioRuntime(voice);
    const startedAt = Number(runtime?.startedAt);
    if (!Number.isFinite(startedAt) || startedAt < 0) continue;
    if (startedAt < oldestStartedAt) {
      oldestStartedAt = startedAt;
      candidate = voice;
    }
  }
  return candidate;
},

acquireSfxVoice(trackId, policy) {
  const pool = this.ensureSfxPool(trackId, policy);
  pool.maxVoices = policy.maxVoices;

  const reusable = this.findReusableSfxVoice(pool);
  if (reusable) return reusable;

  if (pool.voices.length < pool.maxVoices) {
    return this.createSfxVoice(trackId, policy, pool);
  }

  const stealable = this.findStealableSfxVoice(pool);
  if (!stealable) return null;

  this.releaseSfxVoice(stealable, { keepReusable: true });
  return stealable;
},

computeBurstVolumeScale(policy) {
  const groupKey = policy.duckingGroup;
  if (!groupKey || !(policy.burstWindowMs > 0)) return 1;

  const now = this.getNowMs();
  const cutoff = now - policy.burstWindowMs;
  let timestamps = this.sfxBurstState.get(groupKey);
  if (!timestamps) timestamps = [];

  let writeIndex = 0;
  for (let i = 0; i < timestamps.length; i += 1) {
    if (timestamps[i] >= cutoff) {
      timestamps[writeIndex] = timestamps[i];
      writeIndex += 1;
    }
  }
  timestamps.length = writeIndex;

  const overlapCount = timestamps.length;
  timestamps.push(now);
  this.sfxBurstState.set(groupKey, timestamps);

  return Math.max(policy.minVolumeScale, Math.pow(policy.burstVolumeDecay, overlapCount));
},

primeSfxVoice(audio, trackId, volumeScale, stereoPan = 0) {
  const runtime = getAudioRuntime(audio);
  runtime.trackId = trackId;
  runtime.volumeScale = volumeScale;
  runtime.startedAt = this.getNowMs();

  safePause(audio);
  safeCurrentTime(audio, 0);

  try {
    audio.loop = false;
    audio.volume = clamp(this.sfxVolume * this.sfxStateVolumeScale * volumeScale, 0, 1);
  } catch {
    // no-op
  }

  this.applyStereoPanToVoice(audio, stereoPan);
},

releaseSfxVoice(audio, { keepReusable = true } = {}) {
  if (!audio) return;
  this.activeSfx.delete(audio);
  const runtime = getAudioRuntime(audio);
  runtime.startedAt = -Infinity;
  runtime.volumeScale = 1;
  this.resetStereoPan(audio);

  if (keepReusable) {
    safePause(audio);
    safeCurrentTime(audio, 0);
    return;
  }

  disposeAudio(audio);
},

handleSfxVoiceError(trackId, audio) {
  this.releaseSfxVoice(audio, { keepReusable: false });
  this.markTrackUnavailable(trackId);
},

destroySfxPool(trackId) {
  const pool = this.sfxPools.get(trackId);
  if (!pool) return;
  for (const voice of pool.voices) {
    this.activeSfx.delete(voice);
    this.disposeSpatialNodes(voice);
    disposeAudio(voice);
  }
  this.sfxPools.delete(trackId);
},

playSfx(trackId, options = {}) {
  const { cooldownMs = 0 } = options;
  if (!trackId || this.sfxVolume <= 0 || this.unavailableTrackIds.has(trackId)) return false;
  if (this.playerSfxSuppressed && this.isPlayerSfxTrack(trackId)) return false;
  const policy = this.getSfxPolicy(trackId);
  if (!policy?.src) return false;

  const spatialVolumeScale = clamp(this.computeSpatialVolumeScale(policy, options), 0, 1);
  const stereoPan = this.computeSpatialStereoPan(options);
  if (spatialVolumeScale <= 0) return false;
  if (this.isSfxCoolingDown(trackId, cooldownMs)) return false;

  const audio = this.acquireSfxVoice(trackId, policy);
  if (!audio) return false;

  const volumeScale = this.computeBurstVolumeScale(policy) * spatialVolumeScale;
  this.primeSfxVoice(audio, trackId, volumeScale, stereoPan);
  this.activeSfx.add(audio);

  return this.tryPlaySfxVoice(audio, trackId);
},

tryPlaySfxVoice(audio, trackId) {
  if (!audio) return false;
  try {
    const playResult = audio.play?.();
    if (playResult?.catch) {
      playResult.catch((error) => {
        if (isAutoplayError(error)) {
          this.releaseSfxVoice(audio, { keepReusable: true });
          return;
        }
        if (error?.name === 'NotSupportedError') {
          this.handleSfxVoiceError(trackId, audio);
          return;
        }
        this.releaseSfxVoice(audio, { keepReusable: true });
      });
    }
    return true;
  } catch (error) {
    if (isAutoplayError(error)) {
      this.releaseSfxVoice(audio, { keepReusable: true });
      return false;
    }
    if (error?.name === 'NotSupportedError') {
      this.handleSfxVoiceError(trackId, audio);
      return false;
    }
    this.releaseSfxVoice(audio, { keepReusable: true });
    return false;
  }
},

stopAllSfx() {
  for (const audio of [...this.activeSfx]) {
    this.releaseSfxVoice(audio, { keepReusable: true });
  }
},

markTrackUnavailable(trackId) {
  if (!trackId) return;
  this.unavailableTrackIds.add(trackId);
  this.destroySfxPool(trackId);
},

isPlayerSfxTrack(trackId) {
  return typeof trackId === 'string' && trackId.startsWith('player');
},

stopMatchingSfx(predicate) {
  if (typeof predicate !== 'function') return;
  for (const audio of [...this.activeSfx]) {
    const runtime = getAudioRuntime(audio);
    const trackId = runtime?.trackId ?? null;
    if (!predicate(trackId, audio)) continue;
    this.releaseSfxVoice(audio, { keepReusable: true });
  }
},

clearSfxCooldownsMatching(predicate) {
  if (typeof predicate !== 'function') return;
  for (const trackId of [...this.sfxLastPlayAt.keys()]) {
    if (predicate(trackId)) this.sfxLastPlayAt.delete(trackId);
  }
},

setPlayerSfxSuppressed(suppressed) {
  const next = !!suppressed;
  if (this.playerSfxSuppressed === next) return this.playerSfxSuppressed;
  this.playerSfxSuppressed = next;
  if (next) {
    this.stopMatchingSfx((trackId) => this.isPlayerSfxTrack(trackId));
    this.clearSfxCooldownsMatching((trackId) => this.isPlayerSfxTrack(trackId));
  }
  return this.playerSfxSuppressed;
},

tryPlayMedia(audio, trackId, kind) {
  if (!audio) return false;
  try {
    const playResult = audio.play?.();
    if (playResult?.catch) {
      playResult.catch((error) => {
        if (isAutoplayError(error)) {
          if (kind === 'bgm') this.pendingBgmRequest = { trackId, options: { restart: false } };
          return;
        }
        if (error?.name === 'NotSupportedError') this.markTrackUnavailable(trackId);
        if (kind === 'bgm' && this.currentBgmAudio === audio && this.unavailableTrackIds.has(trackId)) {
          this.currentBgmAudio = null;
          this.currentBgmId = null;
        }
      });
    }
    return true;
  } catch (error) {
    if (!isAutoplayError(error) && error?.name === 'NotSupportedError') {
      this.markTrackUnavailable(trackId);
    }
    if (isAutoplayError(error) && kind === 'bgm') {
      this.pendingBgmRequest = { trackId, options: { restart: false } };
    }
    return false;
  }
}
};

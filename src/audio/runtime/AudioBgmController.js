import {
  clamp,
  MODE_BGM_ID,
  MISSION_BGM_ID,
  BOSS_BGM_ID,
  SUPPRESS_AUTO_BGM,
  BGM_START_SILENCE_MS,
  BGM_FADE_OUT_MS,
  getAudioRuntime,
  detachBgmErrorHandler,
  detachPreviewHandlers,
  disposeAudio,
  safePause,
  safeCurrentTime,
} from './AudioManagerShared.js';

export const audioBgmControllerMethods = {
bindUserGestureUnlock(target = document) {
  if (this.unlockHandlersBound || !target?.addEventListener) return;
  this.unlockTarget = target;
  this.unlockHandlersBound = true;
  this.handleUserGestureUnlock = () => {
    this.userUnlocked = true;
    this.resumeSpatialAudioContext();
    this.retryPendingBgm();
    this.retryPendingPreview();
    if (!this.pendingBgmRequest && !this.pendingPreviewRequest) this.unbindUserGestureUnlock();
  };
  target.addEventListener('pointerdown', this.handleUserGestureUnlock, true);
  target.addEventListener('keydown', this.handleUserGestureUnlock, true);
  target.addEventListener('touchstart', this.handleUserGestureUnlock, true);
},

unbindUserGestureUnlock() {
  if (!this.unlockHandlersBound || !this.unlockTarget?.removeEventListener || !this.handleUserGestureUnlock) return;
  this.unlockTarget.removeEventListener('pointerdown', this.handleUserGestureUnlock, true);
  this.unlockTarget.removeEventListener('keydown', this.handleUserGestureUnlock, true);
  this.unlockTarget.removeEventListener('touchstart', this.handleUserGestureUnlock, true);
  this.unlockHandlersBound = false;
  this.unlockTarget = null;
  this.handleUserGestureUnlock = null;
},

resolveDesiredBgmId({ mode, missionId, missionStatus, bossActive, bossForm } = {}) {
  if (mode === 'paused') return this.currentBgmId;
  if (mode === 'playing' && (missionStatus === 'awaitingBoss' || missionStatus === 'clearSequence')) return SUPPRESS_AUTO_BGM;
  if (MODE_BGM_ID[mode]) return MODE_BGM_ID[mode];
  if (mode !== 'playing') return null;

  const bossLikeState = bossActive || missionStatus === 'bossIntro' || missionStatus === 'boss';
  if (bossLikeState) {
    if (missionId === 'voidcrown' && bossForm === 'fighter') return 'bossVoidFighter';
    return BOSS_BGM_ID[missionId] ?? null;
  }
  return MISSION_BGM_ID[missionId] ?? null;
},

invalidateBgmSync() {
  this.lastSyncSignature = '';
},

shouldKeepCurrentBgmState(desiredBgmId, { autoBgmHoldActive = false } = {}) {
  if (autoBgmHoldActive) return true;
  if (this.previewBgmAudio) return true;
  if (desiredBgmId === SUPPRESS_AUTO_BGM) return true;
  if (!desiredBgmId) return !this.currentBgmAudio && !this.currentBgmId;
  if (this.unavailableTrackIds.has(desiredBgmId)) return true;
  const pendingStartMatches = !!this.pendingBgmStartTimer && this.currentBgmId === desiredBgmId && !!this.currentBgmAudio;
  if (pendingStartMatches) return true;
  if (this.pendingBgmRequest?.trackId === desiredBgmId) return true;
  return this.currentBgmId === desiredBgmId && !!this.currentBgmAudio;
},

syncGameState(snapshot = {}) {
  this.updateRuntimeMix(snapshot);
  const autoBgmHoldActive = this.isAutoBgmHoldActive(snapshot.mode ?? null);
  const desiredBgmId = this.resolveDesiredBgmId(snapshot);
  const signature = JSON.stringify({
    mode: snapshot.mode ?? null,
    missionId: snapshot.missionId ?? null,
    missionStatus: snapshot.missionStatus ?? null,
    bossActive: !!snapshot.bossActive,
    bossForm: snapshot.bossForm ?? null,
    autoBgmHoldActive,
  });
  if (signature === this.lastSyncSignature && this.shouldKeepCurrentBgmState(desiredBgmId, { autoBgmHoldActive })) return;
  this.lastSyncSignature = signature;

  if (autoBgmHoldActive || this.previewBgmAudio) return;
  if (this.suppressedAutoBgmMode) {
    const sameMode = snapshot.mode === this.suppressedAutoBgmMode;
    const sameTrack = !this.suppressedAutoBgmTrackId || desiredBgmId === this.suppressedAutoBgmTrackId;
    if (sameMode && sameTrack) {
      this.suppressedAutoBgmMode = null;
      this.suppressedAutoBgmTrackId = null;
      return;
    }
    if (!sameMode) {
      this.suppressedAutoBgmMode = null;
      this.suppressedAutoBgmTrackId = null;
    }
  }

  if (desiredBgmId === SUPPRESS_AUTO_BGM) return;
  if (!desiredBgmId) {
    this.stopBgm();
    return;
  }
  this.playBgm(desiredBgmId);
},

clearPendingBgmStart() {
  if (this.pendingBgmStartTimer) {
    clearTimeout(this.pendingBgmStartTimer);
    this.pendingBgmStartTimer = 0;
  }
  this.pendingBgmStartToken += 1;
},

cancelBgmFade({ resetScale = true } = {}) {
  if (this.bgmFadeFrameId) {
    cancelAnimationFrame(this.bgmFadeFrameId);
    this.bgmFadeFrameId = 0;
  }
  this.bgmFadeToken += 1;
  if (resetScale) {
    this.bgmFadeVolumeScale = 1;
    this.applyCurrentBgmVolume();
  }
},

suppressAutoBgmForMode(mode) {
  this.suppressedAutoBgmMode = mode ?? null;
  this.suppressedAutoBgmTrackId = mode ? (MODE_BGM_ID[mode] ?? null) : null;
},

holdAutoBgm({ durationMs = 0, mode = null } = {}) {
  const safeDuration = Math.max(0, Number(durationMs) || 0);
  if (!(safeDuration > 0)) {
    this.autoBgmHoldMode = null;
    this.autoBgmHoldUntilMs = 0;
    return false;
  }
  this.autoBgmHoldMode = mode ?? null;
  this.autoBgmHoldUntilMs = this.getNowMs() + safeDuration;
  return true;
},

isAutoBgmHoldActive(mode = null) {
  if (!(this.autoBgmHoldUntilMs > 0)) return false;
  if (this.autoBgmHoldMode && mode && this.autoBgmHoldMode !== mode) {
    this.autoBgmHoldMode = null;
    this.autoBgmHoldUntilMs = 0;
    return false;
  }
  if (this.getNowMs() < this.autoBgmHoldUntilMs) return true;
  this.autoBgmHoldMode = null;
  this.autoBgmHoldUntilMs = 0;
  return false;
},

fadeOutAndHoldAutoBgm({ durationMs = BGM_FADE_OUT_MS, silenceAfterFadeMs = 0, mode = null } = {}) {
  const safeFadeDuration = Math.max(1, Number(durationMs) || BGM_FADE_OUT_MS);
  const safeSilenceAfterFade = Math.max(0, Number(silenceAfterFadeMs) || 0);
  this.holdAutoBgm({ durationMs: safeFadeDuration + safeSilenceAfterFade, mode });
  return this.fadeOutBgm({ durationMs: safeFadeDuration, stopOnComplete: true });
},

playBgm(trackId, { restart = false, loop = null } = {}) {
  if (!trackId) {
    this.stopBgm();
    return false;
  }
  if (this.unavailableTrackIds.has(trackId)) return false;

  const track = this.bgmTracks[trackId];
  if (!track?.src) return false;

  if (this.currentBgmId === trackId && this.currentBgmAudio) {
    this.cancelBgmFade();
    if (typeof loop === 'boolean') this.currentBgmAudio.loop = loop;
    if (restart) safeCurrentTime(this.currentBgmAudio, 0);
    this.applyCurrentBgmVolume();
    if (this.currentBgmAudio.paused) this.tryPlayMedia(this.currentBgmAudio, trackId, 'bgm');
    return true;
  }

  this.stopBgm();

  const audio = this.createAudioElementForSource(track.src);
  audio.preload = 'auto';
  audio.loop = typeof loop === 'boolean' ? loop : track.loop !== false;
  this.bgmFadeVolumeScale = 1;
  this.currentBgmAudio = audio;
  this.currentBgmId = trackId;
  this.applyCurrentBgmVolume();

  const runtime = getAudioRuntime(audio);
  const handleError = () => {
    runtime.bgmErrorHandler = null;
    this.markTrackUnavailable(trackId);
    if (this.currentBgmAudio === audio) {
      this.currentBgmAudio = null;
      this.currentBgmId = null;
    }
    this.pendingBgmRequest = null;
    this.invalidateBgmSync();
    disposeAudio(audio);
  };

  runtime.bgmErrorHandler = handleError;
  audio.addEventListener('error', handleError, { once: true });
  this.clearPendingBgmStart();
  const startToken = this.pendingBgmStartToken;
  this.pendingBgmStartTimer = setTimeout(() => {
    if (startToken !== this.pendingBgmStartToken) return;
    this.pendingBgmStartTimer = 0;
    if (this.currentBgmAudio !== audio || this.currentBgmId !== trackId) return;
    this.tryPlayMedia(audio, trackId, 'bgm');
  }, BGM_START_SILENCE_MS);
  return true;
},

retryPendingBgm() {
  if (!this.pendingBgmRequest?.trackId) return false;
  const request = this.pendingBgmRequest;
  this.pendingBgmRequest = null;
  if (this.currentBgmId === request.trackId && this.currentBgmAudio) {
    return this.tryPlayMedia(this.currentBgmAudio, request.trackId, 'bgm');
  }
  return this.playBgm(request.trackId, request.options);
},

retryPendingPreview() {
  if (!this.pendingPreviewRequest?.trackId) return false;
  const request = this.pendingPreviewRequest;
  this.pendingPreviewRequest = null;
  if (this.previewBgmId === request.trackId && this.previewBgmAudio) {
    return this.tryPlayMedia(this.previewBgmAudio, request.trackId, 'preview');
  }
  return this.playPreviewBgm(request.trackId, request.options);
},

fadeOutBgm({ durationMs = BGM_FADE_OUT_MS, stopOnComplete = true } = {}) {
  if (!this.currentBgmAudio || !this.currentBgmId) return false;
  if (this.pendingBgmStartTimer) {
    this.stopBgm();
    return true;
  }

  this.cancelBgmFade({ resetScale: false });
  const token = this.bgmFadeToken;
  const startedAt = this.getNowMs();
  const startScale = this.bgmFadeVolumeScale;
  const audio = this.currentBgmAudio;
  const trackId = this.currentBgmId;
  const safeDuration = Math.max(1, Number(durationMs) || BGM_FADE_OUT_MS);

  const step = () => {
    if (token !== this.bgmFadeToken) return;
    if (this.currentBgmAudio !== audio || this.currentBgmId !== trackId) return;

    const progress = clamp((this.getNowMs() - startedAt) / safeDuration, 0, 1);
    this.bgmFadeVolumeScale = clamp(startScale * (1 - progress), 0, 1);
    this.applyCurrentBgmVolume();

    if (progress >= 1) {
      this.bgmFadeFrameId = 0;
      this.bgmFadeVolumeScale = 1;
      if (stopOnComplete && this.currentBgmAudio === audio && this.currentBgmId === trackId) {
        this.stopBgm();
      }
      return;
    }

    this.bgmFadeFrameId = requestAnimationFrame(step);
  };

  this.bgmFadeFrameId = requestAnimationFrame(step);
  return true;
},

pauseBgm() {
  safePause(this.currentBgmAudio);
},

resumeBgm() {
  if (!this.currentBgmAudio || !this.currentBgmId) return false;
  return this.tryPlayMedia(this.currentBgmAudio, this.currentBgmId, 'bgm');
},

applyPreviewBgmVolume() {
  if (!this.previewBgmAudio) return;
  try {
    this.previewBgmAudio.volume = clamp(this.bgmVolume, 0, 1);
  } catch {
    // no-op
  }
},

playPreviewBgm(trackId, { restart = true, loop = null } = {}) {
  if (!trackId || this.unavailableTrackIds.has(trackId)) return false;
  const track = this.bgmTracks[trackId];
  if (!track?.src) return false;

  const reuseCurrent = this.previewBgmId === trackId && this.previewBgmAudio;
  if (reuseCurrent) {
    if (typeof loop === 'boolean') this.previewBgmAudio.loop = loop;
    if (restart) safeCurrentTime(this.previewBgmAudio, 0);
    this.applyPreviewBgmVolume();
    if (this.previewBgmAudio.paused) this.tryPlayMedia(this.previewBgmAudio, trackId, 'preview');
    return !!this.previewBgmAudio && this.previewBgmId === trackId && !this.unavailableTrackIds.has(trackId);
  }

  // 重要: サウンドテストは本編 BGM とは別レーン。
  // currentBgmId/currentBgmAudio や mission キャッシュ所有権には触らない。
  this.stopPreviewBgm({ resumeMain: false });
  this.pauseBgm();

  const audio = new Audio(track.src);
  audio.preload = 'auto';
  audio.loop = typeof loop === 'boolean' ? loop : track.loop !== false;
  this.previewBgmToken += 1;
  const previewToken = this.previewBgmToken;
  this.previewBgmAudio = audio;
  this.previewBgmId = trackId;
  this.applyPreviewBgmVolume();

  const stopPreview = ({ resumeMain = true } = {}) => {
    if (previewToken !== this.previewBgmToken) return;
    this.stopPreviewBgm({ resumeMain });
  };

  const runtime = getAudioRuntime(audio);
  runtime.previewToken = previewToken;
  const handleEnded = () => stopPreview({ resumeMain: true });
  const handleError = () => {
    if (previewToken !== this.previewBgmToken || this.previewBgmAudio !== audio || this.previewBgmId !== trackId) return;
    this.markTrackUnavailable(trackId);
    stopPreview({ resumeMain: true });
  };
  runtime.previewEndedHandler = handleEnded;
  runtime.previewErrorHandler = handleError;
  audio.addEventListener('ended', handleEnded, { once: true });
  audio.addEventListener('error', handleError, { once: true });

  this.tryPlayMedia(audio, trackId, 'preview');
  return this.previewBgmAudio === audio && this.previewBgmId === trackId && !this.unavailableTrackIds.has(trackId);
},

stopPreviewBgm({ resumeMain = true } = {}) {
  this.previewBgmToken += 1;
  this.pendingPreviewRequest = null;
  const previewAudio = this.previewBgmAudio;
  this.previewBgmAudio = null;
  this.previewBgmId = null;
  detachPreviewHandlers(previewAudio);
  disposeAudio(previewAudio);
  if (resumeMain && !this.resumeBgm()) this.invalidateBgmSync();
  return true;
},

stopBgm({ preservePending = false, invalidateSync = true } = {}) {
  this.cancelBgmFade({ resetScale: false });
  this.clearPendingBgmStart();
  if (!preservePending) this.pendingBgmRequest = null;
  const currentAudio = this.currentBgmAudio;
  detachBgmErrorHandler(currentAudio);
  disposeAudio(currentAudio);
  this.currentBgmAudio = null;
  this.currentBgmId = null;
  this.bgmFadeVolumeScale = 1;
  if (invalidateSync) this.invalidateBgmSync();
  return true;
}
};

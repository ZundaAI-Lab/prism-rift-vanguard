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
    this.unbindUserGestureUnlock();
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

syncGameState(snapshot = {}) {
  this.updateRuntimeMix(snapshot);
  const autoBgmHoldActive = this.isAutoBgmHoldActive(snapshot.mode ?? null);
  const signature = JSON.stringify({
    mode: snapshot.mode ?? null,
    missionId: snapshot.missionId ?? null,
    missionStatus: snapshot.missionStatus ?? null,
    bossActive: !!snapshot.bossActive,
    bossForm: snapshot.bossForm ?? null,
    autoBgmHoldActive,
  });
  if (signature === this.lastSyncSignature) return;
  this.lastSyncSignature = signature;

  const desiredBgmId = this.resolveDesiredBgmId(snapshot);
  if (autoBgmHoldActive) return;
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

stopBgm({ preservePending = false } = {}) {
  this.cancelBgmFade({ resetScale: false });
  this.clearPendingBgmStart();
  if (!preservePending) this.pendingBgmRequest = null;
  const currentAudio = this.currentBgmAudio;
  detachBgmErrorHandler(currentAudio);
  disposeAudio(currentAudio);
  this.currentBgmAudio = null;
  this.currentBgmId = null;
  this.bgmFadeVolumeScale = 1;
  return true;
}
};

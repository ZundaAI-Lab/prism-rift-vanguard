import {
  getAudioRuntime,
  isAutoplayError,
  isPlaybackAbortError,
} from './AudioManagerShared.js';

/**
 * Responsibility:
 * - BGM / preview の HTMLMediaElement.play() Promise と user gesture retry を管理する。
 *
 * Rules:
 * - SFX pool には BGM / preview の pending retry を持ち込まない。
 * - play() の reject は、同じ Audio 要素・同じ track・同じ再生世代がまだ有効な場合だけ処理する。
 * - AbortError は停止・src 差し替え・pause による中断として扱い、停止済み音源を gesture retry へ戻さない。
 */
export const audioPlaybackRuntimeMethods = {
  isActiveMediaPlaybackTarget(audio, trackId, kind) {
    if (!audio || !trackId) return false;

    if (kind === 'bgm') {
      return this.currentBgmAudio === audio && this.currentBgmId === trackId;
    }

    if (kind === 'preview') {
      const runtime = getAudioRuntime(audio);
      const tokenMatches = runtime?.previewToken === this.previewBgmToken;
      return tokenMatches && this.previewBgmAudio === audio && this.previewBgmId === trackId;
    }

    return false;
  },

  queueMediaRetryOnGesture(audio, trackId, kind, retryOptions, playSerial) {
    const runtime = getAudioRuntime(audio);
    if (runtime?.mediaPlaySerial !== playSerial) return false;
    if (!this.isActiveMediaPlaybackTarget(audio, trackId, kind)) return false;

    if (kind === 'bgm') {
      this.pendingBgmRequest = { trackId, options: retryOptions };
    } else if (kind === 'preview') {
      this.pendingPreviewRequest = { trackId, options: retryOptions };
    } else {
      return false;
    }

    this.bindUserGestureUnlock?.();
    return true;
  },

  handleMediaPlayFailure(audio, trackId, kind, error, retryOptions, playSerial) {
    const runtime = getAudioRuntime(audio);
    if (runtime?.mediaPlaySerial !== playSerial) return false;
    if (!this.isActiveMediaPlaybackTarget(audio, trackId, kind)) return false;

    if (isAutoplayError(error)) {
      return this.queueMediaRetryOnGesture(audio, trackId, kind, retryOptions, playSerial);
    }

    if (isPlaybackAbortError(error)) {
      return false;
    }

    if (error?.name === 'NotSupportedError') {
      this.markTrackUnavailable(trackId);
      if (kind === 'bgm' && this.currentBgmAudio === audio && this.currentBgmId === trackId) {
        this.stopBgm?.({ preservePending: false, invalidateSync: true });
      } else if (kind === 'preview' && this.previewBgmAudio === audio && this.previewBgmId === trackId) {
        this.stopPreviewBgm?.({ resumeMain: true });
      }
      return false;
    }

    return false;
  },

  tryPlayMedia(audio, trackId, kind) {
    if (!this.isActiveMediaPlaybackTarget(audio, trackId, kind)) return false;

    const runtime = getAudioRuntime(audio);
    runtime.mediaPlaySerial = (runtime.mediaPlaySerial ?? 0) + 1;
    const playSerial = runtime.mediaPlaySerial;
    const retryOptions = { restart: false, loop: !!audio?.loop };

    try {
      const playResult = audio.play?.();
      if (playResult?.catch) {
        playResult.catch((error) => {
          this.handleMediaPlayFailure(audio, trackId, kind, error, retryOptions, playSerial);
        });
      }
      return true;
    } catch (error) {
      this.handleMediaPlayFailure(audio, trackId, kind, error, retryOptions, playSerial);
      return false;
    }
  },
};

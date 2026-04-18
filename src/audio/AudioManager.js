import { BGM_TRACKS, SFX_TRACKS } from '../data/audio.js';
import { clamp } from '../utils/math.js';
import { audioMixPolicyMethods } from './runtime/AudioMixPolicy.js';
import { audioSpatialMethods } from './runtime/AudioSpatial.js';
import { audioBgmControllerMethods } from './runtime/AudioBgmController.js';
import { audioSfxPoolMethods } from './runtime/AudioSfxPool.js';

/**
 * Responsibility:
 * - Central audio gateway for BGM/SFX playback and group-level volume control.
 *
 * Rules:
 * - Gameplay/UI systems must request sound through this module instead of constructing Audio directly.
 * - Volume is owned per group (BGM/SFX), not per file.
 * - Missing files or failed loads must degrade silently to no-audio; they must never break the game loop.
 * - BGM selection may be driven from runtime state, but asset catalog stays in src/data/audio.js.
 */
export class AudioManager {
  constructor({ bgmTracks = BGM_TRACKS, sfxTracks = SFX_TRACKS, bgmVolume = 0.7, sfxVolume = 0.85, getPlayerPosition = null, getListenerObject = null } = {}) {
    this.bgmTracks = bgmTracks;
    this.sfxTracks = sfxTracks;
    this.bgmVolume = clamp(Number.isFinite(bgmVolume) ? bgmVolume : 0.7, 0, 1);
    this.sfxVolume = clamp(Number.isFinite(sfxVolume) ? sfxVolume : 0.85, 0, 1);
    this.getPlayerPosition = typeof getPlayerPosition === 'function' ? getPlayerPosition : null;
    this.getListenerObject = typeof getListenerObject === 'function' ? getListenerObject : null;

    this.currentBgmId = null;
    this.currentBgmAudio = null;
    this.pendingBgmRequest = null;
    this.unavailableTrackIds = new Set();
    this.activeSfx = new Set();
    this.sfxPools = new Map();
    this.sfxBurstState = new Map();
    this.unlockHandlersBound = false;
    this.userUnlocked = false;
    this.lastSyncSignature = '';
    this.sfxLastPlayAt = new Map();
    this.voiceSerialCounter = 0;
    this.pendingBgmStartTimer = 0;
    this.pendingBgmStartToken = 0;
    this.bgmFadeFrameId = 0;
    this.bgmFadeToken = 0;
    this.bgmFadeVolumeScale = 1;
    this.bgmStateVolumeScale = 1;
    this.sfxStateVolumeScale = 1;
    this.suppressedAutoBgmMode = null;
    this.suppressedAutoBgmTrackId = null;
    this.autoBgmHoldMode = null;
    this.autoBgmHoldUntilMs = 0;
    this.playerSfxSuppressed = false;
    this.audioContext = null;
    this.audioContextUnavailable = false;

    this.bindUserGestureUnlock();
  }

  dispose() {
    this.unbindUserGestureUnlock?.();
    this.clearPendingBgmStart?.();
    this.cancelBgmFade?.();
    this.stopBgm?.();
    this.stopAllSfx?.();

    for (const trackId of [...this.sfxPools.keys()]) {
      this.destroySfxPool?.(trackId);
    }

    this.activeSfx.clear?.();
    this.sfxBurstState.clear?.();
    this.sfxLastPlayAt.clear?.();
    this.pendingBgmRequest = null;

    try {
      this.audioContext?.close?.();
    } catch {
      // no-op
    }
    this.audioContext = null;
  }
}

Object.assign(
  AudioManager.prototype,
  audioMixPolicyMethods,
  audioSpatialMethods,
  audioBgmControllerMethods,
  audioSfxPoolMethods,
);

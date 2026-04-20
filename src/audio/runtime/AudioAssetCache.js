import { disposeAudio } from './AudioManagerShared.js';

const AUDIO_PRELOAD_CONCURRENCY = 6;
const AUDIO_PROBE_TIMEOUT_MS = 15000;

function buildProgressSnapshot(state) {
  const total = Math.max(0, Number(state?.total) || 0);
  const completed = Math.max(0, Number(state?.completed) || 0);
  const succeeded = Math.max(0, Number(state?.succeeded) || 0);
  const failed = Math.max(0, Number(state?.failed) || 0);
  const pending = Math.max(0, total - completed);
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 100;
  return {
    total,
    completed,
    succeeded,
    failed,
    pending,
    percent,
    ready: pending <= 0,
  };
}

async function runWithConcurrency(items, worker, concurrency = AUDIO_PRELOAD_CONCURRENCY) {
  const queue = Array.isArray(items) ? items.slice() : [];
  const workerCount = Math.max(1, Math.min(Number(concurrency) || 1, queue.length || 1));
  const runners = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(runners);
}

export const audioAssetCacheMethods = {
  buildAudioSourceTrackIndex() {
    const index = new Map();
    const catalogs = [this.bgmTracks, this.sfxTracks];
    for (const catalog of catalogs) {
      for (const [trackId, track] of Object.entries(catalog ?? {})) {
        const src = track?.src;
        if (!src) continue;
        let trackIds = index.get(src);
        if (!trackIds) {
          trackIds = new Set();
          index.set(src, trackIds);
        }
        trackIds.add(trackId);
      }
    }
    return index;
  },

  getTrackIdsForAudioSource(src) {
    if (!src) return [];
    return [...(this.audioSourceTrackIndex?.get(src) ?? [])];
  },

  getAllAudioSources() {
    return [...(this.audioSourceTrackIndex?.keys?.() ?? [])];
  },

  getAudioPreloadSnapshot() {
    return buildProgressSnapshot(this.audioPreloadState);
  },

  notifyAudioPreloadProgress(onProgress) {
    if (typeof onProgress !== 'function') return;
    onProgress(this.getAudioPreloadSnapshot());
  },

  createAudioElementForSource(src) {
    return new Audio(this.resolveAudioSource(src));
  },

  resolveAudioSource(src) {
    if (!src) return '';
    const entry = this.audioAssetCache.get(src);
    return entry?.objectUrl || src;
  },

  async preloadAllAssets({ onProgress } = {}) {
    if (this.audioPreloadPromise) {
      this.notifyAudioPreloadProgress(onProgress);
      return this.audioPreloadPromise;
    }

    const sources = this.getAllAudioSources();
    this.audioPreloadState = {
      total: sources.length,
      completed: 0,
      succeeded: 0,
      failed: 0,
    };
    this.notifyAudioPreloadProgress(onProgress);

    this.audioPreloadPromise = (async () => {
      await runWithConcurrency(sources, async (src) => {
        let success = false;
        try {
          await this.preloadAudioSource(src);
          success = true;
        } catch {
          success = false;
        } finally {
          this.audioPreloadState.completed += 1;
          if (success) this.audioPreloadState.succeeded += 1;
          else this.audioPreloadState.failed += 1;
          this.notifyAudioPreloadProgress(onProgress);
        }
      });
      return this.getAudioPreloadSnapshot();
    })();

    try {
      return await this.audioPreloadPromise;
    } finally {
      this.audioPreloadPromise = null;
    }
  },

  async preloadAudioSource(src) {
    if (!src) return null;

    const existingEntry = this.audioAssetCache.get(src);
    if (existingEntry?.status === 'ready') return existingEntry;
    if (existingEntry?.promise) return existingEntry.promise;

    const entry = existingEntry ?? {
      src,
      status: 'idle',
      objectUrl: null,
      mode: 'origin',
      error: null,
      promise: null,
    };
    entry.status = 'loading';
    entry.error = null;
    this.audioAssetCache.set(src, entry);

    entry.promise = (async () => {
      try {
        const response = await fetch(src, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        await this.probeAudioReady(objectUrl);
        entry.objectUrl = objectUrl;
        entry.mode = 'blob';
      } catch (blobError) {
        if (entry.objectUrl) {
          URL.revokeObjectURL(entry.objectUrl);
          entry.objectUrl = null;
        }
        try {
          await this.probeAudioReady(src);
          entry.mode = 'origin';
        } catch (originError) {
          entry.status = 'error';
          entry.error = originError;
          this.markAudioSourceUnavailable(src);
          throw originError;
        }
      }

      entry.status = 'ready';
      return entry;
    })().finally(() => {
      entry.promise = null;
    });

    return entry.promise;
  },

  async probeAudioReady(src) {
    if (!src) return false;
    await new Promise((resolve, reject) => {
      const audio = new Audio();
      let settled = false;
      let timeoutId = 0;

      const cleanup = () => {
        clearTimeout(timeoutId);
        try {
          audio.removeEventListener('loadeddata', handleReady);
          audio.removeEventListener('canplaythrough', handleReady);
          audio.removeEventListener('error', handleError);
        } catch {
          // no-op
        }
        disposeAudio(audio);
      };

      const finish = (callback, payload = null) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback(payload);
      };

      const handleReady = () => finish(resolve);
      const handleError = () => finish(reject, new Error('Audio decode failed.'));

      timeoutId = window.setTimeout(() => {
        finish(reject, new Error('Audio preload timed out.'));
      }, AUDIO_PROBE_TIMEOUT_MS);

      audio.preload = 'auto';
      audio.addEventListener('loadeddata', handleReady, { once: true });
      audio.addEventListener('canplaythrough', handleReady, { once: true });
      audio.addEventListener('error', handleError, { once: true });
      audio.src = src;
      audio.load?.();
    });
    return true;
  },

  markAudioSourceUnavailable(src) {
    for (const trackId of this.getTrackIdsForAudioSource(src)) {
      this.markTrackUnavailable(trackId);
    }
  },

  releaseAudioAssetCache() {
    for (const entry of this.audioAssetCache.values()) {
      if (entry?.objectUrl) {
        try {
          URL.revokeObjectURL(entry.objectUrl);
        } catch {
          // no-op
        }
      }
    }
    this.audioAssetCache.clear();
  },
};

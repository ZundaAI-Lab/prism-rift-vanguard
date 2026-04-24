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
  getTrackDefinition(trackId) {
    if (!trackId) return null;
    return this.bgmTracks?.[trackId] ?? this.sfxTracks?.[trackId] ?? null;
  },

  getTrackSourceById(trackId) {
    return this.getTrackDefinition(trackId)?.src ?? '';
  },

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

  getAudioSourcesForTrackIds(trackIds = []) {
    const unique = new Set();
    for (const trackId of trackIds) {
      const src = this.getTrackSourceById(trackId);
      if (src) unique.add(src);
    }
    return [...unique];
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

  attachOwnerToSource(src, ownerId) {
    if (!src || !ownerId) return null;
    const entry = this.audioAssetCache.get(src) ?? {
      src,
      status: 'idle',
      objectUrl: null,
      mode: 'origin',
      error: null,
      promise: null,
      owners: new Set(),
    };
    if (!(entry.owners instanceof Set)) entry.owners = new Set();
    entry.owners.add(ownerId);
    this.audioAssetCache.set(src, entry);

    let ownedSources = this.audioAssetOwners.get(ownerId);
    if (!ownedSources) {
      ownedSources = new Set();
      this.audioAssetOwners.set(ownerId, ownedSources);
    }
    ownedSources.add(src);
    return entry;
  },

  releaseAudioSourceIfUnused(src) {
    if (!src) return false;
    const entry = this.audioAssetCache.get(src);
    if (!entry) return false;
    const ownerCount = entry.owners instanceof Set ? entry.owners.size : 0;
    if (ownerCount > 0 || entry.promise) return false;
    if (entry.objectUrl) {
      try {
        URL.revokeObjectURL(entry.objectUrl);
      } catch {
        // no-op
      }
    }
    this.audioAssetCache.delete(src);
    return true;
  },

  releaseOwner(ownerId) {
    if (!ownerId) return false;
    const ownedSources = this.audioAssetOwners.get(ownerId);
    if (!ownedSources) return false;
    for (const src of ownedSources) {
      const entry = this.audioAssetCache.get(src);
      if (!entry) continue;
      if (entry.owners instanceof Set) entry.owners.delete(ownerId);
      this.releaseAudioSourceIfUnused(src);
    }
    this.audioAssetOwners.delete(ownerId);
    return true;
  },

  resolveAudioSource(src) {
    if (!src) return '';
    const entry = this.audioAssetCache.get(src);
    return entry?.objectUrl || src;
  },

  async preloadTrackIds(trackIds = [], { ownerId = null, onProgress } = {}) {
    const sources = this.getAudioSourcesForTrackIds(trackIds);
    if (ownerId) {
      for (const src of sources) this.attachOwnerToSource(src, ownerId);
    }

    this.audioPreloadState = {
      total: sources.length,
      completed: 0,
      succeeded: 0,
      failed: 0,
    };
    this.notifyAudioPreloadProgress(onProgress);

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
  },

  async preloadBootAssets({ onProgress } = {}) {
    if (this.audioPreloadPromise) {
      this.notifyAudioPreloadProgress(onProgress);
      return this.audioPreloadPromise;
    }

    const trackIds = [
      ...this.residentBgmTrackIds,
      ...Object.keys(this.sfxTracks ?? {}),
    ];

    this.audioPreloadPromise = this.preloadTrackIds(trackIds, {
      ownerId: this.residentAudioOwnerId,
      onProgress,
    });

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
      owners: new Set(),
    };
    entry.status = 'loading';
    entry.error = null;
    this.audioAssetCache.set(src, entry);

    if (!(entry.owners instanceof Set)) entry.owners = new Set();

    entry.promise = (async () => {
      let pendingObjectUrl = null;
      try {
        const response = await fetch(src, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
        const blob = await response.blob();
        pendingObjectUrl = URL.createObjectURL(blob);
        await this.probeAudioReady(pendingObjectUrl);
        entry.objectUrl = pendingObjectUrl;
        pendingObjectUrl = null;
        entry.mode = 'blob';
      } catch (blobError) {
        if (pendingObjectUrl) {
          URL.revokeObjectURL(pendingObjectUrl);
          pendingObjectUrl = null;
        }
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
          // この音源だけを失敗扱いにし、参照トラックを unavailable へ切り替える。
          // 以後の再生要求は無音 no-op として扱い、全体の進行は止めない。
          this.markAudioSourceUnavailable(src);
          throw originError;
        }
      }

      entry.status = 'ready';
      return entry;
    })().finally(() => {
      entry.promise = null;
      this.releaseAudioSourceIfUnused(src);
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

  isCurrentBgmOwnedByActiveMissionAudioSet() {
    if (!this.currentBgmId || !this.activeMissionAudioOwnerId) return false;
    const ownedSources = this.audioAssetOwners.get(this.activeMissionAudioOwnerId);
    if (!ownedSources?.size) return false;
    const currentSource = this.getTrackSourceById(this.currentBgmId);
    return !!currentSource && ownedSources.has(currentSource);
  },

  stopAndReleaseActiveMissionAudioSet() {
    // 重要: mission owner 解放より先に、owner 配下の現在再生 BGM を必ず停止する。
    // object URL revoke 後の error で曲が unavailable 化する事故をここで防ぐ。
    if (this.isCurrentBgmOwnedByActiveMissionAudioSet()) {
      this.stopBgm({ invalidateSync: false });
    }
    return this.releaseActiveMissionAudioSet();
  },

  activateMissionAudioSet(missionId) {
    this.stopAndReleaseActiveMissionAudioSet();
    const trackIds = this.resolveMissionScopedBgmTrackIds?.(missionId) ?? [];
    if (!trackIds.length) return null;
    const ownerId = `mission:${++this.missionAudioOwnerSerial}`;
    this.activeMissionAudioOwnerId = ownerId;
    this.preloadTrackIds(trackIds, { ownerId }).catch(() => {
      // ミッション専用 BGM の読み込み失敗は無音継続。
    });
    return ownerId;
  },

  releaseActiveMissionAudioSet() {
    if (!this.activeMissionAudioOwnerId) return false;
    const released = this.releaseOwner(this.activeMissionAudioOwnerId);
    this.activeMissionAudioOwnerId = null;
    return released;
  },

  releaseAudioAssetCache() {
    this.audioAssetOwners.clear();
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

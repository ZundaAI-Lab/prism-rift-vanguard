const DEFAULT_MAX_FRAMES = 300;
const SUMMARY_WINDOW_SHORT = 60;
const SUMMARY_WINDOW_LONG = 300;

function clampWindow(frames, limit) {
  if (!Array.isArray(frames) || frames.length === 0) return [];
  return frames.slice(Math.max(0, frames.length - limit));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function max(values) {
  if (!values.length) return 0;
  return values.reduce((best, value) => (value > best ? value : best), values[0]);
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index] ?? 0;
}

function cloneRecord(record) {
  return JSON.parse(JSON.stringify(record));
}

function accumulateNamedNumber(target, source) {
  for (const [name, value] of Object.entries(source ?? {})) {
    target[name] = (target[name] ?? 0) + (Number.isFinite(value) ? value : 0);
  }
}

function accumulateSampleSum(target, samples, field) {
  for (const [name, entry] of Object.entries(samples ?? {})) {
    const safe = target[name] ?? { sum: 0, count: 0 };
    safe[field] += Number.isFinite(entry?.[field]) ? entry[field] : 0;
    target[name] = safe;
  }
}

function averageNamedNumber(sumMap, frameCount) {
  const result = {};
  if (frameCount <= 0) return result;
  for (const [name, value] of Object.entries(sumMap ?? {})) {
    result[name] = value / frameCount;
  }
  return result;
}

function averageSamples(sampleMap) {
  const result = {};
  for (const [name, entry] of Object.entries(sampleMap ?? {})) {
    const count = entry?.count ?? 0;
    result[name] = count > 0 ? (entry.sum / count) : 0;
  }
  return result;
}

function buildSectionStats(frames, shortFrames, longFrames) {
  const names = new Set();
  for (const frame of frames) {
    for (const key of Object.keys(frame.sections ?? {})) names.add(key);
  }
  const result = {};
  for (const name of names) {
    const shortValues = shortFrames.map((frame) => frame.sections?.[name] ?? 0);
    const longValues = longFrames.map((frame) => frame.sections?.[name] ?? 0);
    result[name] = {
      avg60: mean(shortValues),
      p95_300: percentile(longValues, 0.95),
      max300: max(longValues),
      now: frames[frames.length - 1]?.sections?.[name] ?? 0,
    };
  }
  return result;
}

function buildCounterStats(shortFrames) {
  const totals = {};
  for (const frame of shortFrames) accumulateNamedNumber(totals, frame.counters);
  return averageNamedNumber(totals, shortFrames.length);
}

function buildSampleStats(shortFrames) {
  const totals = {};
  for (const frame of shortFrames) {
    accumulateSampleSum(totals, frame.samples, 'sum');
    accumulateSampleSum(totals, frame.samples, 'count');
  }
  return averageSamples(totals);
}

function buildGaugeStats(frames) {
  return cloneRecord(frames[frames.length - 1]?.gauges ?? {});
}

function deltaValue(current, baseline) {
  if (!Number.isFinite(current) || !Number.isFinite(baseline)) return 0;
  return current - baseline;
}

function buildSnapshotMeta(snapshots = {}) {
  const result = {};
  for (const [slot, snapshot] of Object.entries(snapshots)) {
    result[slot] = { slot, capturedAt: snapshot?.capturedAt ?? 0 };
  }
  return result;
}

/**
 * Responsibility:
 * - デバッグ専用の処理時間・件数・候補数・現在値を収集し、比較用 summary を返す。
 *
 * Rules:
 * - DOM を直接触らない。表示は UI モジュールへ委譲する。
 * - ゲームプレイの真実源や分岐条件にならず、観測専用に徹する。
 * - 計測 API は副作用を最小にし、debug 無効時は NullPerformanceMonitor へ差し替える。
 */
export class PerformanceMonitor {
  constructor({ maxFrames = DEFAULT_MAX_FRAMES } = {}) {
    this.maxFrames = Math.max(60, Math.trunc(maxFrames) || DEFAULT_MAX_FRAMES);
    this.frames = [];
    this.snapshots = {};
    this.currentFrame = null;
    this.latestFrame = null;
    this.summaryCache = null;
    this.summaryDirty = true;
  }

  beginFrame(dt = 0) {
    this.currentFrame = {
      startedAt: performance.now(),
      dt,
      sectionStarts: {},
      sections: {},
      counters: {},
      samples: {},
      gauges: { dtMs: (Number(dt) || 0) * 1000 },
    };
  }

  beginSection(name) {
    if (!this.currentFrame || !name) return;
    this.currentFrame.sectionStarts[name] = performance.now();
  }

  endSection(name) {
    if (!this.currentFrame || !name) return 0;
    const startedAt = this.currentFrame.sectionStarts[name];
    if (!Number.isFinite(startedAt)) return 0;
    const elapsed = performance.now() - startedAt;
    this.currentFrame.sections[name] = (this.currentFrame.sections[name] ?? 0) + elapsed;
    delete this.currentFrame.sectionStarts[name];
    return elapsed;
  }

  measure(name, fn) {
    if (typeof fn !== 'function') return undefined;
    this.beginSection(name);
    try {
      return fn();
    } finally {
      this.endSection(name);
    }
  }

  count(name, value = 1) {
    if (!this.currentFrame || !name) return;
    this.currentFrame.counters[name] = (this.currentFrame.counters[name] ?? 0) + (Number(value) || 0);
  }

  sample(name, value) {
    if (!this.currentFrame || !name || !Number.isFinite(value)) return;
    const entry = this.currentFrame.samples[name] ?? { sum: 0, count: 0 };
    entry.sum += value;
    entry.count += 1;
    this.currentFrame.samples[name] = entry;
  }

  setGauge(name, value) {
    if (!this.currentFrame || !name) return;
    this.currentFrame.gauges[name] = value;
  }

  captureSnapshot(slot = 'baseline') {
    const summary = this.getSummary();
    const snapshot = {
      slot,
      capturedAt: Date.now(),
      summary: cloneRecord(summary),
    };
    this.snapshots[slot] = snapshot;
    this.summaryDirty = true;
    return snapshot;
  }

  clearSnapshots() {
    this.snapshots = {};
    this.summaryDirty = true;
  }

  getSnapshot(slot) {
    return this.snapshots?.[slot] ?? null;
  }

  getLatestFrame() {
    return this.latestFrame ? cloneRecord(this.latestFrame) : null;
  }

  endFrame(game = null) {
    if (!this.currentFrame) return;
    const frame = this.currentFrame;
    frame.frameMs = performance.now() - frame.startedAt;
    frame.sections.totalFrame = frame.frameMs;
    frame.fps = frame.frameMs > 0 ? (1000 / frame.frameMs) : 0;
    if (game?.store) {
      frame.gauges.enemiesAlive = game.store.enemies?.length ?? 0;
      frame.gauges.playerProjectilesAlive = game.store.playerProjectiles?.length ?? 0;
      frame.gauges.enemyProjectilesAlive = game.store.enemyProjectiles?.length ?? 0;
      frame.gauges.rewardsAlive = game.store.pickups?.length ?? 0;
      frame.gauges.effectsAlive = game.store.effects?.length ?? 0;
    }
    frame.gauges.staticColliders = game?.world?.staticColliders?.length ?? 0;
    frame.gauges.staticGridActiveCells = game?.world?.staticColliderGrid?.getActiveCellCount?.() ?? 0;
    frame.gauges.enemyGridActiveCells = game?.enemies?.getActiveSpatialCellCount?.() ?? 0;
    const renderStats = game?.renderer?.getLastRenderStats?.() ?? null;
    frame.gauges.drawCalls = renderStats?.drawCalls ?? 0;
    frame.gauges.triangles = renderStats?.triangles ?? 0;
    frame.gauges.lines = renderStats?.lines ?? 0;
    frame.gauges.points = renderStats?.points ?? 0;
    frame.gauges.geometries = renderStats?.geometries ?? 0;
    frame.gauges.textures = renderStats?.textures ?? 0;
    frame.gauges.renderWallMs = renderStats?.wallMs ?? (frame.sections.render ?? 0);
    frame.gauges.usedComposer = renderStats?.usedComposer ? 1 : 0;
    frame.gauges.postProcessingEnabled = renderStats?.postProcessingEnabled ? 1 : 0;
    frame.gauges.shadowMapEnabled = renderStats?.shadowMapEnabled ? 1 : 0;
    frame.gauges.renderScale = renderStats?.renderScale ?? 1;
    frame.gauges.pixelRatio = renderStats?.pixelRatio ?? 0;
    frame.gauges.renderWidth = renderStats?.viewportWidth ?? 0;
    frame.gauges.renderHeight = renderStats?.viewportHeight ?? 0;
    frame.gauges.jsHeapUsedMb = (performance?.memory?.usedJSHeapSize ?? 0) / (1024 * 1024);

    this.latestFrame = {
      frameMs: frame.frameMs,
      fps: frame.fps,
      dt: frame.dt,
      sections: cloneRecord(frame.sections),
      counters: cloneRecord(frame.counters),
      samples: cloneRecord(frame.samples),
      gauges: cloneRecord(frame.gauges),
    };
    this.frames.push(this.latestFrame);
    if (this.frames.length > this.maxFrames) this.frames.shift();
    this.currentFrame = null;
    this.summaryDirty = true;
  }

  getSummary() {
    if (!this.summaryDirty && this.summaryCache) return this.summaryCache;
    const frames = this.frames;
    if (!frames.length) {
      this.summaryCache = {
        enabled: true,
        frame: { now: 0, avg60: 0, p95_300: 0, max300: 0, fpsAvg60: 0 },
        sections: {},
        counters: {},
        samples: {},
        gauges: {},
        snapshots: buildSnapshotMeta(this.snapshots),
        deltas: {},
        frameCount: 0,
      };
      this.summaryDirty = false;
      return this.summaryCache;
    }

    const shortFrames = clampWindow(frames, SUMMARY_WINDOW_SHORT);
    const longFrames = clampWindow(frames, SUMMARY_WINDOW_LONG);
    const shortFrameValues = shortFrames.map((frame) => frame.frameMs ?? 0);
    const longFrameValues = longFrames.map((frame) => frame.frameMs ?? 0);

    const summary = {
      enabled: true,
      frame: {
        now: frames[frames.length - 1]?.frameMs ?? 0,
        avg60: mean(shortFrameValues),
        p95_300: percentile(longFrameValues, 0.95),
        max300: max(longFrameValues),
        fpsAvg60: mean(shortFrames.map((frame) => frame.fps ?? 0)),
      },
      sections: buildSectionStats(frames, shortFrames, longFrames),
      counters: buildCounterStats(shortFrames),
      samples: buildSampleStats(shortFrames),
      gauges: buildGaugeStats(frames),
      snapshots: buildSnapshotMeta(this.snapshots),
      deltas: {},
      frameCount: frames.length,
    };

    const baseline = this.snapshots?.baseline?.summary ?? null;
    const current = this.snapshots?.current?.summary ?? null;
    if (baseline) {
      summary.deltas.liveVsBaseline = {
        frameAvg60: deltaValue(summary.frame.avg60, baseline.frame?.avg60 ?? 0),
        frameP95_300: deltaValue(summary.frame.p95_300, baseline.frame?.p95_300 ?? 0),
        projectilesAvg60: deltaValue(summary.sections?.projectiles?.avg60 ?? 0, baseline.sections?.projectiles?.avg60 ?? 0),
        enemiesAvg60: deltaValue(summary.sections?.enemies?.avg60 ?? 0, baseline.sections?.enemies?.avg60 ?? 0),
        staticCandidates: deltaValue(summary.samples?.staticCandidates ?? 0, baseline.samples?.staticCandidates ?? 0),
        aimAssistCandidates: deltaValue(summary.samples?.aimAssistCandidates ?? 0, baseline.samples?.aimAssistCandidates ?? 0),
      };
    }
    if (baseline && current) {
      summary.deltas.currentVsBaseline = {
        frameAvg60: deltaValue(current.frame?.avg60 ?? 0, baseline.frame?.avg60 ?? 0),
        frameP95_300: deltaValue(current.frame?.p95_300 ?? 0, baseline.frame?.p95_300 ?? 0),
        projectilesAvg60: deltaValue(current.sections?.projectiles?.avg60 ?? 0, baseline.sections?.projectiles?.avg60 ?? 0),
        enemiesAvg60: deltaValue(current.sections?.enemies?.avg60 ?? 0, baseline.sections?.enemies?.avg60 ?? 0),
        staticCandidates: deltaValue(current.samples?.staticCandidates ?? 0, baseline.samples?.staticCandidates ?? 0),
        aimAssistCandidates: deltaValue(current.samples?.aimAssistCandidates ?? 0, baseline.samples?.aimAssistCandidates ?? 0),
      };
    }

    this.summaryCache = summary;
    this.summaryDirty = false;
    return summary;
  }
}

function mean(values = []) {
  if (!Array.isArray(values) || !values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function max(values = []) {
  if (!Array.isArray(values) || !values.length) return 0;
  return values.reduce((best, value) => (value > best ? value : best), values[0]);
}

function percentile(values = [], ratio = 0.95) {
  if (!Array.isArray(values) || !values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index] ?? 0;
}

function sum(values = []) {
  if (!Array.isArray(values) || !values.length) return 0;
  return values.reduce((total, value) => total + value, 0);
}

function buildThresholds(frameValues = []) {
  let over16 = 0;
  let over33 = 0;
  let over50 = 0;
  for (const value of frameValues) {
    if (value > 16.7) over16 += 1;
    if (value > 33.3) over33 += 1;
    if (value > 50) over50 += 1;
  }
  const count = frameValues.length || 1;
  return {
    over16_7: { count: over16, ratio: over16 / count },
    over33_3: { count: over33, ratio: over33 / count },
    over50: { count: over50, ratio: over50 / count },
  };
}

function buildSections(sectionSeries = {}, totalFrameMs = 0) {
  return Object.entries(sectionSeries)
    .map(([name, values]) => {
      const totalMs = sum(values);
      return {
        name,
        avg: mean(values),
        p95: percentile(values, 0.95),
        max: max(values),
        totalMs,
        share: totalFrameMs > 0 ? (totalMs / totalFrameMs) : 0,
      };
    })
    .sort((a, b) => {
      if (b.share !== a.share) return b.share - a.share;
      return b.totalMs - a.totalMs;
    });
}

function buildAverageSamples(sampleTotals = {}) {
  const result = {};
  for (const [name, entry] of Object.entries(sampleTotals)) {
    const count = entry?.count ?? 0;
    result[name] = count > 0 ? ((entry.sum ?? 0) / count) : 0;
  }
  return result;
}

function buildMissionMeta(meta = {}) {
  return {
    missionId: meta.missionId ?? null,
    missionName: meta.missionName ?? '',
    missionIndex: meta.missionIndex ?? -1,
    startedAt: meta.startedAt ?? 0,
    endedAt: Date.now(),
    startedPerformanceAt: meta.startedPerformanceAt ?? 0,
  };
}

export function createMissionPerformanceReport({
  meta = {},
  result = 'unknown',
  reason = '',
  frameValues = [],
  fpsValues = [],
  sectionSeries = {},
  counterTotals = {},
  sampleTotals = {},
  gaugePeaks = {},
  lastGauges = {},
  hitches = [],
  missionTimeSeconds = 0,
} = {}) {
  const totalFrameMs = sum(frameValues);
  const frameCount = frameValues.length;
  return {
    mission: buildMissionMeta(meta),
    result,
    reason,
    missionTimeSeconds: Number.isFinite(missionTimeSeconds) ? missionTimeSeconds : 0,
    frameCount,
    frame: {
      avg: mean(frameValues),
      p95: percentile(frameValues, 0.95),
      p99: percentile(frameValues, 0.99),
      max: max(frameValues),
      totalMs: totalFrameMs,
      fpsAvg: mean(fpsValues),
      thresholds: buildThresholds(frameValues),
    },
    sections: buildSections(sectionSeries, totalFrameMs),
    counters: { ...counterTotals },
    samples: buildAverageSamples(sampleTotals),
    gauges: {
      last: { ...lastGauges },
      peaks: { ...gaugePeaks },
    },
    hitches: [...hitches].sort((a, b) => b.frameMs - a.frameMs),
  };
}

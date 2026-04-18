import { createMissionPerformanceReport } from './MissionPerformanceReport.js';

const DEFAULT_HITCH_THRESHOLD_MS = 25;
const DEFAULT_HITCH_LIMIT = 12;

function cloneRecord(record) {
  return JSON.parse(JSON.stringify(record ?? {}));
}

function ingestNumberMap(target, source) {
  for (const [name, value] of Object.entries(source ?? {})) {
    target[name] = (target[name] ?? 0) + (Number.isFinite(value) ? value : 0);
  }
}

function ingestSampleTotals(target, source) {
  for (const [name, entry] of Object.entries(source ?? {})) {
    const bucket = target[name] ?? { sum: 0, count: 0 };
    bucket.sum += Number.isFinite(entry?.sum) ? entry.sum : 0;
    bucket.count += Number.isFinite(entry?.count) ? entry.count : 0;
    target[name] = bucket;
  }
}

function pushSectionSeries(target, sections) {
  for (const [name, value] of Object.entries(sections ?? {})) {
    const series = target[name] ?? [];
    series.push(Number.isFinite(value) ? value : 0);
    target[name] = series;
  }
}

function updateGaugePeaks(target, gauges) {
  for (const [name, value] of Object.entries(gauges ?? {})) {
    if (!Number.isFinite(value)) continue;
    const current = target[name];
    if (!Number.isFinite(current) || value > current) target[name] = value;
  }
}

function buildHitch(frame, missionTimeSeconds = 0) {
  const sections = Object.entries(frame?.sections ?? {});
  let slowestSectionName = 'totalFrame';
  let slowestSectionMs = Number(frame?.frameMs) || 0;
  for (const [name, value] of sections) {
    if (!Number.isFinite(value)) continue;
    if (value > slowestSectionMs || slowestSectionName === 'totalFrame') {
      slowestSectionName = name;
      slowestSectionMs = value;
    }
  }
  return {
    missionTimeSeconds,
    frameMs: Number(frame?.frameMs) || 0,
    slowestSectionName,
    slowestSectionMs,
    gauges: {
      enemiesAlive: Number(frame?.gauges?.enemiesAlive) || 0,
      playerProjectilesAlive: Number(frame?.gauges?.playerProjectilesAlive) || 0,
      enemyProjectilesAlive: Number(frame?.gauges?.enemyProjectilesAlive) || 0,
      drawCalls: Number(frame?.gauges?.drawCalls) || 0,
      triangles: Number(frame?.gauges?.triangles) || 0,
    },
  };
}

export class MissionPerformanceSession {
  constructor({ missionId = null, missionName = '', missionIndex = -1, startedAt = Date.now(), startedPerformanceAt = performance.now(), hitchThresholdMs = DEFAULT_HITCH_THRESHOLD_MS, hitchLimit = DEFAULT_HITCH_LIMIT } = {}) {
    this.meta = {
      missionId,
      missionName,
      missionIndex,
      startedAt,
      startedPerformanceAt,
    };
    this.hitchThresholdMs = Math.max(16.7, Number(hitchThresholdMs) || DEFAULT_HITCH_THRESHOLD_MS);
    this.hitchLimit = Math.max(1, Math.trunc(hitchLimit) || DEFAULT_HITCH_LIMIT);
    this.frameValues = [];
    this.fpsValues = [];
    this.sectionSeries = {};
    this.counterTotals = {};
    this.sampleTotals = {};
    this.gaugePeaks = {};
    this.lastGauges = {};
    this.hitches = [];
    this.latestReport = null;
  }

  ingestFrame(frame, game = null) {
    if (!frame) return;
    const frameMs = Number(frame.frameMs) || 0;
    const fps = Number(frame.fps) || 0;
    this.frameValues.push(frameMs);
    this.fpsValues.push(fps);
    pushSectionSeries(this.sectionSeries, frame.sections);
    ingestNumberMap(this.counterTotals, frame.counters);
    ingestSampleTotals(this.sampleTotals, frame.samples);
    updateGaugePeaks(this.gaugePeaks, frame.gauges);
    this.lastGauges = cloneRecord(frame.gauges);

    if (frameMs >= this.hitchThresholdMs) {
      const missionTimeSeconds = Number(game?.state?.progression?.missionTimer) || 0;
      this.hitches.push(buildHitch(frame, missionTimeSeconds));
      this.hitches.sort((a, b) => b.frameMs - a.frameMs);
      if (this.hitches.length > this.hitchLimit) this.hitches.length = this.hitchLimit;
    }
  }

  finalize({ result = 'unknown', reason = '', game = null } = {}) {
    this.latestReport = createMissionPerformanceReport({
      meta: this.meta,
      result,
      reason,
      frameValues: this.frameValues,
      fpsValues: this.fpsValues,
      sectionSeries: this.sectionSeries,
      counterTotals: this.counterTotals,
      sampleTotals: this.sampleTotals,
      gaugePeaks: this.gaugePeaks,
      lastGauges: this.lastGauges,
      hitches: this.hitches,
      missionTimeSeconds: Number(game?.state?.progression?.missionTimer) || 0,
    });
    return this.latestReport;
  }
}

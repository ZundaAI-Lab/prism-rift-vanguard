/**
 * Responsibility:
 * - PerformanceMonitor と同一 API を持つ no-op 実装を提供する。
 *
 * Rules:
 * - デバッグ無効時の呼び出し先として使い、Game 側へ条件分岐を散らさない。
 * - 計測結果の真実源にならず、常に副作用なしで即時 return する。
 */
export class NullPerformanceMonitor {
  beginFrame() {}
  beginSection() {}
  endSection() {}
  measure(_name, fn) { return typeof fn === 'function' ? fn() : undefined; }
  count() {}
  sample() {}
  setGauge() {}
  captureSnapshot() { return null; }
  clearSnapshots() {}
  getSnapshot() { return null; }
  getLatestFrame() { return null; }
  endFrame() {}
  getSummary() {
    return {
      enabled: false,
      frame: { now: 0, avg60: 0, p95_300: 0, max300: 0, fpsAvg60: 0 },
      sections: {},
      counters: {},
      samples: {},
      gauges: {},
      snapshots: {},
      deltas: {},
      frameCount: 0,
    };
  }
}

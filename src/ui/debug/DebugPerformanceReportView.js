function formatMs(value) {
  return `${(Number(value) || 0).toFixed(2)}ms`;
}

function formatSeconds(value) {
  return `${(Number(value) || 0).toFixed(2)}s`;
}

function formatCount(value) {
  return `${Math.round(Number(value) || 0)}`;
}

function formatRatio(value) {
  return `${((Number(value) || 0) * 100).toFixed(1)}%`;
}

function formatDate(value) {
  if (!Number.isFinite(value) || value <= 0) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

function buildLiveSummary(summary = {}, activeMissionMeta = null) {
  const frame = summary.frame ?? {};
  const sections = summary.sections ?? {};
  const gauges = summary.gauges ?? {};
  const snapshots = summary.snapshots ?? {};
  const activeLine = activeMissionMeta
    ? `ACTIVE  #${String((activeMissionMeta.missionIndex ?? 0) + 1).padStart(2, '0')}  ${activeMissionMeta.missionId ?? '-'}  started ${formatDate(activeMissionMeta.startedAt)}`
    : 'ACTIVE  none';
  return [
    activeLine,
    `FRAME   avg60 ${formatMs(frame.avg60)} | p95 ${formatMs(frame.p95_300)} | max ${formatMs(frame.max300)} | fps ${Math.round(frame.fpsAvg60 ?? 0)}`,
    `PHASE   mission ${formatMs(sections.mission?.avg60)} | enemies ${formatMs(sections.enemies?.avg60)} | projectiles ${formatMs(sections.projectiles?.avg60)} | renderW ${formatMs(sections.render?.avg60)}`,
    `GAUGE   enemies ${formatCount(gauges.enemiesAlive)} | pShots ${formatCount(gauges.playerProjectilesAlive)} | eShots ${formatCount(gauges.enemyProjectilesAlive)} | wall ${formatMs(gauges.renderWallMs)} | draw ${formatCount(gauges.drawCalls)} | tri ${formatCount(gauges.triangles)}`,
    `QUERY   static ${formatCount(summary.counters?.staticQueries)} / cand ${formatCount(summary.samples?.staticCandidates)} | aim ${formatCount(summary.counters?.aimAssistQueries)} / cand ${formatCount(summary.samples?.aimAssistCandidates)} | hit ${formatCount(summary.counters?.playerProjectileEnemyHitTests)}`,
    `SNAP    baseline ${snapshots.baseline ? formatDate(snapshots.baseline.capturedAt) : '-'} | current ${snapshots.current ? formatDate(snapshots.current.capturedAt) : '-'}`,
  ].join('\n');
}

function buildReportSummary(report = null) {
  if (!report) return 'MISSION REPORT\nまだレポートはありません。ミッションを開始してクリア / リトライ / ゲームオーバーまで進めるとここに集計を表示します。';

  const sectionLines = (report.sections ?? []).slice(0, 5).map((section, index) => (
    `${index + 1}. ${section.name}  avg ${formatMs(section.avg)} | p95 ${formatMs(section.p95)} | max ${formatMs(section.max)} | share ${formatRatio(section.share)}`
  ));
  const hitchLines = (report.hitches ?? []).slice(0, 4).map((hitch, index) => (
    `${index + 1}. ${formatMs(hitch.frameMs)} @ ${formatSeconds(hitch.missionTimeSeconds)}  phase ${hitch.slowestSectionName} ${formatMs(hitch.slowestSectionMs)}  enemies ${formatCount(hitch.gauges?.enemiesAlive)}  draw ${formatCount(hitch.gauges?.drawCalls)}`
  ));
  const thresholds = report.frame?.thresholds ?? {};
  return [
    `MISSION REPORT`,
    `MISSION  #${String((report.mission?.missionIndex ?? 0) + 1).padStart(2, '0')}  ${report.mission?.missionId ?? '-'}  ${report.mission?.missionName ?? ''}`,
    `RESULT   ${report.result ?? '-'} / missionTime ${formatSeconds(report.missionTimeSeconds)} / frames ${formatCount(report.frameCount)}`,
    `FRAME    avg ${formatMs(report.frame?.avg)} | p95 ${formatMs(report.frame?.p95)} | p99 ${formatMs(report.frame?.p99)} | max ${formatMs(report.frame?.max)} | fps ${Math.round(report.frame?.fpsAvg ?? 0)}`,
    `SPIKES   >16.7 ${formatCount(thresholds.over16_7?.count)} (${formatRatio(thresholds.over16_7?.ratio)}) | >33.3 ${formatCount(thresholds.over33_3?.count)} (${formatRatio(thresholds.over33_3?.ratio)}) | >50 ${formatCount(thresholds.over50?.count)}`,
    `PEAK     enemies ${formatCount(report.gauges?.peaks?.enemiesAlive)} | pShots ${formatCount(report.gauges?.peaks?.playerProjectilesAlive)} | eShots ${formatCount(report.gauges?.peaks?.enemyProjectilesAlive)} | draw ${formatCount(report.gauges?.peaks?.drawCalls)} | tri ${formatCount(report.gauges?.peaks?.triangles)}`,
    `TOP PHASES`,
    ...(sectionLines.length ? sectionLines : ['- none']),
    `HITCHES`,
    ...(hitchLines.length ? hitchLines : ['- none']),
  ].join('\n');
}

export function installDebugPerformanceReportView(UIRoot) {
  UIRoot.prototype.createDebugPerformanceReportSection = function createDebugPerformanceReportSection(parent = null) {
    if (!this.game.debug?.isEnabled?.() || this.refs.debugPerfSection) return this.refs.debugPerfSection;

    const section = document.createElement('div');
    section.style.display = 'grid';
    section.style.gap = '12px';
    section.style.padding = '16px';
    section.style.borderRadius = '18px';
    section.style.background = 'rgba(10, 16, 30, 0.52)';
    section.style.border = '1px solid rgba(126, 231, 255, 0.14)';
    section.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.18)';

    const heading = document.createElement('div');
    heading.textContent = 'PERFORMANCE MONITOR';
    heading.style.fontSize = '12px';
    heading.style.letterSpacing = '0.18em';
    heading.style.textTransform = 'uppercase';
    heading.style.color = '#a4bac8';

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.flexWrap = 'wrap';
    controls.style.gap = '10px';

    const overlayBtn = document.createElement('button');
    overlayBtn.type = 'button';
    overlayBtn.className = 'minor';
    overlayBtn.style.minWidth = '200px';

    const baselineBtn = document.createElement('button');
    baselineBtn.type = 'button';
    baselineBtn.className = 'minor';
    baselineBtn.textContent = 'SNAPSHOT // BASELINE';

    const currentBtn = document.createElement('button');
    currentBtn.type = 'button';
    currentBtn.className = 'minor';
    currentBtn.textContent = 'SNAPSHOT // CURRENT';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'minor';
    clearBtn.textContent = 'CLEAR SNAPSHOTS';

    controls.append(overlayBtn, baselineBtn, currentBtn, clearBtn);

    const live = document.createElement('pre');
    live.style.margin = '0';
    live.style.padding = '12px 14px';
    live.style.borderRadius = '14px';
    live.style.border = '1px solid rgba(126, 231, 255, 0.12)';
    live.style.background = 'rgba(6, 11, 18, 0.76)';
    live.style.color = '#dff8ff';
    live.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    live.style.fontSize = '11px';
    live.style.lineHeight = '1.5';
    live.style.whiteSpace = 'pre-wrap';
    live.style.minHeight = '112px';

    const report = document.createElement('pre');
    report.style.margin = '0';
    report.style.padding = '12px 14px';
    report.style.borderRadius = '14px';
    report.style.border = '1px solid rgba(255, 204, 120, 0.12)';
    report.style.background = 'rgba(18, 12, 8, 0.34)';
    report.style.color = '#ffe7c2';
    report.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    report.style.fontSize = '11px';
    report.style.lineHeight = '1.5';
    report.style.whiteSpace = 'pre-wrap';
    report.style.minHeight = '192px';

    section.append(heading, controls, live, report);
    parent?.appendChild(section);

    overlayBtn.onclick = () => {
      this.playUiConfirm();
      this.game.debug?.togglePerformanceOverlay?.();
      this.refreshDebugPerformanceReportView(true);
      this.renderDebugPerformanceOverlay(true);
    };
    baselineBtn.onclick = () => {
      this.playUiConfirm();
      this.game.debug?.capturePerformanceSnapshot?.('baseline');
      this.refreshDebugPerformanceReportView(true);
      this.renderDebugPerformanceOverlay(true);
    };
    currentBtn.onclick = () => {
      this.playUiConfirm();
      this.game.debug?.capturePerformanceSnapshot?.('current');
      this.refreshDebugPerformanceReportView(true);
      this.renderDebugPerformanceOverlay(true);
    };
    clearBtn.onclick = () => {
      this.playUiConfirm();
      this.game.debug?.clearPerformanceSnapshots?.();
      this.refreshDebugPerformanceReportView(true);
      this.renderDebugPerformanceOverlay(true);
    };

    this.refs.debugPerfSection = section;
    this.refs.debugPerfOverlayBtn = overlayBtn;
    this.refs.debugPerfLive = live;
    this.refs.debugPerfReport = report;
    this.lastDebugPerformanceReportRenderAt = 0;
    this.lastDebugPerformanceLiveText = '';
    this.lastDebugPerformanceReportText = '';
    this.refreshDebugPerformanceReportView(true);
    return section;
  };

  UIRoot.prototype.refreshDebugPerformanceReportView = function refreshDebugPerformanceReportView(force = false) {
    if (!this.game.debug?.isEnabled?.() || !this.refs.debugPerfSection) return;
    const now = performance.now();
    if (!force && now - (this.lastDebugPerformanceReportRenderAt ?? 0) < 250) return;
    this.lastDebugPerformanceReportRenderAt = now;

    const summary = this.game.debug?.getPerformanceSummary?.() ?? {};
    const activeMeta = this.game.debug?.getActiveMissionPerformanceMeta?.() ?? null;
    const report = this.game.debug?.getLatestPerformanceReport?.() ?? null;
    const overlayEnabled = this.game.debug?.isPerformanceOverlayEnabled?.() === true;

    if (this.refs.debugPerfOverlayBtn) {
      this.refs.debugPerfOverlayBtn.textContent = overlayEnabled ? 'OVERLAY // ON' : 'OVERLAY // OFF';
      this.refs.debugPerfOverlayBtn.style.borderColor = overlayEnabled ? 'rgba(126, 231, 255, 0.42)' : 'rgba(255,255,255,0.12)';
      this.refs.debugPerfOverlayBtn.style.background = overlayEnabled
        ? 'linear-gradient(180deg, rgba(72, 128, 148, 0.26), rgba(18, 38, 54, 0.16))'
        : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
      this.refs.debugPerfOverlayBtn.style.color = overlayEnabled ? '#dffbff' : '';
    }

    const liveText = buildLiveSummary(summary, activeMeta);
    const reportText = buildReportSummary(report);
    if (this.refs.debugPerfLive && liveText !== this.lastDebugPerformanceLiveText) {
      this.refs.debugPerfLive.textContent = liveText;
      this.lastDebugPerformanceLiveText = liveText;
    }
    if (this.refs.debugPerfReport && reportText !== this.lastDebugPerformanceReportText) {
      this.refs.debugPerfReport.textContent = reportText;
      this.lastDebugPerformanceReportText = reportText;
    }
  };
}

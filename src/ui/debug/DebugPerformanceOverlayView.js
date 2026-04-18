function formatMs(value) {
  return `${(Number(value) || 0).toFixed(2)}ms`;
}

function formatCount(value) {
  return `${Math.round(Number(value) || 0)}`;
}

function formatDelta(value, suffix = 'ms') {
  const safe = Number(value) || 0;
  const sign = safe > 0 ? '+' : '';
  return `${sign}${safe.toFixed(2)}${suffix}`;
}

function buildOverlayText(summary) {
  const lines = [];
  lines.push(`FPS ${Math.round(summary.frame?.fpsAvg60 ?? 0)} / フレーム ${formatMs(summary.frame?.avg60)} / P95 ${formatMs(summary.frame?.p95_300)} / MAX ${formatMs(summary.frame?.max300)}`);
  lines.push(`phase  player ${formatMs(summary.sections?.player?.avg60)} | weapons ${formatMs(summary.sections?.weapons?.avg60)} | enemies ${formatMs(summary.sections?.enemies?.avg60)} | projectiles ${formatMs(summary.sections?.projectiles?.avg60)}`);
  lines.push(`phase  world ${formatMs(summary.sections?.world?.avg60)} | ui ${formatMs(summary.sections?.ui?.avg60)} | renderW ${formatMs(summary.sections?.render?.avg60)} | total ${formatMs(summary.sections?.totalFrame?.avg60 ?? summary.frame?.avg60)}`);
  lines.push(`count  enemies ${formatCount(summary.gauges?.enemiesAlive)} | pShots ${formatCount(summary.gauges?.playerProjectilesAlive)} | eShots ${formatCount(summary.gauges?.enemyProjectilesAlive)} | pickups ${formatCount(summary.gauges?.rewardsAlive)} | colliders ${formatCount(summary.gauges?.staticColliders)}`);
  lines.push(`render wall ${formatMs(summary.gauges?.renderWallMs)} | draw ${formatCount(summary.gauges?.drawCalls)} | tri ${formatCount(summary.gauges?.triangles)} | geo ${formatCount(summary.gauges?.geometries)} | tex ${formatCount(summary.gauges?.textures)} | heap ${((Number(summary.gauges?.jsHeapUsedMb) || 0).toFixed(1))}MB`);
  lines.push(`query  staticCand ${formatCount(summary.samples?.staticCandidates)} | aimCand ${formatCount(summary.samples?.aimAssistCandidates)} | staticQ ${formatCount(summary.counters?.staticQueries)} | aimQ ${formatCount(summary.counters?.aimAssistQueries)} | hitTest ${formatCount(summary.counters?.playerProjectileEnemyHitTests)}`);
  if (summary.snapshots?.baseline) {
    const delta = summary.deltas?.liveVsBaseline ?? {};
    lines.push(`差分(BL比)  frame ${formatDelta(delta.frameAvg60 ?? 0)} | P95 ${formatDelta(delta.frameP95_300 ?? 0)} | proj ${formatDelta(delta.projectilesAvg60 ?? 0)} | staticCand ${formatDelta(delta.staticCandidates ?? 0, '')}`);
  }
  if (summary.snapshots?.baseline && summary.snapshots?.current) {
    const delta = summary.deltas?.currentVsBaseline ?? {};
    lines.push(`保存差分  frame ${formatDelta(delta.frameAvg60 ?? 0)} | P95 ${formatDelta(delta.frameP95_300 ?? 0)} | proj ${formatDelta(delta.projectilesAvg60 ?? 0)} | aimCand ${formatDelta(delta.aimAssistCandidates ?? 0, '')}`);
  }
  return lines.join('\n');
}

function getVisibleRect(element) {
  if (!element) return null;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return null;
  if (element.classList?.contains?.('hidden')) return null;
  const rect = element.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  return rect;
}

/**
 * Responsibility:
 * - デバッグ専用の処理負荷 overlay を描画し、PerformanceMonitor の summary を可視化する。
 *
 * Rules:
 * - 計測そのものは行わず、DebugSystem/PerformanceMonitor から受けた値だけを表示する。
 * - ゲーム本体の DOM に最小限で差し込み、更新は間引いて UI 負荷を増やしすぎない。
 */
export function installDebugPerformanceOverlayView(UIRoot) {
  UIRoot.prototype.createDebugPerformanceOverlay = function createDebugPerformanceOverlay() {
    if (!this.game.debug?.isEnabled?.() || this.refs.debugPerfOverlay) return;
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.zIndex = '95';
    overlay.style.pointerEvents = 'none';
    overlay.style.minWidth = '320px';
    overlay.style.padding = '10px 12px';
    overlay.style.borderRadius = '12px';
    overlay.style.border = '1px solid rgba(126, 231, 255, 0.2)';
    overlay.style.background = 'rgba(6, 11, 18, 0.82)';
    overlay.style.boxShadow = '0 10px 28px rgba(0, 0, 0, 0.32)';
    overlay.style.backdropFilter = 'blur(10px)';
    overlay.style.color = '#dff8ff';
    overlay.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    overlay.style.fontSize = '11px';
    overlay.style.lineHeight = '1.45';
    overlay.style.whiteSpace = 'pre-wrap';
    overlay.style.overflow = 'hidden';
    overlay.style.display = 'none';

    const title = document.createElement('div');
    title.textContent = 'DEBUG PERF';
    title.style.fontSize = '10px';
    title.style.letterSpacing = '0.2em';
    title.style.textTransform = 'uppercase';
    title.style.opacity = '0.72';
    title.style.marginBottom = '6px';

    const body = document.createElement('div');
    body.textContent = '計測待機中';

    overlay.append(title, body);
    document.body.appendChild(overlay);
    this.refs.debugPerfOverlay = overlay;
    this.refs.debugPerfOverlayBody = body;
    this.lastDebugPerfOverlayText = '';
    this.lastDebugPerfOverlayRenderAt = 0;
    this.debugPerfOverlayLayoutKey = '';
    this.applyDebugPerformanceOverlayLayout?.(true);
  };

  UIRoot.prototype.applyDebugPerformanceOverlayLayout = function applyDebugPerformanceOverlayLayout(force = false) {
    const overlay = this.refs.debugPerfOverlay;
    if (!overlay) return;

    const viewportWidth = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 0);
    const viewportHeight = Math.max(240, window.innerHeight || document.documentElement.clientHeight || 0);
    const gap = viewportWidth <= 760 ? 10 : 12;
    const minHeight = viewportHeight <= 560 ? 108 : 132;
    const sideInset = gap;

    const topBarRect = getVisibleRect(this.refs.topBar);
    const bossBarRect = getVisibleRect(this.refs.bossBarWrap);
    const minimapRect = getVisibleRect(this.refs.minimapWrap);

    const anchorBottom = Math.max(
      Math.round(topBarRect?.bottom ?? 0),
      Math.round(bossBarRect?.bottom ?? 0),
    );
    const bottomLimit = Math.max(gap, Math.round(minimapRect?.top ?? (viewportHeight - gap)) - gap);
    const desiredTop = Math.max(gap, anchorBottom + gap);
    const maxTop = Math.max(gap, bottomLimit - minHeight);
    const resolvedTop = Math.min(desiredTop, maxTop);
    const maxHeight = Math.max(96, bottomLimit - resolvedTop);
    const maxWidth = Math.max(280, Math.min(640, viewportWidth - sideInset * 2));
    const layoutKey = [
      viewportWidth,
      viewportHeight,
      Math.round(anchorBottom),
      Math.round(bottomLimit),
      Math.round(resolvedTop),
      Math.round(maxHeight),
      Math.round(maxWidth),
    ].join(':');
    if (!force && this.debugPerfOverlayLayoutKey === layoutKey) return;

    overlay.style.top = `${resolvedTop}px`;
    overlay.style.right = `${sideInset}px`;
    overlay.style.left = 'auto';
    overlay.style.bottom = 'auto';
    overlay.style.maxWidth = `${maxWidth}px`;
    overlay.style.maxHeight = `${maxHeight}px`;
    overlay.style.fontSize = viewportWidth <= 520 ? '10px' : '11px';
    overlay.style.lineHeight = viewportWidth <= 520 ? '1.4' : '1.45';
    this.debugPerfOverlayLayoutKey = layoutKey;
  };

  UIRoot.prototype.destroyDebugPerformanceOverlay = function destroyDebugPerformanceOverlay() {
    this.refs.debugPerfOverlay?.remove?.();
    this.refs.debugPerfOverlay = null;
    this.refs.debugPerfOverlayBody = null;
    this.lastDebugPerfOverlayText = '';
    this.lastDebugPerfOverlayRenderAt = 0;
  };

  UIRoot.prototype.renderDebugPerformanceOverlay = function renderDebugPerformanceOverlay(force = false) {
    if (!this.refs.debugPerfOverlay) return;
    const overlayEnabled = this.game.debug?.isPerformanceOverlayEnabled?.();
    this.refs.debugPerfOverlay.style.display = overlayEnabled ? 'block' : 'none';
    if (!overlayEnabled) return;

    this.applyDebugPerformanceOverlayLayout?.(force);

    const now = performance.now();
    if (!force && now - (this.lastDebugPerfOverlayRenderAt ?? 0) < 200) return;
    this.lastDebugPerfOverlayRenderAt = now;

    const summary = this.game.debug?.getPerformanceSummary?.();
    const text = buildOverlayText(summary ?? {
      frame: {}, sections: {}, counters: {}, samples: {}, gauges: {}, snapshots: {}, deltas: {},
    });
    if (text !== this.lastDebugPerfOverlayText && this.refs.debugPerfOverlayBody) {
      this.refs.debugPerfOverlayBody.textContent = text;
      this.lastDebugPerfOverlayText = text;
    }
  };
}

/**
 * Responsibility:
 * - 被弾方向インジケータの DOM プール生成と描画更新を担当する。
 *
 * Rules:
 * - 描画専用 View として動作し、被弾判定や timer 更新は担当しない。
 * - DOM ノードは固定数プールで再利用し、毎フレームの作り直しを避ける。
 */
export function installDamageIndicatorView(UIRoot) {
  UIRoot.prototype.createDamageIndicatorLayer = function createDamageIndicatorLayer() {
    const layer = document.createElement('div');
    layer.className = 'damage-indicator-layer';
    this.refs.hud.appendChild(layer);
    this.refs.damageIndicatorLayer = layer;
    this.damageIndicatorPool = [];
  };

  UIRoot.prototype.getDamageIndicatorEntry = function getDamageIndicatorEntry(index) {
    if (this.damageIndicatorPool?.[index]) return this.damageIndicatorPool[index];
    if (!this.refs.damageIndicatorLayer) return null;

    const root = document.createElement('div');
    root.className = 'damage-indicator';
    const arrow = document.createElement('div');
    arrow.className = 'damage-indicator-arrow';
    root.appendChild(arrow);
    this.refs.damageIndicatorLayer.appendChild(root);
    const entry = { root, arrow };
    this.damageIndicatorPool[index] = entry;
    return entry;
  };

  UIRoot.prototype.hideDamageIndicators = function hideDamageIndicators() {
    if (!Array.isArray(this.damageIndicatorPool)) return;
    for (const entry of this.damageIndicatorPool) {
      entry?.root?.style?.setProperty('display', 'none');
    }
  };

  UIRoot.prototype.renderDamageIndicators = function renderDamageIndicators() {
    const layer = this.refs.damageIndicatorLayer;
    const stateMode = this.game.state.mode;
    const indicatorMode = this.game.optionState?.hud?.hitDirectionIndicator ?? 'off';
    const indicators = this.game.state.ui?.damageIndicators ?? [];
    if (!layer || indicatorMode === 'off' || (stateMode !== 'playing' && stateMode !== 'paused') || indicators.length === 0) {
      this.hideDamageIndicators();
      return;
    }

    const radius = 68;
    const size = 48;
    const line = 4;
    const activeIds = new Set();
    for (let index = 0; index < indicators.length; index += 1) {
      const indicator = indicators[index];
      if (!indicator) continue;
      const entry = this.getDamageIndicatorEntry(index);
      if (!entry) continue;
      activeIds.add(index);
      const totalDuration = Math.max(0.001, indicator.duration ?? 1.26);
      const holdDuration = Math.max(0, Math.min(totalDuration, indicator.holdDuration ?? 1.0));
      const fadeDuration = Math.max(0.001, indicator.fadeDuration ?? Math.max(0.001, totalDuration - holdDuration));
      const elapsed = Math.max(0, totalDuration - (indicator.timer ?? 0));
      const fadeProgress = elapsed <= holdDuration ? 0 : Math.max(0, Math.min(1, (elapsed - holdDuration) / fadeDuration));
      const visibility = 1 - fadeProgress;
      const alpha = visibility * Math.max(0.28, Math.min(1.2, indicator.strength ?? 1));
      const scale = 1 - fadeProgress * 0.14;
      entry.root.style.display = 'block';
      entry.root.style.setProperty('--damage-indicator-angle', `${indicator.angle}rad`);
      entry.root.style.setProperty('--damage-indicator-radius', `${radius}px`);
      entry.root.style.setProperty('--damage-indicator-size', `${size}px`);
      entry.root.style.setProperty('--damage-indicator-line', `${line}px`);
      entry.root.style.opacity = `${Math.min(1, alpha)}`;
      entry.root.style.transform = `translate(-50%, -50%) rotate(${indicator.angle}rad) translateY(-${radius}px) scale(${scale})`;
    }

    if (!Array.isArray(this.damageIndicatorPool)) return;
    for (let index = 0; index < this.damageIndicatorPool.length; index += 1) {
      if (activeIds.has(index)) continue;
      this.damageIndicatorPool[index]?.root?.style?.setProperty('display', 'none');
    }
  };
}

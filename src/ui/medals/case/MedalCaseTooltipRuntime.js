/**
 * Responsibility:
 * - メダルツールチップの hover bind と位置調整を担当する。
 *
 * Update Rules:
 * - ツールチップ表示・座標計算はこのファイルへ集約する。
 * - 取得条件の計算や preview 生成は他モジュールへ残す。
 */
export function installMedalCaseTooltipRuntime(UIRoot) {
  UIRoot.prototype.showMedalTooltip = function showMedalTooltip(meta, event) {
    const tooltip = this.refs.medalTooltip;
    if (!tooltip || !meta) return;
    this.refs.medalTooltipTitle.textContent = this.getResultEntryLabel(meta.key ?? meta.label, meta.label ?? '');
    this.refs.medalTooltipCondition.textContent = this.getResultEntryCondition(meta.key ?? meta.label, meta.condition ?? '');
    tooltip.style.display = 'block';
    this.positionMedalTooltip(event?.clientX ?? 0, event?.clientY ?? 0);
  };

  UIRoot.prototype.positionMedalTooltip = function positionMedalTooltip(clientX, clientY) {
    const tooltip = this.refs.medalTooltip;
    if (!tooltip || tooltip.style.display === 'none') return;
    const viewportWidth = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 0);
    const viewportHeight = Math.max(240, window.innerHeight || document.documentElement.clientHeight || 0);
    const rect = tooltip.getBoundingClientRect();
    let left = clientX + 16;
    let top = clientY + 16;
    if (left + rect.width > viewportWidth - 8) left = Math.max(8, clientX - rect.width - 16);
    if (top + rect.height > viewportHeight - 8) top = Math.max(8, clientY - rect.height - 16);
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  };

  UIRoot.prototype.hideMedalTooltip = function hideMedalTooltip() {
    if (!this.refs.medalTooltip) return;
    this.refs.medalTooltip.style.display = 'none';
  };

  UIRoot.prototype.bindMedalTooltip = function bindMedalTooltip(node, meta) {
    if (!node || !meta) return;
    node.addEventListener('mouseenter', (event) => this.showMedalTooltip(meta, event));
    node.addEventListener('mousemove', (event) => this.positionMedalTooltip(event.clientX, event.clientY));
    node.addEventListener('mouseleave', () => this.hideMedalTooltip());
    node.addEventListener('blur', () => this.hideMedalTooltip());
  };
}

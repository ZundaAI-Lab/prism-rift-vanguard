/**
 * Responsibility:
 * - インターバル画面固有レイアウトを担当する。
 *
 * 更新ルール:
 * - interval 本文 state や overlay runtime をこのファイルへ混ぜない。
 * - interval 画面特有の width / grid 調整だけを置く。
 */
export function installIntervalScreenLayout(UIRoot) {
  UIRoot.prototype.applyIntervalScreenLayout = function applyIntervalScreenLayout() {
    const card = this.refs.intervalScreen?.querySelector('.screen-card');
    if (!card) return;
    card.style.width = 'min(1440px, calc(100vw - 24px))';
    card.style.maxWidth = '1440px';

    const layout = document.getElementById('intervalLayout');
    if (layout) layout.style.gridTemplateColumns = 'minmax(280px, 0.95fr) minmax(0, 2.05fr)';
  };
}

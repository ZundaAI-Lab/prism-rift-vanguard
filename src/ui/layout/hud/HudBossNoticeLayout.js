/**
 * Responsibility:
 * - boss bar と center notice のレイアウト更新を担当する。
 *
 * Update Rules:
 * - boss / notice の相対位置調整はこのファイルを正本にする。
 * - tutorial panel のレイアウトは TutorialPanelLayout.js へ分ける。
 */
export function installHudBossNoticeLayout(UIRoot) {
  UIRoot.prototype.invalidateBossBarLayout = function invalidateBossBarLayout() {
    this.bossBarLayoutCacheKey = '';
  };

  UIRoot.prototype.invalidateCenterNoticeLayout = function invalidateCenterNoticeLayout() {
    this.centerNoticeLayoutCacheKey = '';
  };

  UIRoot.prototype.applyBossBarLayout = function applyBossBarLayout() {
    const wrap = this.refs.bossBarWrap;
    const header = wrap?.querySelector('.boss-header');
    const bar = wrap?.querySelector('.boss-bar');
    const topBar = document.getElementById('topBar');
    if (!wrap || !header || !bar || !topBar || wrap.classList.contains('hidden')) return;

    const viewportWidth = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 0);
    const viewportHeight = Math.max(240, window.innerHeight || document.documentElement.clientHeight || 0);
    const sideMargin = viewportWidth <= 520 ? 12 : viewportWidth <= 840 ? 16 : 24;
    const availableWidth = Math.max(220, viewportWidth - sideMargin * 2);
    const preferredWidth = viewportWidth >= 1320
      ? 640
      : viewportWidth >= 980
        ? 580
        : viewportWidth >= 760
          ? 520
          : viewportWidth >= 600
            ? 460
            : availableWidth;
    const headerFontSize = viewportWidth <= 460 ? 10 : viewportWidth <= 760 ? 11 : 13;
    const barHeight = viewportHeight <= 420 ? 10 : viewportWidth <= 460 ? 12 : 14;
    const gap = viewportHeight <= 500 ? 8 : 12;
    const width = Math.min(preferredWidth, availableWidth);
    const layoutKey = [viewportWidth, viewportHeight, width, headerFontSize, barHeight, gap].join(':');
    if (this.bossBarLayoutCacheKey === layoutKey) return;

    wrap.style.left = '50%';
    wrap.style.right = 'auto';
    wrap.style.transform = 'translateX(-50%)';
    wrap.style.width = `${width}px`;
    wrap.style.maxWidth = `${availableWidth}px`;

    header.style.fontSize = `${headerFontSize}px`;
    header.style.gap = '10px';
    header.style.alignItems = 'center';

    this.refs.bossLabel.style.flex = '1 1 auto';
    this.refs.bossLabel.style.minWidth = '0';
    this.refs.bossLabel.style.overflow = 'hidden';
    this.refs.bossLabel.style.textOverflow = 'ellipsis';
    this.refs.bossLabel.style.whiteSpace = 'nowrap';

    this.refs.bossHpText.style.flex = '0 0 auto';
    this.refs.bossHpText.style.whiteSpace = 'nowrap';

    bar.style.height = `${barHeight}px`;

    const topBarRect = topBar.getBoundingClientRect();
    let top = Math.round(topBarRect.bottom + gap);
    const wrapHeight = Math.max(30, Math.ceil(wrap.getBoundingClientRect().height));
    const maxTop = Math.max(8, viewportHeight - wrapHeight - 8);
    if (top > maxTop) top = maxTop;
    const finalTop = Math.max(8, top);
    wrap.style.top = `${finalTop}px`;
    this.bossBarLayoutBottom = finalTop + wrapHeight;
    this.bossBarLayoutCacheKey = layoutKey;
    this.invalidateCenterNoticeLayout();
  };

  UIRoot.prototype.applyCenterNoticeLayout = function applyCenterNoticeLayout() {
    const notice = this.refs.centerNotice;
    const topBar = this.refs.topBar ?? document.getElementById('topBar');
    if (!notice || !topBar) return;

    const viewportWidth = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 0);
    const viewportHeight = Math.max(240, window.innerHeight || document.documentElement.clientHeight || 0);
    const topBarRect = topBar.getBoundingClientRect();
    const bossWrap = this.refs.bossBarWrap;
    const bossVisible = !!bossWrap && !bossWrap.classList.contains('hidden');
    const bossBottom = bossVisible ? Math.max(0, this.bossBarLayoutBottom || 0) : 0;
    const anchorBottom = Math.max(Math.round(topBarRect.bottom), Math.round(bossBottom));
    const noticeGap = viewportHeight <= 500 ? 14 : viewportHeight <= 720 ? 18 : 24;
    const defaultTop = Math.round(viewportHeight * (viewportWidth <= 640 ? 0.22 : 0.16));
    const desiredTop = Math.max(defaultTop, anchorBottom + noticeGap);
    const measuredNoticeHeight = Math.ceil(notice.getBoundingClientRect().height || 0);
    const fallbackNoticeHeight = viewportWidth <= 640 ? 52 : 68;
    const noticeHeight = Math.max(36, measuredNoticeHeight || fallbackNoticeHeight);
    const maxTop = Math.max(anchorBottom + 8, viewportHeight - noticeHeight - 24);
    const resolvedTop = Math.min(desiredTop, maxTop);
    const layoutKey = [
      viewportWidth,
      viewportHeight,
      Math.round(topBarRect.bottom),
      bossVisible ? 1 : 0,
      Math.round(bossBottom),
      Math.round(resolvedTop),
    ].join(':');
    if (this.centerNoticeLayoutCacheKey === layoutKey) return;
    notice.style.top = `${resolvedTop}px`;
    this.centerNoticeLayoutCacheKey = layoutKey;
  };
}

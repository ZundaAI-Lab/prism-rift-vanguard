function getNoticeOpacity(notice) {
  const timer = Math.max(0, Number(notice?.timer) || 0);
  if (timer <= 0) return 0;

  const duration = Math.max(timer, Number(notice?.duration) || 0);
  const fadeInDuration = Math.max(0, Math.min(duration, Number(notice?.fadeInDuration) || 0));
  const fadeOutDuration = Math.max(0, Math.min(duration, Number(notice?.fadeOutDuration) || 0));

  let opacity = 1;
  if (fadeInDuration > 0) {
    const elapsed = Math.max(0, duration - timer);
    opacity = Math.min(opacity, Math.max(0, Math.min(1, elapsed / fadeInDuration)));
  }
  if (fadeOutDuration > 0) {
    opacity = Math.min(opacity, Math.max(0, Math.min(1, timer / fadeOutDuration)));
  }

  return opacity;
}

function setTextIfChanged(node, value) {
  if (!node) return;
  const nextValue = String(value ?? '');
  if (node.__uiTextCache === nextValue) return;
  node.textContent = nextValue;
  node.__uiTextCache = nextValue;
}

function setStyleIfChanged(node, property, value) {
  if (!node) return;
  const nextValue = String(value ?? '');
  const cache = node.__uiStyleCache ?? (node.__uiStyleCache = Object.create(null));
  if (cache[property] === nextValue) return;
  node.style[property] = nextValue;
  cache[property] = nextValue;
}

/**
 * Responsibility:
 * - center notice と damage flash の見た目反映を担当する。
 *
 * Update Rules:
 * - notice の timer 更新元は UI runtime state 側を正本にする。
 * - damageFlash の減衰は UI runtime state、見た目反映だけをここへ置く。
 * - 被弾方向インジケータ描画は DamageIndicatorView 側へ戻す。
 */
export function installHudNoticeState(UIRoot) {
  UIRoot.prototype.renderHudNoticeState = function renderHudNoticeState() {
    this.applyCenterNoticeLayout();
    const notice = this.game.state.ui?.notice ?? {
      text: '', timer: 0, duration: 0, fadeInDuration: 0, fadeOutDuration: 0, justShown: false,
    };
    const noticeOpacity = getNoticeOpacity(notice);
    const noticeTransition = (notice?.fadeInDuration || 0) > 0 ? 'none' : '';
    const noticeOpacityText = String(noticeOpacity);

    if (this.lastCenterNoticeTransition !== noticeTransition) {
      setStyleIfChanged(this.refs.centerNotice, 'transition', noticeTransition);
      this.lastCenterNoticeTransition = noticeTransition;
    }
    if (this.lastCenterNoticeOpacity !== noticeOpacityText) {
      setStyleIfChanged(this.refs.centerNotice, 'opacity', noticeOpacityText);
      this.lastCenterNoticeOpacity = noticeOpacityText;
    }
    if (this.lastCenterNoticeText !== notice.text) {
      setTextIfChanged(this.refs.centerNotice, notice.text);
      this.lastCenterNoticeText = notice.text;
    }

    const effectStrength = this.game.optionState?.graphics?.effectStrength ?? 'standard';
    const damageFlashMultiplier = effectStrength === 'reduced' ? 0.72 : effectStrength === 'minimal' ? 0.45 : 1;
    setStyleIfChanged(this.refs.damageFlash, 'opacity', String(Math.min(0.8, this.game.state.damageFlash * 0.8 * damageFlashMultiplier)));
  };
}

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
 * - ボスバーの visible / text / HP 表示だけを更新する。
 *
 * Update Rules:
 * - ボスの選定や HP 計算元はゲーム状態を読むだけに留める。
 * - ボスバーの位置調整は layout 側へ委譲する。
 * - center notice の見た目更新は HudNoticeState へ混ぜない。
 */
export function installHudBossState(UIRoot) {
  UIRoot.prototype.renderHudBossState = function renderHudBossState() {
    const boss = this.game.store.enemies.find((enemy) => enemy.def.isBoss);
    const bossVisible = !!boss;
    if (this.lastBossBarVisible !== bossVisible) {
      this.refs.bossBarWrap?.classList.toggle('hidden', !bossVisible);
      this.lastBossBarVisible = bossVisible;
      this.invalidateBossBarLayout();
      this.invalidateCenterNoticeLayout();
    }

    if (bossVisible) {
      const bossLabel = this.getEnemyName(boss);
      if (this.lastBossBarLabel !== bossLabel) {
        setTextIfChanged(this.refs.bossLabel, bossLabel);
        this.lastBossBarLabel = bossLabel;
        this.invalidateBossBarLayout();
      }
      const rawRatio = Number.isFinite(boss.uiHpRatioOverride) ? boss.uiHpRatioOverride : (boss.hp / boss.maxHp);
      const ratio = Math.max(0, Math.min(1, rawRatio));
      setStyleIfChanged(this.refs.bossBar, 'transform', `scaleX(${ratio})`);
      const bossHpText = `${Math.round(ratio * 100)}%`;
      if (this.lastBossBarHpText !== bossHpText) {
        setTextIfChanged(this.refs.bossHpText, bossHpText);
        this.lastBossBarHpText = bossHpText;
      }
      this.applyBossBarLayout();
    } else if (this.lastBossBarHpText !== '') {
      this.lastBossBarHpText = '';
      setTextIfChanged(this.refs.bossHpText, '');
    }
  };
}

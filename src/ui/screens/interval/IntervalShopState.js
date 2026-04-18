/**
 * Responsibility:
 * - インターバル画面内ショップの dirty 判定、再描画、グリッド更新を担当する。
 *
 * 更新ルール:
 * - このファイルに boss alert / transition / 本文 state を混ぜない。
 * - shop DOM の再構築と購入導線だけをここへ集約する。
 */
import { getShopPanelTint } from '../ShopViewShared.js';

export function installIntervalShopState(UIRoot) {
  UIRoot.prototype.getShopSignature = function getShopSignature() {
    const inventory = this.game.shop.getInventory();
    return JSON.stringify({
      crystals: this.game.state.crystals,
      maxHealth: this.game.state.player.maxHealth,
      items: inventory.map((item) => [item.id, item.level, item.cost, item.affordable, item.atMax]),
    });
  };

  UIRoot.prototype.renderShopIfDirty = function renderShopIfDirty(force = false) {
    const signature = this.getShopSignature();
    if (!force && signature === this.lastShopSignature) return;
    this.lastShopSignature = signature;
    this.renderShop();
  };

  UIRoot.prototype.applyShopGridLayout = function applyShopGridLayout() {
    const grid = this.refs.shopGrid;
    if (!grid) return;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    let columns = 3;
    if (viewportWidth <= 760) columns = 1;
    else if (viewportWidth <= 1160) columns = 2;
    grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  };

  UIRoot.prototype.renderShop = function renderShop() {
    this.applyShopGridLayout();
    const inventory = this.game.shop.getInventory();
    const grid = this.refs.shopGrid;
    if (!grid) return;
    grid.innerHTML = '';
    for (const item of inventory) {
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.style.pointerEvents = 'auto';
      const tint = getShopPanelTint(item.id);
      card.style.background = `linear-gradient(180deg, ${tint.background} 0%, rgba(8, 14, 24, 0.78) 100%)`;
      card.style.borderColor = tint.border;
      card.style.boxShadow = `inset 0 0 0 1px ${tint.glow}, 0 16px 36px rgba(0, 0, 0, 0.26)`;
      const costLabel = item.atMax ? '-' : item.cost;
      card.innerHTML = `
        <h4>${this.getShopTitle(item)}</h4>
        <p>${this.getShopDescription(item)}</p>
        <div class="shop-meta">
          <span class="cost">${this.t('shop.cost', { cost: costLabel })}</span>
          <span class="level">Lv ${item.level} / ${item.maxLevel}</span>
        </div>
      `;
      const button = document.createElement('button');
      button.type = 'button';
      button.style.pointerEvents = 'auto';
      button.textContent = item.atMax ? this.t('common.maxed') : item.affordable ? this.t('common.purchase') : this.t('common.notEnough');
      button.disabled = item.atMax || !item.affordable;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const result = this.game.shop.purchase(item.id);
        if (!result.ok) return;
        this.lastShopSignature = '';
        this.renderHud();
        this.renderIntervalScreenState();
      });
      card.appendChild(button);
      grid.appendChild(card);
    }
  };
}

import { SHOP_ITEMS } from '../data/shop.js';

/**
 * Responsibility:
 * - Calculates shop prices and applies purchases.
 *
 * Rules:
 * - This module is the only place allowed to spend crystals.
 * - UI may ask for availability, but cannot bypass checks.
 * - Survival purchases that permanently change max HP are applied here, not in UI code.
 * - Purchase counters must stay aligned with GameState/UpgradeSystem so item state is tracked consistently.
 */
export class ShopSystem {
  constructor(game) {
    this.game = game;
  }

  getInventory() {
    return SHOP_ITEMS.map((item) => this.describeItem(item));
  }

  describeItem(item) {
    const level = this.getCurrentLevel(item);
    return {
      ...item,
      level,
      atMax: level >= item.maxLevel,
      cost: this.getCost(item, level),
      affordable: this.game.state.crystals >= this.getCost(item, level),
    };
  }

  getCurrentLevel(item) {
    if (item.effect === 'upgrade') return this.game.state.progression.upgrades[item.upgradeKey] ?? 0;
    return this.game.state.progression.shopPurchases[item.id] ?? 0;
  }

  getCost(item, level = this.getCurrentLevel(item)) {
    return Math.round(item.baseCost + item.costStep * level * (1 + level / item.maxLevel));
  }

  purchase(itemId) {
    const raw = SHOP_ITEMS.find((item) => item.id === itemId);
    if (!raw) {
      this.game.audio?.playSfx('shopDenied', { cooldownMs: 120 });
      return { ok: false, reason: 'unknown' };
    }
    const item = this.describeItem(raw);
    if (item.atMax) {
      this.game.audio?.playSfx('shopDenied', { cooldownMs: 120 });
      return { ok: false, reason: 'max' };
    }
    if (!item.affordable) {
      this.game.audio?.playSfx('shopDenied', { cooldownMs: 120 });
      return { ok: false, reason: 'funds' };
    }

    this.game.state.crystals -= item.cost;

    if (item.effect === 'upgrade') {
      this.game.upgrades.applyUpgrade(item.upgradeKey);
    } else if (item.effect === 'maxHealth') {
      this.game.state.player.maxHealth += 20;
      this.game.state.progression.shopPurchases.maxHealth = item.level + 1;
    } else if (item.effect === 'crystalAttract') {
      this.game.state.progression.shopPurchases.crystalAttract = item.level + 1;
    } else if (item.effect === 'armor') {
      this.game.state.progression.shopPurchases.armor = item.level + 1;
    }

    this.game.audio?.playSfx('shopPurchase');
    return { ok: true };
  }
}

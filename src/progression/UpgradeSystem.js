import { PLAYER_BASE, WEAPON_BASE } from '../data/balance.js';
import { SHOP_ITEMS } from '../data/shop.js';
import { createDefaultShopPurchases, createDefaultUpgradeLevels, createMaxedProgressionState } from './UpgradeStateShared.js';

const PRIMARY_HOMING_BY_LEVEL = [0.08, 0.24, 0.42, 0.6, 0.8, 1.0];
const PRIMARY_TURN_RATE_BY_LEVEL = [14, 14, 14, 14, 14, 14];
const PLASMA_HOMING_BY_LEVEL = [0.2, 0.36, 0.52, 0.68, 0.84, 1.0];
const PLASMA_TURN_RATE_BY_LEVEL = [10, 10, 10, 10, 10, 10];

function getLevelValue(table, level) {
  const safeLevel = Math.max(0, Math.min(table.length - 1, level | 0));
  return table[safeLevel];
}

/**
 * Responsibility:
 * - Computes derived weapon stats from persistent upgrade levels.
 *
 * Rules:
 * - No direct DOM writes.
 * - All balancing formulas must stay centralized here so shop changes do not spread.
 * - Formulas stay centralized here unless a future balance patch intentionally changes them.
 * - Reset must initialize every persistent upgrade/shop counter declared in GameState so later refactors do not leave stale keys behind.
 * - Rapid-fire is defined in terms of shots-per-second, not raw cooldown subtraction.
 *   The player starts from `WEAPON_BASE.primaryBaseFireRate`, which is the real level-0 cadence.
 *   PRIMARY RAPID then multiplies that cadence by `WEAPON_BASE.primaryRapidMultiplier` per level,
 *   matching the shop text literally.
 *   MULTI-WAY is a deliberate tradeoff: every multi-shot level multiplies final fire-rate output by
 *   `WEAPON_BASE.primaryMultiWayRatePenalty`, keeping the penalty in the same formula chain.
 *   All firing code must consume one authoritative cooldown value derived here.
 *   Do not re-introduce hidden baseline halves or extra cooldown edits elsewhere, or the UI text and balance math will drift apart again.
 */
export class UpgradeSystem {
  constructor(state) {
    this.state = state;
  }

  reset() {
    this.state.progression.upgrades = createDefaultUpgradeLevels();
    this.state.progression.shopPurchases = createDefaultShopPurchases();
  }

  get levels() {
    return this.state.progression.upgrades;
  }

  getPrimaryFireRate(levels = this.levels) {
    const rapidMultiplier = Math.pow(WEAPON_BASE.primaryRapidMultiplier, levels.rapidFire);
    const multiWayPenalty = Math.pow(WEAPON_BASE.primaryMultiWayRatePenalty, levels.multiShot);
    return WEAPON_BASE.primaryBaseFireRate * rapidMultiplier * multiWayPenalty;
  }

  getPrimaryStats() {
    const levels = this.levels;
    const finalFireRate = this.getPrimaryFireRate(levels);
    const homingLevel = levels.homing ?? 0;
    return {
      damage: WEAPON_BASE.primaryDamage + levels.primaryDamage * 4,
      fireCooldown: 1 / finalFireRate,
      speed: WEAPON_BASE.primarySpeed + levels.primarySpeed * 16,
      pierce: WEAPON_BASE.primaryPierce + levels.pierce,
      homing: getLevelValue(PRIMARY_HOMING_BY_LEVEL, homingLevel),
      homingLevel,
      wayCount: 1 + levels.multiShot,
      spread: WEAPON_BASE.primarySpread,
      life: WEAPON_BASE.primaryLife,
      turnRate: getLevelValue(PRIMARY_TURN_RATE_BY_LEVEL, homingLevel),
    };
  }

  getPlasmaStats() {
    const levels = this.levels;
    const multiWayCooldownPenalty = levels.plasmaMultiShot * 0.4;
    const homingLevel = levels.homing ?? 0;
    return {
      damage: WEAPON_BASE.plasmaDamage + levels.plasmaDamage * 28,
      speed: WEAPON_BASE.plasmaSpeed,
      radius: WEAPON_BASE.plasmaRadius + levels.plasmaRadius * 6.0,
      cooldown: Math.max(1.75, WEAPON_BASE.plasmaCooldown - levels.plasmaCooldown * 0.6 + multiWayCooldownPenalty),
      life: WEAPON_BASE.plasmaLife,
      wayCount: 1 + levels.plasmaMultiShot,
      splashDamageScale: 0.8,
      homing: getLevelValue(PLASMA_HOMING_BY_LEVEL, homingLevel),
      homingLevel,
      turnRate: getLevelValue(PLASMA_TURN_RATE_BY_LEVEL, homingLevel),
    };
  }

  getCrystalAttractMultiplier() {
    const level = this.state.progression.shopPurchases.crystalAttract ?? 0;
    return Math.pow(1.3, level);
  }

  getArmorDamageReduction() {
    return this.state.progression.shopPurchases.armor ?? 0;
  }

  applyUpgrade(upgradeKey) {
    this.state.progression.upgrades[upgradeKey] += 1;
  }

  applyDebugInvinciblePreset() {
    const { upgrades, shopPurchases } = createMaxedProgressionState(SHOP_ITEMS);

    this.state.progression.upgrades = upgrades;
    this.state.progression.shopPurchases = shopPurchases;
    this.state.player.maxHealth = Math.max(999, PLAYER_BASE.maxHealth + shopPurchases.maxHealth * 20);
    this.state.player.health = this.state.player.maxHealth;
  }

  summarizePrimary() {
    const stats = this.getPrimaryStats();
    return `DMG ${stats.damage} / WAY ${stats.wayCount} / HOM ${stats.homing.toFixed(2)} / INT ${stats.fireCooldown.toFixed(3)}s`;
  }

  summarizePlasma() {
    const stats = this.getPlasmaStats();
    return `DMG ${stats.damage} / WAY ${stats.wayCount} / RAD ${stats.radius.toFixed(1)} / CD ${stats.cooldown.toFixed(1)}s`;
  }
}

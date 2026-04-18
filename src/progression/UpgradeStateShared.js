/**
 * Responsibility:
 * - UpgradeSystem / GameState が共有する進行度の初期値生成を担当する。
 *
 * Rules:
 * - 状態 shape の定義だけを集約し、派生ステータス計算は UpgradeSystem へ残す。
 * - 新しい永続アップグレードを追加したら、このファイルで初期値と最大化対象を揃える。
 */
export const DEFAULT_UPGRADE_LEVELS = Object.freeze({
  primaryDamage: 0,
  primarySpeed: 0,
  rapidFire: 0,
  pierce: 0,
  homing: 0,
  multiShot: 0,
  plasmaDamage: 0,
  plasmaRadius: 0,
  plasmaCooldown: 0,
  plasmaMultiShot: 0,
});

export const DEFAULT_SHOP_PURCHASES = Object.freeze({
  maxHealth: 0,
  crystalAttract: 0,
  armor: 0,
});

export function createDefaultUpgradeLevels() {
  return { ...DEFAULT_UPGRADE_LEVELS };
}

export function createDefaultShopPurchases() {
  return { ...DEFAULT_SHOP_PURCHASES };
}

export function createMaxedProgressionState(shopItems) {
  const upgrades = createDefaultUpgradeLevels();
  const shopPurchases = createDefaultShopPurchases();

  for (const item of shopItems) {
    if (item.effect === 'upgrade' && item.upgradeKey && Object.hasOwn(upgrades, item.upgradeKey)) {
      upgrades[item.upgradeKey] = item.maxLevel;
      continue;
    }
    if (item.effect === 'maxHealth') {
      shopPurchases.maxHealth = item.maxLevel;
      continue;
    }
    if (Object.hasOwn(shopPurchases, item.id)) {
      shopPurchases[item.id] = item.maxLevel;
    }
  }

  return { upgrades, shopPurchases };
}

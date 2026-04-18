/**
 * Responsibility:
 * - ショップ表示専用の色味定義と読み取り helper をまとめる。
 *
 * Rules:
 * - 見た目ルールだけを置き、購入処理や DOM 更新は View に残す。
 */
const SHOP_PANEL_TINT_DEFENSE = { background: 'rgba(64, 124, 86, 0.18)', border: 'rgba(118, 214, 151, 0.42)', glow: 'rgba(98, 235, 150, 0.14)' };
const SHOP_PANEL_TINT_PRIMARY = { background: 'rgba(56, 94, 154, 0.18)', border: 'rgba(116, 181, 255, 0.44)', glow: 'rgba(94, 176, 255, 0.14)' };
const SHOP_PANEL_TINT_HOMING = { background: 'rgba(106, 72, 148, 0.20)', border: 'rgba(191, 144, 255, 0.46)', glow: 'rgba(168, 114, 255, 0.16)' };
const SHOP_PANEL_TINT_PLASMA = { background: 'rgba(154, 64, 72, 0.18)', border: 'rgba(255, 130, 136, 0.44)', glow: 'rgba(255, 108, 118, 0.14)' };

export const SHOP_PANEL_TINT_BY_ID = {
  maxHealth: SHOP_PANEL_TINT_DEFENSE,
  armor: SHOP_PANEL_TINT_DEFENSE,
  crystalAttract: SHOP_PANEL_TINT_DEFENSE,
  primaryDamage: SHOP_PANEL_TINT_PRIMARY,
  rapidFire: SHOP_PANEL_TINT_PRIMARY,
  pierce: SHOP_PANEL_TINT_PRIMARY,
  homing: SHOP_PANEL_TINT_HOMING,
  multiShot: SHOP_PANEL_TINT_PRIMARY,
  plasmaDamage: SHOP_PANEL_TINT_PLASMA,
  plasmaRadius: SHOP_PANEL_TINT_PLASMA,
  plasmaCooldown: SHOP_PANEL_TINT_PLASMA,
  plasmaMultiShot: SHOP_PANEL_TINT_PLASMA,
};

export const DEFAULT_SHOP_PANEL_TINT = { background: 'rgba(255, 255, 255, 0.04)', border: 'rgba(255, 255, 255, 0.08)', glow: 'rgba(255, 255, 255, 0.04)' };

export function getShopPanelTint(itemId) {
  return SHOP_PANEL_TINT_BY_ID[itemId] ?? DEFAULT_SHOP_PANEL_TINT;
}

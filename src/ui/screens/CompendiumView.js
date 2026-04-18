/**
 * Responsibility:
 * - 図鑑画面の公開入口を維持し、build / state / preview runtime へ委譲する。
 *
 * Update Rules:
 * - DOM 構築は compendium/CompendiumBuilders.js を更新する。
 * - 開閉 state と再構築は compendium/CompendiumState.js を更新する。
 * - 3D preview は compendium/CompendiumPreviewRuntime.js を更新する。
 * - 外部から使う prototype 名はここを基準に維持し、他ファイルへ散らさない。
 */
import {
  buildCompendiumScreen,
  createCompendiumCard,
  destroyCompendiumScreen,
  rebuildCompendiumScreenForLocalization,
} from './compendium/CompendiumBuilders.js';
import { installCompendiumPreviewRuntime } from './compendium/CompendiumPreviewRuntime.js';
import { installCompendiumState } from './compendium/CompendiumState.js';

export function installCompendiumView(UIRoot) {
  installCompendiumState(UIRoot);
  installCompendiumPreviewRuntime(UIRoot);

  UIRoot.prototype.createCompendiumScreen = function createCompendiumScreen() {
    buildCompendiumScreen(this);
  };

  UIRoot.prototype.createCompendiumCard = function createCompendiumCard(typeKey, missionName, role, missionId = '') {
    return createCompendiumCard(this, typeKey, missionName, role, missionId);
  };

  UIRoot.prototype.destroyCompendiumScreen = function destroyCompendiumScreenPrototype() {
    destroyCompendiumScreen(this);
  };

  UIRoot.prototype.rebuildCompendiumScreenForLocalization = function rebuildCompendiumScreenForLocalizationPrototype() {
    rebuildCompendiumScreenForLocalization(this);
  };
}

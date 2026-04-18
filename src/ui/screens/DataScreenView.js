/**
 * Responsibility:
 * - 保存データ画面の公開入口を維持し、builders / bindings / state へ委譲する。
 *
 * Update Rules:
 * - DOM 構築は data/DataScreenBuilders.js を更新する。
 * - ボタン bind は data/DataScreenBindings.js を更新する。
 * - データ表示と差分更新は data/DataScreenState.js を更新する。
 */
import {
  buildDataScreen,
  destroyDataScreen,
  rebuildDataScreenForLocalization,
} from './data/DataScreenBuilders.js';
import { installDataScreenBindings } from './data/DataScreenBindings.js';
import { installDataScreenState } from './data/DataScreenState.js';

export function installDataScreenView(UIRoot) {
  installDataScreenState(UIRoot);
  installDataScreenBindings(UIRoot);

  UIRoot.prototype.createDataScreen = function createDataScreen() {
    buildDataScreen(this);
  };

  UIRoot.prototype.destroyDataScreen = function destroyDataScreenPrototype() {
    destroyDataScreen(this);
  };

  UIRoot.prototype.rebuildDataScreenForLocalization = function rebuildDataScreenForLocalizationPrototype() {
    rebuildDataScreenForLocalization(this);
  };
}

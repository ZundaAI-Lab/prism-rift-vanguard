/**
 * Responsibility:
 * - デバッグ画面の公開入口を維持し、builders / bindings / state へ委譲する。
 *
 * Update Rules:
 * - DOM 構築は debug/DebugScreenBuilders.js を更新する。
 * - ボタン bind は debug/DebugScreenBindings.js を更新する。
 * - state 表示反映は debug/DebugScreenState.js を更新する。
 */
import {
  buildDebugScreen,
  destroyDebugScreen,
  rebuildDebugScreenForLocalization,
} from './debug/DebugScreenBuilders.js';
import { installDebugScreenBindings } from './debug/DebugScreenBindings.js';
import { installDebugScreenState } from './debug/DebugScreenState.js';

export function installDebugScreenView(UIRoot) {
  installDebugScreenBindings(UIRoot);
  installDebugScreenState(UIRoot);

  UIRoot.prototype.createDebugScreen = function createDebugScreen() {
    buildDebugScreen(this);
  };

  UIRoot.prototype.destroyDebugScreen = function destroyDebugScreenPrototype() {
    destroyDebugScreen(this);
  };

  UIRoot.prototype.rebuildDebugScreenForLocalization = function rebuildDebugScreenForLocalizationPrototype() {
    rebuildDebugScreenForLocalization(this);
  };
}

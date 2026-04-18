/**
 * Responsibility:
 * - クリア画面の公開入口を維持し、builders / state / bindings へ委譲する。
 *
 * Update Rules:
 * - DOM 構築は clear/ClearScreenBuilders.js を更新する。
 * - サマリー描画と visibility 計算は clear/ClearScreenState.js を更新する。
 * - ボタン bind は clear/ClearScreenBindings.js を更新する。
 */
import { installClearScreenBindings } from './clear/ClearScreenBindings.js';
import {
  buildClearScreenUi,
  installClearScreenBuilders,
} from './clear/ClearScreenBuilders.js';
import { installClearScreenState } from './clear/ClearScreenState.js';

export function installClearScreenView(UIRoot) {
  installClearScreenBuilders(UIRoot);
  installClearScreenState(UIRoot);
  installClearScreenBindings(UIRoot);

  UIRoot.prototype.prepareClearScreen = function prepareClearScreen() {
    buildClearScreenUi(this);
  };
}

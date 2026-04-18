/**
 * Responsibility:
 * - オプション画面の公開入口を維持し、構築処理を分割モジュールへ委譲する。
 *
 * Update Rules:
 * - 画面構築は options/OptionsScreenBuilders.js を更新する。
 * - 表示整形は options/OptionsScreenFormatters.js を更新する。
 * - 状態反映は options/OptionsScreenState.js を更新する。
 * - 入力 bind とサウンドテスト制御は options/OptionsScreenBindings.js を更新する。
 * - 外部から使う prototype 名はここを基準に維持し、他ファイルへ散らさない。
 */
import { buildOptionsScreen } from './options/OptionsScreenBuilders.js';
import { installOptionsScreenBindings } from './options/OptionsScreenBindings.js';
import { installOptionsScreenState } from './options/OptionsScreenState.js';

export function installOptionsScreenView(UIRoot) {
  installOptionsScreenState(UIRoot);
  installOptionsScreenBindings(UIRoot);

  UIRoot.prototype.createOptionsScreen = function createOptionsScreen() {
    buildOptionsScreen(this);
    this.refreshOptionsScreenState(true);
  };
}

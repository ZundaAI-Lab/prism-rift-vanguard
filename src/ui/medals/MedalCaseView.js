/**
 * Responsibility:
 * - メダルケース画面の公開入口を維持し、builder / tooltip / preview runtime へ委譲する。
 *
 * Update Rules:
 * - DOM 構築は medals/case/MedalCaseBuilders.js を更新する。
 * - ツールチップの hover / 座標計算は medals/case/MedalCaseTooltipRuntime.js を更新する。
 * - 3D preview とキャッシュは medals/case/MedalCasePreviewRuntime.js を更新する。
 * - 外部から使う prototype 名はここを基準に維持する。
 */
import {
  buildIntervalMedalCase,
  buildMedalTooltip,
  installMedalCaseState,
} from './case/MedalCaseBuilders.js';
import { installMedalCasePreviewRuntime } from './case/MedalCasePreviewRuntime.js';
import { installMedalCaseTooltipRuntime } from './case/MedalCaseTooltipRuntime.js';

export function installMedalCaseView(UIRoot) {
  installMedalCaseTooltipRuntime(UIRoot);
  installMedalCasePreviewRuntime(UIRoot);
  installMedalCaseState(UIRoot);

  UIRoot.prototype.createMedalTooltip = function createMedalTooltip() {
    buildMedalTooltip(this);
  };

  UIRoot.prototype.createIntervalMedalCase = function createIntervalMedalCase() {
    buildIntervalMedalCase(this);
  };
}

/**
 * Responsibility:
 * - インターバル画面の公開入口を維持し、builders / bindings / state / runtime / layout へ委譲する。
 *
 * Update Rules:
 * - 本文 state は interval/IntervalScreenState.js を更新する。
 * - overlay DOM は interval/IntervalOverlayBuilders.js、boss alert は IntervalBossAlertRuntime.js、
 *   transition は IntervalTransitionRuntime.js、shop は IntervalShopState.js を更新する。
 * - interval 固有レイアウトは ui/layout/interval/IntervalScreenLayout.js を更新する。
 */
import { installIntervalScreenBindings } from './interval/IntervalScreenBindings.js';
import { installIntervalScreenBuilders } from './interval/IntervalScreenBuilders.js';
import { installIntervalScreenState } from './interval/IntervalScreenState.js';
import { installIntervalBossAlertRuntime } from './interval/IntervalBossAlertRuntime.js';
import { installIntervalTransitionRuntime } from './interval/IntervalTransitionRuntime.js';
import { installIntervalShopState } from './interval/IntervalShopState.js';
import { installIntervalScreenLayout } from '../layout/interval/IntervalScreenLayout.js';

export function installIntervalScreenView(UIRoot) {
  installIntervalScreenBuilders(UIRoot);
  installIntervalScreenBindings(UIRoot);
  installIntervalScreenState(UIRoot);
  installIntervalBossAlertRuntime(UIRoot);
  installIntervalTransitionRuntime(UIRoot);
  installIntervalShopState(UIRoot);
  installIntervalScreenLayout(UIRoot);
}

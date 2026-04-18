import { installEffectsSpawnCore } from './runtime/EffectsSpawnCore.js';
import { installEffectsSpawnStylized } from './runtime/EffectsSpawnStylized.js';
import { installEffectsUpdateRuntime } from './runtime/EffectsUpdateRuntime.js';

/**
 * Responsibility:
 * - EffectsSystem は一時的な視覚効果の façade として動作する。
 *
 * Rules:
 * - スコア、HP、ミッション状態は変更しない。見た目だけを所有する。
 *
 * 更新ルール:
 * - EffectsSystem.js には runtime install だけを置く。
 * - 戦闘系の軽量エフェクトは EffectsSpawnCore、特殊演出は EffectsSpawnStylized、
 *   経時更新は EffectsUpdateRuntime に追加する。
 * - damageFlash のような UI 状態はここで更新しない。UIRuntimeState 側を正にする。
 */
export class EffectsSystem {
  constructor(game) {
    this.game = game;
  }
}

installEffectsSpawnCore(EffectsSystem);
installEffectsSpawnStylized(EffectsSystem);
installEffectsUpdateRuntime(EffectsSystem);

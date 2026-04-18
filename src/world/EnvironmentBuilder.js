/**
 * Responsibility:
 * - EnvironmentBuilder はミッション環境構築の façade として各責務モジュールを束ねる。
 *
 * Rules:
 * - 外部からの import 入口はこのファイルで固定する。
 * - 空間構築の実処理は mission lifecycle / collider / weather / decor などの責務モジュールへ委譲する。
 *
 * 更新ルール:
 * - ミッション適用と graphics 再適用は environment/EnvironmentMissionLifecycle.js を更新する。
 * - decor 分岐は environment/DecorRegistry.js を更新する。
 * - 最終ボス撃破後の空演出は environment/FinalBossSkyReveal.js を更新する。
 * - façade 本体へミッション固有分岐を戻さない。
 */
import { installStaticColliderRegistry } from './environment/StaticColliderRegistry.js';
import { installGroundFollowController } from './environment/GroundFollowController.js';
import { installSkyEnvironment } from './environment/SkyEnvironment.js';
import { installWeatherEnvironment } from './environment/WeatherEnvironment.js';
import { installBoundaryVeil } from './environment/BoundaryVeil.js';
import { installEnvironmentMissionLifecycle } from './environment/EnvironmentMissionLifecycle.js';
import { installFinalBossSkyReveal } from './environment/FinalBossSkyReveal.js';
import { installDesertDecor } from './environment/decor/DesertDecor.js';
import { installSwampDecor } from './environment/decor/SwampDecor.js';
import { installForgeDecor } from './environment/decor/ForgeDecor.js';
import { installFrostDecor } from './environment/decor/FrostDecor.js';
import { installMirrorDecor } from './environment/decor/MirrorDecor.js';
import { installAstralDecor } from './environment/decor/AstralDecor.js';
import { installVoidCrownDecor } from './environment/decor/VoidCrownDecor.js';

export class EnvironmentBuilder {
  constructor(game) {
    this.game = game;
    this.terrain = null;
    this.staticColliderGrid = null;
    this.resetEnvironmentState();
  }

  setTerrain(terrain) {
    this.terrain = terrain;
  }
}

installEnvironmentMissionLifecycle(EnvironmentBuilder);
installFinalBossSkyReveal(EnvironmentBuilder);
installStaticColliderRegistry(EnvironmentBuilder);
installGroundFollowController(EnvironmentBuilder);
installSkyEnvironment(EnvironmentBuilder);
installWeatherEnvironment(EnvironmentBuilder);
installBoundaryVeil(EnvironmentBuilder);
installDesertDecor(EnvironmentBuilder);
installSwampDecor(EnvironmentBuilder);
installForgeDecor(EnvironmentBuilder);
installFrostDecor(EnvironmentBuilder);
installMirrorDecor(EnvironmentBuilder);
installAstralDecor(EnvironmentBuilder);
installVoidCrownDecor(EnvironmentBuilder);

import { createUiRefs, initializeUiRootState } from './root/UIRootRefs.js';
import { initializeUiRootLifecycle, installUiRootLifecycle } from './root/UIRootLifecycle.js';
import { installUiRuntimeState } from './root/UIRuntimeState.js';
import { installUiLocalization } from './root/UILocalization.js';
import { installHudView } from './hud/HudView.js';
import { installMinimapView } from './hud/MinimapView.js';
import { installTargetLockView } from './hud/TargetLockView.js';
import { installDamageIndicatorView } from './hud/DamageIndicatorView.js';
import { installTutorialPanelView } from './hud/TutorialPanelView.js';
import { installTitleScreenView } from './screens/TitleScreenView.js';
import { installPauseScreenView } from './screens/PauseScreenView.js';
import { installOptionsScreenView } from './screens/OptionsScreenView.js';
import { installCreditScreenView } from './screens/CreditScreenView.js';
import { installCompendiumView } from './screens/CompendiumView.js';
import { installDataScreenView } from './screens/DataScreenView.js';
import { installDebugScreenView } from './screens/DebugScreenView.js';
import { installDebugPerformanceOverlayView } from './debug/DebugPerformanceOverlayView.js';
import { installDebugPerformanceReportView } from './debug/DebugPerformanceReportView.js';
import { installMedalCaseView } from './medals/MedalCaseView.js';
import { installIntervalScreenView } from './screens/IntervalScreenView.js';
import { installClearScreenView } from './screens/ClearScreenView.js';
import { installGameOverScreenState } from './screens/gameover/GameOverScreenState.js';
import { installHudLayout } from './layout/HudLayout.js';
import { installUIScreenFlow } from './screens/UIScreenFlow.js';
import { installConfirmDialogView } from './dialogs/ConfirmDialogView.js';

/**
 * Responsibility:
 * - UIRoot は UI 全体の façade として各 View を束ねる。
 *
 * Rules:
 * - 外部からの import 入口はこのファイルで固定する。
 * - 実際の画面責務は各 View / Layout / root helper モジュールへ委譲し、このクラスは統合点に徹する。
 *
 * 更新ルール:
 * - UIRoot.js には constructor と install だけを置く。
 * - refs 初期化は root/UIRootRefs.js、UI runtime は root/UIRuntimeState.js、
 *   localization は root/UILocalization.js、dispose と resize は root/UIRootLifecycle.js に追記する。
 * - damageFlash のような UI 状態更新は FX 側へ戻さない。
 */
export class UIRoot {
  constructor(game) {
    this.game = game;
    this.refs = createUiRefs();
    initializeUiRootState(this);
    this.ensureUiRuntimeState();
    this.bindUiRuntimeBus();
    this.createPlasmaGauge();
    this.createMissionTimer();
    this.createMissionTargetTime();
    this.createMinimap();
    this.createTargetLockLayer();
    this.createDamageIndicatorLayer();
    this.createTransitionOverlay();
    this.createBossAlertOverlay();
    this.applyReticleLayout();
    this.patchTitleControlHints();
    this.restoreStartButtonStyle();
    this.createTutorialButton();
    this.createTitleVersionBadge();
    this.upgradeCrystalHudPanel();
    this.createTutorialPanel();
    this.createPauseScreen();
    this.createOptionsScreen();
    this.createCreditScreen();
    this.createCompendiumScreen();
    this.createDataScreen();
    this.createDebugScreen();
    this.createDebugPerformanceOverlay();
    this.createMedalTooltip();
    this.createIntervalMedalCase();
    this.prepareClearScreen();
    this.createInlineClearResult();
    this.createClearScreenTitleButton();
    this.createGameOverHangarButton();
    this.createConfirmDialog();
    this.forceInteractiveOverlays();
    this.applyIntervalScreenLayout();
    initializeUiRootLifecycle(this);
    this.bindButtons();
    this.applyLocalization(true);
  }
}

installUiRootLifecycle(UIRoot);
installUiRuntimeState(UIRoot);
installUiLocalization(UIRoot);
installConfirmDialogView(UIRoot);
installHudView(UIRoot);
installMinimapView(UIRoot);
installTargetLockView(UIRoot);
installDamageIndicatorView(UIRoot);
installTutorialPanelView(UIRoot);
installTitleScreenView(UIRoot);
installPauseScreenView(UIRoot);
installOptionsScreenView(UIRoot);
installCreditScreenView(UIRoot);
installCompendiumView(UIRoot);
installDataScreenView(UIRoot);
installDebugScreenView(UIRoot);
installDebugPerformanceOverlayView(UIRoot);
installDebugPerformanceReportView(UIRoot);
installMedalCaseView(UIRoot);
installIntervalScreenView(UIRoot);
installClearScreenView(UIRoot);
installGameOverScreenState(UIRoot);
installHudLayout(UIRoot);
installUIScreenFlow(UIRoot);

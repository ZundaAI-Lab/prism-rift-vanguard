import { MISSIONS } from '../../data/missions.js';

function setTextIfChanged(node, value) {
  if (!node) return;
  const nextValue = String(value ?? '');
  if (node.__uiTextCache === nextValue) return;
  node.textContent = nextValue;
  node.__uiTextCache = nextValue;
}

function setStyleIfChanged(node, property, value) {
  if (!node) return;
  const nextValue = String(value ?? '');
  const cache = node.__uiStyleCache ?? (node.__uiStyleCache = Object.create(null));
  if (cache[property] === nextValue) return;
  node.style[property] = nextValue;
  cache[property] = nextValue;
}

/**
 * Responsibility:
 * - チュートリアル専用 HUD パネルの構築と差分更新を担当する。
 *
 * Update Rules:
 * - タイトル画面の導線とは分離し、プレイ中 HUD overlay として扱う。
 * - tutorial state の判定はゲーム状態を読むだけに留める。
 * - レイアウトは layout/hud/TutorialPanelLayout.js へ委譲する。
 */
export function installTutorialPanelView(UIRoot) {
  UIRoot.prototype.createTutorialPanel = function createTutorialPanel() {
    const hud = this.refs.hud;
    if (!hud || this.refs.tutorialPanel) return;

    const panel = document.createElement('section');
    panel.className = 'tutorial-message-window';
    panel.setAttribute('aria-live', 'polite');
    panel.style.display = 'none';

    const header = document.createElement('div');
    header.className = 'tutorial-message-header';

    const eyebrow = document.createElement('div');
    eyebrow.className = 'tutorial-message-eyebrow';
    eyebrow.textContent = this.t('tutorial.screenTitle');

    const body = document.createElement('div');
    body.className = 'tutorial-message-body';

    const title = document.createElement('div');
    title.className = 'tutorial-message-title';

    const objective = document.createElement('div');
    objective.className = 'tutorial-message-objective';

    const progress = document.createElement('div');
    progress.className = 'tutorial-message-progress';

    header.appendChild(eyebrow);
    body.append(title, objective, progress);
    panel.append(header, body);
    hud.appendChild(panel);

    this.refs.tutorialPanel = panel;
    this.refs.tutorialEyebrow = eyebrow;
    this.refs.tutorialTitle = title;
    this.refs.tutorialObjective = objective;
    this.refs.tutorialProgress = progress;
    this.applyTutorialPanelLayout();
  };

  UIRoot.prototype.refreshTutorialPanelLocalization = function refreshTutorialPanelLocalization() {
    if (this.refs.tutorialEyebrow) this.refs.tutorialEyebrow.textContent = this.t('tutorial.screenTitle');
  };

  UIRoot.prototype.renderTutorialPanelState = function renderTutorialPanelState() {
    const { state } = this.game;
    const progression = state.progression;
    const mission = MISSIONS[state.missionIndex] ?? MISSIONS[0];
    const tutorialVisible = !!progression.tutorial?.active && mission.isTutorial && (state.mode === 'playing' || state.mode === 'paused');
    if (!this.refs.tutorialPanel) return;

    setStyleIfChanged(this.refs.tutorialPanel, 'display', tutorialVisible ? 'block' : 'none');
    if (!tutorialVisible) return;

    setTextIfChanged(this.refs.tutorialTitle, progression.tutorial.stepTitle || this.t('tutorial.screenTitle'));
    setTextIfChanged(this.refs.tutorialObjective, progression.tutorial.objective || '');
    setTextIfChanged(this.refs.tutorialProgress, progression.tutorial.progressText || '');
    this.applyTutorialPanelLayout();
  };
}

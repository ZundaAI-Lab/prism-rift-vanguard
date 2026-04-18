/**
 * Responsibility:
 * - タイトル画面の開始導線とタイトル固有 UI を扱う。
 *
 * Rules:
 * - タイトル画面の通常導線はタイトル専用に保ち、デバッグ専用設定は別画面へ分離する。
 * - 図鑑の開閉導線はタイトル文脈の UI としてここから扱う。
 * - タイトルUIは mission data 自体を書き換えない。
 *
 * Update Rules:
 * - タイトル専用の controls-grid 改変はこのファイルを正本にする。
 * - tutorial panel 本体は hud/TutorialPanelView.js を更新する。
 */
import { APP_VERSION_LABEL } from '../../app/AppMeta.js';
import { TUTORIAL_MISSION_INDEX } from '../../data/missions.js';

const TITLE_ACTION_ORDER = Object.freeze([
  'tutorial',
  'campaign',
  'options',
  'data',
  'compendium',
  'credits',
  'debug',
]);

export function installTitleScreenView(UIRoot) {
  UIRoot.prototype.getTitleActionNode = function getTitleActionNode(slotKey) {
    switch (slotKey) {
      case 'tutorial':
        return this.refs.tutorialStartBtn;
      case 'campaign':
        return document.getElementById('startBtn');
      case 'options':
        return this.refs.optionsOpenBtn;
      case 'compendium':
        return this.refs.enemyIntelOpenBtn;
      case 'data':
        return this.refs.dataOpenBtn;
      case 'debug':
        return this.refs.debugOpenBtn;
      case 'credits':
        return this.refs.creditsOpenBtn;
      default:
        return null;
    }
  };

  UIRoot.prototype.insertTitleActionButton = function insertTitleActionButton(button, slotKey) {
    const actions = this.refs.startScreen?.querySelector('.screen-actions');
    if (!actions || !button) return;

    const slotIndex = TITLE_ACTION_ORDER.indexOf(slotKey);
    if (slotIndex < 0) {
      actions.appendChild(button);
      return;
    }

    for (let index = slotIndex + 1; index < TITLE_ACTION_ORDER.length; index += 1) {
      const nextNode = this.getTitleActionNode(TITLE_ACTION_ORDER[index]);
      if (nextNode && nextNode.parentElement === actions && nextNode !== button) {
        actions.insertBefore(button, nextNode);
        return;
      }
    }

    actions.appendChild(button);
  };

  UIRoot.prototype.createTitleVersionBadge = function createTitleVersionBadge() {
    const titleCard = this.refs.startScreen?.querySelector('.title-card');
    if (!titleCard || titleCard.querySelector('.title-version')) return;

    const badge = document.createElement('div');
    badge.className = 'title-version';
    badge.textContent = APP_VERSION_LABEL;
    titleCard.appendChild(badge);
  };

  UIRoot.prototype.restoreStartButtonStyle = function restoreStartButtonStyle() {
    const startBtn = document.getElementById('startBtn');
    if (!startBtn) return;
    startBtn.classList.add('title-action-primary');
    startBtn.style.borderRadius = '';
    startBtn.style.padding = '';
    startBtn.style.minWidth = '';
    startBtn.style.width = '';
    startBtn.style.display = '';
  };

  UIRoot.prototype.refreshTitleActionState = function refreshTitleActionState(force = false) {
    const signature = JSON.stringify({ language: this.getLanguage() });
    if (!force && this.lastTitleActionSignature === signature) return;
    this.lastTitleActionSignature = signature;

    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.textContent = this.t('common.campaignStart');
    if (this.refs.tutorialStartBtn) this.refs.tutorialStartBtn.textContent = this.t('common.tutorial');
  };

  UIRoot.prototype.patchTitleControlHints = function patchTitleControlHints() {
    const controls = [...document.querySelectorAll('.controls-grid > div')];
    if (controls.length <= 0) return;

    const rightClickRow = controls[3] ?? null;
    const removableShiftRow = controls.length >= 6 ? controls[4] : null;
    if (rightClickRow) {
      const strong = rightClickRow.querySelector('strong');
      const span = rightClickRow.querySelector('span');
      if (strong) strong.textContent = this.t('common.keys.rightClick');
      if (span) span.textContent = this.t('hud.plasmaShot');
    }
    removableShiftRow?.remove();
  };

  UIRoot.prototype.refreshTitleControlHintsLocalization = function refreshTitleControlHintsLocalization() {
    this.patchTitleControlHints();
  };

  UIRoot.prototype.bindTitleScreenControls = function bindTitleScreenControls() {
    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.onclick = () => {
      this.playUiConfirm();
      this.setCompendiumOpen(false);
      this.game.startNewRun(this.game.debug.getTitleStartMissionIndex());
    };

    if (this.refs.tutorialStartBtn) this.refs.tutorialStartBtn.onclick = () => {
      this.playUiConfirm();
      this.setCompendiumOpen(false);
      this.game.startNewRun(TUTORIAL_MISSION_INDEX);
    };
  };

  UIRoot.prototype.createTutorialButton = function createTutorialButton() {
    const actions = this.refs.startScreen?.querySelector('.screen-actions');
    if (!actions || this.refs.tutorialStartBtn) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'title-action-tutorial';
    button.textContent = this.t('common.tutorial');
    const anchor = document.getElementById('startBtn');
    if (anchor) actions.insertBefore(button, anchor);
    else actions.prepend(button);
    this.refs.tutorialStartBtn = button;
  };
}

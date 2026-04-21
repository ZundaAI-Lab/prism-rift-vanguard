import { installPauseScreenState } from './pause/PauseScreenState.js';

/**
 * Responsibility:
 * - pause 画面の DOM 構築と入力導線を担当する。
 *
 * Update Rules:
 * - pause 画面本文の差分更新は pause/PauseScreenState.js を更新する。
 * - HUD 本体へ pause 文言を戻さない。
 */
export function installPauseScreenView(UIRoot) {
  installPauseScreenState(UIRoot);

  UIRoot.prototype.createPauseScreen = function createPauseScreen() {
    const screen = document.createElement('section');
    screen.className = 'screen';
    screen.style.zIndex = '45';
    screen.style.pointerEvents = 'auto';

    const card = document.createElement('div');
    card.className = 'screen-card';
    card.style.width = 'min(640px, calc(100vw - 40px))';

    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = this.t('common.pointerLockReleased');

    const title = document.createElement('h2');
    title.textContent = this.t('common.paused');

    const lead = document.createElement('p');
    lead.className = 'lead';
    lead.textContent = this.t('pause.lead');

    const info = document.createElement('div');
    info.style.marginTop = '16px';
    info.style.padding = '14px 16px';
    info.style.borderRadius = '18px';
    info.style.background = 'rgba(255,255,255,0.035)';
    info.style.border = '1px solid rgba(255,255,255,0.06)';
    info.style.color = '#d7e7ef';
    info.style.lineHeight = '1.7';
    info.style.fontSize = '14px';

    const actions = document.createElement('div');
    actions.className = 'screen-actions';

    const resumeBtn = document.createElement('button');
    resumeBtn.type = 'button';
    resumeBtn.textContent = this.t('common.resume');

    const titleBtn = document.createElement('button');
    titleBtn.type = 'button';
    titleBtn.className = 'minor screen-action-back-end';
    titleBtn.textContent = this.t('common.title');

    let debugBtn = null;
    if (this.game.debug.isEnabled()) {
      debugBtn = document.createElement('button');
      debugBtn.type = 'button';
      debugBtn.className = 'minor';
      debugBtn.textContent = this.t('common.debug');
      debugBtn.style.minWidth = '180px';
      debugBtn.style.borderColor = 'rgba(255, 192, 96, 0.28)';
      debugBtn.style.background = 'linear-gradient(180deg, rgba(70, 48, 12, 0.32), rgba(18, 12, 8, 0.18))';
    }

    if (debugBtn) actions.append(resumeBtn, debugBtn, titleBtn);
    else actions.append(resumeBtn, titleBtn);
    card.append(eyebrow, title, lead, info, actions);
    screen.appendChild(card);
    document.getElementById('app-shell').appendChild(screen);

    this.refs.pauseScreen = screen;
    this.refs.pauseEyebrow = eyebrow;
    this.refs.pauseTitle = title;
    this.refs.pauseLead = lead;
    this.refs.pauseInfo = info;
    this.refs.pauseResumeBtn = resumeBtn;
    this.refs.pauseDebugBtn = debugBtn;
    this.refs.pauseTitleBtn = titleBtn;
  };

  UIRoot.prototype.refreshPauseScreenLocalization = function refreshPauseScreenLocalization() {
    if (this.refs.pauseEyebrow) this.refs.pauseEyebrow.textContent = this.t('common.pointerLockReleased');
    if (this.refs.pauseTitle) this.refs.pauseTitle.textContent = this.t('common.paused');
    if (this.refs.pauseLead) this.refs.pauseLead.textContent = this.t('pause.lead');
    if (this.refs.pauseResumeBtn) this.refs.pauseResumeBtn.textContent = this.t('common.resume');
    if (this.refs.pauseDebugBtn) {
      this.refs.pauseDebugBtn.textContent = this.debugScreenOpen ? this.t('debug.buttonOpen') : this.t('common.debug');
    }
    if (this.refs.pauseTitleBtn) this.refs.pauseTitleBtn.textContent = this.t('common.title');
  };

  UIRoot.prototype.bindPauseScreenControls = function bindPauseScreenControls() {
    if (this.refs.pauseResumeBtn) this.refs.pauseResumeBtn.onclick = () => {
      this.playUiConfirm();
      this.game.resumePausedRun();
    };

    if (this.refs.pauseDebugBtn) this.refs.pauseDebugBtn.onclick = () => {
      this.playUiConfirm();
      if (!this.refs.debugScreen && this.createDebugScreen) this.createDebugScreen();
      this.setDebugScreenOpen(true);
      this.refreshDebugScreenState?.();
    };

    if (this.refs.pauseTitleBtn) this.refs.pauseTitleBtn.onclick = async () => {
      const accepted = await this.requestConfirmation({
        message: this.t('confirm.returnToTitleFromPause'),
        confirmText: this.t('common.title'),
      });
      if (!accepted) return;
      this.playUiCancel();
      this.game.backToTitle();
    };
  };
}

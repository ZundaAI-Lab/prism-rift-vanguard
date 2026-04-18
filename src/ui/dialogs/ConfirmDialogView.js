/**
 * Responsibility:
 * - 画面共通で使う確認ダイアログを構築し、専用 UI として提供する。
 *
 * Rules:
 * - ネイティブの window.confirm は使わず、このモジュール経由で表示する。
 * - 見た目は既存の screen / screen-card 系 UI と統一し、個別画面で独自のダイアログを持たない。
 */
export function installConfirmDialogView(UIRoot) {
  UIRoot.prototype.createConfirmDialog = function createConfirmDialog() {
    if (this.refs.confirmDialogScreen) return;

    const screen = document.createElement('section');
    screen.className = 'screen confirm-dialog-screen';
    screen.style.zIndex = '70';
    screen.style.pointerEvents = 'auto';
    screen.setAttribute('aria-hidden', 'true');

    const card = document.createElement('div');
    card.className = 'screen-card confirm-dialog-card';
    card.setAttribute('role', 'alertdialog');
    card.setAttribute('aria-modal', 'true');
    card.tabIndex = -1;

    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow confirm-dialog-eyebrow';

    const title = document.createElement('h2');
    title.className = 'confirm-dialog-title';

    const message = document.createElement('p');
    message.className = 'lead confirm-dialog-message';

    const actions = document.createElement('div');
    actions.className = 'screen-actions confirm-dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'minor confirm-dialog-cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'confirm-dialog-confirm';

    actions.append(cancelBtn, confirmBtn);
    card.append(eyebrow, title, message, actions);
    screen.appendChild(card);
    document.getElementById('app-shell')?.appendChild(screen);

    const resolveFromUi = (accepted, { playCancel = false } = {}) => {
      if (playCancel) this.playUiCancel();
      this.resolveConfirmation(accepted);
    };

    screen.addEventListener('click', (event) => {
      if (event.target !== screen) return;
      resolveFromUi(false, { playCancel: true });
    });

    cancelBtn.addEventListener('click', () => {
      resolveFromUi(false, { playCancel: true });
    });

    confirmBtn.addEventListener('click', () => {
      resolveFromUi(true);
    });

    const handleKeyDown = (event) => {
      if (!this.confirmDialogState?.active) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        resolveFromUi(false, { playCancel: true });
        return;
      }
      if (event.key !== 'Enter') return;
      event.preventDefault();
      resolveFromUi(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    this.unregisterConfirmDialogKeydown();
    this.unregisterConfirmDialogKeydown = () => {
      document.removeEventListener('keydown', handleKeyDown);
    };

    this.confirmDialogState = {
      active: false,
      resolver: null,
    };
    this.refs.confirmDialogScreen = screen;
    this.refs.confirmDialogCard = card;
    this.refs.confirmDialogEyebrow = eyebrow;
    this.refs.confirmDialogTitle = title;
    this.refs.confirmDialogMessage = message;
    this.refs.confirmDialogCancelBtn = cancelBtn;
    this.refs.confirmDialogConfirmBtn = confirmBtn;
  };

  UIRoot.prototype.resolveConfirmation = function resolveConfirmation(accepted) {
    const state = this.confirmDialogState;
    if (!state?.resolver) return;
    const resolver = state.resolver;
    state.resolver = null;
    state.active = false;

    const screen = this.refs.confirmDialogScreen;
    const card = this.refs.confirmDialogCard;
    screen?.classList.remove('visible');
    screen?.setAttribute('aria-hidden', 'true');
    card?.removeAttribute('data-tone');

    resolver(Boolean(accepted));
  };

  UIRoot.prototype.requestConfirmation = function requestConfirmation({
    message = '',
    title = this.t('confirm.title'),
    eyebrow = this.t('confirm.eyebrow'),
    confirmText = this.t('confirm.confirmAction'),
    cancelText = this.t('confirm.cancel'),
    tone = 'default',
  } = {}) {
    if (!this.refs.confirmDialogScreen) this.createConfirmDialog();
    if (this.confirmDialogState?.active) this.resolveConfirmation(false);

    const screen = this.refs.confirmDialogScreen;
    const card = this.refs.confirmDialogCard;
    const eyebrowNode = this.refs.confirmDialogEyebrow;
    const titleNode = this.refs.confirmDialogTitle;
    const messageNode = this.refs.confirmDialogMessage;
    const cancelBtn = this.refs.confirmDialogCancelBtn;
    const confirmBtn = this.refs.confirmDialogConfirmBtn;

    if (!screen || !card || !eyebrowNode || !titleNode || !messageNode || !cancelBtn || !confirmBtn) {
      return Promise.resolve(false);
    }

    eyebrowNode.textContent = eyebrow;
    titleNode.textContent = title;
    messageNode.textContent = message;
    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;
    if (tone === 'danger') card.dataset.tone = 'danger';
    else card.dataset.tone = 'default';

    screen.classList.add('visible');
    screen.setAttribute('aria-hidden', 'false');

    return new Promise((resolve) => {
      this.confirmDialogState.active = true;
      this.confirmDialogState.resolver = resolve;
      requestAnimationFrame(() => {
        confirmBtn.focus({ preventScroll: true });
      });
    });
  };
}

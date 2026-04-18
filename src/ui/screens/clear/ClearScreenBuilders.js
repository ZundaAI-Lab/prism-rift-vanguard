/**
 * Responsibility:
 * - クリア画面の DOM 構築と追加ボタン生成を担当する。
 */
export function buildClearScreenUi(root) {
  const clearScreen = root.refs.clearScreen;
  if (!clearScreen) return;
  root.refs.clearButtons = clearScreen.querySelector('.screen-actions');
  if (root.refs.clearText) {
    root.refs.clearText.style.whiteSpace = 'normal';
    root.refs.clearText.style.display = 'grid';
    root.refs.clearText.style.gap = '14px';
    root.refs.clearText.style.alignItems = 'center';
    root.refs.clearText.style.justifyItems = 'center';
    root.refs.clearText.textContent = '';

    const header = document.createElement('span');
    header.style.display = 'block';
    header.style.fontSize = 'inherit';
    header.style.lineHeight = '1.75';

    const rows = document.createElement('span');
    rows.style.display = 'grid';
    rows.style.gap = '8px';
    rows.style.width = '100%';
    rows.style.justifyItems = 'center';

    root.refs.clearText.append(header, rows);
    root.refs.clearTextHeader = header;
    root.refs.clearTextRows = rows;
  }

  if (!root.refs.clearIntelUnlockPopup) {
    const popup = document.createElement('section');
    popup.className = 'screen clear-unlock-popup-screen';
    popup.style.zIndex = '65';
    popup.style.pointerEvents = 'auto';
    popup.setAttribute('aria-hidden', 'true');

    const card = document.createElement('div');
    card.className = 'screen-card clear-unlock-popup-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.tabIndex = -1;

    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow clear-unlock-popup-eyebrow';

    const title = document.createElement('h3');
    title.className = 'clear-unlock-popup-title';

    const lead = document.createElement('p');
    lead.className = 'lead clear-unlock-popup-lead';

    const actions = document.createElement('div');
    actions.className = 'screen-actions clear-unlock-popup-actions';

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'clear-unlock-popup-ok';

    actions.appendChild(okBtn);
    card.append(eyebrow, title, lead, actions);
    popup.appendChild(card);
    document.getElementById('app-shell')?.appendChild(popup);

    root.refs.clearIntelUnlockPopup = popup;
    root.refs.clearIntelUnlockPopupCard = card;
    root.refs.clearIntelUnlockPopupEyebrow = eyebrow;
    root.refs.clearIntelUnlockPopupTitle = title;
    root.refs.clearIntelUnlockPopupLead = lead;
    root.refs.clearIntelUnlockPopupOkBtn = okBtn;
  }
}

export function installClearScreenBuilders(UIRoot) {
  UIRoot.prototype.createInlineClearResult = function createInlineClearResult() {
    const hud = this.refs.hud;
    if (!hud) return;

    const result = document.createElement('div');
    result.style.position = 'absolute';
    result.style.left = '50%';
    result.style.top = '0';
    result.style.transform = 'translateX(-50%)';
    result.style.display = 'none';
    result.style.pointerEvents = 'none';
    result.style.textAlign = 'center';
    result.style.fontSize = 'clamp(17px, 1.7vw, 26px)';
    result.style.fontWeight = '700';
    result.style.lineHeight = '1.72';
    result.style.letterSpacing = '0.08em';
    result.style.color = '#dffaff';
    result.style.textShadow = '0 0 16px rgba(116,255,240,0.18), 0 0 34px rgba(255,110,212,0.12)';
    result.style.opacity = '0';
    result.style.transition = 'opacity 180ms ease';
    result.style.maxWidth = 'min(76vw, 920px)';
    result.style.padding = '0 18px';
    result.style.zIndex = '6';

    const header = document.createElement('div');
    header.style.display = 'block';
    header.style.lineHeight = '1.55';

    const rows = document.createElement('div');
    rows.style.marginTop = '10px';
    rows.style.display = 'grid';
    rows.style.gap = '6px';
    rows.style.justifyItems = 'center';

    result.append(header, rows);
    hud.appendChild(result);
    this.refs.clearInlineResult = result;
    this.refs.clearInlineResultHeader = header;
    this.refs.clearInlineResultRows = rows;
  };

  UIRoot.prototype.createClearScreenTitleButton = function createClearScreenTitleButton() {
    const clearScreen = this.refs.clearScreen;
    if (!clearScreen) return;
    const actions = clearScreen.querySelector('.screen-actions');
    if (!actions) return;

    const existing = document.getElementById('clearTitleBtn');
    if (existing) {
      this.refs.clearTitleBtn = existing;
      this.bindResultScreenControls();
      return;
    }

    const titleBtn = document.createElement('button');
    titleBtn.type = 'button';
    titleBtn.id = 'clearTitleBtn';
    titleBtn.className = 'minor screen-action-back-end';
    titleBtn.textContent = this.t('common.title');
    actions.append(titleBtn);
    this.refs.clearTitleBtn = titleBtn;
    this.bindResultScreenControls();
  };

  UIRoot.prototype.createGameOverHangarButton = function createGameOverHangarButton() {
    const gameOverScreen = this.refs.gameOverScreen;
    if (!gameOverScreen) return;
    const actions = gameOverScreen.querySelector('.screen-actions');
    if (!actions) return;

    const existing = document.getElementById('gameOverHangarBtn');
    if (existing) {
      this.refs.gameOverHangarBtn = existing;
      this.bindResultScreenControls();
      return;
    }

    const hangarBtn = document.createElement('button');
    hangarBtn.type = 'button';
    hangarBtn.id = 'gameOverHangarBtn';
    hangarBtn.className = 'minor';
    hangarBtn.textContent = this.t('common.backToHangar');
    const titleBtn = document.getElementById('gameOverTitleBtn');
    if (titleBtn) actions.insertBefore(hangarBtn, titleBtn);
    else actions.append(hangarBtn);
    this.refs.gameOverHangarBtn = hangarBtn;
    this.bindResultScreenControls();
  };
}

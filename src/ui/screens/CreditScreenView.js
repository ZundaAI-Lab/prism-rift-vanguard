/**
 * Responsibility:
 * - タイトル画面から開くクレジット画面の構築と表示更新を担当する。
 *
 * Rules:
 * - 「戻る」系ボタンは `screen-action-back-end` を使い、必ず右端へ配置する。
 * - クレジット表記はこの画面内に閉じ込め、他画面へ直書きしない。
 * - 画面の開閉だけを扱い、ゲーム進行そのものは変更しない。
 * - タイトルボタンの並びは既存の title action 定義順に従う。
 */
const CREDIT_SECTIONS = Object.freeze([
  {
    key: 'program',
    items: ['credits.programUsage'],
  },
  {
    key: 'bgm',
    items: [
      'PeriTune',
      'DOVA-SYNDROME / sakunoken',
      'DOVA-SYNDROME / 奏でるやかん',
      'DOVA-SYNDROME / MAKOOTO',
    ],
  },
  {
    key: 'se',
    items: [
      '効果音ラボ / Killy',
    ],
  },
]);

function applyStyles(node, styles) {
  Object.assign(node.style, styles);
}

function createSection() {
  const section = document.createElement('section');
  applyStyles(section, {
    display: 'grid',
    gap: '12px',
    padding: '18px 20px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
  });
  return section;
}

function createHeading() {
  const heading = document.createElement('div');
  applyStyles(heading, {
    fontSize: '12px',
    fontWeight: '800',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#9fc7d8',
  });
  return heading;
}

function createList() {
  const list = document.createElement('ul');
  applyStyles(list, {
    display: 'grid',
    gap: '10px',
    margin: '0',
    padding: '0 0 0 1.25em',
    color: '#eff8ff',
    lineHeight: '1.75',
  });
  return list;
}

function createItem() {
  const item = document.createElement('li');
  applyStyles(item, {
    fontSize: '15px',
    lineHeight: '1.75',
    color: '#e6f4ff',
  });
  return item;
}

export function installCreditScreenView(UIRoot) {
  UIRoot.prototype.createCreditScreen = function createCreditScreen() {
    if (!this.refs.creditsOpenBtn) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'minor';
      button.textContent = this.t('common.credits');
      button.style.minWidth = '180px';
      this.insertTitleActionButton(button, 'credits');
      this.refs.creditsOpenBtn = button;
    }

    const screen = document.createElement('section');
    screen.className = 'screen screen-scrollable';
    screen.style.zIndex = '43';
    screen.style.pointerEvents = 'auto';

    const card = document.createElement('div');
    card.className = 'screen-card screen-card-shell';
    applyStyles(card, {
      width: 'min(760px, calc(100vw - 40px))',
      maxHeight: 'calc(100dvh - 36px)',
      display: 'grid',
      gridTemplateRows: 'auto auto auto minmax(0, 1fr) auto',
      gap: '14px',
    });

    const eyebrow = document.createElement('div');
    eyebrow.className = 'eyebrow';

    const title = document.createElement('h2');

    const lead = document.createElement('p');
    lead.className = 'lead';

    const scroller = document.createElement('div');
    scroller.className = 'screen-scrollbox';
    applyStyles(scroller, {
      overflow: 'auto',
      paddingRight: '6px',
      display: 'grid',
      gap: '14px',
    });

    const actionsBar = document.createElement('div');
    actionsBar.className = 'screen-actions';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'minor screen-action-back-end';
    closeBtn.textContent = this.t('common.back');
    actionsBar.appendChild(closeBtn);

    card.append(eyebrow, title, lead, scroller, actionsBar);
    screen.appendChild(card);
    document.getElementById('app-shell').appendChild(screen);

    this.refs.creditsScreen = screen;
    this.refs.creditsCloseBtn = closeBtn;
    this.refs.creditsContent = scroller;
    this.refs.creditsMeta = { eyebrow, title, lead };
    this.bindCreditScreenControls();
    this.refreshCreditScreenState(true);
  };

  UIRoot.prototype.bindCreditScreenControls = function bindCreditScreenControls() {
    if (this.refs.creditsOpenBtn) this.refs.creditsOpenBtn.onclick = () => {
      this.playUiConfirm();
      this.setCreditScreenOpen(true);
    };

    if (this.refs.creditsCloseBtn) this.refs.creditsCloseBtn.onclick = () => {
      this.playUiCancel();
      this.setCreditScreenOpen(false);
    };
  };

  UIRoot.prototype.setCreditScreenOpen = function setCreditScreenOpen(open) {
    this.creditScreenOpen = !!open;
    if (this.creditScreenOpen) {
      this.compendiumOpen = false;
      this.dataScreenOpen = false;
      this.debugScreenOpen = false;
      if (this.optionsScreenOpen) this.setOptionsScreenOpen(false);
    }
    this.refreshCreditScreenState();
  };

  UIRoot.prototype.refreshCreditScreenState = function refreshCreditScreenState(force = false) {
    const openBtn = this.refs.creditsOpenBtn;
    if (openBtn) {
      openBtn.textContent = this.t('common.credits');
      openBtn.style.borderColor = this.creditScreenOpen
        ? 'rgba(130,255,225,0.28)'
        : '';
      openBtn.style.background = this.creditScreenOpen
        ? 'linear-gradient(180deg, rgba(18, 54, 62, 0.34), rgba(8, 20, 24, 0.18))'
        : '';
    }

    const meta = this.refs.creditsMeta;
    const content = this.refs.creditsContent;
    if (!meta || !content) return;

    const signature = JSON.stringify({
      language: this.getLanguage(),
      open: this.creditScreenOpen === true,
    });
    if (!force && this.lastCreditScreenSignature === signature) return;
    this.lastCreditScreenSignature = signature;

    meta.eyebrow.textContent = this.t('credits.eyebrow');
    meta.title.textContent = this.t('credits.title');
    meta.lead.textContent = this.t('credits.lead');
    if (this.refs.creditsCloseBtn) this.refs.creditsCloseBtn.textContent = this.t('common.back');

    content.textContent = '';
    for (const sectionData of CREDIT_SECTIONS) {
      const section = createSection();
      const heading = createHeading();
      heading.textContent = this.t(`credits.sections.${sectionData.key}`);

      const list = createList();
      for (const itemValue of sectionData.items) {
        const item = createItem();
        item.textContent = itemValue.startsWith('credits.') ? this.t(itemValue) : itemValue;
        list.appendChild(item);
      }

      section.append(heading, list);
      content.appendChild(section);
    }
  };
}

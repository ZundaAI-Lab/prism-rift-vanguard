/**
 * Responsibility:
 * - 保存データ画面の DOM 構築と再構築を担当する。
 */
export function buildDataScreen(root) {
  const startScreen = root.refs.startScreen;
  const actions = startScreen?.querySelector('.screen-actions');
  if (actions && !root.refs.dataOpenBtn) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'minor';
    button.textContent = root.t('common.data');
    button.style.minWidth = '180px';
    root.insertTitleActionButton(button, 'data');
    root.refs.dataOpenBtn = button;
  }

  const screen = document.createElement('section');
  screen.className = 'screen screen-scrollable';
  screen.style.zIndex = '42';
  screen.style.pointerEvents = 'auto';

  const card = document.createElement('div');
  card.className = 'screen-card huge screen-card-shell';
  card.style.width = 'min(1100px, calc(100vw - 36px))';
  card.style.maxHeight = 'calc(100dvh - 36px)';
  card.style.display = 'grid';
  card.style.gridTemplateRows = 'auto auto minmax(0, 1fr) auto';
  card.style.gap = '14px';

  const eyebrow = document.createElement('div');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = root.t('common.localDataArchive');

  const title = document.createElement('h2');
  title.textContent = root.t('common.missionRecords');

  const scroller = document.createElement('div');
  scroller.className = 'screen-scrollbox';
  scroller.style.overflow = 'auto';
  scroller.style.paddingRight = '6px';
  scroller.style.display = 'grid';
  scroller.style.gridTemplateColumns = 'minmax(0, 1fr)';
  scroller.style.gap = '12px';

  const actionsBar = document.createElement('div');
  actionsBar.className = 'screen-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'minor';
  deleteBtn.textContent = root.t('common.deleteData');
  deleteBtn.style.borderColor = 'rgba(255, 122, 146, 0.24)';
  deleteBtn.style.background = 'linear-gradient(180deg, rgba(92, 24, 38, 0.26), rgba(28, 10, 16, 0.16))';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'minor screen-action-back-end';
  backBtn.textContent = root.t('common.back');

  actionsBar.append(deleteBtn, backBtn);
  card.append(eyebrow, title, scroller, actionsBar);
  screen.appendChild(card);
  document.getElementById('app-shell').appendChild(screen);

  root.refs.dataScreen = screen;
  root.refs.dataSummary = scroller;
  root.refs.dataCloseBtn = backBtn;
  root.refs.dataDeleteBtn = deleteBtn;
  root.bindDataScreenControls();
  root.refreshDataScreenState(true);
}

export function destroyDataScreen(root) {
  root.refs.dataScreen?.remove?.();
  root.refs.dataOpenBtn?.remove?.();
  root.refs.dataScreen = null;
  root.refs.dataSummary = null;
  root.refs.dataCloseBtn = null;
  root.refs.dataDeleteBtn = null;
  root.refs.dataOpenBtn = null;
}

export function rebuildDataScreenForLocalization(root) {
  if (!root.refs.dataScreen && !root.refs.dataOpenBtn) {
    root.createDataScreen();
    return;
  }
  const wasOpen = root.dataScreenOpen;
  destroyDataScreen(root);
  buildDataScreen(root);
  root.dataScreenOpen = wasOpen;
  root.refreshDataButtonState();
  root.refreshDataScreenState(true);
}

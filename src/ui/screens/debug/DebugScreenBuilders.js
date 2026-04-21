/**
 * Responsibility:
 * - デバッグ画面の DOM 構築と再構築を担当する。
 */
import { MISSIONS } from '../../../data/missions.js';

export function buildDebugScreen(root) {
  if (!root.game.debug.isEnabled()) return;

  const startScreen = root.refs.startScreen;
  const actions = startScreen?.querySelector('.screen-actions');
  if (actions && !root.refs.debugOpenBtn) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'minor';
    button.textContent = root.t('common.debug');
    button.style.minWidth = '180px';
    button.style.borderColor = 'rgba(255, 192, 96, 0.28)';
    button.style.background = 'linear-gradient(180deg, rgba(70, 48, 12, 0.32), rgba(18, 12, 8, 0.18))';
    root.insertTitleActionButton(button, 'debug');
    root.refs.debugOpenBtn = button;
  }

  const screen = document.createElement('section');
  screen.className = 'screen screen-scrollable';
  screen.style.zIndex = '42';
  screen.style.pointerEvents = 'auto';

  const card = document.createElement('div');
  card.className = 'screen-card screen-card-shell';
  card.style.width = 'min(760px, calc(100vw - 40px))';
  card.style.maxHeight = 'calc(100dvh - 36px)';
  card.style.display = 'grid';
  card.style.gridTemplateRows = 'auto auto auto minmax(0, 1fr) auto';
  card.style.gap = '16px';

  const eyebrow = document.createElement('div');
  eyebrow.className = 'eyebrow';
  eyebrow.style.color = '#ffd58f';
  eyebrow.textContent = root.t('debug.eyebrow');

  const title = document.createElement('h2');
  title.textContent = root.t('debug.title');

  const lead = document.createElement('p');
  lead.className = 'lead';
  lead.textContent = root.t('debug.lead');

  const panel = document.createElement('div');
  panel.style.display = 'grid';
  panel.style.gap = '12px';
  panel.style.padding = '16px';
  panel.style.borderRadius = '18px';
  panel.style.background = 'rgba(10, 16, 30, 0.52)';
  panel.style.border = '1px solid rgba(255, 204, 120, 0.14)';
  panel.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.18)';

  const missionLabel = document.createElement('div');
  missionLabel.textContent = root.t('debug.startMission');
  missionLabel.style.fontSize = '12px';
  missionLabel.style.letterSpacing = '0.18em';
  missionLabel.style.textTransform = 'uppercase';
  missionLabel.style.color = '#a4bac8';

  const select = document.createElement('select');
  select.style.width = '100%';
  select.style.padding = '12px 14px';
  select.style.borderRadius = '12px';
  select.style.border = '1px solid rgba(130,255,225,0.16)';
  select.style.background = 'rgba(7, 12, 24, 0.88)';
  select.style.color = '#ecf8ff';
  select.style.fontSize = '15px';
  select.style.outline = 'none';
  select.style.pointerEvents = 'auto';

  MISSIONS.forEach((mission, index) => {
    if (mission.hideFromDebugSelect) return;
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${String(index + 1).padStart(2, '0')} // ${root.getMissionName(mission)}`;
    select.appendChild(option);
  });

  const summary = document.createElement('div');
  summary.style.fontSize = '13px';
  summary.style.lineHeight = '1.7';
  summary.style.color = '#cfe4f1';
  summary.style.opacity = '0.92';

  const toggles = document.createElement('div');
  toggles.style.display = 'flex';
  toggles.style.flexWrap = 'wrap';
  toggles.style.gap = '10px';

  const invincibleBtn = document.createElement('button');
  invincibleBtn.type = 'button';
  invincibleBtn.className = 'minor';
  invincibleBtn.style.minWidth = '250px';

  const bossModeBtn = document.createElement('button');
  bossModeBtn.type = 'button';
  bossModeBtn.className = 'minor';
  bossModeBtn.style.minWidth = '250px';

  const collisionOverlayBtn = document.createElement('button');
  collisionOverlayBtn.type = 'button';
  collisionOverlayBtn.className = 'minor';
  collisionOverlayBtn.style.minWidth = '250px';

  toggles.append(invincibleBtn, bossModeBtn, collisionOverlayBtn);
  panel.append(missionLabel, select, summary, toggles);

  const scroller = document.createElement('div');
  scroller.className = 'screen-scrollbox';
  scroller.style.display = 'grid';
  scroller.style.gap = '16px';

  const actionsBar = document.createElement('div');
  actionsBar.className = 'screen-actions';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'minor screen-action-back-end';
  backBtn.textContent = root.t('common.back');
  actionsBar.appendChild(backBtn);

  scroller.append(panel);
  root.createDebugPerformanceReportSection(scroller);
  card.append(eyebrow, title, lead, scroller, actionsBar);
  screen.appendChild(card);
  document.getElementById('app-shell').appendChild(screen);

  root.refs.debugScreen = screen;
  root.refs.debugStageSelect = select;
  root.refs.debugStageSummary = summary;
  root.refs.debugInvincibleBtn = invincibleBtn;
  root.refs.debugBossModeBtn = bossModeBtn;
  root.refs.debugCollisionOverlayBtn = collisionOverlayBtn;
  root.refs.debugScreenCloseBtn = backBtn;
  root.bindDebugScreenControls();
  root.refreshDebugScreenState();
  root.refreshDebugPerformanceReportView(true);
}

export function destroyDebugScreen(root) {
  root.refs.debugScreen?.remove?.();
  root.refs.debugOpenBtn?.remove?.();
  root.refs.debugScreen = null;
  root.refs.debugPerfSection = null;
  root.refs.debugPerfOverlayBtn = null;
  root.refs.debugPerfLive = null;
  root.refs.debugPerfReport = null;
  root.refs.debugStageSelect = null;
  root.refs.debugStageSummary = null;
  root.refs.debugInvincibleBtn = null;
  root.refs.debugBossModeBtn = null;
  root.refs.debugCollisionOverlayBtn = null;
  root.refs.debugScreenCloseBtn = null;
  root.refs.debugOpenBtn = null;
}

export function rebuildDebugScreenForLocalization(root) {
  if (!root.game.debug.isEnabled()) {
    destroyDebugScreen(root);
    root.debugScreenOpen = false;
    return;
  }
  if (!root.refs.debugScreen && !root.refs.debugOpenBtn) {
    root.createDebugScreen();
    return;
  }
  const wasOpen = root.debugScreenOpen;
  destroyDebugScreen(root);
  buildDebugScreen(root);
  root.debugScreenOpen = wasOpen;
  root.refreshDebugScreenState();
  root.refreshDataButtonState();
}

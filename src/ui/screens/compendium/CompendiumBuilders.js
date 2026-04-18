/**
 * Responsibility:
 * - 図鑑画面の DOM 構築とカード生成を担当する。
 *
 * Update Rules:
 * - レイアウトやカード構成を変えるときはこのファイルを更新する。
 * - 開閉状態や preview 描画制御は State / PreviewRuntime 側へ寄せる。
 * - 図鑑カード生成時の preview target 登録はこの builder を正にする。
 */
import {
  COMPENDIUM_PREVIEW_SIZE,
  ENEMY_LIBRARY,
  getCombatSummary,
  getIntelSections,
} from '../CompendiumShared.js';
import { ensureCompendiumViewState } from './CompendiumPreviewRuntime.js';

const COMPENDIUM_PREVIEW_HEIGHT = 190;
const COMPENDIUM_BOSS_PREVIEW_WIDTH = COMPENDIUM_PREVIEW_SIZE * 2;
const COMPENDIUM_BOSS_PREVIEW_HEIGHT = COMPENDIUM_PREVIEW_HEIGHT * 2;

function getCompendiumPreviewLogicalSize(def, missionId) {
  if (!def?.isBoss) return { width: COMPENDIUM_PREVIEW_SIZE, height: COMPENDIUM_PREVIEW_HEIGHT };
  if (missionId === 'voidcrown') return { width: COMPENDIUM_BOSS_PREVIEW_WIDTH, height: COMPENDIUM_BOSS_PREVIEW_HEIGHT };
  return { width: COMPENDIUM_BOSS_PREVIEW_WIDTH, height: COMPENDIUM_BOSS_PREVIEW_HEIGHT };
}

export function buildCompendiumScreen(root) {
  root.disposeCompendiumView();
  ensureCompendiumViewState(root);

  const startScreen = root.refs.startScreen;
  const actions = startScreen?.querySelector('.screen-actions');
  if (actions) {
    const intelBtn = document.createElement('button');
    intelBtn.type = 'button';
    intelBtn.className = 'minor';
    intelBtn.textContent = root.t('common.enemyBossIntel');
    root.insertTitleActionButton(intelBtn, 'compendium');
    root.refs.enemyIntelOpenBtn = intelBtn;
  }

  const screen = document.createElement('section');
  screen.className = 'screen compendium-screen screen-scrollable';

  const card = document.createElement('div');
  card.className = 'screen-card huge compendium-screen-card screen-card-shell';

  const eyebrow = document.createElement('div');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = root.t('common.enemyBossCompendium');

  const title = document.createElement('h2');
  title.textContent = root.t('common.tacticalIntelligence');

  const lead = document.createElement('p');
  lead.className = 'lead compendium-screen-lead';
  lead.textContent = root.t('compendium.lead');

  const scroller = document.createElement('div');
  scroller.className = 'compendium-scroll screen-scrollbox';

  const sections = getIntelSections(root.getLanguage());
  for (const sectionData of sections) {
    const section = document.createElement('section');
    section.className = 'compendium-section';

    const sectionHead = document.createElement('div');
    sectionHead.className = 'compendium-section-head';

    const headTop = document.createElement('div');
    headTop.className = 'compendium-section-head-top';

    const sectionTitle = document.createElement('h3');
    sectionTitle.className = 'compendium-section-title';
    sectionTitle.textContent = sectionData.title;

    const waveChip = document.createElement('span');
    waveChip.className = 'compendium-wave-chip';
    waveChip.textContent = sectionData.waveText;

    headTop.append(sectionTitle, waveChip);

    const sub = document.createElement('p');
    sub.className = 'compendium-section-subtitle';
    sub.textContent = sectionData.subtitle;

    sectionHead.append(headTop, sub);

    const grid = document.createElement('div');
    grid.className = 'compendium-entry-grid';
    // IMPORTANT:
    // この並びは prism_rift_vanguard_modular34 の図鑑仕様を維持すること。
    // - 雑魚は常に4体横並び
    // - 通常ボスはその下段で2列ぶんのカード幅 + ボス用2倍プレビュー枠
    // - voidcrown のボス2体も通常ボスと同じ2列幅で、同じ段に横並び
    // レイアウト都合で auto-fit / 別グリッド / 横並びボス本文レイアウトへ変更しない。
    for (const entry of sectionData.entries) {
      const intelCard = createCompendiumCard(root, entry.key, sectionData.title, entry.role, sectionData.missionId);
      grid.appendChild(intelCard);
    }

    section.append(sectionHead, grid);
    scroller.appendChild(section);
  }

  const actionsBar = document.createElement('div');
  actionsBar.className = 'screen-actions';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'minor screen-action-back-end';
  closeBtn.textContent = root.t('common.back');
  actionsBar.appendChild(closeBtn);

  card.append(eyebrow, title, lead, scroller, actionsBar);
  screen.appendChild(card);
  document.getElementById('app-shell').appendChild(screen);

  root.refs.enemyIntelScreen = screen;
  root.refs.enemyIntelScroll = scroller;
  root.refs.enemyIntelCloseBtn = closeBtn;
  root.bindCompendiumControls();
}

export function createCompendiumCard(root, typeKey, missionName, role, missionId = '') {
  const def = ENEMY_LIBRARY[typeKey];
  const isBossCard = role === 'boss';
  const isVoidCrownBossCard = isBossCard && missionId === 'voidcrown';
  const previewSize = getCompendiumPreviewLogicalSize(def, missionId);
  const card = document.createElement('article');
  card.className = 'compendium-entry-card';
  if (isBossCard) card.classList.add('compendium-entry-card-boss');
  if (isVoidCrownBossCard) card.classList.add('compendium-entry-card-voidcrown');

  const head = document.createElement('div');
  head.className = 'compendium-entry-head';

  const top = document.createElement('div');
  top.className = 'compendium-entry-top';

  const name = document.createElement('strong');
  name.className = 'compendium-entry-name';
  name.textContent = root.getEnemyName(typeKey);

  const roleChip = document.createElement('span');
  roleChip.className = `compendium-role-chip ${isBossCard ? 'compendium-role-chip-boss' : 'compendium-role-chip-enemy'}`;
  roleChip.textContent = isBossCard ? root.t('common.boss') : root.t('common.enemy');

  top.append(name, roleChip);

  const mission = document.createElement('div');
  mission.className = 'compendium-entry-mission';
  mission.textContent = missionName;
  head.append(top, mission);

  const previewWrap = document.createElement('div');
  previewWrap.className = 'compendium-preview-wrap';
  if (isBossCard) previewWrap.classList.add('compendium-preview-wrap-boss');
  if (isVoidCrownBossCard) previewWrap.classList.add('compendium-preview-wrap-voidcrown');

  const canvas = document.createElement('canvas');
  canvas.className = 'compendium-preview-canvas';
  canvas.setAttribute('aria-label', `${root.getEnemyName(typeKey)} preview`);
  canvas.width = previewSize.width;
  canvas.height = previewSize.height;

  const overlay = document.createElement('div');
  overlay.className = 'compendium-preview-overlay';

  const behaviorChip = document.createElement('span');
  behaviorChip.className = 'compendium-preview-chip';
  behaviorChip.textContent = String(root.t(`behavior.${def.behavior}`)).split(' / ')[0];

  const attackChip = document.createElement('span');
  attackChip.className = 'compendium-preview-chip';
  attackChip.textContent = String(root.t(`attack.${def.attack}`)).split(' / ')[0];

  overlay.append(behaviorChip, attackChip);
  previewWrap.append(canvas, overlay);

  const body = document.createElement('div');
  body.className = 'compendium-entry-body';

  const summary = document.createElement('p');
  summary.className = 'compendium-entry-summary';
  summary.textContent = getCombatSummary(typeKey, def, root.getLanguage());

  const stats = document.createElement('div');
  stats.className = 'compendium-entry-stats';
  const statEntries = [
    [root.t('compendium.stats.hp'), String(def.hp)],
    [root.t('compendium.stats.move'), `${def.speed.toFixed(1)}`],
    [root.t('compendium.stats.range'), `${def.attackRange}`],
    [root.t('compendium.stats.bullet'), `${def.bulletSpeed}`],
    [root.t('compendium.stats.damage'), `${def.bulletDamage}`],
    [root.t('compendium.stats.reward'), `${def.score} / ${def.crystal[0]}-${def.crystal[1]}`],
  ];

  for (const [labelText, valueText] of statEntries) {
    const stat = document.createElement('div');
    stat.className = 'compendium-entry-stat';

    const label = document.createElement('div');
    label.className = 'compendium-entry-stat-label';
    label.textContent = labelText;

    const value = document.createElement('strong');
    value.className = 'compendium-entry-stat-value';
    value.textContent = valueText;

    stat.append(label, value);
    stats.appendChild(stat);
  }

  body.append(summary, stats);
  card.append(head, previewWrap, body);

  const state = ensureCompendiumViewState(root);
  const targets = state.targets.get(typeKey) ?? [];
  targets.push({
    canvas,
    wrap: previewWrap,
    width: previewSize.width,
    height: previewSize.height,
    missionId,
  });
  state.targets.set(typeKey, targets);

  return card;
}

export function destroyCompendiumScreen(root) {
  root.disposeCompendiumView();
  root.refs.enemyIntelScreen?.remove?.();
  root.refs.enemyIntelOpenBtn?.remove?.();
  root.refs.enemyIntelScreen = null;
  root.refs.enemyIntelScroll = null;
  root.refs.enemyIntelCloseBtn = null;
  root.refs.enemyIntelOpenBtn = null;
}

export function rebuildCompendiumScreenForLocalization(root) {
  if (!root.refs.enemyIntelScreen && !root.refs.enemyIntelOpenBtn) {
    root.createCompendiumScreen();
    return;
  }
  const wasOpen = root.compendiumOpen;
  destroyCompendiumScreen(root);
  buildCompendiumScreen(root);
  root.compendiumOpen = wasOpen;
  if (wasOpen) root.ensureCompendiumPreviews();
  root.refreshDataButtonState();
}

/**
 * Responsibility:
 * - オプション画面の DOM 構築と参照束ね込みを担当する。
 *
 * Update Rules:
 * - レイアウト変更、項目追加、ボタン配置変更はこのファイルを更新する。
 * - 値の反映処理やイベント処理は State / Bindings 側へ寄せる。
 * - 外部公開の入口は UIRoot#createOptionsScreen のまま維持し、このファイルは build 専用に保つ。
 */
import {
  OPTION_CROSSHAIR_PRESETS,
  OPTION_EFFECT_STRENGTHS,
  OPTION_GRAPHICS_QUALITIES,
  OPTION_LANGUAGES,
  OPTION_SOUNDTEST_TRACK_IDS,
} from '../../../storage/OptionStorage.js';
import {
  formatCrosshairPreset,
  formatEffectStrength,
  formatGraphicsQuality,
  formatLanguage,
} from './OptionsScreenFormatters.js';

function applyStyles(node, styles) {
  Object.assign(node.style, styles);
}

function createSection(title) {
  const section = document.createElement('section');
  applyStyles(section, {
    display: 'grid',
    gap: '12px',
    alignContent: 'start',
  });

  const heading = document.createElement('div');
  heading.textContent = title;
  applyStyles(heading, {
    fontSize: '12px',
    fontWeight: '800',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#a4bac8',
    padding: '0 4px',
  });

  section.append(heading);
  return { section, heading };
}

function createRow() {
  const row = document.createElement('div');
  applyStyles(row, {
    display: 'grid',
    gap: '10px',
    padding: '14px 16px',
    borderRadius: '18px',
    background: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.16)',
  });
  return row;
}

function createFieldLabel(text) {
  const label = document.createElement('div');
  label.textContent = text;
  applyStyles(label, {
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: '#a4bac8',
  });
  return label;
}

function createHint(text = '') {
  const hint = document.createElement('div');
  hint.textContent = text;
  applyStyles(hint, {
    fontSize: '12px',
    lineHeight: '1.6',
    color: '#c6d9e6',
    opacity: '0.88',
    minHeight: '1.6em',
  });
  return hint;
}

function createValueLabel() {
  const value = document.createElement('div');
  applyStyles(value, {
    justifySelf: 'end',
    fontSize: '13px',
    fontWeight: '800',
    letterSpacing: '0.08em',
    color: '#effcff',
  });
  return value;
}

function createSelect() {
  const select = document.createElement('select');
  applyStyles(select, {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(130,255,225,0.16)',
    background: 'rgba(7, 12, 24, 0.88)',
    color: '#ecf8ff',
    fontSize: '15px',
    outline: 'none',
    pointerEvents: 'auto',
  });
  return select;
}

function createRange(min, max, step) {
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.style.width = '100%';
  input.style.pointerEvents = 'auto';
  return input;
}

function createCheckbox(text) {
  const label = document.createElement('label');
  applyStyles(label, {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#effcff',
    cursor: 'pointer',
    pointerEvents: 'auto',
  });

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.style.pointerEvents = 'auto';

  const span = document.createElement('span');
  span.textContent = text;
  label.append(input, span);
  return { label, input, text: span };
}

function createOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

function createHead(labelText) {
  const head = document.createElement('div');
  applyStyles(head, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  });
  const label = createFieldLabel(labelText);
  const value = createValueLabel();
  head.append(label, value);
  return { head, label, value };
}

function createSelectRow({ label, hint, values }) {
  const row = createRow();
  const head = createHead(label);
  const select = createSelect();
  values.forEach(({ value, label: optionLabel }) => {
    select.appendChild(createOption(value, optionLabel));
  });
  const hintNode = createHint(hint);
  row.append(head.head, select, hintNode);
  return { row, labelNode: head.label, valueNode: head.value, select, hintNode };
}

function createRangeRow({ label, hint, min, max, step }) {
  const row = createRow();
  const head = createHead(label);
  const input = createRange(min, max, step);
  const hintNode = createHint(hint);
  row.append(head.head, input, hintNode);
  return { row, labelNode: head.label, valueNode: head.value, input, hintNode };
}

function createToggleRow({ label, hint, text }) {
  const row = createRow();
  const head = createHead(label);
  const checkbox = createCheckbox(text);
  const hintNode = createHint(hint);
  row.append(head.head, checkbox.label, hintNode);
  return {
    row,
    labelNode: head.label,
    valueNode: head.value,
    input: checkbox.input,
    textNode: checkbox.text,
    hintNode,
  };
}

export function buildOptionsScreen(root) {
  const startActions = root.refs.startScreen?.querySelector('.screen-actions');
  if (startActions && !root.refs.optionsOpenBtn) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'minor';
    button.textContent = root.t('common.options');
    button.style.minWidth = '180px';
    root.insertTitleActionButton(button, 'options');
    root.refs.optionsOpenBtn = button;
  }

  if (root.refs.pauseScreen && !root.refs.pauseOptionsBtn) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'minor';
    button.textContent = root.t('common.options');
    root.refs.pauseResumeBtn?.insertAdjacentElement?.('afterend', button);
    root.refs.pauseOptionsBtn = button;
  }

  if (root.refs.intervalScreen && !root.refs.hangarOptionsBtn) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'minor';
    button.textContent = root.t('common.options');
    const nextMissionBtn = root.refs.nextMissionBtn;
    if (nextMissionBtn) nextMissionBtn.insertAdjacentElement('afterend', button);
    else root.refs.intervalScreen.querySelector('.screen-actions')?.append(button);
    root.refs.hangarOptionsBtn = button;
  }

  const screen = document.createElement('section');
  screen.className = 'screen screen-scrollable';
  screen.style.zIndex = '46';
  screen.style.pointerEvents = 'auto';

  const card = document.createElement('div');
  card.className = 'screen-card huge screen-card-shell';
  applyStyles(card, {
    width: 'min(960px, calc(100vw - 36px))',
    maxHeight: 'calc(100dvh - 36px)',
    display: 'grid',
    gridTemplateRows: 'auto auto minmax(0, 1fr) auto',
    gap: '14px',
  });

  const eyebrow = document.createElement('div');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = root.t('common.configuration');

  const title = document.createElement('h2');
  title.textContent = root.t('options.title');

  const scroller = document.createElement('div');
  scroller.className = 'screen-scrollbox';
  applyStyles(scroller, {
    overflow: 'auto',
    paddingRight: '6px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '14px',
    alignItems: 'start',
  });

  const leftColumn = document.createElement('div');
  const rightColumn = document.createElement('div');
  [leftColumn, rightColumn].forEach((column) => {
    applyStyles(column, {
      display: 'grid',
      gap: '14px',
      alignContent: 'start',
    });
  });

  const optionsMeta = {
    eyebrow,
    title,
    groupHeadings: {},
    rows: {},
  };

  const systemSection = createSection(root.t('options.groups.system'));
  optionsMeta.groupHeadings.system = systemSection.heading;
  const languageRow = createSelectRow({
    label: root.t('options.language'),
    hint: '',
    values: OPTION_LANGUAGES.map((language) => ({ value: language, label: formatLanguage(root, language) })),
  });
  systemSection.section.append(languageRow.row);
  optionsMeta.rows.language = languageRow;

  const audioSection = createSection(root.t('options.groups.audio'));
  optionsMeta.groupHeadings.audio = audioSection.heading;
  const soundTestRow = createSelectRow({
    label: root.t('options.soundTest'),
    hint: root.t('options.hints.soundTest'),
    values: OPTION_SOUNDTEST_TRACK_IDS.map((trackId) => ({ value: trackId, label: root.getSoundTestTrackLabel(trackId, trackId) })),
  });
  const soundTestButtons = document.createElement('div');
  soundTestButtons.className = 'screen-actions';
  soundTestButtons.style.marginTop = '0';
  const soundTestPlayBtn = document.createElement('button');
  soundTestPlayBtn.type = 'button';
  soundTestPlayBtn.textContent = root.t('common.play');
  const soundTestStopBtn = document.createElement('button');
  soundTestStopBtn.type = 'button';
  soundTestStopBtn.className = 'minor';
  soundTestStopBtn.textContent = root.t('common.stop');
  soundTestButtons.append(soundTestPlayBtn, soundTestStopBtn);
  soundTestRow.row.insertBefore(soundTestButtons, soundTestRow.hintNode);
  audioSection.section.append(soundTestRow.row);
  optionsMeta.rows.soundTest = soundTestRow;
  optionsMeta.soundTestPlayBtn = soundTestPlayBtn;
  optionsMeta.soundTestStopBtn = soundTestStopBtn;

  const bgmRow = createRangeRow({ label: root.t('options.bgmVolume'), hint: '', min: 0, max: 1, step: 0.01 });
  const sfxRow = createRangeRow({ label: root.t('options.sfxVolume'), hint: '', min: 0, max: 1, step: 0.01 });
  audioSection.section.append(bgmRow.row, sfxRow.row);
  optionsMeta.rows.bgmVolume = bgmRow;
  optionsMeta.rows.sfxVolume = sfxRow;

  const controlSection = createSection(root.t('options.groups.controls'));
  optionsMeta.groupHeadings.controls = controlSection.heading;
  const sensitivityRow = createRangeRow({
    label: root.t('options.mouseSensitivity'),
    hint: root.t('options.hints.sensitivity'),
    min: 0.35,
    max: 2.5,
    step: 0.01,
  });
  const invertYRow = createToggleRow({
    label: root.t('options.look'),
    hint: '',
    text: root.t('options.invertY'),
  });
  controlSection.section.append(sensitivityRow.row, invertYRow.row);
  optionsMeta.rows.mouseSensitivity = sensitivityRow;
  optionsMeta.rows.invertY = invertYRow;

  const visualsSection = createSection(root.t('options.groups.visuals'));
  optionsMeta.groupHeadings.visuals = visualsSection.heading;
  const graphicsRow = createSelectRow({
    label: root.t('options.graphicsQuality'),
    hint: root.t('options.hints.graphics'),
    values: OPTION_GRAPHICS_QUALITIES.map((quality) => ({ value: quality, label: formatGraphicsQuality(root, quality) })),
  });
  const fovRow = createRangeRow({
    label: root.t('options.fov'),
    hint: root.t('options.hints.fov'),
    min: 68,
    max: 84,
    step: 1,
  });
  const effectRow = createSelectRow({
    label: root.t('options.effectStrength'),
    hint: root.t('options.hints.effectStrength'),
    values: OPTION_EFFECT_STRENGTHS.map((value) => ({ value, label: formatEffectStrength(root, value) })),
  });
  visualsSection.section.append(graphicsRow.row, fovRow.row, effectRow.row);
  optionsMeta.rows.graphicsQuality = graphicsRow;
  optionsMeta.rows.fov = fovRow;
  optionsMeta.rows.effectStrength = effectRow;

  const combatSection = createSection(root.t('options.groups.combat'));
  optionsMeta.groupHeadings.combat = combatSection.heading;
  const crosshairPresetRow = createSelectRow({
    label: root.t('options.crosshairPreset'),
    hint: root.t('options.hints.crosshairPreset'),
    values: OPTION_CROSSHAIR_PRESETS.map((value) => ({ value, label: formatCrosshairPreset(root, value) })),
  });
  const crosshairScaleRow = createRangeRow({
    label: root.t('options.crosshairScale'),
    hint: root.t('options.hints.crosshairScale'),
    min: 1,
    max: 1.4,
    step: 0.05,
  });
  const hitDirectionRow = createToggleRow({
    label: root.t('options.hitDirectionIndicator'),
    hint: root.t('options.hints.hitDirectionIndicator'),
    text: root.t('options.hitDirectionIndicator'),
  });
  combatSection.section.append(crosshairPresetRow.row, crosshairScaleRow.row, hitDirectionRow.row);
  optionsMeta.rows.crosshairPreset = crosshairPresetRow;
  optionsMeta.rows.crosshairScale = crosshairScaleRow;
  optionsMeta.rows.hitDirectionIndicator = hitDirectionRow;

  const hudSection = createSection(root.t('options.groups.hud'));
  optionsMeta.groupHeadings.hud = hudSection.heading;
  const hudOpacityRow = createRangeRow({
    label: root.t('options.hudOpacity'),
    hint: '',
    min: 0.35,
    max: 1,
    step: 0.01,
  });
  const minimapVisibleRow = createToggleRow({
    label: root.t('options.minimapVisible'),
    hint: '',
    text: root.t('options.minimapVisible'),
  });
  const minimapScaleRow = createRangeRow({
    label: root.t('options.minimapScale'),
    hint: root.t('options.hints.minimapScale'),
    min: 0.75,
    max: 1.4,
    step: 0.01,
  });
  const enemyMarkersRow = createToggleRow({
    label: root.t('options.enemyMarkersVisible'),
    hint: root.t('options.hints.enemyMarkers'),
    text: root.t('options.enemyMarkersVisible'),
  });
  const highContrastRow = createToggleRow({
    label: root.t('options.highContrast'),
    hint: root.t('options.hints.highContrast'),
    text: root.t('options.highContrast'),
  });
  hudSection.section.append(
    hudOpacityRow.row,
    minimapVisibleRow.row,
    minimapScaleRow.row,
    enemyMarkersRow.row,
    highContrastRow.row,
  );
  optionsMeta.rows.hudOpacity = hudOpacityRow;
  optionsMeta.rows.minimapVisible = minimapVisibleRow;
  optionsMeta.rows.minimapScale = minimapScaleRow;
  optionsMeta.rows.enemyMarkersVisible = enemyMarkersRow;
  optionsMeta.rows.highContrast = highContrastRow;

  leftColumn.append(systemSection.section, audioSection.section, hudSection.section);
  rightColumn.append(visualsSection.section, controlSection.section, combatSection.section);
  scroller.append(leftColumn, rightColumn);

  const actions = document.createElement('div');
  actions.className = 'screen-actions';
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'minor';
  resetBtn.textContent = root.t('common.restoreDefaults');
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'minor screen-action-back-end';
  closeBtn.textContent = root.t('common.back');
  actions.append(resetBtn, closeBtn);

  optionsMeta.resetBtn = resetBtn;
  optionsMeta.closeBtn = closeBtn;

  card.append(eyebrow, title, scroller, actions);
  screen.appendChild(card);
  document.getElementById('app-shell')?.appendChild(screen);

  root.refs.optionsScreen = screen;
  root.refs.optionsCloseBtn = closeBtn;
  root.refs.optionsResetBtn = resetBtn;
  root.refs.optionsLanguageSelect = languageRow.select;
  root.refs.optionsLanguageValue = languageRow.valueNode;
  root.refs.optionsSoundTestSelect = soundTestRow.select;
  root.refs.optionsSoundTestStatus = soundTestRow.valueNode;
  root.refs.optionsSoundTestNowPlaying = soundTestRow.hintNode;
  root.refs.optionsSoundTestPlayBtn = soundTestPlayBtn;
  root.refs.optionsSoundTestStopBtn = soundTestStopBtn;
  root.refs.optionsBgmVolume = bgmRow.input;
  root.refs.optionsBgmVolumeValue = bgmRow.valueNode;
  root.refs.optionsSfxVolume = sfxRow.input;
  root.refs.optionsSfxVolumeValue = sfxRow.valueNode;
  root.refs.optionsMouseSensitivity = sensitivityRow.input;
  root.refs.optionsMouseSensitivityValue = sensitivityRow.valueNode;
  root.refs.optionsInvertY = invertYRow.input;
  root.refs.optionsGraphicsQuality = graphicsRow.select;
  root.refs.optionsGraphicsQualityValue = graphicsRow.valueNode;
  root.refs.optionsFov = fovRow.input;
  root.refs.optionsFovValue = fovRow.valueNode;
  root.refs.optionsEffectStrength = effectRow.select;
  root.refs.optionsEffectStrengthValue = effectRow.valueNode;
  root.refs.optionsCrosshairPreset = crosshairPresetRow.select;
  root.refs.optionsCrosshairPresetValue = crosshairPresetRow.valueNode;
  root.refs.optionsCrosshairScale = crosshairScaleRow.input;
  root.refs.optionsCrosshairScaleValue = crosshairScaleRow.valueNode;
  root.refs.optionsHitDirectionIndicator = hitDirectionRow.input;
  root.refs.optionsHudOpacity = hudOpacityRow.input;
  root.refs.optionsHudOpacityValue = hudOpacityRow.valueNode;
  root.refs.optionsHudMinimapVisible = minimapVisibleRow.input;
  root.refs.optionsHudMinimapScale = minimapScaleRow.input;
  root.refs.optionsHudMinimapScaleValue = minimapScaleRow.valueNode;
  root.refs.optionsHudEnemyMarkersVisible = enemyMarkersRow.input;
  root.refs.optionsHighContrast = highContrastRow.input;
  root.refs.optionsMeta = optionsMeta;
}

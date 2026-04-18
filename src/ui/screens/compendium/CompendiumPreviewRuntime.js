/**
 * Responsibility:
 * - 図鑑の 3D preview state / renderer / scene / animation を担当する。
 *
 * Update Rules:
 * - 図鑑 preview の renderer / scene / camera / factory / targets / entries はこのモジュールを正にする。
 * - preview state は _compendiumViewState だけを使い、旧 preview state 名へ戻さない。
 * - dispose は disposeCompendiumView に集約する。
 */
import { EnemyFactory } from '../../../enemies/EnemyFactory.js';
import {
  COMPENDIUM_BOX,
  COMPENDIUM_CAMERA,
  COMPENDIUM_CENTER,
  COMPENDIUM_LOOK,
  COMPENDIUM_PREVIEW_SIZE,
  COMPENDIUM_SIZE,
  ENEMY_LIBRARY,
  THREE,
  disposeObject3D,
} from '../CompendiumShared.js';

const COMPENDIUM_PREVIEW_HEIGHT = 190;
const COMPENDIUM_PREVIEW_MARGIN = 80;
const COMPENDIUM_PREVIEW_ROTATE_SPEED = 0.35;

function disposeOffscreenRenderer(renderer) {
  const canvas = renderer?.domElement ?? null;
  renderer?.dispose?.();
  renderer?.forceContextLoss?.();
  canvas?.remove?.();
}

function createCompendiumViewState() {
  return {
    renderer: null,
    scene: null,
    camera: null,
    rendererSize: null,
    factory: new EnemyFactory(),
    targets: new Map(),
    entries: new Map(),
    pendingDt: 0,
    renderAccumulator: 0,
  };
}

export function ensureCompendiumViewState(uiRoot) {
  uiRoot._compendiumViewState ??= createCompendiumViewState();
  return uiRoot._compendiumViewState;
}

function isCompendiumPreviewVisible(targets, scrollHost) {
  if (!(scrollHost instanceof HTMLElement)) return true;
  const scrollRect = scrollHost.getBoundingClientRect();
  const minX = scrollRect.left - COMPENDIUM_PREVIEW_MARGIN;
  const maxX = scrollRect.right + COMPENDIUM_PREVIEW_MARGIN;
  const minY = scrollRect.top - COMPENDIUM_PREVIEW_MARGIN;
  const maxY = scrollRect.bottom + COMPENDIUM_PREVIEW_MARGIN;
  return targets.some((target) => {
    const rect = target.wrap.getBoundingClientRect();
    return rect.right >= minX && rect.left <= maxX && rect.bottom >= minY && rect.top <= maxY;
  });
}

function getCompendiumPreviewRenderer(uiRoot, width = COMPENDIUM_PREVIEW_SIZE, height = COMPENDIUM_PREVIEW_HEIGHT) {
  const state = ensureCompendiumViewState(uiRoot);
  if (!state.renderer) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / Math.max(1, height), 0.1, 200);

    const ambient = new THREE.AmbientLight(0xe8f6ff, 2.1);
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3.2, 5.6, 4.8);
    const fill = new THREE.DirectionalLight(0x8fd0ff, 1.4);
    fill.position.set(-4.2, 1.8, 3.2);
    const rim = new THREE.DirectionalLight(0xff97dc, 1.2);
    rim.position.set(-2.6, 3.0, -4.8);
    scene.add(ambient, key, fill, rim);

    state.renderer = renderer;
    state.scene = scene;
    state.camera = camera;
    state.rendererSize = { width, height };
    return renderer;
  }

  const currentSize = state.rendererSize ?? { width: 0, height: 0 };
  if (currentSize.width !== width || currentSize.height !== height) {
    state.renderer.setSize(width, height, false);
    state.rendererSize = { width, height };
  }
  state.camera.aspect = width / Math.max(1, height);
  state.camera.updateProjectionMatrix();
  return state.renderer;
}

function createCompendiumPreviewEntry(uiRoot, typeKey, targets = []) {
  const def = ENEMY_LIBRARY[typeKey];
  const root = new THREE.Group();
  const state = ensureCompendiumViewState(uiRoot);
  const mesh = state.factory.createMesh(def);
  root.add(mesh);

  COMPENDIUM_BOX.setFromObject(root);
  COMPENDIUM_BOX.getSize(COMPENDIUM_SIZE);
  COMPENDIUM_BOX.getCenter(COMPENDIUM_CENTER);
  root.position.sub(COMPENDIUM_CENTER);
  root.position.y += COMPENDIUM_SIZE.y * (def.isBoss ? 0.03 : 0.06);

  const extent = Math.max(COMPENDIUM_SIZE.x, COMPENDIUM_SIZE.y, COMPENDIUM_SIZE.z, 1);
  const target = targets[0] ?? { width: COMPENDIUM_PREVIEW_SIZE, height: COMPENDIUM_PREVIEW_HEIGHT, wrap: null };
  return {
    typeKey,
    def,
    root,
    targets,
    width: target.width,
    height: target.height,
    extent,
    lookYOffset: COMPENDIUM_SIZE.y * 0.08,
    baseRotationX: -0.22,
    baseRotationY: def.isBoss ? 0.72 : 0.58,
    spin: 0,
  };
}

export function installCompendiumPreviewRuntime(UIRoot) {
  UIRoot.prototype.ensureCompendiumPreviews = function ensureCompendiumPreviews() {
    const state = ensureCompendiumViewState(this);
    for (const [typeKey, targets] of state.targets.entries()) {
      if (state.entries.has(typeKey)) continue;
      const entry = createCompendiumPreviewEntry(this, typeKey, targets);
      state.entries.set(typeKey, entry);
    }
    this.renderCompendiumPreviews(true);
  };

  UIRoot.prototype.getCompendiumPreviewRenderer = function getCompendiumPreviewRendererPrototype(width = COMPENDIUM_PREVIEW_SIZE, height = COMPENDIUM_PREVIEW_HEIGHT) {
    return getCompendiumPreviewRenderer(this, width, height);
  };

  UIRoot.prototype.createCompendiumPreviewEntry = function createCompendiumPreviewEntryPrototype(typeKey, targets = []) {
    return createCompendiumPreviewEntry(this, typeKey, targets);
  };

  UIRoot.prototype.renderCompendiumPreviews = function renderCompendiumPreviews(force = false) {
    const state = this._compendiumViewState;
    const entries = state?.entries;
    if (!entries?.size) return;
    if (!force) {
      state.renderAccumulator = (state.renderAccumulator ?? 0) + (state.pendingDt ?? 0);
      state.pendingDt = 0;
      if (state.renderAccumulator < (1 / 30)) return;
      state.renderAccumulator = 0;
    } else {
      state.pendingDt = 0;
      state.renderAccumulator = 0;
    }

    const scrollHost = this.refs.enemyIntelScroll;
    for (const entry of entries.values()) {
      if (!entry.targets?.length) continue;
      if (!force && !isCompendiumPreviewVisible(entry.targets, scrollHost)) continue;

      const renderer = getCompendiumPreviewRenderer(this, entry.width, entry.height);
      const scene = state.scene;
      const camera = state.camera;
      if (!scene || !camera) continue;
      entry.root.rotation.x = entry.baseRotationX;
      entry.root.rotation.y = entry.baseRotationY + entry.spin;

      scene.add(entry.root);
      camera.position.copy(COMPENDIUM_CAMERA.set(entry.extent * 1.55, entry.extent * 0.9, entry.extent * (entry.def.isBoss ? 1.95 : 2.2)));
      camera.lookAt(COMPENDIUM_LOOK.set(0, entry.lookYOffset, 0));

      renderer.clear();
      renderer.render(scene, camera);
      scene.remove(entry.root);

      for (const target of entry.targets) {
        const ctx = target.canvas.getContext('2d');
        if (!ctx) continue;
        if (target.canvas.width !== entry.width) target.canvas.width = entry.width;
        if (target.canvas.height !== entry.height) target.canvas.height = entry.height;
        ctx.clearRect(0, 0, entry.width, entry.height);
        ctx.drawImage(renderer.domElement, 0, 0, entry.width, entry.height);
      }
    }
  };

  UIRoot.prototype.updateCompendiumPreviewAnimation = function updateCompendiumPreviewAnimation(dt) {
    if (!this.compendiumOpen || this.game.state.mode !== 'title') return;
    const state = this._compendiumViewState;
    if (!state?.targets?.size) return;
    this.ensureCompendiumPreviews();
    state.pendingDt = (state.pendingDt ?? 0) + dt;
    if (state.entries?.size) {
      for (const entry of state.entries.values()) entry.spin += dt * COMPENDIUM_PREVIEW_ROTATE_SPEED;
    }
    this.renderCompendiumPreviews(false);
  };

  UIRoot.prototype.disposeCompendiumPreviewEntries = function disposeCompendiumPreviewEntries() {
    const state = this._compendiumViewState;
    if (!state) return;
    if (state.entries?.size) {
      for (const entry of state.entries.values()) {
        state.scene?.remove(entry.root);
        disposeObject3D(entry.root);
      }
    }
    state.entries = new Map();
    state.targets = new Map();
    state.pendingDt = 0;
    state.renderAccumulator = 0;
  };

  UIRoot.prototype.disposeCompendiumView = function disposeCompendiumView() {
    const state = this._compendiumViewState;
    if (!state) return;
    this.disposeCompendiumPreviewEntries();
    disposeOffscreenRenderer(state.renderer);
    state.renderer = null;
    state.scene = null;
    state.camera = null;
    state.rendererSize = null;
    state.factory = null;
    delete this._compendiumViewState;
  };
}

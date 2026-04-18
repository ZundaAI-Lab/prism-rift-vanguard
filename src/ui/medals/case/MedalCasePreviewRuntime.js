/**
 * Responsibility:
 * - メダル 3D preview state / renderer / cache を担当する。
 *
 * Update Rules:
 * - preview state は _medalCaseViewState だけを使う。
 * - cache / targets / factory はこのモジュールを正にし、root helper へ戻さない。
 * - dispose は disposeMedalPreviewAssets に集約する。
 */
import {
  MEDAL_BOX,
  MEDAL_CAMERA,
  MEDAL_CENTER,
  MEDAL_LOOK,
  MEDAL_PREVIEW_SIZE,
  MEDAL_SIZE,
  THREE,
  disposeObject3D,
} from '../../shared/UiPreviewShared.js';
import { MEDAL_MODEL_SCALE, MedalFactory } from '../../MedalFactory.js';

function disposeOffscreenRenderer(renderer) {
  const canvas = renderer?.domElement ?? null;
  renderer?.dispose?.();
  renderer?.forceContextLoss?.();
  canvas?.remove?.();
}

function createMedalCaseViewState() {
  return {
    renderer: null,
    scene: null,
    camera: null,
    cache: new Map(),
    targets: new Map(),
    factory: new MedalFactory(),
  };
}

export function ensureMedalCaseViewState(uiRoot) {
  uiRoot._medalCaseViewState ??= createMedalCaseViewState();
  return uiRoot._medalCaseViewState;
}

function getMedalPreviewRenderer(uiRoot) {
  const state = ensureMedalCaseViewState(uiRoot);
  if (state.renderer) return state.renderer;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(MEDAL_PREVIEW_SIZE, MEDAL_PREVIEW_SIZE, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);

  const ambient = new THREE.AmbientLight(0xeaf6ff, 2.2);
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(3.4, 5.0, 4.8);
  const fill = new THREE.DirectionalLight(0x89ceff, 1.4);
  fill.position.set(-3.6, 2.2, 4.2);
  const rim = new THREE.DirectionalLight(0xff9fe0, 1.1);
  rim.position.set(-2.8, 3.2, -4.6);
  scene.add(ambient, key, fill, rim);

  state.renderer = renderer;
  state.scene = scene;
  state.camera = camera;
  return renderer;
}

function renderMedalPreview(uiRoot, medalId) {
  const state = ensureMedalCaseViewState(uiRoot);
  const renderer = getMedalPreviewRenderer(uiRoot);
  const scene = state.scene;
  const camera = state.camera;

  const root = state.factory.createMesh(medalId);
  scene.add(root);

  MEDAL_BOX.setFromObject(root);
  MEDAL_BOX.getSize(MEDAL_SIZE);
  MEDAL_BOX.getCenter(MEDAL_CENTER);
  root.position.sub(MEDAL_CENTER);
  root.position.y -= 0.16;
  root.rotation.x = -0.28;
  root.rotation.y = 0.56;

  const extent = Math.max(MEDAL_SIZE.x, MEDAL_SIZE.y, MEDAL_SIZE.z, 1);
  const framingExtent = Math.max(1, extent / Math.max(1, MEDAL_MODEL_SCALE));
  camera.position.copy(MEDAL_CAMERA.set(framingExtent * 1.6, framingExtent * 0.74, framingExtent * 3.1));
  camera.lookAt(MEDAL_LOOK.set(0, framingExtent * 0.14, 0));

  renderer.clear();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');

  scene.remove(root);
  disposeObject3D(root);
  return url;
}

export function installMedalCasePreviewRuntime(UIRoot) {
  UIRoot.prototype.ensureMedalCaseViewState = function ensureMedalCaseViewStatePrototype() {
    return ensureMedalCaseViewState(this);
  };

  UIRoot.prototype.createMedalElement = function createMedalElement(medalId, { size = 18, count = 1, bordered = false, tooltipMeta = null } = {}) {
    const wrap = document.createElement('span');
    wrap.style.position = 'relative';
    wrap.style.display = 'inline-flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.style.width = `${size}px`;
    wrap.style.height = `${size}px`;
    wrap.style.minWidth = `${size}px`;
    wrap.style.minHeight = `${size}px`;
    wrap.style.borderRadius = bordered ? '16px' : '0';
    wrap.style.background = bordered ? 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' : 'transparent';
    wrap.style.border = bordered ? '1px solid rgba(155, 228, 255, 0.14)' : '0';
    wrap.style.boxShadow = bordered ? 'inset 0 0 0 1px rgba(255,255,255,0.02), 0 10px 22px rgba(0,0,0,0.18)' : 'none';
    wrap.style.overflow = 'visible';

    const img = document.createElement('img');
    img.alt = tooltipMeta?.label ?? medalId;
    img.draggable = false;
    img.style.width = bordered ? `${Math.round(size * 0.82)}px` : '100%';
    img.style.height = bordered ? `${Math.round(size * 0.82)}px` : '100%';
    img.style.objectFit = 'contain';
    img.style.filter = 'drop-shadow(0 0 10px rgba(130, 238, 255, 0.18))';
    wrap.appendChild(img);
    this.assignMedalPreview(img, medalId);

    if (count > 1) {
      const badge = document.createElement('span');
      badge.textContent = String(count);
      badge.style.position = 'absolute';
      badge.style.left = bordered ? '2px' : '-2px';
      badge.style.bottom = bordered ? '2px' : '-2px';
      badge.style.minWidth = bordered ? '16px' : '14px';
      badge.style.height = bordered ? '16px' : '14px';
      badge.style.padding = bordered ? '0 4px' : '0 3px';
      badge.style.borderRadius = '999px';
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.background = 'rgba(10, 18, 32, 0.92)';
      badge.style.border = '1px solid rgba(170, 238, 255, 0.28)';
      badge.style.boxShadow = '0 4px 10px rgba(0,0,0,0.28)';
      badge.style.fontSize = bordered ? '10px' : '9px';
      badge.style.fontWeight = '800';
      badge.style.lineHeight = '1';
      badge.style.color = '#f4fcff';
      wrap.appendChild(badge);
    }

    if (tooltipMeta) this.bindMedalTooltip(wrap, tooltipMeta);
    return wrap;
  };

  UIRoot.prototype.assignMedalPreview = function assignMedalPreview(img, medalId) {
    if (!img || !medalId) return;
    const state = ensureMedalCaseViewState(this);
    if (state.cache.has(medalId)) {
      img.src = state.cache.get(medalId);
      return;
    }
    const targets = state.targets.get(medalId) ?? [];
    targets.push(img);
    state.targets.set(medalId, targets);
    const url = renderMedalPreview(this, medalId);
    state.cache.set(medalId, url);
    for (const target of state.targets.get(medalId) ?? []) target.src = url;
  };

  UIRoot.prototype.getMedalPreviewRenderer = function getMedalPreviewRendererPrototype() {
    return getMedalPreviewRenderer(this);
  };

  UIRoot.prototype.renderMedalPreview = function renderMedalPreviewPrototype(medalId) {
    return renderMedalPreview(this, medalId);
  };

  UIRoot.prototype.disposeMedalPreviewAssets = function disposeMedalPreviewAssets() {
    const state = this._medalCaseViewState;
    if (!state) return;
    disposeOffscreenRenderer(state.renderer);
    state.renderer = null;
    state.scene = null;
    state.camera = null;
    state.cache?.clear?.();
    state.targets?.clear?.();
    state.factory = null;
    delete this._medalCaseViewState;
  };
}

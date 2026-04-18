/**
 * Responsibility:
 * - 敵ターゲットロックUIのプール管理と投影更新を担当する。
 *
 * Rules:
 * - ワールド上の敵状態は読むだけで、ロック選定や戦闘判定は変更しない。
 * - DOM プールを再利用し、毎フレームの作り直しを避ける。
 * - 画面外・無効対象の非表示条件はここで完結させる。
 */
import {
  LOCK_CAMERA_RIGHT,
  LOCK_CAMERA_UP,
  LOCK_PLAYER_POS,
  LOCK_SCREEN_CENTER,
  LOCK_SCREEN_RIGHT,
  LOCK_SCREEN_UP,
  LOCK_WORLD_POS,
  TARGET_LOCK,
} from './TargetLockShared.js';
import { getEnemyName } from '../../i18n/index.js';

function setEntryTextIfChanged(node, value) {
  if (!node) return;
  const nextValue = String(value ?? '');
  if (node.__uiTextCache === nextValue) return;
  node.textContent = nextValue;
  node.__uiTextCache = nextValue;
}

function setEntryStyleIfChanged(node, property, value) {
  if (!node) return;
  const nextValue = String(value ?? '');
  const cache = node.__uiStyleCache ?? (node.__uiStyleCache = Object.create(null));
  if (cache[property] === nextValue) return;
  node.style[property] = nextValue;
  cache[property] = nextValue;
}

function setEntryDisplay(entry, display) {
  if (!entry?.root) return;
  setEntryStyleIfChanged(entry.root, 'display', display);
}

function setEntryTransform(entry, x, y) {
  if (!entry?.root) return;
  setEntryStyleIfChanged(entry.root, 'transform', `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`);
}


export function installTargetLockView(UIRoot) {
  UIRoot.prototype.createTargetLockLayer = function createTargetLockLayer() {
      const layer = document.createElement('div');
      layer.className = 'target-lock-layer';
      this.refs.hud.insertBefore(layer, this.refs.hud.firstChild ?? null);
      this.refs.targetLockLayer = layer;
      this.targetLockPool = new Map();
    }

  UIRoot.prototype.getTargetLockEntry = function getTargetLockEntry(enemyId) {
      if (this.targetLockPool?.has(enemyId)) return this.targetLockPool.get(enemyId);
      if (!this.refs.targetLockLayer) return null;
  
      const root = document.createElement('div');
      root.className = 'target-lock-entry';
  
      const frame = document.createElement('div');
      frame.className = 'target-lock-frame';
  
      const makeCorner = () => {
        const corner = document.createElement('div');
        corner.className = 'target-lock-corner';
        return corner;
      };
  
      const tl = makeCorner();
      tl.classList.add('target-lock-corner-tl');
  
      const tr = makeCorner();
      tr.classList.add('target-lock-corner-tr');
  
      const bl = makeCorner();
      bl.classList.add('target-lock-corner-bl');
  
      const br = makeCorner();
      br.classList.add('target-lock-corner-br');
  
      const lineTop = document.createElement('div');
      lineTop.className = 'target-lock-line target-lock-line-top';
  
      const lineBottom = document.createElement('div');
      lineBottom.className = 'target-lock-line target-lock-line-bottom';
  
      const label = document.createElement('div');
      label.className = 'target-lock-label';
  
      frame.append(tl, tr, bl, br, lineTop, lineBottom);
      root.append(frame, label);
      this.refs.targetLockLayer.appendChild(root);
  
      const entry = {
        root,
        frame,
        label,
        corners: [tl, tr, bl, br],
        lines: [lineTop, lineBottom],
      };
      this.targetLockPool.set(enemyId, entry);
      return entry;
    }

  UIRoot.prototype.hideTargetLocks = function hideTargetLocks() {
      if (!this.targetLockPool) return;
      for (const entry of this.targetLockPool.values()) {
        setEntryDisplay(entry, 'none');
      }
    }

  UIRoot.prototype.renderTargetLocks = function renderTargetLocks() {
      const layer = this.refs.targetLockLayer;
      const playerMesh = this.game.store.playerMesh;
      const camera = this.game.renderer?.camera;
      const stateMode = this.game.state.mode;
      const enemyMarkersVisible = this.game.optionState?.hud?.enemyMarkersVisible !== false;
      if (!enemyMarkersVisible || !layer || !playerMesh || !camera || (stateMode !== 'playing' && stateMode !== 'paused')) {
        this.hideTargetLocks();
        return;
      }
  
      const highContrast = this.game.optionState?.hud?.highContrast === true;
      const layerRect = layer.getBoundingClientRect();
      const viewportWidth = Math.max(320, layerRect.width || layer.clientWidth || window.innerWidth || document.documentElement.clientWidth || 0);
      const viewportHeight = Math.max(240, layerRect.height || layer.clientHeight || window.innerHeight || document.documentElement.clientHeight || 0);
      const activeIds = new Set();
      const targetLockRange = TARGET_LOCK.range;
      playerMesh.getWorldPosition(LOCK_PLAYER_POS);
      LOCK_CAMERA_RIGHT.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      LOCK_CAMERA_UP.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  
      for (const enemy of this.game.store.enemies) {
        if (!enemy.alive || enemy.mesh.visible === false || enemy.def.isBoss) continue;
  
        enemy.mesh.getWorldPosition(LOCK_WORLD_POS);
        const worldDist = LOCK_WORLD_POS.distanceTo(LOCK_PLAYER_POS);
        if (worldDist > targetLockRange) continue;
  
        LOCK_SCREEN_CENTER.copy(LOCK_WORLD_POS).project(camera);
        if (LOCK_SCREEN_CENTER.z < -1 || LOCK_SCREEN_CENTER.z > 1) continue;
        if (LOCK_SCREEN_CENTER.x < -1.2 || LOCK_SCREEN_CENTER.x > 1.2 || LOCK_SCREEN_CENTER.y < -1.2 || LOCK_SCREEN_CENTER.y > 1.2) continue;
  
        const projectedRadiusX = Math.max(1.2, enemy.def.radius * 0.95);
        const projectedRadiusY = Math.max(1.0, enemy.def.radius * 0.82);
        LOCK_SCREEN_RIGHT.copy(LOCK_WORLD_POS).addScaledVector(LOCK_CAMERA_RIGHT, projectedRadiusX).project(camera);
        LOCK_SCREEN_UP.copy(LOCK_WORLD_POS).addScaledVector(LOCK_CAMERA_UP, projectedRadiusY).project(camera);
  
        const screenX = (LOCK_SCREEN_CENTER.x * 0.5 + 0.5) * viewportWidth;
        const screenY = (-LOCK_SCREEN_CENTER.y * 0.5 + 0.5) * viewportHeight;
        const halfW = Math.max(22, Math.abs((LOCK_SCREEN_RIGHT.x - LOCK_SCREEN_CENTER.x) * viewportWidth * 0.5) * 2.05);
        const halfH = Math.max(16, Math.abs((LOCK_SCREEN_UP.y - LOCK_SCREEN_CENTER.y) * viewportHeight * 0.5) * 2.3);
        const width = Math.min(188, Math.max(52, Math.round(halfW * 2)));
        const height = Math.min(136, Math.max(40, Math.round(halfH * 2)));
        if (screenX < -width || screenX > viewportWidth + width || screenY < -height || screenY > viewportHeight + height) continue;
  
        const entry = this.getTargetLockEntry(enemy.id);
        if (!entry) continue;
        activeIds.add(enemy.id);
  
        const pulse = 0.5 + 0.5 * Math.sin(this.game.state.elapsed * 6.6 + enemy.id * 0.8);
        const distanceRatio = Math.min(1, worldDist / Math.max(0.001, targetLockRange));
        const opacity = 0.74 + pulse * 0.18 - distanceRatio * 0.16;
        const cornerSize = Math.max(12, Math.min(20, Math.round(Math.min(width, height) * 0.24)));
        const lineWidth = Math.max(16, Math.round(width * 0.26));
        const glow = (highContrast ? 6 : 10) + pulse * (highContrast ? 4 : 10);
  
        setEntryDisplay(entry, 'block');
        setEntryTransform(entry, screenX, screenY);
        setEntryStyleIfChanged(entry.root, 'opacity', `${Math.max(0.42, Math.min(1, opacity))}`);
  
        setEntryStyleIfChanged(entry.frame, 'width', `${width}px`);
        setEntryStyleIfChanged(entry.frame, 'height', `${height}px`);
        setEntryStyleIfChanged(entry.frame, 'boxShadow', highContrast
          ? `inset 0 0 0 1px rgba(255,255,255,${0.16 + pulse * 0.08}), 0 0 0 1px rgba(0,0,0,0.52)`
          : `inset 0 0 0 1px rgba(120, 252, 255, ${0.06 + pulse * 0.05})`);
        setEntryStyleIfChanged(entry.frame, 'background', 'rgba(0, 0, 0, 0)');
  
        for (const corner of entry.corners) {
          setEntryStyleIfChanged(corner, 'width', `${cornerSize}px`);
          setEntryStyleIfChanged(corner, 'height', `${cornerSize}px`);
          setEntryStyleIfChanged(corner, 'borderColor', highContrast ? 'rgba(255,255,255,0.98)' : 'rgba(120, 252, 255, 0.95)');
          setEntryStyleIfChanged(corner, 'filter', highContrast
            ? `drop-shadow(0 0 ${glow}px rgba(255,255,255,${0.18 + pulse * 0.12})) drop-shadow(0 0 1px rgba(0,0,0,0.88))`
            : `drop-shadow(0 0 ${glow}px rgba(90, 225, 255, ${0.35 + pulse * 0.28}))`);
        }
        for (const line of entry.lines) {
          setEntryStyleIfChanged(line, 'width', `${lineWidth}px`);
          setEntryStyleIfChanged(line, 'background', highContrast ? 'rgba(255,255,255,0.92)' : 'rgba(120, 252, 255, 0.78)');
          setEntryStyleIfChanged(line, 'boxShadow', highContrast
            ? `0 0 ${glow}px rgba(255,255,255,${0.12 + pulse * 0.08}), 0 0 1px rgba(0,0,0,0.9)`
            : `0 0 ${glow}px rgba(90, 225, 255, ${0.25 + pulse * 0.22})`);
        }
  
        setEntryTextIfChanged(entry.label, getEnemyName(this.game, enemy) || enemy.typeKey || this.t('hud.target'));
        setEntryStyleIfChanged(entry.label, 'bottom', `${Math.round(height * 0.5 + 10)}px`);
        setEntryStyleIfChanged(entry.label, 'borderColor', highContrast ? 'rgba(255,255,255,0.92)' : `rgba(140, 248, 255, ${0.22 + pulse * 0.18})`);
        setEntryStyleIfChanged(entry.label, 'background', highContrast
          ? 'linear-gradient(180deg, rgba(5, 8, 16, 0.96), rgba(0, 0, 0, 0.92))'
          : 'linear-gradient(180deg, rgba(8, 18, 34, 0.88), rgba(4, 10, 22, 0.76))');
        setEntryStyleIfChanged(entry.label, 'boxShadow', highContrast
          ? `0 0 ${8 + pulse * 4}px rgba(255,255,255,0.08), 0 0 0 1px rgba(0,0,0,0.72)`
          : `0 0 ${12 + pulse * 10}px rgba(66, 218, 255, ${0.16 + pulse * 0.14})`);
        setEntryStyleIfChanged(entry.label, 'textShadow', highContrast
          ? '0 0 1px rgba(0,0,0,0.94)'
          : `0 0 ${8 + pulse * 8}px rgba(132, 248, 255, ${0.18 + pulse * 0.2})`);
      }
  
      if (!this.targetLockPool) return;
      for (const [enemyId, entry] of this.targetLockPool.entries()) {
        if (!activeIds.has(enemyId)) setEntryDisplay(entry, 'none');
      }
    }

}

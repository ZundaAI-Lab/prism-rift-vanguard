import { clamp } from '../utils/math.js';

/**
 * Responsibility:
 * - Browser input gateway.
 *
 * Rules:
 * - Only this module talks directly to DOM keyboard/mouse events.
 * - Runtime systems must read input through this API, never attach their own listeners.
 * - Keyboard may stay global, but gameplay mouse buttons/context-menu belong to the game canvas.
 * - Pointer-lock look input is accepted only while the game canvas owns pointer lock.
 */
export class Input {
  constructor(canvas) {
    this.canvas = canvas ?? null;
    this.enabled = true;
    this.keys = new Set();
    this.pointerLocked = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.mouseDown = false;
    this.mouseButtonsDown = new Set();
    this.mouseButtonsPressed = new Set();
    this.mouseButtonsReleased = new Set();
    this.justPressed = new Set();
    this.justReleased = new Set();

    this.handleKeyDown = (event) => {
      if (!this.enabled) return;
      if (this.shouldIgnoreKeyboardEvent(event)) return;
      if (!this.keys.has(event.code)) this.justPressed.add(event.code);
      this.keys.add(event.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
    };

    this.handleKeyUp = (event) => {
      if (this.shouldIgnoreKeyboardEvent(event)) return;
      this.keys.delete(event.code);
      this.justReleased.add(event.code);
    };

    this.handleMouseDown = (event) => {
      if (!this.enabled) return;
      if (!this.canvasContainsEventTarget(event)) return;
      if (!this.mouseButtonsDown.has(event.button)) this.mouseButtonsPressed.add(event.button);
      this.mouseButtonsDown.add(event.button);
      if (event.button === 0) this.mouseDown = true;
      if (event.button === 2) event.preventDefault();
    };

    this.handleMouseUp = (event) => {
      if (!this.canvasContainsEventTarget(event) && !this.isCanvasPointerLocked()) return;
      this.mouseButtonsDown.delete(event.button);
      this.mouseButtonsReleased.add(event.button);
      if (event.button === 0) this.mouseDown = false;
      if (event.button === 2) event.preventDefault();
    };

    this.handleContextMenu = (event) => {
      if (!this.canvasContainsEventTarget(event)) return;
      event.preventDefault();
    };

    this.handleMouseMove = (event) => {
      if (!this.enabled) return;
      if (!this.isCanvasPointerLocked()) return;
      this.mouseDeltaX += event.movementX;
      this.mouseDeltaY += event.movementY;
    };

    this.handlePointerLockChange = () => {
      const locked = this.isCanvasPointerLocked();
      this.pointerLocked = locked;
      if (!locked) this.clearState({ preservePointerLock: true });
    };

    this.handleWindowBlur = () => {
      this.clearState();
    };

    this.handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') this.clearState();
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas?.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.canvas?.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  setEnabled(enabled) {
    this.enabled = enabled !== false;
    if (!this.enabled) this.clearState({ preservePointerLock: true });
  }

  shouldIgnoreKeyboardEvent(event) {
    if (!this.enabled) return true;
    const target = event?.target;
    if (this.isEditableElement(target)) return true;
    const active = document.activeElement;
    if (active && active !== target && this.isEditableElement(active)) return true;
    return false;
  }

  isEditableElement(target) {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    return target.closest('input, textarea, select, [contenteditable="true"]') !== null;
  }

  canvasContainsEventTarget(event) {
    if (!this.canvas) return false;
    const target = event?.target;
    return target === this.canvas || this.canvas.contains?.(target);
  }

  isCanvasPointerLocked() {
    return document.pointerLockElement === this.canvas;
  }

  clearState({ preservePointerLock = false } = {}) {
    this.keys.clear();
    this.justPressed.clear();
    this.justReleased.clear();
    this.mouseButtonsDown.clear();
    this.mouseButtonsPressed.clear();
    this.mouseButtonsReleased.clear();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.mouseDown = false;
    if (!preservePointerLock) this.pointerLocked = false;
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas?.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas?.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.clearState();
  }

  requestPointerLock() {
    this.canvas?.requestPointerLock?.();
  }

  releasePointerLock() {
    document.exitPointerLock?.();
  }

  isDown(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.justPressed.has(code);
  }

  isMouseDown(button) {
    return this.mouseButtonsDown.has(button);
  }

  wasMousePressed(button) {
    return this.mouseButtonsPressed.has(button);
  }

  consumeLookDelta() {
    const delta = {
      x: clamp(this.mouseDeltaX, -200, 200),
      y: clamp(this.mouseDeltaY, -200, 200),
    };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return delta;
  }

  endFrame() {
    this.justPressed.clear();
    this.justReleased.clear();
    this.mouseButtonsPressed.clear();
    this.mouseButtonsReleased.clear();
  }
}

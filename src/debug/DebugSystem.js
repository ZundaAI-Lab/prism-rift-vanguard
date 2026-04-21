import * as THREE from 'three';
import { CAMPAIGN_START_MISSION_INDEX, MISSIONS } from '../data/missions.js';
import { translate } from '../i18n/index.js';
import { PerformanceMonitor } from './perf/PerformanceMonitor.js';
import { NullPerformanceMonitor } from './perf/NullPerformanceMonitor.js';
import { MissionPerformanceSession } from './perf/MissionPerformanceSession.js';

const DEBUG_PROJECTED = new THREE.Vector3();
const PERFORMANCE_REPORT_HISTORY_LIMIT = 10;

const STATIC_COLLIDER_DEBUG_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 20, 1, false);
STATIC_COLLIDER_DEBUG_GEOMETRY.userData.shared = true;

const STATIC_COLLIDER_PLAYER_DEBUG_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xff8be8,
  wireframe: true,
  transparent: true,
  opacity: 0.7,
  depthWrite: false,
  depthTest: false,
  toneMapped: false,
});
STATIC_COLLIDER_PLAYER_DEBUG_MATERIAL.userData.shared = true;

const STATIC_COLLIDER_PROJECTILE_DEBUG_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xffcf6f,
  wireframe: true,
  transparent: true,
  opacity: 0.66,
  depthWrite: false,
  depthTest: false,
  toneMapped: false,
});
STATIC_COLLIDER_PROJECTILE_DEBUG_MATERIAL.userData.shared = true;

const STATIC_COLLIDER_MISC_DEBUG_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xa6ffd8,
  wireframe: true,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
  depthTest: false,
  toneMapped: false,
});
STATIC_COLLIDER_MISC_DEBUG_MATERIAL.userData.shared = true;

function createStaticColliderDebugMesh(material) {
  const mesh = new THREE.Mesh(STATIC_COLLIDER_DEBUG_GEOMETRY, material);
  mesh.name = 'StaticColliderDebug';
  mesh.visible = false;
  mesh.renderOrder = 999;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Responsibility:
 * - デバッグモードの有効判定、デバッグ専用設定の保持、実行中のデバッグ専用操作を担当する。
 * - デバッグ限定の performance monitor / overlay / mission report の窓口を提供する。
 *
 * Rules:
 * - デバッグモードは `?debug=1` のときだけ有効化する。
 * - 永続化は行わず、URL 以外を真実源にしない。
 * - 実行中に切り替える設定値はここで保持し、新しい state へ再接続するときもここから再適用する。
 * - デバッグ専用ホットキーもここで解釈し、通常ゲームシステムへ責務を漏らさない。
 */
export class DebugSystem {
  constructor(state, search = window.location.search) {
    this.enabled = this.parseEnabled(search);
    this.invincible = false;
    this.bossMode = false;
    this.titleStartMissionIndex = CAMPAIGN_START_MISSION_INDEX;
    this.performanceOverlayEnabled = false;
    this.collisionOverlayEnabled = false;
    this.performanceMonitor = this.enabled ? new PerformanceMonitor() : new NullPerformanceMonitor();
    this.performanceReportHistory = [];
    this.latestPerformanceReport = null;
    this.activeMissionPerformance = null;
    this.lastGame = null;
    this.staticColliderDebugMeshes = new Map();
    this.staticColliderDebugGroup = null;
    this.attachState(state);
  }

  parseEnabled(search) {
    try {
      return new URLSearchParams(search).get('debug') === '1';
    } catch {
      return false;
    }
  }

  attachState(state) {
    this.state = state;
    this.applyToState();
  }

  applyToState() {
    if (!this.state?.progression?.debug) return;
    this.state.progression.debug.enabled = this.enabled;
    this.state.progression.debug.invincible = this.invincible;
    this.state.progression.debug.bossMode = this.bossMode;
    this.state.progression.debug.titleStartMissionIndex = this.titleStartMissionIndex;
  }

  update(game) {
    if (game) this.lastGame = game;
    this.syncCollisionOverlay(game);
    if (!this.enabled || !game?.input) return;
    if (game.input.wasPressed('KeyC')) {
      this.clearVisibleEnemies(game);
    }
  }

  isEnabled() {
    return this.enabled;
  }

  isInvincible() {
    return this.invincible;
  }

  setInvincible(enabled) {
    this.invincible = !!enabled;
    if (this.state?.progression?.debug) {
      this.state.progression.debug.invincible = this.invincible;
    }
    return this.invincible;
  }

  toggleInvincible() {
    return this.setInvincible(!this.invincible);
  }

  isBossMode() {
    return this.bossMode;
  }

  setBossMode(enabled) {
    this.bossMode = !!enabled;
    if (this.state?.progression?.debug) {
      this.state.progression.debug.bossMode = this.bossMode;
    }
    return this.bossMode;
  }

  toggleBossMode() {
    return this.setBossMode(!this.bossMode);
  }

  getTitleStartMissionIndex() {
    return this.titleStartMissionIndex;
  }

  setTitleStartMissionIndex(index) {
    const safeIndex = this.clampMissionIndex(index);
    this.titleStartMissionIndex = safeIndex;
    if (this.state?.progression?.debug) {
      this.state.progression.debug.titleStartMissionIndex = safeIndex;
    }
    return safeIndex;
  }

  clampMissionIndex(index) {
    const raw = Number(index);
    if (!Number.isFinite(raw)) return CAMPAIGN_START_MISSION_INDEX;
    return Math.max(0, Math.min(MISSIONS.length - 1, Math.trunc(raw)));
  }

  getPerformanceMonitor() {
    return this.performanceMonitor;
  }

  getPerformanceSummary() {
    return this.performanceMonitor.getSummary();
  }

  isPerformanceOverlayEnabled() {
    return this.enabled && this.performanceOverlayEnabled;
  }

  setPerformanceOverlayEnabled(enabled) {
    this.performanceOverlayEnabled = !!enabled;
    return this.performanceOverlayEnabled;
  }

  togglePerformanceOverlay() {
    return this.setPerformanceOverlayEnabled(!this.performanceOverlayEnabled);
  }

  isCollisionOverlayEnabled() {
    return this.enabled && this.collisionOverlayEnabled;
  }

  setCollisionOverlayEnabled(enabled) {
    this.collisionOverlayEnabled = !!enabled;
    this.syncCollisionOverlay(this.lastGame);
    return this.collisionOverlayEnabled;
  }

  toggleCollisionOverlay() {
    return this.setCollisionOverlayEnabled(!this.collisionOverlayEnabled);
  }

  capturePerformanceSnapshot(slot = 'baseline') {
    if (!this.enabled) return null;
    return this.performanceMonitor.captureSnapshot(slot);
  }

  clearPerformanceSnapshots() {
    if (!this.enabled) return;
    this.performanceMonitor.clearSnapshots();
  }

  beginMissionPerformance(game, mission, missionIndex = 0) {
    if (!this.enabled || !mission) return null;
    this.activeMissionPerformance = new MissionPerformanceSession({
      missionId: mission.id ?? null,
      missionName: mission.name ?? mission.id ?? '',
      missionIndex,
      startedAt: Date.now(),
      startedPerformanceAt: performance.now(),
    });
    return this.activeMissionPerformance;
  }

  ingestPerformanceFrame(game) {
    if (!this.enabled || !this.activeMissionPerformance) return;
    const frame = this.performanceMonitor.getLatestFrame?.();
    if (!frame) return;
    this.activeMissionPerformance.ingestFrame(frame, game);
  }

  finalizeMissionPerformance(game, result = 'unknown', { reason = '' } = {}) {
    if (!this.enabled || !this.activeMissionPerformance) return null;
    const report = this.activeMissionPerformance.finalize({ result, reason, game });
    this.latestPerformanceReport = report;
    this.performanceReportHistory.unshift(report);
    if (this.performanceReportHistory.length > PERFORMANCE_REPORT_HISTORY_LIMIT) {
      this.performanceReportHistory.length = PERFORMANCE_REPORT_HISTORY_LIMIT;
    }
    this.activeMissionPerformance = null;
    return report;
  }

  getLatestPerformanceReport() {
    return this.latestPerformanceReport;
  }

  getPerformanceReportHistory() {
    return this.performanceReportHistory;
  }

  getActiveMissionPerformanceMeta() {
    return this.activeMissionPerformance?.meta ?? null;
  }

  clearVisibleEnemies(game) {
    if (!game?.state || game.state.mode !== 'playing') return 0;
    if (game.state.progression?.missionStatus === 'clearSequence') return 0;

    const enemies = game.store?.enemies ?? [];
    if (!enemies.length) {
      game.ui?.showNotice(translate(game, 'debug.purgeNoTarget'), 0.9);
      return 0;
    }

    const targets = enemies.filter((enemy) => enemy?.alive && this.isEnemyInsideViewport(game, enemy));
    if (!targets.length) {
      game.ui?.showNotice(translate(game, 'debug.purgeNoTarget'), 0.9);
      return 0;
    }

    for (const enemy of [...targets]) {
      game.enemies.killEnemy(enemy, { source: 'debugPurge' });
    }

    game.ui?.showNotice(translate(game, 'debug.purgeTargets', { count: targets.length, plural: targets.length === 1 ? '' : 'S' }), 1.0);
    return targets.length;
  }

  isEnemyInsideViewport(game, enemy) {
    const camera = game?.renderer?.camera;
    const mesh = enemy?.mesh;
    if (!camera || !mesh?.position) return true;
    DEBUG_PROJECTED.copy(mesh.position).project(camera);
    if (!Number.isFinite(DEBUG_PROJECTED.x) || !Number.isFinite(DEBUG_PROJECTED.y) || !Number.isFinite(DEBUG_PROJECTED.z)) return false;
    return DEBUG_PROJECTED.z >= -1 && DEBUG_PROJECTED.z <= 1
      && Math.abs(DEBUG_PROJECTED.x) <= 1.08
      && Math.abs(DEBUG_PROJECTED.y) <= 1.08;
  }

  syncCollisionOverlay(game) {
    const visible = this.enabled && this.collisionOverlayEnabled;
    this.syncEnemyCollisionOverlay(game, visible);
    this.syncStaticCollisionOverlay(game, visible);
  }

  syncEnemyCollisionOverlay(game, visible) {
    const enemies = game?.store?.enemies;
    const setCollisionDebugVisible = game?.enemies?.factory?.setCollisionDebugVisible?.bind?.(game.enemies.factory);
    if (!Array.isArray(enemies) || !setCollisionDebugVisible) return;
    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      if (!enemy) continue;
      setCollisionDebugVisible(enemy, visible);
    }
  }

  syncStaticCollisionOverlay(game, visible) {
    const group = this.ensureStaticColliderDebugGroup(game);
    if (!group) return;

    group.visible = visible;
    if (!visible) return;

    const colliders = game?.world?.staticColliders ?? [];
    const activeColliders = new Set();
    for (let i = 0; i < colliders.length; i += 1) {
      const collider = colliders[i];
      if (!collider) continue;
      game?.world?.refreshCollider?.(collider);
      const debugMesh = this.ensureStaticColliderDebugMesh(group, collider);
      if (!debugMesh) continue;
      this.updateStaticColliderDebugMesh(debugMesh, collider);
      activeColliders.add(collider);
    }

    for (const [collider, debugMesh] of this.staticColliderDebugMeshes) {
      if (activeColliders.has(collider)) continue;
      debugMesh.removeFromParent();
      this.staticColliderDebugMeshes.delete(collider);
    }
  }

  ensureStaticColliderDebugGroup(game) {
    const rendererGroup = game?.renderer?.groups?.debug ?? game?.renderer?.groups?.fx;
    if (!rendererGroup) return null;
    if (!this.staticColliderDebugGroup) {
      this.staticColliderDebugGroup = new THREE.Group();
      this.staticColliderDebugGroup.name = 'StaticColliderDebugGroup';
      this.staticColliderDebugGroup.visible = false;
    }
    if (this.staticColliderDebugGroup.parent !== rendererGroup) {
      rendererGroup.add(this.staticColliderDebugGroup);
    }
    return this.staticColliderDebugGroup;
  }

  ensureStaticColliderDebugMesh(group, collider) {
    if (collider?.blocksPlayer === false && collider?.blocksProjectiles === false) return null;
    let debugMesh = this.staticColliderDebugMeshes.get(collider);
    if (!debugMesh) {
      debugMesh = createStaticColliderDebugMesh(this.getStaticColliderDebugMaterial(collider));
      this.staticColliderDebugMeshes.set(collider, debugMesh);
      group.add(debugMesh);
    }
    debugMesh.material = this.getStaticColliderDebugMaterial(collider);
    return debugMesh;
  }

  getStaticColliderDebugMaterial(collider) {
    if (collider?.blocksPlayer !== false) return STATIC_COLLIDER_PLAYER_DEBUG_MATERIAL;
    if (collider?.blocksProjectiles !== false) return STATIC_COLLIDER_PROJECTILE_DEBUG_MATERIAL;
    return STATIC_COLLIDER_MISC_DEBUG_MATERIAL;
  }

  updateStaticColliderDebugMesh(debugMesh, collider) {
    const radius = Math.max(0.01, Number(collider?.radius) || 0.01);
    const halfHeight = Math.max(0.02, Number(collider?.halfHeight ?? collider?.verticalRadius ?? collider?.radius) || 0.02);
    debugMesh.position.set(collider?.x ?? 0, collider?.y ?? 0, collider?.z ?? 0);
    debugMesh.scale.set(radius, Math.max(halfHeight * 2, 0.04), radius);
    debugMesh.visible = true;
  }
}

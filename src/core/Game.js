import { Renderer } from '../render/Renderer.js';
import { CameraRig } from '../render/CameraRig.js';
import { createInitialState } from './GameState.js';
import { Input } from './Input.js';
import { EventBus } from './EventBus.js';
import { EntityStore } from '../entities/EntityStore.js';
import { Terrain } from '../world/Terrain.js';
import { EnvironmentBuilder } from '../world/EnvironmentBuilder.js';
import { StageGimmickSystem } from '../world/StageGimmickSystem.js';
import { createPlayerShip } from '../player/ShipFactory.js';
import { UpgradeSystem } from '../progression/UpgradeSystem.js';
import { AimAssist } from '../player/AimAssist.js';
import { PlayerSystem } from '../player/PlayerSystem.js';
import { WeaponSystem } from '../player/WeaponSystem.js';
import { EnemySystem } from '../enemies/EnemySystem.js';
import { ProjectileSystem } from '../combat/ProjectileSystem.js';
import { RewardSystem } from '../combat/RewardSystem.js';
import { EffectsSystem } from '../fx/EffectsSystem.js';
import { MissionSystem } from '../progression/MissionSystem.js';
import { MissionAchievements } from '../progression/MissionAchievements.js';
import { ShopSystem } from '../progression/ShopSystem.js';
import { UIRoot } from '../ui/UIRoot.js';
import { AudioManager } from '../audio/AudioManager.js';
import { DebugSystem } from '../debug/DebugSystem.js';
import { RecordStorage } from '../storage/RecordStorage.js';
import { OptionStorage } from '../storage/OptionStorage.js';
import { CAMPAIGN_START_MISSION_INDEX, MISSIONS, TITLE_PREVIEW_MISSION_INDEX } from '../data/missions.js';

function normalizeGraphicsOptionsSnapshot(graphics = {}) {
  const fov = Number(graphics?.fov);
  return {
    quality: graphics?.quality ?? null,
    fov: Number.isFinite(fov) ? fov : null,
    effectStrength: graphics?.effectStrength ?? null,
  };
}

function didGraphicsOptionsChange(previousGraphics = {}, nextGraphics = {}) {
  return previousGraphics.quality !== nextGraphics.quality
    || previousGraphics.fov !== nextGraphics.fov
    || previousGraphics.effectStrength !== nextGraphics.effectStrength;
}

/**
 * Responsibility:
 * - Application composition root and main update loop.
 *
 * Rules:
 * - Construct systems here, but keep feature logic inside the owning module.
 * - Update order is authoritative: mission -> player -> weapons -> enemies -> projectiles -> rewards -> gimmicks -> fx -> world -> camera -> ui -> render.
 * - Stage gimmicks are gameplay hazards, so they must update before pure visual FX/world animation.
 * - Pointer-lock loss during combat must flow into MissionSystem pause handling instead of ad-hoc booleans in UI code.
 * - Retrying a mission must route through MissionSystem so checkpoint restoration stays authoritative.
 */
export class Game {
  constructor() {
    this.bus = new EventBus();
    this.state = createInitialState();
    this.debug = new DebugSystem(this.state);
    this.records = new RecordStorage({ missions: MISSIONS });
    this.options = new OptionStorage();
    this.optionState = this.options.getOptions();
    this.renderer = new Renderer({ quality: this.optionState.graphics.quality });
    this.input = new Input(this.renderer.webgl.domElement);
    this.store = new EntityStore(this.renderer);
    this.terrain = new Terrain();
    this.world = new EnvironmentBuilder(this);
    this.world.setTerrain(this.terrain);
    this.stageGimmicks = new StageGimmickSystem(this);
    this.upgrades = new UpgradeSystem(this.state);
    this.missionAchievements = new MissionAchievements(this);
    this.aimAssist = new AimAssist(this);
    this.playerSystem = new PlayerSystem(this);
    this.projectiles = new ProjectileSystem(this);
    this.rewards = new RewardSystem(this);
    this.effects = new EffectsSystem(this);
    this.enemies = new EnemySystem(this);
    this.weapons = new WeaponSystem(this);
    this.shop = new ShopSystem(this);
    this.missionSystem = new MissionSystem(this);
    this.ui = new UIRoot(this);
    this.audio = new AudioManager({
      bgmVolume: this.optionState.audio.bgmVolume,
      sfxVolume: this.optionState.audio.sfxVolume,
      getPlayerPosition: () => this.store.playerMesh?.position ?? null,
      getListenerObject: () => this.renderer.camera ?? null,
    });
    this.cameraRig = new CameraRig(this.renderer.camera);

    this.lastTime = performance.now();
    this.frameRequestId = 0;
    this.disposed = false;
    this.prevPointerLocked = false;
    this.resumeRequested = false;
    this.previousBgmScreenMode = this.getBgmScreenMode(this.state.mode);
    this.bindCanvas();
    this.createPlayer();
    this.state.missionIndex = TITLE_PREVIEW_MISSION_INDEX;
    this.world.applyMission(MISSIONS[TITLE_PREVIEW_MISSION_INDEX] ?? MISSIONS[0]);
    this.stageGimmicks.applyMission(MISSIONS[TITLE_PREVIEW_MISSION_INDEX] ?? MISSIONS[0]);
    this.playerSystem.resetForMission();
    this.applyOptionSettings(this.optionState);
  }

  bindCanvas() {
    this.handleCanvasClick = () => {
      if (this.state.mode === 'playing') this.input.requestPointerLock();
    };
    this.handleWindowKeyDown = (event) => {
      if (event.code === 'Escape') this.input.releasePointerLock();
    };
    this.renderer.webgl.domElement.addEventListener('click', this.handleCanvasClick);
    window.addEventListener('keydown', this.handleWindowKeyDown);
  }

  unbindCanvas() {
    this.renderer?.webgl?.domElement?.removeEventListener?.('click', this.handleCanvasClick);
    window.removeEventListener('keydown', this.handleWindowKeyDown);
    this.handleCanvasClick = null;
    this.handleWindowKeyDown = null;
  }

  createPlayer() {
    const ship = createPlayerShip();
    this.store.playerMesh = ship;
    this.renderer.groups.actors.add(ship);
  }

  getAudioStateSnapshot() {
    return {
      mode: this.state.mode,
      missionId: MISSIONS[this.state.missionIndex]?.id ?? null,
      missionStatus: this.state.progression.missionStatus,
      bossActive: this.state.progression.bossActive,
      bossForm: this.getActiveBossAudioForm(),
    };
  }

  getOptionsSnapshot() {
    return this.options.getOptions();
  }

  applyOptionSettings(snapshot = this.getOptionsSnapshot()) {
    const previousGraphics = normalizeGraphicsOptionsSnapshot(this.renderer?.currentGraphicsOptions ?? this.optionState?.graphics ?? {});
    const nextGraphics = normalizeGraphicsOptionsSnapshot(snapshot?.graphics ?? {});
    const graphicsChanged = didGraphicsOptionsChange(previousGraphics, nextGraphics);
    const graphicsQualityChanged = previousGraphics.quality !== nextGraphics.quality;

    this.optionState = snapshot;

    if (graphicsChanged) {
      this.renderer?.applyGraphicsOptions?.(snapshot.graphics);
    }
    if (graphicsQualityChanged) {
      this.world?.applyGraphicsOptions?.({ quality: nextGraphics.quality });
    }

    this.audio?.setBgmVolume?.(snapshot.audio?.bgmVolume ?? 0);
    this.audio?.setSfxVolume?.(snapshot.audio?.sfxVolume ?? 0);
    this.ui?.applyOptionSettings?.(snapshot);
    this.ui?.applyLocalization?.();
    return this.optionState;
  }

  syncAudioState() {
    this.audio?.syncGameState(this.getAudioStateSnapshot());
  }

  start() {
    if (this.disposed || this.frameRequestId) return;
    this.lastTime = performance.now();
    this.frameRequestId = requestAnimationFrame((time) => this.frame(time));
  }

  startNewRun(startMissionIndex = CAMPAIGN_START_MISSION_INDEX) {
    this.resumeRequested = false;
    this.input.requestPointerLock();
    this.missionSystem.startNewRun(startMissionIndex);
  }

  resumePausedRun() {
    if (this.state.mode !== 'paused') return;
    this.resumeRequested = true;
    this.input.requestPointerLock();
  }

  retryCurrentMission() {
    this.resumeRequested = false;
    this.input.requestPointerLock();
    this.missionSystem.retryCurrentMission();
  }

  backToMissionHangar() {
    this.resumeRequested = false;
    this.missionSystem.returnToMissionHangar();
  }

  launchFromInterval() {
    this.resumeRequested = false;
    this.input.requestPointerLock();
    this.missionSystem.startNextMission();
  }

  getActiveBossAudioForm() {
    for (const enemy of this.store.enemies) {
      if (!enemy?.def?.isBoss && !enemy?.finalBoss) continue;
      if (enemy.finalBoss?.form === 'fighter' || enemy.def?.behavior === 'boss_final_fighter') return 'fighter';
      if (enemy.finalBoss?.form === 'fortress' || enemy.def?.behavior === 'boss_final_fortress') return 'fortress';
      if (enemy.def?.isBoss) return 'boss';
    }
    return null;
  }

  getBgmScreenMode(mode) {
    if (mode === 'paused') return 'playing';
    if (mode === 'title' || mode === 'interval' || mode === 'playing') return mode;
    return null;
  }

  stopBgmOnScreenTransition(previousScreenMode = null, nextScreenMode = null) {
    if (previousScreenMode && nextScreenMode && previousScreenMode !== nextScreenMode) {
      this.audio?.stopBgm();
    }
    this.previousBgmScreenMode = nextScreenMode;
  }

  backToTitle() {
    this.resumeRequested = false;
    this.debug.finalizeMissionPerformance(this, 'aborted', { reason: 'backToTitle' });
    const shouldStopCurrentBgm = this.state.mode === 'playing' || this.state.mode === 'paused' || this.state.mode === 'gameoverSequence' || this.state.mode === 'gameover';
    this.audio?.stopPreviewBgm?.({ resumeMain: false });
    if (shouldStopCurrentBgm) {
      this.audio.stopBgm();
      this.audio?.stopAndReleaseActiveMissionAudioSet?.();
      this.audio.suppressAutoBgmForMode('title');
    } else {
      this.audio?.stopAndReleaseActiveMissionAudioSet?.();
    }
    this.state = createInitialState();
    this.debug.attachState(this.state);
    this.upgrades.state = this.state;
    this.store.reset();
    this.enemies.clearEncounterRuntimeState();
    this.createPlayer();
    this.state.missionIndex = TITLE_PREVIEW_MISSION_INDEX;
    this.world.applyMission(MISSIONS[TITLE_PREVIEW_MISSION_INDEX] ?? MISSIONS[0]);
    this.stageGimmicks.applyMission(MISSIONS[TITLE_PREVIEW_MISSION_INDEX] ?? MISSIONS[0]);
    this.playerSystem.resetForMission();
    this.missionAchievements.resetCampaign();
    this.ui?.ensureUiRuntimeState?.();
    this.missionSystem.cancelIntervalTransition();
    this.prevPointerLocked = false;
    this.input.releasePointerLock();
  }

  frame(time) {
    if (this.disposed) {
      this.frameRequestId = 0;
      return;
    }
    this.frameRequestId = 0;
    const dt = Math.min(0.033, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.update(dt);
    if (this.disposed) return;
    this.frameRequestId = requestAnimationFrame((next) => this.frame(next));
  }

  update(dt) {
    if (this.disposed) return;
    const perf = this.debug.getPerformanceMonitor();
    perf.beginFrame(dt);

    this.state.elapsed += dt;

    const lostPointerLock = this.prevPointerLocked && !this.input.pointerLocked;
    if (lostPointerLock && this.state.mode === 'playing' && this.state.progression.missionStatus !== 'clearSequence') {
      this.resumeRequested = false;
      this.missionSystem.pauseForUnlock();
    }

    if (this.resumeRequested && this.state.mode === 'paused' && this.input.pointerLocked) {
      this.resumeRequested = false;
      this.missionSystem.resumePlay();
    }

    if (this.state.mode !== 'paused' && this.resumeRequested) {
      this.resumeRequested = false;
    }

    const previousScreenMode = this.previousBgmScreenMode ?? this.getBgmScreenMode(this.state.mode);
    this.prevPointerLocked = this.input.pointerLocked;

    perf.measure('debug', () => this.debug.update(this));

    if (this.state.mode === 'playing') {
      perf.measure('mission', () => this.missionSystem.update(dt));
      perf.measure('player', () => this.playerSystem.update(dt));
      perf.measure('weapons', () => this.weapons.update(dt));
      perf.measure('enemies', () => this.enemies.update(dt));
      perf.measure('projectiles', () => this.projectiles.update(dt));
      perf.measure('rewards', () => this.rewards.update(dt));
      perf.measure('gimmicks', () => this.stageGimmicks.update(dt));
      perf.measure('effects', () => this.effects.update(dt));
      perf.measure('world', () => this.world.update(dt));
    } else if (this.state.mode === 'gameoverSequence') {
      perf.measure('playerGameOver', () => {
        if (this.playerSystem.updateGameOverSequence(dt)) {
          this.missionSystem.completeGameOverSequence();
        }
      });
      perf.measure('effects', () => this.effects.update(dt));
      perf.measure('world', () => this.world.update(dt));
    } else if (this.state.mode !== 'paused' && this.state.mode !== 'gameover') {
      perf.measure('effects', () => this.effects.update(dt));
      perf.measure('world', () => this.world.update(dt));
    }

    const nextScreenMode = this.getBgmScreenMode(this.state.mode);
    this.stopBgmOnScreenTransition(previousScreenMode, nextScreenMode);

    perf.measure('audioSync', () => this.syncAudioState());

    if (this.state.mode !== 'gameover') perf.measure('camera', () => this.cameraRig.update(this, dt));
    perf.measure('ui', () => this.ui.update(dt));
    perf.measure('render', () => this.renderer.render());
    perf.measure('inputEndFrame', () => this.input.endFrame());

    perf.endFrame(this);
    this.debug.ingestPerformanceFrame(this);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.resumeRequested = false;
    if (this.frameRequestId) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = 0;
    }

    this.unbindCanvas();
    this.input?.releasePointerLock?.();

    this.ui?.dispose?.();
    this.audio?.dispose?.();
    this.debug?.dispose?.();

    this.stageGimmicks?.clear?.();
    this.store?.reset?.();
    this.world?.clearWorld?.();

    this.renderer?.dispose?.();
    this.input?.dispose?.();
  }

}

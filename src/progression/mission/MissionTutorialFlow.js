import * as Shared from '../MissionSystemShared.js';

const {
  angleWrap,
  clamp,
  translate,
  TUTORIAL_STEP_COUNT,
} = Shared;

export function installMissionTutorialFlow(MissionSystem) {
  MissionSystem.prototype.resetTutorialState = function resetTutorialState() {
    const tutorial = this.game.state.progression.tutorial;
    tutorial.active = false;
    tutorial.totalSteps = 0;
    tutorial.stepIndex = -1;
    tutorial.stepTitle = '';
    tutorial.objective = '';
    tutorial.progressText = '';
    tutorial.enemyIds = [];
    tutorial.moveDistance = 0;
    tutorial.lookTravel = 0;
    tutorial.stepElapsed = 0;
    tutorial.startCrystals = 0;
    tutorial.requiredCrystals = 0;
    tutorial.primaryUsed = false;
    tutorial.plasmaUsed = false;
    tutorial.lastX = this.game.state.player.x;
    tutorial.lastZ = this.game.state.player.z;
    tutorial.lastYaw = this.game.state.player.yaw;
    tutorial.lastPitch = this.game.state.player.pitch;
  }

  MissionSystem.prototype.getTutorialEnemies = function getTutorialEnemies() {
    const enemyIds = new Set(this.game.state.progression.tutorial.enemyIds ?? []);
    return this.game.store.enemies.filter((enemy) => enemyIds.has(enemy.id));
  }

  MissionSystem.prototype.resolveTutorialSpawnPosition = function resolveTutorialSpawnPosition(position, stepIndex) {
    const player = this.game.state.player;
    const offsetStep = Math.max(0, Number(stepIndex) - 1);
    const bearingOffset = (Math.PI / 3) * offsetStep;
    const effectiveYaw = angleWrap((player.yaw || 0) - bearingOffset);
    const rightX = Math.cos(effectiveYaw);
    const rightZ = -Math.sin(effectiveYaw);
    const forwardX = -Math.sin(effectiveYaw);
    const forwardZ = -Math.cos(effectiveYaw);
    const localX = Number(position?.x) || 0;
    const localZ = Number(position?.z) || 0;
    return {
      x: player.x + (rightX * localX) + (forwardX * -localZ),
      z: player.z + (rightZ * localX) + (forwardZ * -localZ),
    };
  }

  MissionSystem.prototype.spawnTutorialEnemy = function spawnTutorialEnemy(typeKey, position, { hp = null, frozen = false, cooldown = null } = {}) {
    const spawnPosition = this.resolveTutorialSpawnPosition(position, this.game.state.progression.tutorial.stepIndex);
    const enemy = this.game.enemies.spawnEnemy(typeKey, spawnPosition);
    this.game.enemies.finishSpawnIntro?.(enemy);
    if (Number.isFinite(hp)) {
      enemy.hp = hp;
      enemy.maxHp = hp;
    }
    if (Number.isFinite(cooldown)) enemy.cooldown = cooldown;
    if (frozen) {
      enemy.tutorialFrozen = true;
      enemy.cooldown = Math.max(enemy.cooldown, 9999);
    }
    this.game.state.progression.tutorial.enemyIds.push(enemy.id);
    return enemy;
  }

  MissionSystem.prototype.enterTutorialStep = function enterTutorialStep(stepIndex) {
    const { state } = this.game;
    const tutorial = state.progression.tutorial;
    tutorial.active = true;
    tutorial.totalSteps = TUTORIAL_STEP_COUNT;
    tutorial.stepIndex = stepIndex;
    tutorial.enemyIds = [];
    tutorial.moveDistance = 0;
    tutorial.lookTravel = 0;
    tutorial.stepElapsed = 0;
    tutorial.startCrystals = state.crystals;
    tutorial.requiredCrystals = 0;
    tutorial.primaryUsed = false;
    tutorial.plasmaUsed = false;
    tutorial.lastX = state.player.x;
    tutorial.lastZ = state.player.z;
    tutorial.lastYaw = state.player.yaw;
    tutorial.lastPitch = state.player.pitch;
    state.progression.wave = stepIndex + 1;
    state.progression.waveTarget = TUTORIAL_STEP_COUNT;
    state.player.health = state.player.maxHealth;
    state.player.primaryCooldown = 0;
    state.player.plasmaCooldown = 0;
    this.game.projectiles.clearEnemyProjectiles();
    this.game.store.clearCombatEntities();
    this.game.enemies.clearEncounterRuntimeState();

    if (stepIndex === 0) {
      tutorial.stepTitle = translate(this.game, 'tutorial.step1Title');
      tutorial.objective = translate(this.game, 'tutorial.step1Objective');
      tutorial.progressText = translate(this.game, 'tutorial.step1Progress', { move: 0, look: 0 });
      this.setNotice(translate(this.game, 'tutorial.basicFlight'), 1.1);
      return;
    }

    if (stepIndex === 1) {
      tutorial.stepTitle = translate(this.game, 'tutorial.step2Title');
      tutorial.objective = translate(this.game, 'tutorial.step2Objective');
      tutorial.progressText = translate(this.game, 'tutorial.step2Progress', { count: 2, plural: 'S' });
      this.spawnTutorialEnemy('tutorialTarget', { x: -8, z: -30 }, { hp: 10, frozen: true });
      this.spawnTutorialEnemy('tutorialTarget', { x: 8, z: -30 }, { hp: 10, frozen: true });
      this.setNotice(translate(this.game, 'tutorial.primaryFire'), 1.1);
      return;
    }

    if (stepIndex === 2) {
      tutorial.stepTitle = translate(this.game, 'tutorial.step3Title');
      tutorial.objective = translate(this.game, 'tutorial.step3Objective');
      tutorial.progressText = translate(this.game, 'tutorial.step3ProgressReady');
      this.spawnTutorialEnemy('tutorialTarget', { x: -1.9, z: -28 }, { hp: 12, frozen: true });
      this.spawnTutorialEnemy('tutorialTarget', { x: 0, z: -28 }, { hp: 12, frozen: true });
      this.spawnTutorialEnemy('tutorialTarget', { x: 1.9, z: -28 }, { hp: 12, frozen: true });
      this.setNotice(translate(this.game, 'tutorial.plasmaBurst'), 1.1);
      return;
    }

    if (stepIndex === 3) {
      tutorial.stepTitle = translate(this.game, 'tutorial.step4Title');
      tutorial.objective = translate(this.game, 'tutorial.step4Objective');
      tutorial.requiredCrystals = 1;
      tutorial.progressText = translate(this.game, 'tutorial.step4Progress', { collected: 0, required: 1 });
      this.spawnTutorialEnemy('scarab', { x: 0, z: -26 }, { hp: 18, cooldown: 1.0 });
      this.setNotice(translate(this.game, 'tutorial.combatAndLoot'), 1.1);
      return;
    }

    tutorial.active = false;
    this.handleMissionClear();
  }

  MissionSystem.prototype.updateTutorial = function updateTutorial(dt) {
    const { state } = this.game;
    const tutorial = state.progression.tutorial;
    if (!tutorial.active) return;

    tutorial.stepElapsed += dt;
    tutorial.primaryUsed = tutorial.primaryUsed || state.player.primaryCooldown > 0.0001;
    tutorial.plasmaUsed = tutorial.plasmaUsed || state.player.plasmaCooldown > 0.0001;

    const dx = state.player.x - tutorial.lastX;
    const dz = state.player.z - tutorial.lastZ;
    tutorial.moveDistance += Math.hypot(dx, dz);
    tutorial.lookTravel += Math.abs(state.player.yaw - tutorial.lastYaw) + (Math.abs(state.player.pitch - tutorial.lastPitch) * 1.4);
    tutorial.lastX = state.player.x;
    tutorial.lastZ = state.player.z;
    tutorial.lastYaw = state.player.yaw;
    tutorial.lastPitch = state.player.pitch;

    if (tutorial.stepIndex === 0) {
      const moveRatio = clamp(tutorial.moveDistance / 18, 0, 1);
      const lookRatio = clamp(tutorial.lookTravel / 0.65, 0, 1);
      tutorial.progressText = translate(this.game, 'tutorial.step1Progress', { move: Math.round(moveRatio * 100), look: Math.round(lookRatio * 100) });
      if (moveRatio >= 1 && lookRatio >= 1) this.enterTutorialStep(1);
      return;
    }

    if (tutorial.stepIndex === 1) {
      const remaining = this.getTutorialEnemies().length;
      tutorial.progressText = translate(this.game, 'tutorial.step2Progress', { count: remaining, plural: remaining === 1 ? '' : 'S' });
      if (tutorial.primaryUsed && remaining <= 0) this.enterTutorialStep(2);
      return;
    }

    if (tutorial.stepIndex === 2) {
      const remaining = this.getTutorialEnemies().length;
      tutorial.progressText = tutorial.plasmaUsed
        ? translate(this.game, 'tutorial.step3ProgressDone', { count: remaining, plural: remaining === 1 ? '' : 'S' })
        : translate(this.game, 'tutorial.step3ProgressReady');
      if (tutorial.plasmaUsed && remaining <= 0) this.enterTutorialStep(3);
      return;
    }

    if (tutorial.stepIndex === 3) {
      const remaining = this.getTutorialEnemies().length;
      const collected = Math.max(0, state.crystals - tutorial.startCrystals);
      tutorial.progressText = translate(this.game, 'tutorial.step4Progress', { collected, required: tutorial.requiredCrystals });
      if (remaining <= 0 && collected >= tutorial.requiredCrystals) {
        tutorial.active = false;
        this.handleMissionClear();
      }
    }
  }

}

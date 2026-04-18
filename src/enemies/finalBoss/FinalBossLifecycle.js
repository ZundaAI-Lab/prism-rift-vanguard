import * as Shared from '../FinalBossSystemShared.js';

const {
  THREE,
  ENEMY_LIBRARY,
  randRange,
  detachAndDispose,
  translate,
  VOID_REINFORCEMENT_INTERVAL,
} = Shared;

export function installFinalBossLifecycle(FinalBossSystem) {
  FinalBossSystem.prototype.setupBoss = function setupBoss(enemy) {
    if (enemy.finalBoss) return;
    if (enemy.def.behavior !== 'boss_final_fortress' && enemy.def.behavior !== 'boss_final_fighter') return;

    if (enemy.def.behavior === 'boss_final_fortress') {
      enemy.finalBoss = {
        form: 'fortress',
        state: 'intro',
        introTime: 0,
        transformTime: 0,
        cueIndex: 0,
        volleyIndex: 0,
        dashCooldown: 0,
        dashTime: 0,
        dashSpeed: 0,
        dashDir: new THREE.Vector3(),
        orbitAngle: Math.random() * Math.PI * 2,
        reinforcementTimer: VOID_REINFORCEMENT_INTERVAL,
        phaseOneDownPosition: new THREE.Vector3(),
        fighterIntroStart: new THREE.Vector3(),
        fighterIntroEnd: new THREE.Vector3(),
        fortressAttackStarted: false,
      };
      delete enemy.uiHpRatioOverride;
      enemy.invulnerable = true;
      enemy.introDone = false;
      enemy.cooldown = 999;
      enemy.mesh.position.set(0, this.getVoidFortressHoverY(enemy) + 68, 0);
      enemy.mesh.rotation.set(0, Math.PI, 0);
      enemy.localVelocity.set(0, 0, 0);
    } else {
      enemy.finalBoss = {
        form: 'fighter',
        state: 'fighter',
        introTime: 0,
        transformTime: 0,
        cueIndex: 3,
        volleyIndex: 0,
        dashCooldown: 1.6,
        dashTime: 0,
        dashSpeed: 0,
        dashDir: new THREE.Vector3(),
        orbitAngle: Math.random() * Math.PI * 2,
        mode: 'throne',
        modeTime: 0,
        modeDuration: 2.8,
        modeIndex: 0,
        sideSign: Math.random() < 0.5 ? -1 : 1,
        closeBurstFired: false,
        runThrough: false,
        modeShots: 0,
        modeTriggered: false,
        focus: new THREE.Vector3(),
        anchor: new THREE.Vector3(),
        anchorB: new THREE.Vector3(),
        anchorC: new THREE.Vector3(),
        phaseOneDownPosition: enemy.mesh.position.clone(),
        fighterIntroStart: enemy.mesh.position.clone(),
        fighterIntroEnd: enemy.mesh.position.clone(),
      };
      delete enemy.uiHpRatioOverride;
      enemy.invulnerable = false;
      enemy.introDone = true;
    }
  }

  FinalBossSystem.prototype.interceptLethal = function interceptLethal(enemy) {
    if (!this.isFinalBoss(enemy)) return false;
    this.setupBoss(enemy);
    const data = enemy.finalBoss;
    if (data.form !== 'fortress') return false;
    if (data.state !== 'fortress') return true;

    data.phaseOneDownPosition = data.phaseOneDownPosition || new THREE.Vector3();
    data.phaseOneDownPosition.copy(enemy.mesh.position);
    data.state = 'transition';
    data.transformTime = 0;
    enemy.invulnerable = true;
    this.clearVoidFortressSummons();
    enemy.hp = Math.max(1, enemy.maxHp * 0.04);
    enemy.uiHpRatioOverride = 0;
    enemy.cooldown = 999;
    this.clearEnemyProjectiles();
    this.game.stageGimmicks.eventTimer = Math.min(this.game.stageGimmicks.eventTimer, 0.55);
    this.game.bus?.emit('ui:notice', { text: translate(this.game, 'notices.ironThroneDown'), seconds: 1.5 });
    this.game.audio?.fadeOutAndHoldAutoBgm({ durationMs: 700, silenceAfterFadeMs: 3000, mode: 'playing' });
    this.game.audio?.playSfx('bossPhaseChange', { cooldownMs: 400, worldPosition: enemy.mesh.position });
    this.game.effects.spawnExplosion(enemy.mesh.position.clone(), 0xffb784, 3.8);
    this.game.effects.spawnShockwave(enemy.mesh.position.clone().setY(this.game.world.getHeight(enemy.mesh.position.x, enemy.mesh.position.z) + 0.1), 0xff6bd4, 10.5);
    return true;
  }

  FinalBossSystem.prototype.update = function update(enemy, dt) {
    this.setupBoss(enemy);
    const data = enemy.finalBoss;
    if (!data) return;
    if (data.state === 'intro') this.updateFortressIntro(enemy, dt);
    else if (data.state === 'fortress') this.updateFortress(enemy, dt);
    else if (data.state === 'transition') this.updateTransition(enemy, dt);
    else if (data.state === 'fighterIntro') this.updateFighterIntro(enemy, dt);
    else if (data.state === 'fighter') this.updateFighter(enemy, dt);
  }

  FinalBossSystem.prototype.updateTransition = function updateTransition(enemy, dt) {
    const data = enemy.finalBoss;
    data.transformTime += dt;
    enemy.mesh.rotation.y += dt * 0.95;
    enemy.mesh.rotation.z = Math.sin(data.transformTime * 8.5) * 0.12;
    enemy.mesh.scale.setScalar(Math.max(0.28, 1 - data.transformTime * 0.14));
    enemy.mesh.position.y += Math.sin(data.transformTime * 12.0) * 0.07;

    if (Math.floor(data.transformTime * 8) !== Math.floor((data.transformTime - dt) * 8)) {
      this.game.effects.spawnExplosion(enemy.mesh.position.clone().add(new THREE.Vector3(randRange(-6, 6), randRange(-4, 4), randRange(-6, 6))), data.transformTime < 1.5 ? 0xffb784 : 0x6fc8ff, data.transformTime < 1.5 ? 1.6 : 1.2);
    }

    if (data.transformTime > 2.4 && data.state === 'transition') {
      this.swapToFighter(enemy);
      data.state = 'fighterIntro';
      data.introTime = 0;
      this.game.bus?.emit('ui:notice', { text: translate(this.game, 'notices.seraphWraith'), seconds: 2.2 });
      this.game.audio?.playSfx('finalFormShift', { cooldownMs: 500, worldPosition: enemy.mesh.position });
    }
  }

  FinalBossSystem.prototype.swapToFighter = function swapToFighter(enemy) {
    const parent = enemy.mesh.parent;
    const oldPos = enemy.mesh.position.clone();
    const oldRot = enemy.mesh.rotation.clone();
    const fighterIntroStart = enemy.finalBoss.phaseOneDownPosition?.clone() ?? oldPos.clone();
    const fighterIntroEnd = this.getFighterIntroEnd(enemy, fighterIntroStart);
    detachAndDispose(enemy.mesh);

    const def = ENEMY_LIBRARY.voidFighter;
    enemy.def = def;
    enemy.typeKey = 'voidFighter';
    enemy.maxHp = def.hp;
    enemy.hp = def.hp;
    delete enemy.uiHpRatioOverride;
    enemy.cooldown = 999;
    enemy.mesh = this.game.enemies.factory.createMesh(def);
    enemy.mesh.position.copy(fighterIntroStart);
    enemy.mesh.rotation.copy(oldRot);
    enemy.mesh.scale.setScalar(1.0);
    parent?.add(enemy.mesh);
    enemy.invulnerable = true;
    enemy.introDone = true;
    enemy.finalBoss.form = 'fighter';
    enemy.finalBoss.dashCooldown = 1.4;
    enemy.finalBoss.dashTime = 0;
    enemy.finalBoss.volleyIndex = 0;
    enemy.finalBoss.mode = 'throne';
    enemy.finalBoss.modeTime = 0;
    enemy.finalBoss.modeDuration = 2.8;
    enemy.finalBoss.modeIndex = 0;
    enemy.finalBoss.sideSign = enemy.finalBoss.sideSign || (Math.random() < 0.5 ? -1 : 1);
    enemy.finalBoss.closeBurstFired = false;
    enemy.finalBoss.runThrough = false;
    enemy.finalBoss.modeShots = 0;
    enemy.finalBoss.modeTriggered = false;
    enemy.finalBoss.orbitAngle = Math.random() * Math.PI * 2;
    enemy.finalBoss.focus = enemy.finalBoss.focus || new THREE.Vector3();
    enemy.finalBoss.anchor = enemy.finalBoss.anchor || new THREE.Vector3();
    enemy.finalBoss.anchorB = enemy.finalBoss.anchorB || new THREE.Vector3();
    enemy.finalBoss.anchorC = enemy.finalBoss.anchorC || new THREE.Vector3();
    enemy.finalBoss.phaseOneDownPosition = enemy.finalBoss.phaseOneDownPosition || new THREE.Vector3();
    enemy.finalBoss.phaseOneDownPosition.copy(fighterIntroStart);
    enemy.finalBoss.fighterIntroStart = enemy.finalBoss.fighterIntroStart || new THREE.Vector3();
    enemy.finalBoss.fighterIntroStart.copy(fighterIntroStart);
    enemy.finalBoss.fighterIntroEnd = enemy.finalBoss.fighterIntroEnd || new THREE.Vector3();
    enemy.finalBoss.fighterIntroEnd.copy(fighterIntroEnd);
    enemy.localVelocity.set(0, 0, 0);
    this.clearEnemyProjectiles();
    this.game.effects.spawnShockwave(fighterIntroStart.clone().setY(this.game.world.getHeight(fighterIntroStart.x, fighterIntroStart.z) + 0.2), 0x76c2ff, 12.5);
  }

}

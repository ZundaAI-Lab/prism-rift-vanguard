import * as Shared from '../FinalBossSystemShared.js';

const {
  translate,
  TARGET_DIR,
  SIDE,
  UP,
  PREV,
  DESIRED,
  TEMP,
  START,
  END,
  LOOK_TARGET,
  INTRO_TILT_QUAT,
  VOID_REINFORCEMENT_INTERVAL,
  easeInOut,
} = Shared;

export function installFinalBossFortressPhase(FinalBossSystem) {
  FinalBossSystem.prototype.updateFortressIntro = function updateFortressIntro(enemy, dt) {
    const data = enemy.finalBoss;
    data.introTime += dt;
    const targetY = this.getVoidFortressHoverY(enemy);
    START.set(0, targetY + 72, 0);
    END.set(0, targetY, 0);
    const t = easeInOut(Math.min(1, data.introTime / 12.2));
    enemy.mesh.position.lerpVectors(START, END, t);
    this.updateFortressIntroPose(enemy, data.introTime);

    if (data.cueIndex === 0 && data.introTime > 0.2) {
      data.cueIndex = 1;
      this.game.bus?.emit('ui:notice', { text: translate(this.game, 'notices.finalMission'), seconds: 4, options: { fadeInDuration: 2, fadeOutDuration: 1.1 } });
      this.game.audio?.playSfx('bossIntro', { cooldownMs: 500, worldPosition: enemy.mesh.position });
    }
    if (data.cueIndex === 1 && data.introTime > 4.2) {
      data.cueIndex = 2;
      this.game.bus?.emit('ui:notice', { text: translate(this.game, 'notices.voidCrown'), seconds: 4, options: { fadeInDuration: 2, fadeOutDuration: 1.1 } });
    }
    if (data.cueIndex === 2 && data.introTime > 8.2) {
      data.cueIndex = 3;
      this.game.bus?.emit('ui:notice', { text: translate(this.game, 'notices.ironThroneAwakens'), seconds: 4, options: { fadeInDuration: 2, fadeOutDuration: 1.1 } });
      this.game.effects.spawnShockwave(enemy.mesh.position.clone().setY(this.getVoidDaisTopY() + 0.2), 0xffb784, 11.0);
    }
    if (data.introTime >= 12.2) {
      data.state = 'fortress';
      enemy.invulnerable = false;
      enemy.introDone = true;
      enemy.cooldown = 0.42;
      // this.game.bus?.emit('ui:notice', { text: 'THE SKY WILL NOT KNEEL', seconds: 2.0 });
    }
  }

  FinalBossSystem.prototype.updateFortress = function updateFortress(enemy, dt) {
    const data = enemy.finalBoss;
    PREV.copy(enemy.mesh.position);
    enemy.phase += dt;

    const playerPos = this.game.store.playerMesh.position;
    const hpRatio = enemy.hp / enemy.maxHp;
    const phaseTier = hpRatio <= 0.25 ? 2 : hpRatio <= 0.5 ? 1 : 0;

    TARGET_DIR.copy(playerPos).sub(enemy.mesh.position).normalize();
    SIDE.crossVectors(TARGET_DIR, UP).normalize();

    data.orbitAngle = (data.orbitAngle || 0) + dt * (0.22 + phaseTier * 0.04);
    data.reinforcementTimer = Math.max(0, (data.reinforcementTimer ?? VOID_REINFORCEMENT_INTERVAL) - dt);
    if (data.reinforcementTimer <= 0) {
      data.reinforcementTimer += VOID_REINFORCEMENT_INTERVAL;
      this.trySpawnVoidFortressReinforcement(enemy);
    }

    const radius = phaseTier === 2 ? 9.0 : phaseTier === 1 ? 11.5 : 14.0;
    const baseHeight = this.getVoidFortressHoverY(enemy);
    DESIRED.set(
      Math.cos(data.orbitAngle) * radius,
      baseHeight + Math.sin(enemy.phase * 0.8) * 0.9,
      Math.sin(data.orbitAngle) * radius,
    );
    enemy.mesh.position.lerp(DESIRED, dt * (1.45 + phaseTier * 0.18));
    LOOK_TARGET.set(playerPos.x, enemy.mesh.position.y - 2.2, playerPos.z);
    this.lookAtUpright(enemy, LOOK_TARGET, 0.28);
    enemy.mesh.rotation.z = Math.sin(enemy.phase * 0.7) * 0.04;
    enemy.localVelocity.copy(enemy.mesh.position).sub(PREV).multiplyScalar(1 / Math.max(dt, 0.001));

    enemy.cooldown -= dt;
    if (enemy.cooldown > 0) return;

    if (!data.fortressAttackStarted) data.fortressAttackStarted = true;
    const volley = data.volleyIndex++ % (phaseTier === 2 ? 5 : 4);
    if (phaseTier === 0) {
      if (volley % 2 === 0) this.fireFortressCurtain(enemy, 13, 0.09, 0xffc784, 0.7, enemy.def.bulletDamage + 4, { speed: enemy.def.bulletSpeed + 8, showBulletRatio: 0.16, highShowBulletRatio: 0.22 });
      else this.fireFortressNova(enemy, 18, 0xff67c8, 0.56, enemy.def.bulletDamage + 2, { speed: enemy.def.bulletSpeed - 6, showBulletRatio: 0.18, highShowBulletRatio: 0.26, verticalBias: 0.08 });
      enemy.cooldown = 0.78;
      return;
    }
    if (phaseTier === 1) {
      if (volley === 0) this.fireFortressCurtain(enemy, 17, 0.082, 0xffc784, 0.72, enemy.def.bulletDamage + 5, { speed: enemy.def.bulletSpeed + 10, showBulletRatio: 0.18, highShowBulletRatio: 0.24 });
      else if (volley === 1) this.fireFortressLances(enemy, 5, 0xffefbe, 0.5, enemy.def.bulletDamage + 4);
      else if (volley === 2) this.fireFortressMortars(enemy, 4, 0xff875a, 0.88, enemy.def.bulletDamage + 2, { splashRadius: 6.5, splashDamage: enemy.def.bulletDamage + 6, speed: enemy.def.bulletSpeed - 18 });
      else this.fireFortressNova(enemy, 24, 0xff67c8, 0.56, enemy.def.bulletDamage + 3, { speed: enemy.def.bulletSpeed - 4, showBulletRatio: 0.2, highShowBulletRatio: 0.28, verticalBias: 0.1 });
      enemy.cooldown = 0.58;
      return;
    }

    if (volley === 0) this.fireFortressCurtain(enemy, 21, 0.07, 0xffc784, 0.76, enemy.def.bulletDamage + 6, { speed: enemy.def.bulletSpeed + 14, showBulletRatio: 0.2, highShowBulletRatio: 0.28 });
    else if (volley === 1) this.fireFortressLances(enemy, 7, 0xffffff, 0.48, enemy.def.bulletDamage + 5, { speed: enemy.def.bulletSpeed + 18, life: 4.4 });
    else if (volley === 2) this.fireFortressMortars(enemy, 6, 0xff8b63, 0.92, enemy.def.bulletDamage + 3, { splashRadius: 7.4, splashDamage: enemy.def.bulletDamage + 8, speed: enemy.def.bulletSpeed - 14 });
    else if (volley === 3) this.fireFortressNova(enemy, 30, 0xff67c8, 0.58, enemy.def.bulletDamage + 4, { speed: enemy.def.bulletSpeed - 2, showBulletRatio: 0.22, highShowBulletRatio: 0.32, verticalBias: 0.12 });
    else {
      this.fireFortressCurtain(enemy, 15, 0.088, 0xffefbe, 0.46, enemy.def.bulletDamage + 3, { speed: enemy.def.bulletSpeed + 24, life: 3.8, showBulletRatio: 0.18, highShowBulletRatio: 0.24 });
      this.fireFortressCurtain(enemy, 15, 0.088, 0xff9a66, 0.46, enemy.def.bulletDamage + 3, { speed: enemy.def.bulletSpeed + 12, life: 4.2, showBulletRatio: 0.16, highShowBulletRatio: 0.22 });
    }
    enemy.cooldown = 0.38;
  }

  FinalBossSystem.prototype.updateFortressIntroPose = function updateFortressIntroPose(enemy, introTime) {
    const playerPos = this.game.store.playerMesh.position;
    const pitch = Math.sin(introTime * 0.9) * 0.04;
    LOOK_TARGET.set(playerPos.x, enemy.mesh.position.y - 2.2, playerPos.z);
    this.lookAtUpright(enemy, LOOK_TARGET, 0.28);
    INTRO_TILT_QUAT.setFromAxisAngle(TEMP.set(1, 0, 0), pitch);
    enemy.mesh.quaternion.multiply(INTRO_TILT_QUAT);
  }

}

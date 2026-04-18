import * as Shared from '../FinalBossSystemShared.js';

const {
  THREE,
  lerp,
  SIDE,
  PREV,
  DESIRED,
  ORBIT,
  LOOK_TARGET,
  easeInOut,
} = Shared;

export function installFinalBossFighterPhase(FinalBossSystem) {
  FinalBossSystem.prototype.updateFighterIntro = function updateFighterIntro(enemy, dt) {
    const data = enemy.finalBoss;
    data.introTime += dt;
    const t = easeInOut(Math.min(1, data.introTime / 2.1));
    const start = data.fighterIntroStart || enemy.mesh.position;
    const end = data.fighterIntroEnd || this.getFighterIntroEnd(enemy, start);
    enemy.mesh.position.lerpVectors(start, end, t);
    enemy.mesh.rotation.z = lerp(-0.7, 0, t);
    enemy.mesh.rotation.x = lerp(0.35, 0, t);
    enemy.mesh.rotation.y = Math.PI + Math.sin(data.introTime * 8.0) * 0.04;
    if (data.introTime >= 2.1) {
      data.state = 'fighter';
      enemy.invulnerable = false;
      enemy.cooldown = 0.32;
      data.focus.copy(this.game.store.playerMesh.position);
      this.chooseNextFighterMode(enemy, 0, true);
      this.game.effects.spawnExplosion(enemy.mesh.position.clone(), 0x76c2ff, 2.2);
    }
  }

  FinalBossSystem.prototype.getFighterIntroEnd = function getFighterIntroEnd(enemy, startPosition) {
    const target = startPosition.clone();
    const planar = Math.hypot(target.x, target.z);
    if (planar < 18) {
      if (planar > 0.0001) {
        target.x *= 18 / planar;
        target.z *= 18 / planar;
      } else {
        target.z = -18;
      }
    }
    return this.placeFighterPoint(enemy, target, 0.8);
  }

  FinalBossSystem.prototype.updateFighter = function updateFighter(enemy, dt) {
    PREV.copy(enemy.mesh.position);
    enemy.phase += dt;
    enemy.cooldown -= dt;
    const data = enemy.finalBoss;
    const playerPos = this.game.store.playerMesh.position;
    const hpRatio = enemy.hp / enemy.maxHp;
    const phaseTier = hpRatio <= 0.25 ? 2 : hpRatio <= 0.5 ? 1 : 0;

    this.computeAim(enemy);
    data.orbitAngle = (data.orbitAngle || 0) + dt * (0.58 + phaseTier * 0.08);
    data.modeTime = (data.modeTime || 0) + dt;
    data.focus = data.focus || new THREE.Vector3();
    data.focus.lerp(playerPos, THREE.MathUtils.clamp(dt * (0.7 + phaseTier * 0.08), 0, 1));

    if (!data.mode || data.modeTime >= (data.modeDuration || 0)) {
      this.chooseNextFighterMode(enemy, phaseTier);
    }

    this.updateFighterMovement(enemy, dt, phaseTier);

    this.computeAim(enemy);
    LOOK_TARGET.set(playerPos.x, playerPos.y + 1.1, playerPos.z);
    this.lookAtUpright(enemy, LOOK_TARGET, 0.52);
    const basePitch = enemy.mesh.rotation.x;
    const lateralSpeed = enemy.localVelocity.dot(SIDE);
    enemy.mesh.rotation.z = THREE.MathUtils.clamp(-lateralSpeed * 0.0062, -0.68, 0.68) + Math.sin(enemy.phase * 4.8) * 0.035;
    enemy.mesh.rotation.x = basePitch + THREE.MathUtils.clamp(-enemy.localVelocity.y * 0.0045, -0.16, 0.16) + Math.cos(enemy.phase * 3.2) * 0.025;

    if (enemy.cooldown <= 0) {
      this.fireFighterPatternByMode(enemy, phaseTier);
    }
  }

  FinalBossSystem.prototype.chooseNextFighterMode = function chooseNextFighterMode(enemy, phaseTier, force = false) {
    const data = enemy.finalBoss;
    const sequences = [
      ['throne', 'sweep', 'lance', 'cage', 'breakaway'],
      ['throne', 'lance', 'sweep', 'cage', 'lance', 'breakaway'],
      ['lance', 'cage', 'sweep', 'lance', 'throne', 'breakaway', 'sweep'],
    ];
    const sequence = sequences[Math.min(2, phaseTier)];
    if (force && !data.modeIndex) data.modeIndex = Math.floor(Math.random() * sequence.length);
    const mode = sequence[data.modeIndex % sequence.length];
    data.modeIndex += 1;
    data.mode = mode;
    data.modeTime = 0;
    data.sideSign = (data.sideSign || 1) * -1;
    data.closeBurstFired = false;
    data.runThrough = false;
    data.modeShots = 0;
    data.modeTriggered = false;
    data.modeDuration = this.getFighterModeDuration(mode, phaseTier);
    this.setupFighterModeRoute(enemy, phaseTier);
  }

  FinalBossSystem.prototype.getFighterModeDuration = function getFighterModeDuration(mode, phaseTier) {
    if (mode === 'lance') return 2.6 + phaseTier * 0.18;
    if (mode === 'sweep') return 3.0 + phaseTier * 0.22;
    if (mode === 'cage') return 2.8 + phaseTier * 0.18;
    if (mode === 'breakaway') return 2.2 + phaseTier * 0.15;
    return 2.9 + phaseTier * 0.2;
  }

  FinalBossSystem.prototype.updateFighterMovement = function updateFighterMovement(enemy, dt, phaseTier) {
    const data = enemy.finalBoss;
    const playerPos = this.game.store.playerMesh.position;
    const progress = THREE.MathUtils.clamp(data.modeTime / Math.max(0.01, data.modeDuration || 1), 0, 1);
    const mode = data.mode || 'throne';

    this.updatePlayerBasis();
    this.computeAim(enemy);

    if (mode === 'throne') {
      ORBIT.set(Math.cos(data.orbitAngle) * (7.5 + phaseTier * 0.8), Math.sin(enemy.phase * 2.0) * 1.1, Math.sin(data.orbitAngle) * (5.5 + phaseTier * 0.6));
      DESIRED.copy(data.anchor).add(ORBIT);
      this.enforceFighterSpacing(DESIRED, playerPos, 26 + phaseTier * 2);
      this.moveFighterTowards(enemy, this.placeFighterPoint(enemy, DESIRED, 0), dt, 2.5 + phaseTier * 0.22);
    } else if (mode === 'sweep') {
      DESIRED.lerpVectors(data.anchor, data.anchorB, easeInOut(progress));
      DESIRED.y += Math.sin(progress * Math.PI * 2.0) * 1.1;
      this.enforceFighterSpacing(DESIRED, playerPos, 24 + phaseTier * 2);
      this.moveFighterTowards(enemy, this.placeFighterPoint(enemy, DESIRED, 0.6), dt, 3.3 + phaseTier * 0.3);
    } else if (mode === 'lance') {
      if (progress < 0.36) DESIRED.copy(data.anchor);
      else if (progress < 0.72) DESIRED.lerpVectors(data.anchor, data.anchorB, easeInOut((progress - 0.36) / 0.36));
      else DESIRED.lerpVectors(data.anchorB, data.anchorC, easeInOut((progress - 0.72) / 0.28));
      DESIRED.y += Math.sin(enemy.phase * 3.8) * 0.6;
      this.enforceFighterSpacing(DESIRED, playerPos, progress < 0.5 ? 21 + phaseTier * 1.5 : 26 + phaseTier * 2);
      this.moveFighterTowards(enemy, this.placeFighterPoint(enemy, DESIRED, -0.2), dt, progress < 0.72 ? 4.8 + phaseTier * 0.45 : 4.1 + phaseTier * 0.35);
    } else if (mode === 'cage') {
      ORBIT.set(Math.cos(data.orbitAngle * 0.72) * (6.0 + phaseTier), Math.sin(enemy.phase * 1.8) * 0.9, Math.sin(data.orbitAngle * 0.72) * (8.0 + phaseTier * 0.8));
      DESIRED.copy(data.anchor).add(ORBIT);
      this.enforceFighterSpacing(DESIRED, playerPos, 30 + phaseTier * 2.5);
      this.moveFighterTowards(enemy, this.placeFighterPoint(enemy, DESIRED, 1.2), dt, 2.8 + phaseTier * 0.24);
    } else {
      DESIRED.copy(data.anchor);
      DESIRED.x += Math.sin(enemy.phase * 1.9) * 3.4 * (data.sideSign || 1);
      DESIRED.z += Math.cos(enemy.phase * 1.6) * 2.6;
      this.enforceFighterSpacing(DESIRED, playerPos, 32 + phaseTier * 2.5);
      this.moveFighterTowards(enemy, this.placeFighterPoint(enemy, DESIRED, 1.6), dt, 3.0 + phaseTier * 0.26);
    }

    enemy.localVelocity.copy(enemy.mesh.position).sub(PREV).multiplyScalar(1 / Math.max(dt, 0.001));
  }

  FinalBossSystem.prototype.moveFighterTowards = function moveFighterTowards(enemy, desired, dt, responsiveness) {
    const alpha = 1 - Math.exp(-dt * responsiveness);
    enemy.mesh.position.lerp(desired, THREE.MathUtils.clamp(alpha, 0, 1));
  }

  FinalBossSystem.prototype.fireFighterPatternByMode = function fireFighterPatternByMode(enemy, phaseTier) {
    const data = enemy.finalBoss;
    const dist = enemy.mesh.position.distanceTo(this.game.store.playerMesh.position);
    const progress = THREE.MathUtils.clamp(data.modeTime / Math.max(0.01, data.modeDuration || 1), 0, 1);
    const mode = data.mode || 'throne';

    if (mode === 'throne') {
      const volley = data.volleyIndex++ % 3;
      if (volley === 0) this.fireFighterTwin(enemy, 2 + phaseTier, 0xffc878, 0.32, enemy.def.bulletDamage + 1 + phaseTier, { speed: enemy.def.bulletSpeed + 10, life: 3.8 });
      else if (volley === 1) this.fireFighterSpray(enemy, 7 + phaseTier * 2, 0.082, 0xffedd0, 0.28, enemy.def.bulletDamage + phaseTier, { speed: enemy.def.bulletSpeed + 5, life: 4.0, showBulletRatio: 0.4 });
      else this.fireFighterLance(enemy, 3 + phaseTier, 0x8fd2ff, 0.26, enemy.def.bulletDamage + 2 + phaseTier, { speed: enemy.def.bulletSpeed + 16, life: 3.2 });
      enemy.cooldown = 0.26 - phaseTier * 0.02;
      return;
    }

    if (mode === 'sweep') {
      if (progress > 0.38 && progress < 0.68 && !data.modeTriggered) {
        data.modeTriggered = true;
        this.fireFighterCross(enemy, phaseTier);
        enemy.cooldown = 0.34 - phaseTier * 0.02;
      } else {
        this.fireFighterSpray(enemy, 6 + phaseTier * 2, 0.09, 0xffb773, 0.28, enemy.def.bulletDamage + 1 + phaseTier, { speed: enemy.def.bulletSpeed + 8, life: 3.9, showBulletRatio: 0.4 });
        enemy.cooldown = 0.28 - phaseTier * 0.02;
      }
      return;
    }

    if (mode === 'lance') {
      if (progress < 0.34) {
        this.fireFighterTwin(enemy, 1 + phaseTier, 0xffdf9e, 0.3, enemy.def.bulletDamage + phaseTier, { speed: enemy.def.bulletSpeed + 8, life: 3.2 });
        enemy.cooldown = 0.24;
        return;
      }
      if (!data.modeTriggered) {
        data.modeTriggered = true;
        this.fireFighterLance(enemy, 4 + phaseTier, 0xffffff, 0.26, enemy.def.bulletDamage + 4 + phaseTier, { speed: enemy.def.bulletSpeed + 24, life: 3.1 });
        if (dist <= 28) this.fireFighterShotgun(enemy, 7 + phaseTier * 2, 0.1, 0xfff3d7, 0.32, enemy.def.bulletDamage + 3 + phaseTier, { speed: enemy.def.bulletSpeed + 18, life: 2.7, showBulletRatio: 0.4 });
        enemy.cooldown = 0.42;
        return;
      }
      this.fireFighterTwin(enemy, 2 + phaseTier, 0xffb95a, 0.3, enemy.def.bulletDamage + 1 + phaseTier, { speed: enemy.def.bulletSpeed + 12, life: 3.0 });
      enemy.cooldown = 0.3;
      return;
    }

    if (mode === 'cage') {
      const volley = data.volleyIndex++ % 2;
      if (volley === 0) this.fireFighterNova(enemy, 13 + phaseTier * 3, 0xffd38a, 0.32, enemy.def.bulletDamage + phaseTier, { speed: enemy.def.bulletSpeed - 2, life: 4.4, showBulletRatio: 0.4 });
      else this.fireFighterSpray(enemy, 9 + phaseTier * 2, 0.075, 0x9dd3ff, 0.28, enemy.def.bulletDamage + 1 + phaseTier, { speed: enemy.def.bulletSpeed + 6, life: 4.1, showBulletRatio: 0.4 });
      enemy.cooldown = 0.3 - phaseTier * 0.02;
      return;
    }

    if (dist >= 34) {
      this.fireFighterLance(enemy, 3 + phaseTier, 0xffffff, 0.26, enemy.def.bulletDamage + 3 + phaseTier, { speed: enemy.def.bulletSpeed + 22, life: 3.2 });
      enemy.cooldown = 0.28 - phaseTier * 0.02;
    } else {
      this.fireFighterSpray(enemy, 7 + phaseTier * 2, 0.085, 0xff9a66, 0.28, enemy.def.bulletDamage + 1 + phaseTier, { speed: enemy.def.bulletSpeed + 6, life: 4.1, showBulletRatio: 0.4 });
      enemy.cooldown = 0.26 - phaseTier * 0.02;
    }
  }

}

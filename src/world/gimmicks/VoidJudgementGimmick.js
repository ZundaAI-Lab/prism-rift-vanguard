import * as THREE from 'three';
import { clamp, randRange } from '../../utils/math.js';
import { detachAndDispose } from '../../utils/three-dispose.js';
import {
  PLAYER_XZ,
  TEMP_XZ,
  VOID_JUDGEMENT_PILLAR_TELEGRAPH_TIME,
  VOID_JUDGEMENT_PILLAR_IMPACT_TIME,
  VOID_JUDGEMENT_PILLAR_STAGGER,
  VOID_JUDGEMENT_RING_PULSE_START,
  VOID_JUDGEMENT_ARENA_LIMIT,
} from './StageGimmickShared.js';

export const voidJudgementGimmickMethods = {
getVoidJudgementLead(secondsAhead = 0) {
  const player = this.game.state.player;
  const speed = Math.hypot(player?.vx ?? 0, player?.vz ?? 0);
  const dirX = speed > 0.001 ? (player.vx / speed) : Math.sin(player?.yaw ?? 0);
  const dirZ = speed > 0.001 ? (player.vz / speed) : Math.cos(player?.yaw ?? 0);
  const targetX = clamp((player?.x ?? 0) + (player?.vx ?? 0) * secondsAhead, -VOID_JUDGEMENT_ARENA_LIMIT, VOID_JUDGEMENT_ARENA_LIMIT);
  const targetZ = clamp((player?.z ?? 0) + (player?.vz ?? 0) * secondsAhead, -VOID_JUDGEMENT_ARENA_LIMIT, VOID_JUDGEMENT_ARENA_LIMIT);
  return {
    x: targetX,
    z: targetZ,
    dirX,
    dirZ,
    speed,
    hasLead: speed >= 5,
  };
},

createVoidJudgementStrikePlan() {
  const baseLead = this.getVoidJudgementLead(VOID_JUDGEMENT_PILLAR_IMPACT_TIME);
  const idleAngle = randRange(0, Math.PI * 2);
  const forwardX = baseLead.hasLead ? baseLead.dirX : Math.cos(idleAngle);
  const forwardZ = baseLead.hasLead ? baseLead.dirZ : Math.sin(idleAngle);
  const sideX = -forwardZ;
  const sideZ = forwardX;
  const timings = [
    VOID_JUDGEMENT_PILLAR_IMPACT_TIME,
    VOID_JUDGEMENT_PILLAR_IMPACT_TIME + VOID_JUDGEMENT_PILLAR_STAGGER,
    VOID_JUDGEMENT_PILLAR_IMPACT_TIME + VOID_JUDGEMENT_PILLAR_STAGGER * 2,
  ];
  const leads = timings.map((secondsAhead) => this.getVoidJudgementLead(secondsAhead));
  const firstLead = leads[0];
  const secondLead = leads[1];
  const thirdLead = leads[2];
  const plan = [
    {
      x: firstLead.x + forwardX * randRange(-0.8, 0.8) + sideX * randRange(-1.2, 1.2),
      z: firstLead.z + forwardZ * randRange(-0.8, 0.8) + sideZ * randRange(-1.2, 1.2),
      startDelay: 0,
    },
    {
      x: secondLead.x + forwardX * randRange(-1.2, 1.8) + sideX * randRange(-6.4, -2.4),
      z: secondLead.z + forwardZ * randRange(-1.2, 1.8) + sideZ * randRange(-6.4, -2.4),
      startDelay: VOID_JUDGEMENT_PILLAR_STAGGER,
    },
    {
      x: thirdLead.x + forwardX * randRange(-0.8, 3.8) + sideX * randRange(2.4, 6.4),
      z: thirdLead.z + forwardZ * randRange(-0.8, 3.8) + sideZ * randRange(2.4, 6.4),
      startDelay: VOID_JUDGEMENT_PILLAR_STAGGER * 2,
    },
  ];

  return plan.map((point) => ({
    x: clamp(point.x, -VOID_JUDGEMENT_ARENA_LIMIT, VOID_JUDGEMENT_ARENA_LIMIT),
    z: clamp(point.z, -VOID_JUDGEMENT_ARENA_LIMIT, VOID_JUDGEMENT_ARENA_LIMIT),
    startDelay: point.startDelay,
  }));
},

spawnVoidJudgement() {
  const strikePlan = this.createVoidJudgementStrikePlan();
  const suppressCentralVoidRing = this.isSeraphWraithBattleActive();
  this.game.audio?.playSfx('gimmickVoidJudgementWarning', { cooldownMs: 260 });
  for (let i = 0; i < strikePlan.length; i += 1) {
    const { x, z, startDelay = 0 } = strikePlan[i];
    const y = this.game.world.getHeight(x, z);
    const root = new THREE.Group();
    const telegraph = new THREE.Mesh(
      new THREE.RingGeometry(3.8, 4.9, 40),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xffc88b : 0xff76de, transparent: true, opacity: 0.0 }),
    );
    telegraph.rotation.x = -Math.PI / 2;
    telegraph.position.y = y + 0.06;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.8, 28, 8),
      new THREE.MeshBasicMaterial({ color: 0xffefcb, transparent: true, opacity: 0.0 }),
    );
    pillar.position.y = y + 14;
    root.add(telegraph, pillar);
    root.position.set(x, 0, z);
    this.group.add(root);
    this.hazards.push({
      kind: 'voidPillar',
      root,
      telegraph,
      pillar,
      x,
      z,
      y,
      age: 0,
      life: 2.8 + startDelay,
      startDelay,
      hitDone: false,
      damage: 18 + i * 2,
      telegraphTime: VOID_JUDGEMENT_PILLAR_TELEGRAPH_TIME,
      impactTime: VOID_JUDGEMENT_PILLAR_IMPACT_TIME,
      impactSoundPlayed: false,
    });
  }

  if (suppressCentralVoidRing) return;

  const ringRoot = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.8, 0.42, 10, 64),
    new THREE.MeshBasicMaterial({ color: 0xffc584, transparent: true, opacity: 0.0 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = this.game.world.getHeight(0, 0) + 0.35;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(10, 48),
    new THREE.MeshBasicMaterial({ color: 0xff63d5, transparent: true, opacity: 0.0 }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = this.game.world.getHeight(0, 0) + 0.04;
  ringRoot.add(disc, ring);
  this.group.add(ringRoot);
  this.hazards.push({
    kind: 'voidRing',
    root: ringRoot,
    ring,
    disc,
    x: 0,
    z: 0,
    y: this.game.world.getHeight(0, 0),
    age: 0,
    life: 3.1,
    pulseStart: VOID_JUDGEMENT_RING_PULSE_START,
    pulseRadius: 0,
    pulseSoundPlayed: false,
  });
},

updateVoidPillar(hazard) {
  const telegraphTime = hazard.telegraphTime ?? VOID_JUDGEMENT_PILLAR_TELEGRAPH_TIME;
  const impactTime = hazard.impactTime ?? VOID_JUDGEMENT_PILLAR_IMPACT_TIME;
  const startDelay = hazard.startDelay ?? 0;
  const t = hazard.age - startDelay;
  if (t < 0) {
    hazard.telegraph.material.opacity = 0;
    hazard.pillar.material.opacity = 0;
    return;
  }

  hazard.telegraph.scale.setScalar(1 + t * 1.1);
  hazard.telegraph.material.opacity = t < telegraphTime ? 0.16 + t * 0.18 : Math.max(0, 0.46 - (t - telegraphTime) * 0.6);
  if (t < telegraphTime) return;

  const impactT = Math.min(1, (t - telegraphTime) / 0.16);
  hazard.pillar.material.opacity = Math.max(0, 0.92 - Math.max(0, t - (telegraphTime + 0.16)) * 1.1);
  hazard.pillar.scale.set(1 + impactT * 1.8, 1, 1 + impactT * 1.8);
  if (!hazard.hitDone && t >= impactTime) {
    hazard.hitDone = true;
    if (!hazard.impactSoundPlayed) {
      hazard.impactSoundPlayed = true;
      this.game.audio?.playSfx('gimmickVoidPillarImpact', {
        cooldownMs: 120,
        worldPosition: hazard.root.position,
      });
    }
    this.tryDamagePlayerAt(hazard.x, hazard.z, 5.3, hazard.damage);
    this.game.effects.spawnExplosion(new THREE.Vector3(hazard.x, hazard.y + 0.6, hazard.z), 0xffc584, 1.8);
    this.game.effects.spawnShockwave(new THREE.Vector3(hazard.x, hazard.y + 0.15, hazard.z), 0xff76de, 6.4);
  }
},

updateVoidRing(hazard) {
  if (this.isSeraphWraithBattleActive()) {
    detachAndDispose(hazard.root);
    const index = this.hazards.indexOf(hazard);
    if (index >= 0) this.hazards.splice(index, 1);
    return;
  }

  const t = hazard.age;
  hazard.disc.material.opacity = t < hazard.pulseStart ? 0.05 + t * 0.05 : Math.max(0, 0.12 - (t - hazard.pulseStart) * 0.06);
  if (t < hazard.pulseStart) return;
  if (!hazard.pulseSoundPlayed) {
    hazard.pulseSoundPlayed = true;
    this.game.audio?.playSfx('gimmickVoidRingPulse', {
      cooldownMs: 180,
      worldPosition: hazard.root.position,
    });
  }

  const pulseT = (t - hazard.pulseStart) / (hazard.life - hazard.pulseStart);
  hazard.pulseRadius = 4 + pulseT * 72;
  hazard.ring.material.opacity = Math.max(0, 0.82 - pulseT * 0.52);
  hazard.ring.scale.setScalar(1 + pulseT * 10.5);
  if (this.damageGate <= 0) {
    PLAYER_XZ.set(this.game.store.playerMesh.position.x, this.game.store.playerMesh.position.z);
    TEMP_XZ.set(0, 0);
    const dist = PLAYER_XZ.distanceTo(TEMP_XZ);
    if (Math.abs(dist - hazard.pulseRadius) <= 2.3) {
      this.damageGate = 0.18;
      this.game.playerSystem.applyDamage(14, { sourcePosition: { x: 0, y: this.game.store.playerMesh.position.y, z: 0 } });
    }
  }
}
};

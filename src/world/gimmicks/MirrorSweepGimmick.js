import * as THREE from 'three';
import { randRange } from '../../utils/math.js';
import { PLAYER_XZ, SEG_A, SEG_B, distanceToSegment2 } from './StageGimmickShared.js';

export const mirrorSweepGimmickMethods = {
spawnMirrorSweep() {
  const radius = 132;
  this.game.audio?.playSfx('gimmickMirrorSweepWarning', { cooldownMs: 220 });
  const beamLength = radius * 2;
  const stageBaseY = this.game.world.getHeight(0, 0);
  const root = new THREE.Group();
  const pylonA = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8.4, 1.2), new THREE.MeshStandardMaterial({ color: 0xfafcff, emissive: 0x98a7ff, emissiveIntensity: 0.7, roughness: 0.06, metalness: 0.9 }));
  const pylonB = pylonA.clone();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, beamLength, 18, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xff9be0,
      emissive: 0xff62c9,
      emissiveIntensity: 1.75,
      roughness: 0.08,
      metalness: 0.04,
      transparent: true,
      opacity: 0.0,
    }),
  );
  beam.rotation.z = Math.PI / 2;
  const telegraph = new THREE.Mesh(new THREE.BoxGeometry(beamLength, 0.02, 4.8), new THREE.MeshBasicMaterial({ color: 0xbfcfff, transparent: true, opacity: 0.16 }));
  telegraph.position.y = 0.08;
  root.add(pylonA, pylonB, beam, telegraph);
  this.group.add(root);
  this.hazards.push({
    kind: 'mirrorSweep',
    root,
    pylonA,
    pylonB,
    beam,
    telegraph,
    radius,
    beamLength,
    angle: randRange(0, Math.PI * 2),
    speed: randRange(0.42, 0.62),
    age: 0,
    life: 4.8,
    activeFrom: 1.0,
    beamY: stageBaseY + 5.2,
    telegraphY: stageBaseY + 0.1,
    fireSoundPlayed: false,
  });
},

updateMirrorSweep(hazard, dt) {
  hazard.angle += dt * hazard.speed;
  const dirX = Math.cos(hazard.angle);
  const dirZ = Math.sin(hazard.angle);
  const perpX = -dirZ;
  const perpZ = dirX;
  const ax = perpX * hazard.radius;
  const az = perpZ * hazard.radius;
  const bx = -ax;
  const bz = -az;
  const ay = this.game.world.getHeight(ax, az);
  const by = this.game.world.getHeight(bx, bz);
  const beamYaw = Math.PI * 0.5 - hazard.angle;
  const activeFade = 0.18;
  const activeRatio = THREE.MathUtils.clamp((hazard.age - hazard.activeFrom) / activeFade, 0, 1);
  const beamActive = activeRatio > 0;
  const damageActive = activeRatio >= 0.55;
  if (beamActive && !hazard.fireSoundPlayed) {
    hazard.fireSoundPlayed = true;
    this.game.audio?.playSfx('gimmickMirrorSweepFire', { cooldownMs: 180 });
  }

  hazard.pylonA.position.set(ax, ay + 4.2, az);
  hazard.pylonB.position.set(bx, by + 4.2, bz);
  hazard.beam.position.set(0, hazard.beamY, 0);
  hazard.telegraph.position.set(0, hazard.telegraphY, 0);
  hazard.beam.rotation.set(0, beamYaw, Math.PI / 2);
  hazard.telegraph.rotation.y = beamYaw;
  hazard.root.position.set(0, 0, 0);
  hazard.root.rotation.set(0, 0, 0);
  hazard.beam.material.opacity = 0.54 * activeRatio;
  hazard.telegraph.material.opacity = THREE.MathUtils.lerp(0.26, 0.08, activeRatio);

  if (beamActive && this.damageGate <= 0 && damageActive) {
    PLAYER_XZ.set(this.game.store.playerMesh.position.x, this.game.store.playerMesh.position.z);
    SEG_A.set(ax, az);
    SEG_B.set(bx, bz);
    const dist = distanceToSegment2(PLAYER_XZ, SEG_A, SEG_B);
    if (dist <= 3.6) {
      this.damageGate = 0.22;
      this.game.playerSystem.applyDamage(9, { sourcePosition: { x: (ax + bx) * 0.5, y: this.game.store.playerMesh.position.y, z: (az + bz) * 0.5 } });
    }
  }
}
};

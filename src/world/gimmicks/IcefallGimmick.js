import * as THREE from 'three';
import { randRange } from '../../utils/math.js';

export const icefallGimmickMethods = {
spawnIcefall() {
  const player = this.game.store.playerMesh.position;
  this.game.audio?.playSfx('gimmickIcefallWarning', { cooldownMs: 200 });
  for (let i = 0; i < 4; i += 1) {
    const x = player.x + randRange(-18, 18);
    const z = player.z + randRange(-18, 18);
    const y = this.game.world.getHeight(x, z);
    const root = new THREE.Group();
    const telegraph = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 3.6, 40),
      new THREE.MeshBasicMaterial({ color: 0xcaf6ff, transparent: true, opacity: 0.34 }),
    );
    telegraph.rotation.x = -Math.PI / 2;
    telegraph.position.y = y + 0.08;
    const shard = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 6.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xf7ffff, emissive: 0x88d8ff, emissiveIntensity: 0.8, roughness: 0.12, metalness: 0.18, transparent: true, opacity: 0 }),
    );
    shard.position.set(0, 10, 0);
    root.add(telegraph, shard);
    root.position.set(x, 0, z);
    this.group.add(root);
    this.hazards.push({ kind: 'icefall', root, telegraph, shard, x, z, y, age: 0, life: 2.4, hitDone: false, impactSoundPlayed: false });
  }
},

updateIcefall(hazard) {
  const t = hazard.age;
  hazard.telegraph.scale.setScalar(1 + t * 0.8);
  hazard.telegraph.material.opacity = t < 1.0 ? 0.24 + t * 0.3 : Math.max(0, 0.6 - (t - 1.0) * 0.5);
  if (t < 1.0) {
    hazard.shard.position.y = 10 - t * 8.5;
    return;
  }
  const impactT = Math.min(1, (t - 1.0) / 0.28);
  hazard.shard.material.opacity = 1 - Math.max(0, (t - 1.28) / 0.8);
  hazard.shard.position.y = hazard.y + 3.2 - impactT * 2.8;
  hazard.shard.scale.setScalar(1 + impactT * 0.35);
  if (!hazard.hitDone && t >= 1.08) {
    hazard.hitDone = true;
    if (!hazard.impactSoundPlayed) {
      hazard.impactSoundPlayed = true;
      this.game.audio?.playSfx('gimmickIcefallImpact', {
        cooldownMs: 120,
        worldPosition: hazard.root.position,
      });
    }
    this.tryDamagePlayerAt(hazard.x, hazard.z, 4.2, 15);
    this.game.effects.spawnShockwave(new THREE.Vector3(hazard.x, hazard.y + 0.1, hazard.z), 0xdffcff, 4.8);
  }
}
};

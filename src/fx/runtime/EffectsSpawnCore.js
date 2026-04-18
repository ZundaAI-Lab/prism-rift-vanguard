import * as THREE from 'three';
import { randRange } from '../../utils/math.js';

export function installEffectsSpawnCore(EffectsSystem) {
  EffectsSystem.prototype.spawnMuzzleFlash = function spawnMuzzleFlash(position, color, scale = 1) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.4 * scale, 10, 10),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78 }),
    );
    mesh.position.copy(position);
    this.game.renderer.groups.fx.add(mesh);
    this.game.store.effects.push({ kind: 'flash', mesh, age: 0, life: 0.15, scale });
  };

  EffectsSystem.prototype.spawnExplosion = function spawnExplosion(position, color, scale = 1) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.9 * scale, 1),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }),
    );
    mesh.position.copy(position);
    this.game.renderer.groups.fx.add(mesh);
    this.game.store.effects.push({ kind: 'explosion', mesh, age: 0, life: 0.45, scale });
  };

  EffectsSystem.prototype.spawnShockwave = function spawnShockwave(position, color, radius) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(0.8, radius * 0.22), 0.1, 8, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }),
    );
    mesh.position.copy(position);
    mesh.rotation.x = Math.PI / 2;
    this.game.renderer.groups.fx.add(mesh);
    this.game.store.effects.push({ kind: 'shockwave', mesh, age: 0, life: 0.5, scale: radius * 0.5 });
  };

  EffectsSystem.prototype.spawnHitSpark = function spawnHitSpark(position, color, scale = 1) {
    for (let i = 0; i < 4; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12 * scale, 0.12 * scale, 0.7 * scale),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
      );
      mesh.position.copy(position);
      mesh.rotation.set(randRange(0, Math.PI), randRange(0, Math.PI), randRange(0, Math.PI));
      this.game.renderer.groups.fx.add(mesh);
      this.game.store.effects.push({
        kind: 'spark',
        mesh,
        age: 0,
        life: 0.22,
        velocity: new THREE.Vector3(randRange(-5, 5), randRange(2, 7), randRange(-5, 5)),
      });
    }
  };
}

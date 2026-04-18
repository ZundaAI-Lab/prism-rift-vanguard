import * as THREE from 'three';
import { randRange } from '../../utils/math.js';
import {
  PLASMA_READY_FOLLOW_POSITION,
  TRAIL_AXIS_A,
  TRAIL_AXIS_B,
  TRAIL_DIRECTION,
  WARP_STREAM_UP,
} from '../EffectsShared.js';

export function installEffectsSpawnStylized(EffectsSystem) {
  EffectsSystem.prototype.spawnSpawnRift = function spawnSpawnRift(position, color, scale = 1, life = 1.2, intensity = 1) {
    const group = new THREE.Group();
    group.position.copy(position);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55 * intensity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const veilMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.16 * intensity,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const coreMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22 * intensity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(0.7, scale * 1.28), Math.max(0.05, scale * 0.08), 10, 48),
      ringMaterial,
    );
    baseRing.rotation.x = Math.PI / 2;

    const shearRing = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(0.45, scale * 0.9), Math.max(0.04, scale * 0.055), 8, 36),
      ringMaterial.clone(),
    );
    shearRing.rotation.set(Math.PI * 0.32, 0, Math.PI * 0.16);
    shearRing.scale.set(1.0, 1.4, 0.7);

    const veilA = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(1.1, scale * 1.65), Math.max(1.8, scale * 3.2)),
      veilMaterial,
    );
    veilA.position.y = Math.max(0.8, scale * 1.05);
    veilA.rotation.y = Math.PI / 6;

    const veilB = veilA.clone();
    veilB.material = veilMaterial.clone();
    veilB.rotation.y += Math.PI / 2;

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.38, scale * 0.56), 14, 12),
      coreMaterial,
    );
    core.scale.set(1.3, 0.4, 1.3);
    core.position.y = Math.max(0.15, scale * 0.16);

    group.add(baseRing, shearRing, veilA, veilB, core);
    this.game.renderer.groups.fx.add(group);
    this.game.store.effects.push({
      kind: 'spawnRift',
      mesh: group,
      age: 0,
      life,
      scale,
      baseY: position.y,
      baseRing,
      shearRing,
      veilA,
      veilB,
      core,
      spin: randRange(-1.8, 1.8),
      wobble: Math.random() * Math.PI * 2,
      intensity,
    });
  };

  EffectsSystem.prototype.spawnMirrorWarpStream = function spawnMirrorWarpStream(from, to, color, scale = 1, life = 0.22) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.22, scale * 0.26), 12, 12),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.96,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    group.add(core);

    const particleCount = Math.max(8, Math.min(18, Math.round(from.distanceTo(to) / 5.5) + 6));
    const particles = [];
    for (let i = 0; i < particleCount; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.08, scale * (0.07 + (i / particleCount) * 0.06)), 8, 8),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.78,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      group.add(particle);
      particles.push({
        mesh: particle,
        offset: i / particleCount,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.game.renderer.groups.fx.add(group);
    this.game.store.effects.push({
      kind: 'mirrorWarpStream',
      mesh: group,
      age: 0,
      life,
      scale,
      from: from.clone(),
      to: to.clone(),
      core,
      particles,
    });
  };

  EffectsSystem.prototype.spawnPlasmaReadyBurst = function spawnPlasmaReadyBurst(anchor, color = 0x8ff6ff, scale = 1, followOffset = null) {
    const group = new THREE.Group();
    const followTarget = anchor?.isObject3D ? anchor : null;
    const offset = followOffset?.isVector3 ? followOffset.clone() : new THREE.Vector3();

    if (followTarget) group.position.copy(PLASMA_READY_FOLLOW_POSITION.copy(followTarget.position).add(offset));
    else if (anchor?.isVector3) group.position.copy(anchor);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ringAccentMaterial = ringMaterial.clone();
    ringAccentMaterial.opacity = 0.68;

    const mainRing = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(2.1, scale * 2.55), Math.max(0.08, scale * 0.12), 10, 64),
      ringMaterial,
    );
    mainRing.rotation.x = Math.PI / 2;

    const accentRing = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(1.45, scale * 1.85), Math.max(0.05, scale * 0.08), 10, 48),
      ringAccentMaterial,
    );
    accentRing.rotation.set(Math.PI / 2, 0, Math.PI / 7);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.48, scale * 0.66), 14, 12),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    core.scale.set(1.8, 0.5, 1.8);

    group.add(mainRing, accentRing, core);
    this.game.renderer.groups.fx.add(group);
    this.game.store.effects.push({
      kind: 'plasmaReadyBurst',
      mesh: group,
      age: 0,
      life: 0.48,
      scale,
      mainRing,
      accentRing,
      core,
      followTarget,
      followOffset: offset,
    });
  };

  EffectsSystem.prototype.spawnCinematicTrailSparkle = function spawnCinematicTrailSparkle(position, direction, scale = 1) {
    TRAIL_DIRECTION.copy(direction);
    if (TRAIL_DIRECTION.lengthSq() < 0.0001) TRAIL_DIRECTION.set(0, 0, -1);
    else TRAIL_DIRECTION.normalize();

    TRAIL_AXIS_A.crossVectors(TRAIL_DIRECTION, WARP_STREAM_UP);
    if (TRAIL_AXIS_A.lengthSq() < 0.0001) TRAIL_AXIS_A.set(1, 0, 0);
    else TRAIL_AXIS_A.normalize();
    TRAIL_AXIS_B.crossVectors(TRAIL_AXIS_A, TRAIL_DIRECTION).normalize();

    const palette = [0xe8ffff, 0xc8f7ff, 0xffddf7];
    const color = palette[Math.floor(Math.random() * palette.length)];
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(Math.max(0.05, scale * randRange(0.12, 0.19)), 0),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: randRange(0.75, 0.96),
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    mesh.position.copy(position);
    mesh.rotation.set(randRange(0, Math.PI), randRange(0, Math.PI), randRange(0, Math.PI));

    const backwardSpeed = randRange(4.4, 7.4);
    const lateralSpeed = randRange(-1.6, 1.6);
    const liftSpeed = randRange(0.5, 2.4);
    const driftSpeed = randRange(-1.1, 1.1);
    const velocity = TRAIL_DIRECTION.clone().multiplyScalar(-backwardSpeed)
      .addScaledVector(TRAIL_AXIS_A, lateralSpeed)
      .addScaledVector(TRAIL_AXIS_B, liftSpeed)
      .addScaledVector(WARP_STREAM_UP, driftSpeed);

    this.game.renderer.groups.fx.add(mesh);
    this.game.store.effects.push({
      kind: 'trailSparkle',
      mesh,
      age: 0,
      life: randRange(0.42, 0.72),
      velocity,
      baseScale: mesh.scale.x || 1,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleRate: randRange(12, 20),
      spinX: randRange(-4.8, 4.8),
      spinY: randRange(-6.2, 6.2),
      spinZ: randRange(-4.4, 4.4),
    });
  };
}

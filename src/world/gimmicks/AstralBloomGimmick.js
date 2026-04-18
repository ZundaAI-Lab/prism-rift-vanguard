import * as THREE from 'three';
import { randRange } from '../../utils/math.js';
import { PLAYER_XZ, TEMP_XZ } from './StageGimmickShared.js';

const ASTRAL_BLOOM_DAMAGE_BAND_HALF_WIDTH = 1.8;
const ASTRAL_BLOOM_FINAL_PULSE_RADIUS = 20.0;
const ASTRAL_BLOOM_MAX_DAMAGE_INNER_RADIUS = Math.max(0.35, ASTRAL_BLOOM_FINAL_PULSE_RADIUS - ASTRAL_BLOOM_DAMAGE_BAND_HALF_WIDTH);
const ASTRAL_BLOOM_MAX_DAMAGE_OUTER_RADIUS = ASTRAL_BLOOM_FINAL_PULSE_RADIUS + ASTRAL_BLOOM_DAMAGE_BAND_HALF_WIDTH;
const ASTRAL_BLOOM_PAIR_MIN_CENTER_DISTANCE = ASTRAL_BLOOM_MAX_DAMAGE_OUTER_RADIUS * 2 + 0.6;
const ASTRAL_BLOOM_PAIR_MIN_HALF_SEPARATION = ASTRAL_BLOOM_PAIR_MIN_CENTER_DISTANCE * 0.5;
const ASTRAL_BLOOM_PAIR_MAX_HALF_SEPARATION = 24.0;

function createAstralBloomSpawnPoints(player) {
  const angle = randRange(0, Math.PI * 2);
  const halfSeparation = randRange(ASTRAL_BLOOM_PAIR_MIN_HALF_SEPARATION, ASTRAL_BLOOM_PAIR_MAX_HALF_SEPARATION);
  const offsetX = Math.cos(angle) * halfSeparation;
  const offsetZ = Math.sin(angle) * halfSeparation;

  return [
    { x: player.x + offsetX, z: player.z + offsetZ },
    { x: player.x - offsetX, z: player.z - offsetZ },
  ];
}

export const astralBloomGimmickMethods = {
spawnAstralBloom() {
  const player = this.game.store.playerMesh.position;
  const spawnPoints = createAstralBloomSpawnPoints(player);
  this.game.audio?.playSfx('gimmickAstralBloomWarning', { cooldownMs: 220 });
  for (let i = 0; i < spawnPoints.length; i += 1) {
    const { x, z } = spawnPoints[i];
    const y = this.game.world.getHeight(x, z);
    const root = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.98, 0),
      new THREE.MeshStandardMaterial({
        color: 0xb8ffff,
        emissive: 0xff7ad7,
        emissiveIntensity: 1.35,
        roughness: 0.08,
        metalness: 0.2,
        transparent: true,
        opacity: 0.88,
      }),
    );
    core.position.y = y + 4.2;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.14, 10, 44),
      new THREE.MeshBasicMaterial({
        color: 0x9ef4ff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y + 0.88;
    const telegraph = new THREE.Mesh(
      new THREE.CircleGeometry(ASTRAL_BLOOM_MAX_DAMAGE_OUTER_RADIUS, 64),
      new THREE.MeshBasicMaterial({
        color: 0xff8fdc,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      }),
    );
    telegraph.rotation.x = -Math.PI / 2;
    telegraph.position.y = y + 0.34;
    const telegraphEdge = new THREE.Mesh(
      new THREE.RingGeometry(ASTRAL_BLOOM_MAX_DAMAGE_INNER_RADIUS, ASTRAL_BLOOM_MAX_DAMAGE_OUTER_RADIUS, 72),
      new THREE.MeshBasicMaterial({
        color: 0xffc8f1,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    telegraphEdge.rotation.x = -Math.PI / 2;
    telegraphEdge.position.y = y + 0.4;
    const warningColumn = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 3.7, 6.8, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xff4a9f,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    warningColumn.position.y = y - 2.6;
    const warningHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.14, 8, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffd7f6,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    warningHalo.rotation.x = Math.PI / 2;
    warningHalo.position.y = y + 5.05;
    const plasmaBand = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.4, 56),
      new THREE.MeshBasicMaterial({
        color: 0xff365a,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    plasmaBand.rotation.x = -Math.PI / 2;
    plasmaBand.position.y = y + 0.48;
    const plasmaBandHot = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.25, 56),
      new THREE.MeshBasicMaterial({
        color: 0xffb2c2,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    plasmaBandHot.rotation.x = -Math.PI / 2;
    plasmaBandHot.position.y = y + 0.56;
    const plasmaGroup = new THREE.Group();
    const plasmaArcs = [];
    for (let p = 0; p < 12; p += 1) {
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.32, 1.8, 6, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xff3d54,
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
          depthTest: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        }),
      );
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 10, 10),
        new THREE.MeshBasicMaterial({
          color: 0xff9ab0,
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      bolt.position.y = y + 1.2;
      glow.position.y = y + 0.72;
      plasmaGroup.add(bolt, glow);
      plasmaArcs.push({
        bolt,
        glow,
        angleOffset: randRange(0, Math.PI * 2),
        radialOffset: randRange(-0.7, 0.7),
        speed: randRange(2.4, 5.6),
        drift: randRange(0.7, 1.45),
      });
    }
    root.add(core, ring, telegraph, telegraphEdge, warningColumn, warningHalo, plasmaBand, plasmaBandHot, plasmaGroup);
    root.position.set(x, 0, z);
    this.group.add(root);
    this.hazards.push({
      kind: 'astralBloom',
      root,
      core,
      ring,
      telegraph,
      telegraphEdge,
      warningColumn,
      warningHalo,
      plasmaBand,
      plasmaBandHot,
      plasmaArcs,
      plasmaInner: 0,
      plasmaOuter: 0,
      x,
      z,
      y,
      age: 0,
      life: 3.6,
      pulseStart: 1.1,
      pulseRadius: 0,
      maxDamageInnerRadius: ASTRAL_BLOOM_MAX_DAMAGE_INNER_RADIUS,
      maxDamageOuterRadius: ASTRAL_BLOOM_MAX_DAMAGE_OUTER_RADIUS,
      plasmaSeed: randRange(0, Math.PI * 2),
      burstSoundPlayed: false,
    });
  }
},

syncAstralPlasmaBand(hazard, innerRadius, outerRadius) {
  const inner = Math.max(0.15, innerRadius);
  const outer = Math.max(inner + 0.1, outerRadius);
  if (Math.abs(hazard.plasmaInner - inner) < 0.45 && Math.abs(hazard.plasmaOuter - outer) < 0.45) return;

  hazard.plasmaInner = inner;
  hazard.plasmaOuter = outer;
  hazard.plasmaBand.geometry.dispose();
  hazard.plasmaBand.geometry = new THREE.RingGeometry(inner, outer, 56);
  hazard.plasmaBandHot.geometry.dispose();
  hazard.plasmaBandHot.geometry = new THREE.RingGeometry(Math.max(0.12, inner + 0.28), Math.max(inner + 0.4, outer - 0.22), 56);
},

updateAstralBloom(hazard, dt) {
  const t = hazard.age;
  const prePulseRatio = THREE.MathUtils.clamp(t / hazard.pulseStart, 0, 1);
  const prePulseWave = 0.72 + Math.sin(t * 8.8 + hazard.plasmaSeed) * 0.12;
  hazard.core.rotation.y += dt * 1.6;
  hazard.core.rotation.x += dt * 0.55;
  hazard.core.position.y = hazard.y + 4.0 + Math.sin(t * 4.0) * 0.34;
  hazard.core.scale.setScalar(0.92 + prePulseRatio * 0.16 + Math.sin(t * 10.5) * 0.04);
  hazard.core.material.opacity = 0.72 + prePulseRatio * 0.2;
  hazard.core.material.emissiveIntensity = 1.2 + prePulseRatio * 0.85 + Math.max(0, Math.sin(t * 12.0 + hazard.plasmaSeed)) * 0.35;
  hazard.telegraph.scale.setScalar(0.992 + Math.sin(t * 6.8 + hazard.plasmaSeed) * 0.01);
  hazard.telegraph.material.opacity = t < hazard.pulseStart ? 0.08 + prePulseRatio * 0.04 : Math.max(0, 0.12 - (t - hazard.pulseStart) * 0.08);
  hazard.telegraphEdge.scale.setScalar(1);
  hazard.telegraphEdge.material.opacity = 0;
  const columnRise = THREE.MathUtils.smoothstep(prePulseRatio, 0.08, 0.92);
  const columnWidth = 0.52 + columnRise * 0.76;
  const columnHeight = 0.08 + columnRise * 1.1 + prePulseWave * 0.06;
  hazard.warningColumn.scale.set(columnWidth, columnHeight, columnWidth);
  hazard.warningColumn.position.y = hazard.y - 2.6 + columnRise * 5.8;
  hazard.warningColumn.material.opacity = t < hazard.pulseStart ? 0.04 + columnRise * 0.32 : Math.max(0, 0.3 - (t - hazard.pulseStart) * 0.22);
  hazard.warningHalo.rotation.z += dt * 1.15;
  hazard.warningHalo.scale.setScalar(0.86 + prePulseRatio * 0.34 + Math.sin(t * 9.0 + hazard.plasmaSeed) * 0.03);
  hazard.warningHalo.material.opacity = t < hazard.pulseStart ? 0.28 + prePulseRatio * 0.2 : Math.max(0, 0.34 - (t - hazard.pulseStart) * 0.18);
  if (t < hazard.pulseStart) return;
  if (!hazard.burstSoundPlayed) {
    hazard.burstSoundPlayed = true;
    this.game.audio?.playSfx('gimmickAstralBloomBurst', {
      cooldownMs: 180,
      worldPosition: hazard.root.position,
    });
  }

  const pulseT = (t - hazard.pulseStart) / (hazard.life - hazard.pulseStart);
  hazard.pulseRadius = 2 + pulseT * 18;
  hazard.ring.material.opacity = Math.max(0, 0.82 - pulseT * 0.34);
  hazard.ring.scale.setScalar(1.08 + pulseT * 3.75);
  hazard.ring.position.y = hazard.y + 0.92 + Math.sin(t * 18.0) * 0.04;
  hazard.warningColumn.material.opacity = Math.max(0, 0.22 - pulseT * 0.12);
  hazard.warningHalo.material.opacity = Math.max(0, 0.26 - pulseT * 0.14);

  const damageInner = Math.max(0.35, hazard.pulseRadius - ASTRAL_BLOOM_DAMAGE_BAND_HALF_WIDTH);
  const damageOuter = hazard.pulseRadius + ASTRAL_BLOOM_DAMAGE_BAND_HALF_WIDTH;
  const damageMid = (damageInner + damageOuter) * 0.5;
  const plasmaFade = Math.max(0, 0.92 - pulseT * 0.3);
  const plasmaPulse = 0.8 + Math.sin(t * 28 + hazard.plasmaSeed) * 0.16 + Math.sin(t * 17 - hazard.plasmaSeed * 0.6) * 0.12;

  this.syncAstralPlasmaBand(hazard, damageInner, damageOuter);
  hazard.plasmaBand.material.opacity = Math.max(0, plasmaFade * (0.42 + plasmaPulse * 0.2));
  hazard.plasmaBandHot.material.opacity = Math.max(0, plasmaFade * (0.24 + plasmaPulse * 0.13));
  hazard.plasmaBand.rotation.z += dt * 0.4;
  hazard.plasmaBandHot.rotation.z -= dt * 0.7;

  for (let i = 0; i < hazard.plasmaArcs.length; i += 1) {
    const arc = hazard.plasmaArcs[i];
    const angle = arc.angleOffset + t * arc.speed;
    const radialWave = Math.sin(t * (7.8 + arc.speed) + arc.angleOffset * 1.4) * (0.52 * arc.drift) + arc.radialOffset;
    const radius = THREE.MathUtils.clamp(damageMid + radialWave, damageInner + 0.15, damageOuter - 0.15);
    const lift = 0.42 + Math.abs(Math.sin(t * (12.0 + arc.speed) + arc.angleOffset)) * 0.72;
    const opacity = Math.max(0, plasmaFade * (0.3 + Math.abs(Math.sin(t * (18.0 + arc.speed) + arc.angleOffset)) * 0.28));
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    arc.glow.position.set(x, hazard.y + 0.56 + lift * 0.16, z);
    arc.glow.scale.setScalar(0.95 + lift * 1.05);
    arc.glow.material.opacity = opacity * 0.82;
    arc.bolt.position.set(x, hazard.y + 0.96 + lift * 0.52, z);
    arc.bolt.scale.set(0.95, 0.92 + lift * 1.0, 0.95);
    arc.bolt.rotation.x = Math.sin(t * (8.0 + arc.drift) + arc.angleOffset) * 0.2;
    arc.bolt.rotation.z = Math.cos(t * (9.4 + arc.drift) + arc.angleOffset) * 0.2;
    arc.bolt.material.opacity = opacity;
  }

  if (this.damageGate <= 0) {
    PLAYER_XZ.set(this.game.store.playerMesh.position.x, this.game.store.playerMesh.position.z);
    TEMP_XZ.set(hazard.x, hazard.z);
    const dist = PLAYER_XZ.distanceTo(TEMP_XZ);
    if (Math.abs(dist - hazard.pulseRadius) <= ASTRAL_BLOOM_DAMAGE_BAND_HALF_WIDTH) {
      this.damageGate = 0.18;
      this.game.playerSystem.applyDamage(11, { sourcePosition: { x: hazard.x, y: this.game.store.playerMesh.position.y, z: hazard.z } });
    }
  }
}
};

import * as THREE from 'three';
import { COLORS, PICKUP, CRYSTAL_DROP } from '../data/balance.js';
import { clamp, lerp, randRange } from '../utils/math.js';

const TO_PLAYER = new THREE.Vector3();
const TO_PLAYER_XZ = new THREE.Vector3();
const DROP_OFFSET = new THREE.Vector3();
const DROP_VELOCITY = new THREE.Vector3();
const PRISM_BASE_TINT = new THREE.Color(0xffffff);
const PRISM_COLOR = new THREE.Color();
const PICKUP_COLOR = new THREE.Color(COLORS.crystal);

/**
 * Responsibility:
 * - Crystal drop spawning, floating behavior, magnet collection, and crystal gain.
 *
 * Rules:
 * - Only manage pickup entities.
 * - Never apply weapon upgrades here; only award spendable currency.
 * - Crystal collection is fully automatic inside a pickup influence radius around the player.
 * - Pickup reach is evaluated on the horizontal XZ plane, not raw 3D center-to-center distance.
 * - Pickup meshes stored in the entity list are logic anchors only. The real draw work lives in
 *   Renderer.batches.pickups so high drop counts do not create one Mesh per crystal anymore.
 * - Shared rule for all batched visuals: if the visual batch cannot allocate a slot, do not create the
 *   gameplay entity. Capacity exhaustion is treated as an exceptional skip, never as a hidden fallback.
 */
export class RewardSystem {
  constructor(game) {
    this.game = game;
    this.crystalMaterial = this.game.renderer.batches.pickups.getCrystalMaterial();
    this.crystalVisualTime = 0;
    this.updateCrystalPrismMaterial(0);
  }

  updateCrystalPrismMaterial(dt) {
    this.crystalVisualTime += dt;
    const hue = (this.crystalVisualTime * 0.18) % 1;
    PRISM_COLOR.setHSL(hue, 0.95, 0.6);

    this.crystalMaterial.color.copy(PRISM_BASE_TINT).lerp(PRISM_COLOR, 0.52);
    this.crystalMaterial.emissive.copy(PRISM_COLOR);
    this.crystalMaterial.emissiveIntensity = 1.18 + Math.sin(this.crystalVisualTime * 4.6) * 0.22;
    this.crystalMaterial.opacity = 0.5 + Math.sin(this.crystalVisualTime * 3.1) * 0.06;
  }

  calculateCrystalDropCount(dropRange, defeatTime, isBoss = false) {
    const [minDrop = 0, maxDrop = 0] = Array.isArray(dropRange) ? dropRange : [0, 0];
    const minCount = Math.min(minDrop, maxDrop);
    const maxCount = Math.max(minDrop, maxDrop);
    if (maxCount <= minCount) return Math.max(0, Math.round(maxCount));

    const timeScale = isBoss ? CRYSTAL_DROP.bossTimeScale : 1;
    const fastTime = CRYSTAL_DROP.fastKillSeconds * timeScale;
    const slowTime = CRYSTAL_DROP.slowKillSeconds * timeScale;
    if (slowTime <= fastTime) return maxCount;

    const normalizedTime = clamp((Math.max(0, defeatTime) - fastTime) / (slowTime - fastTime), 0, 1);
    return Math.round(lerp(maxCount, minCount, normalizedTime));
  }

  spawnCrystalDrops(position, count, scale = 1) {
    const safeCount = Math.max(0, Math.floor(count || 0));
    const spreadScale = Math.min(1.42, 1 + safeCount * 0.05);

    for (let i = 0; i < safeCount; i += 1) {
      const angle = randRange(0, Math.PI * 2);
      const radialSpeed = randRange(2.4, 6.6) * spreadScale;
      const tangentSpeed = randRange(-1.6, 1.6);
      const radialOffset = randRange(0.12, 1.45) * spreadScale;
      const mesh = new THREE.Object3D();
      mesh.scale.set(scale, scale * 2, scale);
      mesh.rotation.set(randRange(0, Math.PI * 2), randRange(0, Math.PI * 2), randRange(0, Math.PI * 2));
      DROP_OFFSET.set(Math.cos(angle) * radialOffset, randRange(0.45, 1.9), Math.sin(angle) * radialOffset);
      mesh.position.copy(position).add(DROP_OFFSET);
      DROP_VELOCITY.set(
        Math.cos(angle) * radialSpeed - Math.sin(angle) * tangentSpeed,
        randRange(1.15, 2.35),
        Math.sin(angle) * radialSpeed + Math.cos(angle) * tangentSpeed,
      );
      // Batched-visual common rule:
      // if no visual slot is available, skip entity creation itself.
      const visualHandle = this.game.renderer.batches.pickups.allocateCrystal({ kind: 'crystal' });
      if (!visualHandle) {
        console.warn('[PickupBatchRenderer] capacity exhausted for crystal');
        continue;
      }

      const pickup = {
        kind: 'crystal',
        value: 1,
        mesh,
        age: 0,
        velocity: DROP_VELOCITY.clone(),
        bobPhase: randRange(0, Math.PI * 2),
        visualColor: PICKUP_COLOR.clone(),
        visualOpacity: 1,
        visualScale: mesh.scale.clone(),
        visualHandle,
      };
      this.game.store.pickups.push(pickup);
      this.game.renderer.batches.pickups.syncCrystal(pickup);
    }
  }

  update(dt) {
    this.updateCrystalPrismMaterial(dt);

    const playerMesh = this.game.store.playerMesh;
    if (!playerMesh) return;

    const attractMultiplier = this.game.upgrades?.getCrystalAttractMultiplier?.() ?? 1;
    const magnetRadius = PICKUP.magnetRadius * attractMultiplier;
    const collectRadius = PICKUP.collectRadius * attractMultiplier;

    for (let i = this.game.store.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = this.game.store.pickups[i];
      pickup.age += dt;
      pickup.velocity.y -= dt * 2.5;
      pickup.mesh.position.addScaledVector(pickup.velocity, dt);
      pickup.mesh.position.y = Math.max(this.game.world.getHeight(pickup.mesh.position.x, pickup.mesh.position.z) + PICKUP.floatHeight, pickup.mesh.position.y);
      pickup.mesh.rotation.y += dt * 2.6;
      pickup.mesh.rotation.x += dt * 1.1;

      pickup.velocity.multiplyScalar(Math.exp(-dt * 3.2));
      pickup.mesh.position.y += Math.sin(pickup.age * 2.4 + pickup.bobPhase) * dt * 0.28;
      pickup.visualScale.copy(pickup.mesh.scale);

      TO_PLAYER.copy(playerMesh.position).sub(pickup.mesh.position);
      TO_PLAYER_XZ.set(TO_PLAYER.x, 0, TO_PLAYER.z);
      const planarDistance = Math.max(0.001, TO_PLAYER_XZ.length());
      if (planarDistance <= magnetRadius) {
        const rushStrength = 120 + Math.max(0, magnetRadius - planarDistance) * 1.7;
        pickup.mesh.position.addScaledVector(TO_PLAYER.normalize(), dt * rushStrength);
      }

      this.game.renderer.batches.pickups.syncCrystal(pickup);

      if (planarDistance < collectRadius) {
        this.collectPickup(pickup, i);
      }
    }
  }

  removePickup(pickup, index = -1) {
    if (index >= 0 && this.game.store.pickups[index] === pickup) this.game.store.pickups.splice(index, 1);
    else {
      const fallbackIndex = this.game.store.pickups.indexOf(pickup);
      if (fallbackIndex >= 0) this.game.store.pickups.splice(fallbackIndex, 1);
    }
    this.game.renderer.batches.pickups.releaseCrystal(pickup.visualHandle);
    pickup.visualHandle = null;
  }

  collectPickup(pickup, index = -1) {
    this.game.state.crystals += pickup.value;
    if (pickup?.kind === 'crystal') {
      this.game.missionAchievements?.registerCrystalsCollected?.(pickup.value);
      this.game.missionSystem?.tryResolveLateCrystalComplete?.();
    }
    this.game.audio?.playSfx('crystalPickup', {
      cooldownMs: 45,
      worldPosition: pickup.mesh.position,
    });
    this.game.effects.spawnHitSpark(pickup.mesh.position.clone(), this.crystalMaterial.emissive.getHex(), 0.55);
    this.removePickup(pickup, index);
  }
}

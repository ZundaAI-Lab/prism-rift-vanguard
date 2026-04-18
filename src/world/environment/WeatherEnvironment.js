/**
 * Responsibility:
 * - 雪・霧・吹雪ドームなどの天候演出を担当する。
 *
 * Rules:
 * - 天候の見た目更新だけを持ち、ダメージや減速の判定は別システムに残す。
 * - frost 系天候状態の内部キャッシュはこのモジュールで完結させる。
 */
import { THREE, randRange } from '../EnvironmentBuilderShared.js';

const SNOW_STORM_DIR = new THREE.Vector3();
const SNOW_STORM_SIDE = new THREE.Vector3();
const SNOW_STORM_FLOW = {
  dirX: 0,
  dirZ: 0,
  sideX: 0,
  sideZ: 0,
  speed: 0,
  lift: 0,
  stormBlend: 0,
};

export function installWeatherEnvironment(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.createSnow = function createSnow() {
      const baseCount = 2200;
      const count = baseCount * 2;
      const positions = new Float32Array(count * 3);
      const velocity = new Float32Array(count * 3);
      const playerPos = this.game.store.playerMesh?.position ?? new THREE.Vector3();
  
      for (let i = 0; i < count; i += 1) this.resetSnowParticle(positions, velocity, i, playerPos, true);
  
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setDrawRange(0, Math.floor(baseCount * 0.24));
  
      const material = new THREE.PointsMaterial({
        color: 0xf6fbff,
        size: 0.34,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
  
      this.snowPoints = new THREE.Points(geometry, material);
      this.snowPoints.frustumCulled = false;
      this.game.renderer.groups.world.add(this.snowPoints);
      this.snowState = {
        positions,
        velocity,
        count,
        baseCount,
        activeCount: Math.floor(baseCount * 0.24),
        radius: 210,
        top: 86,
        bottom: -10,
      };
    }

  EnvironmentBuilder.prototype.createFrostMist = function createFrostMist() {
      const count = 120;
      const positions = new Float32Array(count * 3);
      const radius = new Float32Array(count);
      const height = new Float32Array(count);
      const phase = new Float32Array(count);
      const spin = new Float32Array(count);
      const wobble = new Float32Array(count);
      const playerPos = this.game.store.playerMesh?.position ?? new THREE.Vector3();
  
      for (let i = 0; i < count; i += 1) {
        radius[i] = randRange(1.8, 8.2);
        height[i] = randRange(-0.4, 5.4);
        phase[i] = Math.random() * Math.PI * 2;
        spin[i] = randRange(0.09, 0.28) * (Math.random() < 0.5 ? -1 : 1);
        wobble[i] = randRange(0.42, 0.92);
        const offset = i * 3;
        positions[offset] = playerPos.x;
        positions[offset + 1] = playerPos.y + height[i];
        positions[offset + 2] = playerPos.z;
      }
  
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setDrawRange(0, 0);
  
      const material = new THREE.PointsMaterial({
        color: 0xe5eef8,
        size: 1.55,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.NormalBlending,
        sizeAttenuation: true,
      });
  
      this.frostMistPoints = new THREE.Points(geometry, material);
      this.frostMistPoints.frustumCulled = false;
      this.game.renderer.groups.world.add(this.frostMistPoints);
      this.frostMistState = { positions, radius, height, phase, spin, wobble, count };
    }

  EnvironmentBuilder.prototype.createFrostBlizzardDome = function createFrostBlizzardDome() {
      const geometry = new THREE.SphereGeometry(1, 28, 18);
      const material = new THREE.MeshBasicMaterial({
        color: 0xf7fbff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      this.frostDomeMesh = new THREE.Mesh(geometry, material);
      this.frostDomeMesh.visible = false;
      this.game.renderer.groups.world.add(this.frostDomeMesh);
    }

  EnvironmentBuilder.prototype.getFrostSnowIntensity = function getFrostSnowIntensity() {
      if (this.currentMissionId !== 'frost') return 0;
      const mission = this.game.missionSystem?.currentMission;
      const waves = mission?.waves ?? 7;
      const progression = this.game.state?.progression;
      const status = progression?.missionStatus ?? 'idle';
      const wave = progression?.wave ?? 0;
      let intensity = wave <= 0 ? 0.18 : wave / Math.max(1, waves);
      if (status === 'awaitingBoss' || status === 'bossIntro' || status === 'boss') intensity = 1;
      const blizzard = this.game.enemies?.getFrostBlizzardState?.();
      if (blizzard?.active) intensity = Math.min(1, intensity + 0.55);
      return THREE.MathUtils.clamp(intensity, 0.18, 1);
    }

  EnvironmentBuilder.prototype.getSnowStormFlow = function getSnowStormFlow(center) {
      const blizzard = this.game.enemies?.getFrostBlizzardState?.();
      const stormBlend = this.frostStormBlend ?? 0;
      if (!blizzard?.active || stormBlend <= 0.001) return null;
  
      const sourceX = blizzard.sourceX ?? center.x;
      const sourceZ = blizzard.sourceZ ?? center.z;
      const sourceY = blizzard.sourceY ?? center.y;
      SNOW_STORM_DIR.set(center.x - sourceX, center.y - sourceY, center.z - sourceZ);
      SNOW_STORM_DIR.y = 0;
      if (SNOW_STORM_DIR.lengthSq() <= 0.0001) SNOW_STORM_DIR.set(0, 0, 1);
      else SNOW_STORM_DIR.normalize();
      SNOW_STORM_SIDE.set(-SNOW_STORM_DIR.z, 0, SNOW_STORM_DIR.x);
      SNOW_STORM_FLOW.dirX = SNOW_STORM_DIR.x;
      SNOW_STORM_FLOW.dirZ = SNOW_STORM_DIR.z;
      SNOW_STORM_FLOW.sideX = SNOW_STORM_SIDE.x;
      SNOW_STORM_FLOW.sideZ = SNOW_STORM_SIDE.z;
      SNOW_STORM_FLOW.speed = THREE.MathUtils.lerp(18, 52, stormBlend);
      SNOW_STORM_FLOW.lift = THREE.MathUtils.lerp(0.06, 0.22, stormBlend);
      SNOW_STORM_FLOW.stormBlend = stormBlend;
      return SNOW_STORM_FLOW;
    }

  EnvironmentBuilder.prototype.resetSnowParticle = function resetSnowParticle(positions, velocity, index, center, initial = false) {
      const offset = index * 3;
      const radius = this.snowState?.radius ?? 210;
      const top = this.snowState?.top ?? 86;
      const bottom = this.snowState?.bottom ?? -10;
      const flow = this.getSnowStormFlow(center);
  
      if (flow) {
        const along = radius * randRange(initial ? 0.18 : 0.88, initial ? 1.04 : 1.18);
        const lateral = radius * randRange(0.04, 0.42);
        const sideOffset = THREE.MathUtils.randFloatSpread(lateral * 2);
        positions[offset] = center.x - flow.dirX * along + flow.sideX * sideOffset;
        positions[offset + 1] = center.y + (initial ? Math.random() * (top - bottom) + bottom : top + Math.random() * 12);
        positions[offset + 2] = center.z - flow.dirZ * along + flow.sideZ * sideOffset;
        velocity[offset] = flow.dirX * flow.speed + flow.sideX * THREE.MathUtils.randFloatSpread(4.6);
        velocity[offset + 1] = randRange(18, 46) * (1 - flow.lift);
        velocity[offset + 2] = flow.dirZ * flow.speed + flow.sideZ * THREE.MathUtils.randFloatSpread(4.6);
        return;
      }
  
      positions[offset] = center.x + THREE.MathUtils.randFloatSpread(radius * 2);
      positions[offset + 1] = center.y + (initial ? Math.random() * (top - bottom) + bottom : top + Math.random() * 18);
      positions[offset + 2] = center.z + THREE.MathUtils.randFloatSpread(radius * 2);
      velocity[offset] = THREE.MathUtils.randFloatSpread(4.2);
      velocity[offset + 1] = randRange(16, 42);
      velocity[offset + 2] = THREE.MathUtils.randFloatSpread(4.2);
    }

  EnvironmentBuilder.prototype.updateSnow = function updateSnow(dt) {
      if (!this.snowPoints || !this.snowState) return;
  
      const intensity = this.getFrostSnowIntensity();
      const stormBlend = this.frostStormBlend ?? 0;
      const blizzard = this.game.enemies?.getFrostBlizzardState?.();
      const snowBurstActive = Boolean(blizzard?.telegraphActive || blizzard?.active);
      const playerPos = this.game.store.playerMesh?.position ?? new THREE.Vector3();
      const { positions, velocity, count, baseCount = Math.floor(count * 0.5), radius, top, bottom } = this.snowState;
      const maxShare = THREE.MathUtils.lerp(0.72, 0.9, stormBlend);
      const normalActiveCount = THREE.MathUtils.lerp(baseCount * 0.18, baseCount * maxShare, intensity);
      const activeCount = Math.min(count, Math.floor(normalActiveCount * (snowBurstActive ? 2 : 1)));
      const flow = this.getSnowStormFlow(playerPos);
      this.snowState.activeCount = activeCount;
      this.snowPoints.geometry.setDrawRange(0, activeCount);
      this.snowPoints.material.opacity = THREE.MathUtils.lerp(0.16, 0.42, Math.min(1, intensity * 0.7 + stormBlend * 0.32));
      this.snowPoints.material.size = THREE.MathUtils.lerp(0.2, 0.54, Math.min(1, intensity * 0.62 + stormBlend * 0.34));
  
      const swirl = intensity * 0.78 + stormBlend * 1.8;
      const fallMul = 1 + stormBlend * 0.35;
      const forwardLimit = radius * 0.44;
      const backLimit = -radius * 1.18;
      const sideLimit = radius * 0.82;
  
      for (let i = 0; i < activeCount; i += 1) {
        const offset = i * 3;
        positions[offset] += (velocity[offset] + Math.sin(this.localTime * 0.95 + i * 0.37) * swirl) * dt;
        positions[offset + 1] -= velocity[offset + 1] * fallMul * dt;
        positions[offset + 2] += (velocity[offset + 2] + Math.cos(this.localTime * 0.82 + i * 0.29) * swirl) * dt;
  
        if (positions[offset + 1] < playerPos.y + bottom) {
          this.resetSnowParticle(positions, velocity, i, playerPos, false);
          continue;
        }
  
        if (flow) {
          const relX = positions[offset] - playerPos.x;
          const relZ = positions[offset + 2] - playerPos.z;
          const forward = relX * flow.dirX + relZ * flow.dirZ;
          const side = relX * flow.sideX + relZ * flow.sideZ;
          if (forward > forwardLimit || forward < backLimit || Math.abs(side) > sideLimit) {
            this.resetSnowParticle(positions, velocity, i, playerPos, false);
            continue;
          }
        } else {
          if (positions[offset] > playerPos.x + radius) positions[offset] -= radius * 2;
          else if (positions[offset] < playerPos.x - radius) positions[offset] += radius * 2;
          if (positions[offset + 2] > playerPos.z + radius) positions[offset + 2] -= radius * 2;
          else if (positions[offset + 2] < playerPos.z - radius) positions[offset + 2] += radius * 2;
        }
        if (positions[offset + 1] > playerPos.y + top + 28) positions[offset + 1] = playerPos.y + top;
      }
  
      this.snowPoints.geometry.attributes.position.needsUpdate = true;
    }

  EnvironmentBuilder.prototype.updateFrostMist = function updateFrostMist() {
      if (!this.frostMistPoints || !this.frostMistState) return;
  
      const blend = this.frostStormBlend ?? 0;
      if (blend <= 0.001) {
        this.frostMistPoints.geometry.setDrawRange(0, 0);
        this.frostMistPoints.material.opacity = 0;
        return;
      }
  
      const playerPos = this.game.store.playerMesh?.position ?? new THREE.Vector3();
      const { positions, radius, height, phase, spin, wobble, count } = this.frostMistState;
      const activeCount = Math.max(12, Math.floor(count * (0.24 + blend * 0.3)));
      this.frostMistPoints.geometry.setDrawRange(0, activeCount);
      this.frostMistPoints.material.opacity = THREE.MathUtils.lerp(0.03, 0.11, blend);
      this.frostMistPoints.material.size = THREE.MathUtils.lerp(1.1, 2.2, blend);
      for (let i = 0; i < activeCount; i += 1) {
        phase[i] += spin[i] * (0.62 + blend * 1.08);
        const offset = i * 3;
        positions[offset] = playerPos.x + Math.cos(phase[i] * (1 + wobble[i] * 0.16)) * radius[i] + Math.sin(this.localTime * (0.34 + wobble[i] * 0.15) + i) * wobble[i] * 0.42;
        positions[offset + 1] = playerPos.y + height[i] + Math.sin(this.localTime * (0.66 + wobble[i] * 0.18) + i * 0.3) * 0.2;
        positions[offset + 2] = playerPos.z + Math.sin(phase[i] * (1.06 + wobble[i] * 0.14)) * radius[i] + Math.cos(this.localTime * (0.38 + wobble[i] * 0.14) + i) * wobble[i] * 0.42;
      }
  
      this.frostMistPoints.geometry.attributes.position.needsUpdate = true;
    }

  EnvironmentBuilder.prototype.updateFrostBlizzardDome = function updateFrostBlizzardDome() {
      if (!this.frostDomeMesh) return;
      const blizzard = this.game.enemies?.getFrostBlizzardState?.();
      if (!blizzard?.telegraphActive) {
        this.frostDomeMesh.visible = false;
        this.frostDomeMesh.material.opacity = 0;
        return;
      }
  
      const duration = Math.max(0.001, blizzard.telegraphDuration ?? 1.25);
      const progress = THREE.MathUtils.clamp(1 - ((blizzard.telegraphTimer ?? 0) / duration), 0, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      const radius = THREE.MathUtils.lerp(3.5, 19, eased);
      this.frostDomeMesh.visible = true;
      this.frostDomeMesh.position.set(blizzard.sourceX ?? 0, blizzard.sourceY ?? 0, blizzard.sourceZ ?? 0);
      this.frostDomeMesh.scale.set(radius, radius * 0.58, radius);
      this.frostDomeMesh.material.opacity = (1 - eased) * 0.14 + 0.03;
    }


  EnvironmentBuilder.prototype.updateFrostWeather = function updateFrostWeather(dt) {
      if (this.currentMissionId !== 'frost') return;
      const blizzard = this.game.enemies?.getFrostBlizzardState?.();
      const targetStorm = blizzard?.active ? 1 : 0;
      this.frostStormBlend = THREE.MathUtils.lerp(this.frostStormBlend ?? 0, targetStorm, 1 - Math.exp(-dt * 2.4));
      if (this.game.renderer.scene?.fog) this.game.renderer.scene.fog.density = THREE.MathUtils.lerp(this.frostBaseFogDensity, this.frostBaseFogDensity * 1.32, this.frostStormBlend);
      this.updateSnow(dt);
      this.updateFrostMist();
      this.updateFrostBlizzardDome();
    }

}

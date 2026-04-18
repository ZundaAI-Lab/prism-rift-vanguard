/**
 * Responsibility:
 * - 星礁テーマの装飾配置と gel field 登録を担当する。
 *
 * Rules:
 * - astral 固有 decor と gel 登録は同じテーマ責務としてこのファイルに置く。
 */
import { PLAYER_TRAVEL, THREE, randChoice, randRange } from '../../EnvironmentBuilderShared.js';

export function installAstralDecor(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.addAstralDecor = function addAstralDecor(group) {
      const staticGroup = this.staticDecorGroup ?? group;
      const gelPlacements = [];
      const centralGelCount = 2;
      const outerGelCount = 4;
      const peripheryMinRadius = 78;
      const centralSpawnSafeRadius = 26;
      const coralCount = 36;
      const shellCount = 18;
      const coralColliderRadius = 2.8;
      const shellColliderRadius = 3.2;
      const decorGelPadding = 12;
  
      const buildGelPlacement = (x, z, sizeBias = 1) => {
        const radiusX = randRange(8.8, 14.8) * 4.0 * sizeBias;
        const radiusY = randRange(3.8, 6.2) * 4.0 * sizeBias;
        const radiusZ = randRange(8.2, 13.6) * 4.0 * sizeBias;
        return {
          x,
          z,
          radiusX,
          radiusY,
          radiusZ,
          footprint: Math.max(radiusX, radiusZ) * 1.06,
        };
      };
  
      const isPlacementWithinTravelArea = (placement) => Math.abs(placement.x) <= PLAYER_TRAVEL.radius && Math.abs(placement.z) <= PLAYER_TRAVEL.radius;
  
      const getPlacementAxisDistanceLimit = (axisX, axisZ) => {
        const maxByX = Math.abs(axisX) > 1e-4 ? PLAYER_TRAVEL.radius / Math.abs(axisX) : Number.POSITIVE_INFINITY;
        const maxByZ = Math.abs(axisZ) > 1e-4 ? PLAYER_TRAVEL.radius / Math.abs(axisZ) : Number.POSITIVE_INFINITY;
        return Math.min(maxByX, maxByZ);
      };
  
      const overlapsGelPlacement = (x, z, placementRadius = 0, padding = decorGelPadding) => gelPlacements.some(
        (gel) => Math.hypot(gel.x - x, gel.z - z) < (gel.footprint + placementRadius + padding),
      );
  
      const centralAxisAngle = randRange(0, Math.PI * 2);
      const centralAxisX = Math.cos(centralAxisAngle);
      const centralAxisZ = Math.sin(centralAxisAngle);
      for (let side = 0; side < centralGelCount; side += 1) {
        const direction = side === 0 ? -1 : 1;
        const placement = buildGelPlacement(0, 0, randRange(0.82, 0.9));
        const desiredDistance = centralSpawnSafeRadius + placement.footprint + randRange(10, 18);
        const maxDistance = getPlacementAxisDistanceLimit(centralAxisX, centralAxisZ);
        const minimumDistance = Math.min(centralSpawnSafeRadius + placement.footprint * 0.42, maxDistance);
        const centerDistance = Math.max(minimumDistance, Math.min(desiredDistance, maxDistance));
        placement.x = centralAxisX * centerDistance * direction;
        placement.z = centralAxisZ * centerDistance * direction;
        if (isPlacementWithinTravelArea(placement)) gelPlacements.push(placement);
      }
  
      for (let i = 0; i < outerGelCount; i += 1) {
        let placement = null;
        for (let tries = 0; tries < 48 && !placement; tries += 1) {
          const candidate = buildGelPlacement(0, 0, randRange(0.92, 1.08));
          const x = randRange(-PLAYER_TRAVEL.radius, PLAYER_TRAVEL.radius);
          const z = randRange(-PLAYER_TRAVEL.radius, PLAYER_TRAVEL.radius);
          const radial = Math.hypot(x, z);
          if (radial < peripheryMinRadius) continue;
  
          candidate.x = x;
          candidate.z = z;
          if (!isPlacementWithinTravelArea(candidate)) continue;
  
          const overlapsExisting = gelPlacements.some((existing) => Math.hypot(existing.x - x, existing.z - z) < (existing.footprint + candidate.footprint + 16));
          if (overlapsExisting) continue;
  
          placement = candidate;
        }
        if (!placement) {
          for (let tries = 0; tries < 24 && !placement; tries += 1) {
            const candidate = buildGelPlacement(0, 0, randRange(0.92, 1.08));
            const fallbackAngle = randRange(0, Math.PI * 2);
            const maxDistance = getPlacementAxisDistanceLimit(Math.cos(fallbackAngle), Math.sin(fallbackAngle));
            const fallbackRadius = Math.min(randRange(peripheryMinRadius, PLAYER_TRAVEL.radius), maxDistance);
            if (!Number.isFinite(fallbackRadius) || fallbackRadius < peripheryMinRadius) continue;
            candidate.x = Math.cos(fallbackAngle) * fallbackRadius;
            candidate.z = Math.sin(fallbackAngle) * fallbackRadius;
            if (!isPlacementWithinTravelArea(candidate)) continue;
            const overlapsExisting = gelPlacements.some((existing) => Math.hypot(existing.x - candidate.x, existing.z - candidate.z) < (existing.footprint + candidate.footprint + 16));
            if (overlapsExisting) continue;
            placement = candidate;
          }
        }
        if (!placement) {
          const candidate = buildGelPlacement(0, 0, 0.96);
          const fallbackAngle = (i / Math.max(outerGelCount, 1)) * Math.PI * 2 + randRange(-0.22, 0.22);
          const axisX = Math.cos(fallbackAngle);
          const axisZ = Math.sin(fallbackAngle);
          const maxDistance = getPlacementAxisDistanceLimit(axisX, axisZ);
          const preferredRadius = Math.max(peripheryMinRadius, PLAYER_TRAVEL.radius * 0.78);
          const fallbackRadius = Math.min(maxDistance - 4, preferredRadius);
          if (Number.isFinite(fallbackRadius) && fallbackRadius > 12) {
            candidate.x = axisX * fallbackRadius;
            candidate.z = axisZ * fallbackRadius;
            if (isPlacementWithinTravelArea(candidate)) placement = candidate;
          }
        }
        if (placement) gelPlacements.push(placement);
      }
  
      let coralPlaced = 0;
      for (let tries = 0; coralPlaced < coralCount && tries < coralCount * 16; tries += 1) {
        const x = THREE.MathUtils.randFloatSpread(360);
        const z = THREE.MathUtils.randFloatSpread(360);
        if (overlapsGelPlacement(x, z, coralColliderRadius)) continue;
        const y = this.terrain.getHeight(x, z);
        const coral = new THREE.Group();
        const stemMat = new THREE.MeshStandardMaterial({ color: randChoice([0x4c4fff, 0x5f2cff, 0x813dff]), emissive: 0x211b6d, emissiveIntensity: 0.38, roughness: 0.48, metalness: 0.12 });
        const tipMat = new THREE.MeshStandardMaterial({ color: randChoice([0x7cf6ff, 0xff95f2, 0x8ffff4]), emissive: randChoice([0x6cecff, 0xff82ea, 0x80fff4]), emissiveIntensity: 1.1, roughness: 0.14, metalness: 0.18 });
        for (let branch = 0; branch < 3; branch += 1) {
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, randRange(3.2, 6.4), 8), stemMat);
          stem.position.y = stem.geometry.parameters.height * 0.5;
          stem.rotation.z = randRange(-0.3, 0.3);
          stem.rotation.x = randRange(-0.12, 0.12);
          stem.rotation.y = (branch / 3) * Math.PI * 2;
          const tip = new THREE.Mesh(new THREE.IcosahedronGeometry(randRange(0.55, 1.1), 0), tipMat);
          tip.position.y = stem.geometry.parameters.height * 0.52;
          stem.add(tip);
          coral.add(stem);
        }
        coral.position.set(x, y, z);
        coral.rotation.y = Math.random() * Math.PI * 2;
        staticGroup.add(coral);
        this.registerStaticCollider(coral, coralColliderRadius, 2.4);
        coralPlaced += 1;
      }
  
      let shellPlaced = 0;
      for (let tries = 0; shellPlaced < shellCount && tries < shellCount * 20; tries += 1) {
        const x = THREE.MathUtils.randFloatSpread(330);
        const z = THREE.MathUtils.randFloatSpread(330);
        if (overlapsGelPlacement(x, z, shellColliderRadius, decorGelPadding + 6)) continue;
        const y = this.terrain.getHeight(x, z) + randRange(5, 12);
        const shell = new THREE.Mesh(
          new THREE.TorusKnotGeometry(randRange(1.8, 3.8), 0.18, 64, 8),
          new THREE.MeshStandardMaterial({ color: 0x9de9ff, emissive: 0xff89f0, emissiveIntensity: 0.65, roughness: 0.12, metalness: 0.28 }),
        );
        shell.position.set(x, y, z);
        shell.rotation.set(randRange(0, Math.PI), randRange(0, Math.PI), randRange(0, Math.PI));
        staticGroup.add(shell);
        this.registerStaticCollider(shell, shellColliderRadius, 0.0);
        shellPlaced += 1;
      }
  
      for (const placement of gelPlacements) {
        const { x, z, radiusX, radiusY, radiusZ } = placement;
        const groundY = this.terrain.getHeight(x, z);
        const field = new THREE.Group();
        const pulseSpeed = randRange(0.6, 1.25);
        const floatSpeed = randRange(0.35, 0.75);
        const floatAmp = randRange(0.18, 0.46) * 1.4;
        const baseY = groundY + randRange(1.7, 2.8) + radiusY * 0.08;
  
        const membraneMaterial = new THREE.MeshPhysicalMaterial({
          color: randChoice([0x74e5ff, 0x73b5ff, 0xb68bff]),
          emissive: randChoice([0x2d93ff, 0x3b6dff, 0xa14dff]),
          emissiveIntensity: 0.42,
          roughness: 0.08,
          metalness: 0.0,
          transmission: 0.0,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          clearcoat: 0.65,
          clearcoatRoughness: 0.18,
        });
        const innerMaterial = new THREE.MeshStandardMaterial({
          color: randChoice([0xc8f6ff, 0xc4d4ff, 0xe5c7ff]),
          emissive: randChoice([0x87eaff, 0x8bb7ff, 0xf09dff]),
          emissiveIntensity: 0.58,
          roughness: 0.16,
          metalness: 0.0,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        });
  
        const core = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), membraneMaterial);
        core.scale.set(radiusX, radiusY, radiusZ);
        core.castShadow = false;
        core.receiveShadow = false;
        field.add(core);
  
        const innerCore = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), innerMaterial);
        innerCore.scale.set(radiusX * 0.58, radiusY * 0.62, radiusZ * 0.58);
        field.add(innerCore);
  
        const lobeCount = 4 + Math.floor(Math.random() * 3);
        const lobes = [];
        for (let lobeIndex = 0; lobeIndex < lobeCount; lobeIndex += 1) {
          const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), membraneMaterial.clone());
          const angle = (Math.PI * 2 * lobeIndex) / lobeCount + randRange(-0.35, 0.35);
          const offsetRadius = randRange(radiusX * 0.24, radiusX * 0.52);
          const lobeScale = randRange(0.28, 0.42);
          lobe.scale.set(radiusX * lobeScale, radiusY * randRange(0.58, 0.92), radiusZ * lobeScale);
          lobe.position.set(Math.cos(angle) * offsetRadius, randRange(-radiusY * 0.12, radiusY * 0.22), Math.sin(angle) * offsetRadius * (radiusZ / radiusX));
          field.add(lobe);
          lobes.push({
            mesh: lobe,
            basePosition: lobe.position.clone(),
            baseScale: lobe.scale.clone(),
            bobPhase: Math.random() * Math.PI * 2,
            bobAmp: randRange(0.12, 0.36),
          });
        }
  
        const shimmer = new THREE.Mesh(
          new THREE.CircleGeometry(Math.max(radiusX, radiusZ) * randRange(0.76, 0.92), 40),
          new THREE.MeshBasicMaterial({ color: 0xaaf6ff, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        shimmer.rotation.x = -Math.PI / 2;
        shimmer.position.y = -radiusY * 0.56;
        field.add(shimmer);
  
        field.position.set(x, baseY, z);
        field.rotation.y = Math.random() * Math.PI * 2;
        field.userData.astralGel = {
          core,
          innerCore,
          lobes,
          shimmer,
          pulseSpeed,
          floatSpeed,
          floatAmp,
          baseY,
        };
        group.add(field);
        this.registerAstralGelField({
          source: field,
          radiusX,
          radiusY: radiusY * 1.08,
          radiusZ,
          speedScale: 0.5,
        });
      }
    }


  EnvironmentBuilder.prototype.updateAstralDecor = function updateAstralDecor() {
      if (this.currentMissionId !== 'astral' || !Array.isArray(this.astralGelFields)) return;
      for (const field of this.astralGelFields) {
        const state = field?.source?.userData?.astralGel;
        if (!state) continue;
        const t = this.localTime;
        const pulse = 1 + Math.sin(t * state.pulseSpeed + (field.radiusX ?? 1) * 0.17) * 0.06;
        state.core.scale.set((field.radiusX ?? 1) * pulse, (field.radiusY ?? 1) * (0.96 + Math.sin(t * state.pulseSpeed * 1.4) * 0.08), (field.radiusZ ?? 1) * (1 + Math.cos(t * state.pulseSpeed * 1.1) * 0.05));
        state.innerCore.scale.set((field.radiusX ?? 1) * 0.58 * (1 + Math.sin(t * (state.pulseSpeed * 1.8)) * 0.05), (field.radiusY ?? 1) * 0.62 * (1 + Math.cos(t * (state.pulseSpeed * 1.35)) * 0.06), (field.radiusZ ?? 1) * 0.58 * (1 + Math.sin(t * (state.pulseSpeed * 1.5) + 1.2) * 0.05));
        field.source.position.y = state.baseY + Math.sin(t * state.floatSpeed + (field.radiusZ ?? 1) * 0.21) * state.floatAmp;
        for (const lobe of state.lobes ?? []) {
          lobe.mesh.position.copy(lobe.basePosition);
          lobe.mesh.position.y += Math.sin(t * (state.pulseSpeed * 1.6) + lobe.bobPhase) * lobe.bobAmp;
          const lobePulse = 1 + Math.sin(t * (state.pulseSpeed * 2.0) + lobe.bobPhase) * 0.07;
          lobe.mesh.scale.set(lobe.baseScale.x * lobePulse, lobe.baseScale.y * (1 + Math.cos(t * (state.pulseSpeed * 1.5) + lobe.bobPhase) * 0.05), lobe.baseScale.z * lobePulse);
        }
        if (state.shimmer?.material) state.shimmer.material.opacity = 0.11 + Math.sin(t * (state.floatSpeed * 2.8)) * 0.03;
      }
      this.refreshAstralGelFields?.();
    }

}

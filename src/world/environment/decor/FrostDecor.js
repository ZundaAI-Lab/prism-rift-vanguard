/**
 * Responsibility:
 * - 氷域テーマの装飾配置を担当する。
 *
 * Rules:
 * - frost の art variation だけを扱う。
 */
import { THREE, randRange } from '../../EnvironmentBuilderShared.js';

export function installFrostDecor(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.addFrostDecor = function addFrostDecor(group) {
      const staticGroup = this.staticDecorGroup ?? group;
      for (let i = 0; i < 90; i += 1) {
        const x = THREE.MathUtils.randFloatSpread(360);
        const z = THREE.MathUtils.randFloatSpread(360);
        const y = this.terrain.getHeight(x, z);
        const height = randRange(3.2, 10.5);
        const shardRadius = randRange(0.5, 1.4);
        const shard = new THREE.Mesh(
          new THREE.ConeGeometry(shardRadius, height, 6),
          new THREE.MeshStandardMaterial({ color: 0xebf4fb, emissive: 0x496e89, emissiveIntensity: 0.1, roughness: 0.74, metalness: 0.03 }),
        );
        shard.position.set(x, y + height * 0.5, z);
        shard.rotation.y = Math.random() * Math.PI * 2;
        shard.castShadow = true;
        staticGroup.add(shard);
        this.registerStaticCollider(shard, Math.max(0.28, shardRadius * 0.52), 0.0, {
          verticalRadius: height * 0.5,
          halfHeight: height * 0.5,
        });
      }
      for (let i = 0; i < 18; i += 1) {
        const x = THREE.MathUtils.randFloatSpread(320);
        const z = THREE.MathUtils.randFloatSpread(320);
        const y = this.terrain.getHeight(x, z);
        const floe = new THREE.Group();
        const coreRadius = randRange(2.1, 3.8);
        const coreHeight = randRange(4.4, 7.6);
        const coreMat = new THREE.MeshStandardMaterial({
          color: 0xf3fbff,
          emissive: 0x6b93af,
          emissiveIntensity: 0.1,
          roughness: 0.46,
          metalness: 0.05,
          transparent: true,
          opacity: 0.92,
        });
        const edgeMat = new THREE.MeshStandardMaterial({
          color: 0xe6f7ff,
          emissive: 0x8eb5ca,
          emissiveIntensity: 0.14,
          roughness: 0.32,
          metalness: 0.06,
          transparent: true,
          opacity: 0.84,
        });

        const floeCollisionDiscs = [];
        let floeTop = 0;

        const pushFloeDisc = (x, yPos, z, radius, halfHeight) => {
          const safeRadius = Math.max(0.2, radius);
          const safeHalfHeight = Math.max(0.28, halfHeight);
          floeCollisionDiscs.push({
            x,
            y: yPos,
            z,
            radius: safeRadius,
            halfHeight: safeHalfHeight,
          });
          floeTop = Math.max(floeTop, yPos + safeHalfHeight);
        };

        const core = new THREE.Mesh(new THREE.OctahedronGeometry(coreRadius, 0), coreMat);
        core.position.y = coreHeight * 0.46;
        core.scale.set(randRange(1.15, 1.45), coreHeight / (coreRadius * 1.8), randRange(0.9, 1.15));
        core.rotation.set(randRange(-0.24, 0.24), Math.random() * Math.PI * 2, randRange(-0.18, 0.18));
        core.castShadow = true;
        floe.add(core);
        pushFloeDisc(
          0,
          core.position.y,
          0,
          Math.max(0.84, coreRadius * 0.56),
          Math.max(1.1, coreRadius * core.scale.y * 0.95),
        );

        const shardCount = 4 + Math.floor(Math.random() * 3);
        for (let shardIndex = 0; shardIndex < shardCount; shardIndex += 1) {
          const shard = new THREE.Mesh(
            new THREE.OctahedronGeometry(coreRadius * randRange(0.34, 0.58), 0),
            (shardIndex % 2 === 0 ? edgeMat : coreMat).clone(),
          );
          const angle = (Math.PI * 2 * shardIndex) / shardCount + randRange(-0.24, 0.24);
          const radius = coreRadius * randRange(0.72, 1.28);
          shard.position.set(
            Math.cos(angle) * radius,
            randRange(0.9, coreHeight * 0.72),
            Math.sin(angle) * radius,
          );
          shard.rotation.set(randRange(-0.55, 0.55), Math.random() * Math.PI * 2, randRange(-0.45, 0.45));
          shard.scale.set(randRange(0.6, 0.92), randRange(1.1, 1.85), randRange(0.6, 0.92));
          shard.castShadow = true;
          floe.add(shard);
          const shardRadius = shard.geometry.parameters.radius ?? (coreRadius * 0.4);
          pushFloeDisc(
            shard.position.x * 0.9,
            shard.position.y,
            shard.position.z * 0.9,
            Math.max(0.34, coreRadius * 0.22),
            Math.max(0.75, shardRadius * shard.scale.y * 0.95),
          );
        }

        if (Math.random() < 0.75) {
          const cap = new THREE.Mesh(
            new THREE.CylinderGeometry(coreRadius * 0.72, coreRadius * 1.08, randRange(0.6, 1.2), 7),
            new THREE.MeshStandardMaterial({ color: 0xd8e8f3, emissive: 0x42627a, emissiveIntensity: 0.06, roughness: 0.84, metalness: 0.02 }),
          );
          cap.position.y = cap.geometry.parameters.height * 0.48;
          cap.rotation.y = Math.random() * Math.PI * 2;
          floe.add(cap);
        }

        const floeHalfHeight = Math.max(1.0, floeTop);
        floe.position.set(x, y, z);
        floe.rotation.y = Math.random() * Math.PI * 2;
        staticGroup.add(floe);
        this.registerStaticCollider(floe, coreRadius * 0.88, 0.0, {
          verticalRadius: floeHalfHeight,
          halfHeight: floeHalfHeight,
          playerCollisionModel: 'compound',
          playerCollisionDiscs: floeCollisionDiscs,
        });
      }
    }

}

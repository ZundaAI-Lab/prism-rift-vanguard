/**
 * Responsibility:
 * - 砂漠テーマの装飾配置を担当する。
 *
 * Rules:
 * - desert の art variation だけを扱い、他テーマの分岐を混ぜない。
 */
import { THREE, randChoice, randRange } from '../../EnvironmentBuilderShared.js';

export function installDesertDecor(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.addDesertDecor = function addDesertDecor(group) {
      const staticGroup = this.staticDecorGroup ?? group;
      for (let i = 0; i < 70; i += 1) {
        const x = THREE.MathUtils.randFloatSpread(360);
        const z = THREE.MathUtils.randFloatSpread(360);
        const y = this.terrain.getHeight(x, z);
        const crystalColor = randChoice([0x79d8ff, 0xff93d8, 0x8bffef]);
        const crystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(randRange(0.8, 2.4), 0),
          new THREE.MeshPhysicalMaterial({
            color: crystalColor,
            emissive: crystalColor,
            emissiveIntensity: 0.1,
            roughness: 0.06,
            metalness: 0.05,
            clearcoat: 0.46,
            clearcoatRoughness: 0.07,
            transmission: 0.8,
            ior: 1.38,
            thickness: 1.5,
            transparent: true,
            opacity: 0.76,
          }),
        );
        crystal.position.set(x, y + 0.9, z);
        crystal.scale.y = randRange(1.2, 3.3);
        crystal.rotation.y = Math.random() * Math.PI * 2;
        crystal.castShadow = true;
        staticGroup.add(crystal);
        this.registerStaticCollider(crystal, 1.2 + crystal.scale.y * 0.45);
      }
      for (let i = 0; i < 30; i += 1) {
        const x = THREE.MathUtils.randFloatSpread(350);
        const z = THREE.MathUtils.randFloatSpread(350);
        const y = this.terrain.getHeight(x, z);
        const cluster = new THREE.Group();
        const height = randRange(4.2, 8.6);
        const gemRadius = randRange(1.8, 3.2);
        const gemColor = randChoice([0x79d8ff, 0xff93d8, 0x8bffef, 0xd8b3ff]);
        const gemMaterial = new THREE.MeshPhysicalMaterial({
          color: gemColor,
          emissive: gemColor,
          emissiveIntensity: 0.14,
          roughness: 0.05,
          metalness: 0.08,
          clearcoat: 0.62,
          clearcoatRoughness: 0.05,
          transmission: 0.82,
          ior: 1.42,
          thickness: 2.0,
          transparent: true,
          opacity: 0.76,
        });
  
  
        const coreGem = new THREE.Mesh(
          new THREE.OctahedronGeometry(gemRadius, 0),
          gemMaterial,
        );
        coreGem.position.y = height * 0.58;
        coreGem.scale.set(0.95, height / (gemRadius * 1.6), 0.95);
        coreGem.castShadow = true;
        cluster.add(coreGem);
  
        for (let shardIndex = 0; shardIndex < 3; shardIndex += 1) {
          const shard = new THREE.Mesh(
            new THREE.OctahedronGeometry(gemRadius * randRange(0.32, 0.48), 0),
            gemMaterial.clone(),
          );
          const angle = (Math.PI * 2 * shardIndex) / 3 + randRange(-0.22, 0.22);
          const radius = gemRadius * randRange(0.92, 1.25);
          shard.position.set(Math.cos(angle) * radius, height * randRange(0.28, 0.44), Math.sin(angle) * radius);
          shard.rotation.set(randRange(-0.45, 0.45), Math.random() * Math.PI * 2, randRange(-0.45, 0.45));
          shard.scale.set(randRange(0.72, 0.92), randRange(1.25, 1.9), randRange(0.72, 0.92));
          shard.castShadow = true;
          cluster.add(shard);
        }
  
        cluster.position.set(x, y, z);
        cluster.rotation.y = Math.random() * Math.PI * 2;
        staticGroup.add(cluster);
        this.registerStaticCollider(cluster, gemRadius * 1.35, height * 0.5, {
          verticalRadius: Math.max(height * 0.6, gemRadius * 1.6),
        });
      }
    }

}

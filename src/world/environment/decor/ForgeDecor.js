/**
 * Responsibility:
 * - 鍛炉テーマの装飾配置を担当する。
 *
 * Rules:
 * - forge の art variation だけを扱う。
 */
import { THREE, randRange } from '../../EnvironmentBuilderShared.js';

export function installForgeDecor(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.addForgeDecor = function addForgeDecor(group) {
      const staticGroup = this.staticDecorGroup ?? group;
      for (let i = 0; i < 80; i += 1) {
        const x = THREE.MathUtils.randFloatSpread(360);
        const z = THREE.MathUtils.randFloatSpread(360);
        const y = this.terrain.getHeight(x, z);
        const height = randRange(4.0, 12.0);
        const topRadius = randRange(0.5, 1.5);
        const bottomRadius = randRange(0.7, 2.0);
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(topRadius, bottomRadius, height, 6),
          new THREE.MeshStandardMaterial({ color: 0x4f2a21, emissive: 0x2d0f0a, emissiveIntensity: 0.46, roughness: 0.9, metalness: 0.15 }),
        );
        pillar.position.set(x, y + height * 0.5, z);
        pillar.castShadow = true;
        pillar.rotation.y = Math.random() * Math.PI * 2;
        staticGroup.add(pillar);
        this.registerStaticCollider(pillar, Math.max(topRadius, bottomRadius) + 0.16, 0.0, {
          verticalRadius: height * 0.5,
          halfHeight: height * 0.5,
        });
        if (Math.random() < 0.58) {
          const ember = new THREE.Mesh(
            new THREE.OctahedronGeometry(randRange(0.45, 1.15), 0),
            new THREE.MeshStandardMaterial({ color: 0xff9f63, emissive: 0xff7d52, emissiveIntensity: 1.4, metalness: 0.4, roughness: 0.25 }),
          );
          ember.position.set(x, pillar.position.y + height * 0.48, z);
          staticGroup.add(ember);
        }
      }
    }

}

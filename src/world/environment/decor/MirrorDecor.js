/**
 * Responsibility:
 * - 鏡都テーマの装飾配置を担当する。
 *
 * Rules:
 * - mirror の art variation だけを扱う。
 */
import { THREE, randRange } from '../../EnvironmentBuilderShared.js';

export function installMirrorDecor(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.addMirrorDecor = function addMirrorDecor(group) {
      const staticGroup = this.staticDecorGroup ?? group;
      for (let i = 0; i < 65; i += 1) {
        const x = THREE.MathUtils.randFloatSpread(350);
        const z = THREE.MathUtils.randFloatSpread(350);
        const y = this.terrain.getHeight(x, z);
        const width = randRange(1.6, 3.4);
        const height = randRange(6.0, 12.0);
        const depth = randRange(0.3, 0.8);
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, depth),
          new THREE.MeshPhysicalMaterial({
            color: 0xf4f7ff,
            emissive: 0x6b8dff,
            emissiveIntensity: 0.18,
            roughness: 0.02,
            metalness: 0.98,
            clearcoat: 1.0,
            clearcoatRoughness: 0.02,
            reflectivity: 1.0,
          }),
        );
        slab.position.set(x, y + height * 0.5, z);
        slab.rotation.y = Math.random() * Math.PI * 2;
        slab.castShadow = true;
        staticGroup.add(slab);
        this.registerStaticCollider(slab, Math.hypot(width * 0.5, depth * 0.5), 0, {
          reflective: true,
          reflectionModel: 'plane',
          playerCollisionModel: 'obb',
          surfaceNormalLocal: new THREE.Vector3(0, 0, 1),
          localHalfExtents: new THREE.Vector3(
            width * 0.5,
            height * 0.5,
            depth * 0.5,
          ),
          verticalRadius: height * 0.5,
          halfHeight: height * 0.5,
        });
      }
    }

}

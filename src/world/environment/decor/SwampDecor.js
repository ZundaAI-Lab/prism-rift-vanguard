/**
 * Responsibility:
 * - 湿地テーマの装飾配置を担当する。
 *
 * Rules:
 * - swamp の art variation だけを扱う。
 */
import { THREE, randChoice, randRange } from '../../EnvironmentBuilderShared.js';

export function installSwampDecor(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.addSwampDecor = function addSwampDecor(group) {
      const staticGroup = this.staticDecorGroup ?? group;
      for (let i = 0; i < 85; i += 1) {
        const x = THREE.MathUtils.randFloatSpread(360);
        const z = THREE.MathUtils.randFloatSpread(360);
        const y = this.terrain.getHeight(x, z);
        const height = randRange(2.4, 7.0);
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.24, height, 8),
          new THREE.MeshStandardMaterial({ color: 0x31533c, emissive: 0x122117, emissiveIntensity: 0.24, roughness: 0.9, metalness: 0.05 }),
        );
        stem.position.set(x, y + height * 0.5, z);
        stem.castShadow = true;
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(randRange(1.0, 2.4), 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({
            color: randChoice([0x8aff80, 0x53ffce, 0xddff6d]),
            emissive: randChoice([0x5dff8b, 0x3bffb9, 0xd0ff55]),
            emissiveIntensity: 1.1,
            roughness: 0.28,
            metalness: 0.08,
          }),
        );
        cap.position.set(x, stem.position.y + height * 0.45, z);
        staticGroup.add(stem, cap);
        this.registerStaticCollider(stem, 0.85 + height * 0.18, height * 0.15);
      }
      for (let i = 0; i < 26; i += 1) {
        const x = THREE.MathUtils.randFloatSpread(350);
        const z = THREE.MathUtils.randFloatSpread(350);
        const y = this.terrain.getHeight(x, z) + 0.08;
        const pool = new THREE.Mesh(
          new THREE.CircleGeometry(randRange(3.5, 8.8), 32),
          new THREE.MeshBasicMaterial({ color: randChoice([0x53ff9d, 0x98ff6d, 0x52ffd6]), transparent: true, opacity: 0.28 }),
        );
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(x, y, z);
        group.add(pool);
      }
    }

}

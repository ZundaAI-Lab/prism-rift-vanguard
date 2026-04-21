/**
 * Responsibility:
 * - Void Crown テーマの装飾配置を担当する。
 *
 * Rules:
 * - void_crown の art variation だけを扱う。
 */
import { THREE } from '../../EnvironmentBuilderShared.js';

export function installVoidCrownDecor(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.addVoidCrownDecor = function addVoidCrownDecor(group) {
      const staticGroup = this.staticDecorGroup ?? group;
      const crownMat = new THREE.MeshStandardMaterial({ color: 0x30253c, emissive: 0x120814, emissiveIntensity: 0.12, roughness: 0.64, metalness: 0.46 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc07d, emissive: 0xff7b57, emissiveIntensity: 0.68, roughness: 0.18, metalness: 0.62 });
      const paleMat = new THREE.MeshStandardMaterial({ color: 0xf7f5ff, emissive: 0x7ca4ff, emissiveIntensity: 0.42, roughness: 0.1, metalness: 0.35 });
  
      const central = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(32, 38, 5.6, 32), crownMat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(28, 0.9, 10, 72), goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 3.2;
      const halo = new THREE.Mesh(new THREE.TorusGeometry(18, 0.34, 10, 72), new THREE.MeshBasicMaterial({ color: 0xffd0a0, transparent: true, opacity: 0.14 }));
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.2;
      central.add(disc, ring, halo);
      central.position.y = this.terrain.getHeight(0, 0) - 0.4;
      group.add(central);
  
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 118;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = this.terrain.getHeight(x, z);
        const tower = new THREE.Group();
        const spine = new THREE.Mesh(new THREE.BoxGeometry(4.6, 36, 4.6), crownMat);
        spine.position.y = 18;
        const fang = new THREE.Mesh(new THREE.ConeGeometry(2.3, 18, 6), paleMat);
        fang.position.y = 44;
        fang.rotation.x = Math.PI;
        const brace = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.32, 8, 32, Math.PI), goldMat);
        brace.position.y = 26;
        brace.rotation.x = Math.PI / 2;
        tower.add(spine, fang, brace);
        tower.position.set(x, y, z);
        tower.rotation.y = -angle + Math.PI / 2;
        staticGroup.add(tower);
        this.registerStaticCollider(spine, Math.hypot(2.3, 2.3), 0.0, {
          playerCollisionModel: 'obb',
          localHalfExtents: new THREE.Vector3(2.3, 18, 2.3),
          verticalRadius: 18,
          halfHeight: 18,
        });
      }
  
      for (let i = 0; i < 16; i += 1) {
        const angle = (i / 16) * Math.PI * 2 + Math.PI / 16;
        const radius = 78 + (i % 2) * 18;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = this.terrain.getHeight(x, z);
        const obeliskHeight = 12 + (i % 3) * 4;
        const obelisk = new THREE.Mesh(new THREE.BoxGeometry(2.1, obeliskHeight, 2.1), i % 2 === 0 ? crownMat : paleMat);
        obelisk.position.set(x, y + obeliskHeight * 0.5, z);
        obelisk.rotation.y = angle;
        staticGroup.add(obelisk);
        this.registerStaticCollider(obelisk, Math.hypot(1.05, 1.05), 0.0, {
          playerCollisionModel: 'obb',
          localHalfExtents: new THREE.Vector3(1.05, obeliskHeight * 0.5, 1.05),
          verticalRadius: obeliskHeight * 0.5,
          halfHeight: obeliskHeight * 0.5,
        });
      }
  
      for (let i = 0; i < 10; i += 1) {
        const angle = (i / 10) * Math.PI * 2;
        const radius = 50;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = this.terrain.getHeight(x, z) + 18 + (i % 2) * 6;
        const frameRadius = 8 + (i % 3);
        const frameTubeRadius = 0.26;
        const frame = new THREE.Mesh(
          new THREE.TorusGeometry(frameRadius, frameTubeRadius, 10, 48),
          new THREE.MeshStandardMaterial({ color: 0xffd5a9, emissive: 0xff7b57, emissiveIntensity: 0.42, roughness: 0.1, metalness: 0.52, transparent: true, opacity: 0.92 }),
        );
        frame.position.set(x, y, z);
        frame.rotation.set(angle * 0.35, angle, Math.PI / 2);
        staticGroup.add(frame);
        this.registerStaticCollider(frame, frameRadius + frameTubeRadius, 0, {
          blocksPlayer: true,
          blocksProjectiles: true,
          minimapObstacle: false,
          playerCollisionModel: 'ring',
          reflectionModel: 'ring',
          ringRadius: frameRadius,
          tubeRadius: Math.max(0.3, frameTubeRadius),
          verticalRadius: frameRadius + frameTubeRadius,
          halfHeight: frameRadius + frameTubeRadius,
        });
      }
    }

}

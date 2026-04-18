import * as THREE from 'three';

export function buildVoidFortressMesh(ctx) {
  const {
    def,
    group,
    mainMaterial,
    accentMaterial,
    addHalo,
  } = ctx;
        const bodyMat = mainMaterial.clone();
        bodyMat.color.setHex(0xffffff);
        bodyMat.emissive.setHex(0xf3f6ff);
        bodyMat.emissiveIntensity = 0.32;
        bodyMat.roughness = 0.16;
        bodyMat.metalness = 0.9;
        const trimMat = accentMaterial.clone();
        trimMat.emissiveIntensity = 1.34;
        trimMat.roughness = 0.06;
        trimMat.metalness = 0.36;
        const glowMat = new THREE.MeshBasicMaterial({
          color: def.accent,
          transparent: true,
          opacity: 0.26,
          depthWrite: false,
        });
        const paleGlowMat = new THREE.MeshBasicMaterial({
          color: 0xfff2d6,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        });
         const citadel = new THREE.Group();
        const seatBase = new THREE.Mesh(new THREE.BoxGeometry(10.6, 1.8, 8.8), bodyMat);
        seatBase.position.set(0, -3.4, 2.3);
        const lowerStep = new THREE.Mesh(new THREE.BoxGeometry(8.0, 1.2, 6.4), trimMat);
        lowerStep.position.set(0, -2.3, 1.9);
        const upperSeat = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.1, 4.8), bodyMat);
        upperSeat.position.set(0, -1.45, 1.2);
        const daisNose = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 3.8), trimMat);
        daisNose.position.set(0, -0.95, 3.8);
         const spine = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.35, 8.8, 8), bodyMat);
        spine.position.y = 1.7;
        const backrest = new THREE.Mesh(new THREE.BoxGeometry(7.4, 8.6, 2.0), bodyMat);
        backrest.position.set(0, 2.2, -1.15);
        const mantle = new THREE.Mesh(new THREE.BoxGeometry(8.8, 1.0, 2.9), trimMat);
        mantle.position.set(0, 5.9, -1.05);
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.48, 0), trimMat);
        core.scale.set(0.84, 1.5, 0.84);
        core.position.set(0, 1.15, 1.4);
        const coreAura = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), glowMat);
        coreAura.scale.set(0.62, 1.92, 0.62);
        coreAura.position.copy(core.position);
        const heartHalo = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.12, 8, 28), trimMat);
        heartHalo.rotation.y = Math.PI / 2;
        heartHalo.position.copy(core.position);
        citadel.add(seatBase, lowerStep, upperSeat, daisNose, spine, backrest, mantle, core, coreAura, heartHalo);
         for (let i = 0; i < 4; i += 1) {
          const slit = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.12), trimMat);
          slit.position.set(-2.2 + i * 1.46, 2.7 - i * 0.35, -0.04);
          slit.rotation.x = 0.08;
          citadel.add(slit);
        }
         for (let side = -1; side <= 1; side += 2) {
          const bastion = new THREE.Group();
          const arm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.5, 6.8), bodyMat);
          arm.position.set(side * 4.45, -1.35, 0.4);
          const shoulder = new THREE.Mesh(new THREE.BoxGeometry(2.7, 3.1, 2.5), trimMat);
          shoulder.position.set(side * 4.6, 0.35, -0.95);
          const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.6, 4.8, 10), bodyMat);
          cannon.rotation.x = Math.PI / 2;
          cannon.position.set(side * 4.35, -0.45, 3.95);
          const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.11, 8, 22), trimMat);
          muzzle.rotation.x = Math.PI / 2;
          muzzle.position.set(side * 4.35, -0.45, 6.15);
          const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.8, 2.4), trimMat);
          guard.position.set(side * 5.55, 0.7, 0.2);
          guard.rotation.z = side * 0.1;
          bastion.add(arm, shoulder, cannon, muzzle, guard);
           for (let tier = 0; tier < 3; tier += 1) {
            const rib = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 2.7 - tier * 0.55), trimMat);
            rib.position.set(side * (4.15 + tier * 0.34), 1.45 + tier * 1.0, -1.0 - tier * 0.3);
            rib.rotation.z = side * (0.3 + tier * 0.06);
            bastion.add(rib);
          }
          citadel.add(bastion);
        }
         const crown = new THREE.Group();
        const crownRing = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.24, 12, 72), trimMat);
        crownRing.rotation.x = Math.PI / 2;
        crownRing.position.y = 6.5;
        const crownHalo = new THREE.Mesh(new THREE.TorusGeometry(7.25, 0.16, 10, 56), glowMat);
        crownHalo.rotation.x = Math.PI / 2;
        crownHalo.position.y = 6.5;
        const axisHalo = new THREE.Mesh(new THREE.TorusGeometry(5.1, 0.12, 10, 44), paleGlowMat);
        axisHalo.rotation.z = Math.PI / 2;
        axisHalo.position.y = 1.8;
        const rearHalo = axisHalo.clone();
        rearHalo.rotation.x = Math.PI / 2;
        rearHalo.scale.set(1.12, 1.0, 1.0);
        rearHalo.position.set(0, 2.2, -1.6);
        crown.add(crownRing, crownHalo, axisHalo, rearHalo);
         for (let i = 0; i < 8; i += 1) {
          const fang = new THREE.Mesh(new THREE.ConeGeometry(0.54, 5.9, 6), trimMat);
          const angle = (i / 8) * Math.PI * 2;
          fang.position.set(Math.cos(angle) * 5.75, 8.55 + (i % 2) * 0.4, Math.sin(angle) * 5.75);
          fang.lookAt(0, 5.7, 0);
          fang.rotateX(Math.PI / 2);
          crown.add(fang);
        }
         for (let side = -1; side <= 1; side += 2) {
          const spireA = new THREE.Mesh(new THREE.ConeGeometry(0.58, 6.8, 6), bodyMat);
          spireA.position.set(side * 3.2, 8.5, -1.5);
          spireA.rotation.z = side * 0.1;
          crown.add(spireA);
          const spireB = new THREE.Mesh(new THREE.ConeGeometry(0.42, 5.2, 6), trimMat);
          spireB.position.set(side * 1.45, 8.9, -1.25);
          spireB.rotation.z = side * 0.06;
          crown.add(spireB);
        }
         const lowerHalo = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.22, 10, 56), glowMat);
        lowerHalo.rotation.x = Math.PI / 2;
        lowerHalo.position.y = -1.8;
        const sideHalo = new THREE.Mesh(new THREE.TorusGeometry(7.0, 0.15, 10, 44), paleGlowMat);
        sideHalo.rotation.y = Math.PI / 2;
        sideHalo.position.y = 1.4;
         group.add(citadel, crown, lowerHalo, sideHalo);
         for (let i = 0; i < 4; i += 1) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 7.4, 1.4), trimMat);
          fin.position.set(-2.7 + i * 1.8, 2.3, -2.0);
          fin.rotation.x = 0.08;
          group.add(fin);
        }
         addHalo(9.25, 0.24, 0xffc57f, 0.44);
  return true;
}

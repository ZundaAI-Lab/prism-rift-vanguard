import * as THREE from 'three';

export function buildSwampBossMesh(ctx) {
  const {
    def,
    group,
    mainMaterial,
    accentMaterial,
    addHalo,
  } = ctx;
        const fleshMat = mainMaterial.clone();
        fleshMat.roughness = 0.72;
        fleshMat.metalness = 0.08;
        fleshMat.emissiveIntensity = 0.24;
        const bloomMat = accentMaterial.clone();
        bloomMat.roughness = 0.26;
        bloomMat.metalness = 0.12;
        bloomMat.emissiveIntensity = 1.16;
        const innerBloomMat = bloomMat.clone();
        innerBloomMat.emissiveIntensity = 1.32;
        innerBloomMat.roughness = 0.18;
        const veilMat = new THREE.MeshBasicMaterial({
          color: def.accent,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
        });
        const mistMat = new THREE.MeshBasicMaterial({
          color: def.color,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
        });

        const throne = new THREE.Group();
        const basalBulb = new THREE.Mesh(new THREE.SphereGeometry(3.35, 20, 18), fleshMat);
        basalBulb.scale.set(1.14, 0.86, 1.14);
        basalBulb.position.y = -2.5;
        const queenBody = new THREE.Mesh(new THREE.SphereGeometry(2.9, 20, 18), fleshMat);
        queenBody.scale.set(1.0, 1.34, 1.0);
        queenBody.position.y = 1.0;
        const broodCrown = new THREE.Mesh(new THREE.SphereGeometry(2.05, 18, 16), fleshMat);
        broodCrown.scale.set(0.92, 0.8, 0.92);
        broodCrown.position.y = 5.05;
        throne.add(basalBulb, queenBody, broodCrown);

        const queenCore = new THREE.Mesh(new THREE.OctahedronGeometry(1.18, 0), innerBloomMat);
        queenCore.scale.set(0.82, 1.9, 0.82);
        queenCore.position.set(0, 2.15, 0);
        const coreHalo = new THREE.Mesh(new THREE.TorusGeometry(2.18, 0.12, 10, 28), bloomMat);
        coreHalo.rotation.x = Math.PI / 2;
        coreHalo.position.copy(queenCore.position);
        const coreVeil = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), veilMat);
        coreVeil.scale.set(0.56, 2.4, 0.56);
        coreVeil.position.copy(queenCore.position);
        throne.add(queenCore, coreHalo, coreVeil);

        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * Math.PI * 2;
          const pod = new THREE.Mesh(new THREE.SphereGeometry(0.82, 12, 12), bloomMat);
          pod.scale.set(0.92, 1.26, 0.92);
          pod.position.set(Math.cos(angle) * 2.45, 3.65 + Math.sin(i * 1.7) * 0.28, Math.sin(angle) * 2.45);
          throne.add(pod);

          const vein = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 1.24, 3, 8), fleshMat);
          vein.position.set(Math.cos(angle) * 1.62, 3.0, Math.sin(angle) * 1.62);
          vein.lookAt(pod.position);
          vein.rotateX(Math.PI / 2);
          throne.add(vein);
        }

        const crown = new THREE.Group();
        const crownRing = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.18, 10, 40), bloomMat);
        crownRing.rotation.x = Math.PI / 2;
        crownRing.position.y = 5.45;
        const crownMist = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.16, 10, 36), veilMat);
        crownMist.rotation.x = Math.PI / 2;
        crownMist.position.y = 5.45;
        const queenNimbus = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.12, 10, 30), mistMat);
        queenNimbus.rotation.z = Math.PI / 2;
        queenNimbus.position.y = 2.7;
        crown.add(crownRing, crownMist, queenNimbus);

        for (let i = 0; i < 8; i += 1) {
          const angle = (i / 8) * Math.PI * 2;
          const petal = new THREE.Mesh(new THREE.ConeGeometry(0.78, 3.8, 6), fleshMat);
          petal.position.set(Math.cos(angle) * 3.12, 7.1 + (i % 2) * 0.34, Math.sin(angle) * 3.12);
          petal.lookAt(0, 4.7, 0);
          petal.rotateX(Math.PI / 2);
          crown.add(petal);

          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 10), bloomMat);
          cap.position.set(Math.cos(angle) * 3.78, 8.05 + (i % 2) * 0.16, Math.sin(angle) * 3.78);
          crown.add(cap);
        }

        const mantle = new THREE.Group();
        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const veil = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 3.5, 5, 10), fleshMat);
          veil.position.set(Math.cos(angle) * 2.8, 0.25, Math.sin(angle) * 2.8);
          veil.rotation.z = Math.PI / 2;
          veil.rotation.y = angle;
          veil.rotation.x = 0.28;
          mantle.add(veil);
        }

        const roots = new THREE.Group();
        for (let i = 0; i < 10; i += 1) {
          const angle = (i / 10) * Math.PI * 2;
          const root = new THREE.Mesh(new THREE.CapsuleGeometry(0.16 + (i % 3) * 0.02, 4.8 + (i % 2) * 0.6, 4, 10), fleshMat);
          root.position.set(Math.cos(angle) * 3.55, -4.2, Math.sin(angle) * 3.55);
          root.rotation.z = Math.PI / 2 + 0.18;
          root.rotation.y = angle;
          root.rotation.x = -0.22 - (i % 2) * 0.08;
          roots.add(root);

          const bud = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), bloomMat);
          bud.position.set(Math.cos(angle) * 5.25, -4.9 - (i % 2) * 0.32, Math.sin(angle) * 5.25);
          roots.add(bud);
        }

        const rearFronds = new THREE.Group();
        for (let side = -1; side <= 1; side += 2) {
          for (let tier = 0; tier < 3; tier += 1) {
            const frond = new THREE.Mesh(new THREE.ConeGeometry(0.34 + tier * 0.08, 3.5 + tier * 0.7, 5), bloomMat);
            frond.position.set(side * (2.6 + tier * 0.72), 1.0 + tier * 1.7, -1.0 - tier * 0.8);
            frond.rotation.z = side * (-0.78 + tier * 0.08);
            frond.rotation.x = -0.34 - tier * 0.04;
            rearFronds.add(frond);
          }
        }

        const lowerVeil = new THREE.Mesh(new THREE.TorusGeometry(5.15, 0.18, 10, 42), veilMat);
        lowerVeil.rotation.x = Math.PI / 2;
        lowerVeil.position.y = -2.85;
        const sideVeil = new THREE.Mesh(new THREE.TorusGeometry(4.15, 0.1, 10, 30), mistMat);
        sideVeil.rotation.z = Math.PI / 2;
        sideVeil.position.y = 1.45;

        group.add(throne, crown, mantle, roots, rearFronds, lowerVeil, sideVeil);
        addHalo(5.5, 0.16, def.accent, 0.34);
  return true;
}

import * as THREE from 'three';

export function buildDesertBossMesh(ctx) {
  const {
    def,
    group,
    mainMaterial,
    accentMaterial,
    addHalo,
  } = ctx;
        const bodyMat = mainMaterial.clone();
        bodyMat.roughness = 0.16;
        bodyMat.metalness = 0.92;
        bodyMat.emissiveIntensity = 0.56;
        const trimMat = accentMaterial.clone();
        trimMat.roughness = 0.1;
        trimMat.metalness = 0.34;
        trimMat.emissiveIntensity = 1.22;
        const innerTrimMat = trimMat.clone();
        innerTrimMat.emissiveIntensity = 1.38;
        innerTrimMat.roughness = 0.06;
        const glowMat = new THREE.MeshBasicMaterial({
          color: def.accent,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
        });
        const paleGlowMat = new THREE.MeshBasicMaterial({
          color: 0xffefc7,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
        });

        const citadel = new THREE.Group();
        const lowerBody = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.4, 6.2, 6), bodyMat);
        lowerBody.position.y = -2.0;
        const midBody = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.8, 7.4, 6), bodyMat);
        midBody.position.y = 1.5;
        const upperSpire = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.9, 6.0, 6), bodyMat);
        upperSpire.position.y = 7.8;
        const crownTip = new THREE.Mesh(new THREE.ConeGeometry(1.18, 2.9, 6), bodyMat);
        crownTip.position.y = 12.2;
        const rootTip = new THREE.Mesh(new THREE.ConeGeometry(1.72, 2.6, 6), bodyMat);
        rootTip.position.y = -6.3;
        rootTip.rotation.z = Math.PI;
        citadel.add(lowerBody, midBody, upperSpire, crownTip, rootTip);

        const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(1.08, 0), innerTrimMat);
        chestCore.scale.set(0.72, 2.0, 0.72);
        chestCore.position.set(0, 2.1, 0);
        const chestAura = new THREE.Mesh(new THREE.OctahedronGeometry(2.1, 0), glowMat);
        chestAura.scale.set(0.48, 2.7, 0.48);
        chestAura.position.copy(chestCore.position);
        const chestRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.13, 10, 28), trimMat);
        chestRing.rotation.x = Math.PI / 2;
        chestRing.position.set(0, 2.1, 0);
        citadel.add(chestCore, chestAura, chestRing);

        for (let face = 0; face < 6; face += 1) {
          const angle = (face / 6) * Math.PI * 2;
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 12.2, 1.04), trimMat);
          rib.position.set(Math.cos(angle) * 2.28, 1.85, Math.sin(angle) * 2.28);
          rib.rotation.y = angle;
          citadel.add(rib);
        }

        for (let tier = 0; tier < 4; tier += 1) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(2.55 - tier * 0.34, 0.08 + tier * 0.01, 8, 32, Math.PI * (1.68 - tier * 0.12)),
            tier % 2 === 0 ? trimMat : innerTrimMat,
          );
          ring.rotation.x = Math.PI / 2;
          ring.rotation.z = 0.42 + tier * 0.28;
          ring.position.y = -0.5 + tier * 2.3;
          citadel.add(ring);
        }

        for (let i = 0; i < 5; i += 1) {
          const slit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.58, 2.06), trimMat);
          slit.position.set(0, 5.0 - i * 1.62, 1.86);
          citadel.add(slit);
          const slitBack = slit.clone();
          slitBack.position.z = -1.86;
          citadel.add(slitBack);
        }

        for (let side = -1; side <= 1; side += 2) {
          for (let level = 0; level < 2; level += 1) {
            const buttress = new THREE.Mesh(new THREE.BoxGeometry(0.32, 5.4 - level * 0.8, 1.48 - level * 0.14), bodyMat);
            buttress.position.set(side * (1.74 + level * 0.62), -0.9 + level * 2.4, 0);
            buttress.rotation.z = side * (0.52 - level * 0.12);
            citadel.add(buttress);
          }
        }

        const crown = new THREE.Group();
        const crownRing = new THREE.Mesh(new THREE.TorusGeometry(4.85, 0.22, 10, 54), trimMat);
        crownRing.rotation.x = Math.PI / 2;
        crownRing.position.y = 9.6;
        const crownHalo = new THREE.Mesh(new THREE.TorusGeometry(5.45, 0.15, 10, 42), glowMat);
        crownHalo.rotation.x = Math.PI / 2;
        crownHalo.position.y = 9.6;
        const commandHalo = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.11, 10, 36), paleGlowMat);
        commandHalo.rotation.y = Math.PI / 2;
        commandHalo.position.y = 3.0;
        crown.add(crownRing, crownHalo, commandHalo);

        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * Math.PI * 2;
          const fang = new THREE.Mesh(new THREE.ConeGeometry(0.46, 4.8, 6), trimMat);
          fang.position.set(Math.cos(angle) * 4.48, 12.2 + (i % 2) * 0.35, Math.sin(angle) * 4.48);
          fang.lookAt(0, 9.3, 0);
          fang.rotateX(Math.PI / 2);
          crown.add(fang);
        }

        for (let i = 0; i < 3; i += 1) {
          const crest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.2 + i * 0.8, 1.1 - i * 0.18), trimMat);
          crest.position.set(0, 9.0 + i * 1.18, -2.1 + i * 0.46);
          crest.rotation.x = -0.12 - i * 0.04;
          crown.add(crest);
        }

        const sentries = new THREE.Group();
        for (let i = 0; i < 4; i += 1) {
          const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const sentinel = new THREE.Group();
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.18, 5.6, 6), bodyMat);
          body.rotation.z = 0.12;
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.36, 6), bodyMat);
          tip.position.y = 3.42;
          const base = new THREE.Mesh(new THREE.ConeGeometry(0.54, 1.16, 6), bodyMat);
          base.position.y = -3.34;
          base.rotation.z = Math.PI;
          const eye = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), innerTrimMat);
          eye.scale.set(0.76, 1.55, 0.76);
          const brace = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 0.82), trimMat);
          brace.position.z = 0.74;
          const halo = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.06, 8, 22), glowMat);
          halo.rotation.x = Math.PI / 2;
          sentinel.add(body, tip, base, eye, brace, halo);
          sentinel.position.set(Math.cos(angle) * 6.4, 1.8 + (i % 2) * 0.65, Math.sin(angle) * 6.4);
          sentinel.rotation.y = angle + Math.PI / 2;
          sentinel.rotation.z = i % 2 === 0 ? 0.1 : -0.1;
          sentries.add(sentinel);
        }

        const lowerHalo = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.18, 10, 44), glowMat);
        lowerHalo.rotation.x = Math.PI / 2;
        lowerHalo.position.y = -2.6;
        const sideHalo = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.12, 10, 34), paleGlowMat);
        sideHalo.rotation.z = Math.PI / 2;
        sideHalo.position.y = 1.0;

        group.add(citadel, crown, sentries, lowerHalo, sideHalo);
        addHalo(7.8, 0.18, def.accent, 0.34);
  return true;
}

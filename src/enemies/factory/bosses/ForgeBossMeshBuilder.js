import * as THREE from 'three';

export function buildForgeBossMesh(ctx) {
  const {
    def,
    group,
    mainMaterial,
    accentMaterial,
    addHalo,
  } = ctx;
        const bodyMat = mainMaterial.clone();
        const decorationColor = 0xff6a2e;
        bodyMat.color.setHex(decorationColor);
        bodyMat.emissive.setHex(decorationColor);
        bodyMat.roughness = 0.22;
        bodyMat.metalness = 0.84;
        bodyMat.emissiveIntensity = 0.42;
        const trimMat = accentMaterial.clone();
        trimMat.roughness = 0.1;
        trimMat.metalness = 0.3;
        trimMat.emissiveIntensity = 1.18;
        const innerTrimMat = trimMat.clone();
        innerTrimMat.emissiveIntensity = 1.36;
        innerTrimMat.roughness = 0.06;
        const glowMat = new THREE.MeshBasicMaterial({
          color: def.accent,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
        });
        const emberMat = new THREE.MeshBasicMaterial({
          color: def.color,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        });

        const citadel = new THREE.Group();
        const lowerDie = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.5, 8.2), bodyMat);
        lowerDie.position.y = -4.1;
        const waist = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.6, 5.4), bodyMat);
        waist.position.y = -1.7;
        const coreCube = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4.8, 4.8), bodyMat);
        coreCube.position.y = 1.15;
        const upperAnvil = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.3, 7.6), bodyMat);
        upperAnvil.position.y = 4.2;
        const crownBlock = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 4.2), trimMat);
        crownBlock.position.y = 5.55;
        citadel.add(lowerDie, waist, coreCube, upperAnvil, crownBlock);

        const furnaceCore = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.1, 2.1), innerTrimMat);
        furnaceCore.position.set(0, 1.15, 0);
        const furnaceAura = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 3.0), glowMat);
        furnaceAura.position.copy(furnaceCore.position);
        furnaceAura.rotation.set(Math.PI / 4, Math.PI / 4, 0);
        const furnaceHalo = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.16, 10, 32), trimMat);
        furnaceHalo.position.y = 1.15;
        furnaceHalo.rotation.x = Math.PI / 2;
        citadel.add(furnaceCore, furnaceAura, furnaceHalo);

        for (let i = 0; i < 4; i += 1) {
          const angle = (i / 4) * Math.PI * 2;
          const collar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 6.5, 5.3), trimMat);
          collar.position.set(Math.cos(angle) * 2.8, 1.15, Math.sin(angle) * 2.8);
          collar.rotation.y = angle;
          citadel.add(collar);

          const brace = new THREE.Mesh(new THREE.BoxGeometry(0.2, 10.8, 0.92), trimMat);
          brace.position.set(Math.cos(angle) * 3.76, 0.75, Math.sin(angle) * 3.76);
          brace.rotation.y = angle + Math.PI / 4;
          citadel.add(brace);
        }

        for (let i = 0; i < 3; i += 1) {
          const band = new THREE.Mesh(new THREE.TorusGeometry(2.55 + i * 0.72, 0.1 + i * 0.02, 10, 40), i === 1 ? innerTrimMat : trimMat);
          band.rotation.x = Math.PI / 2;
          band.position.y = -0.45 + i * 2.35;
          band.rotation.z = 0.34 + i * 0.23;
          citadel.add(band);
        }

        for (let side = -1; side <= 1; side += 2) {
          const armature = new THREE.Group();
          const shoulder = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.3, 6.3), bodyMat);
          shoulder.position.set(side * 5.1, 2.35, 0);
          const counterweight = new THREE.Mesh(new THREE.BoxGeometry(1.3, 4.4, 3.0), trimMat);
          counterweight.position.set(side * 6.2, 0.75, 0);
          const horn = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 1.8), trimMat);
          horn.position.set(side * 5.8, 4.35, 1.55);
          horn.rotation.z = side * 0.08;
          const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.6, 1.5), bodyMat);
          lowerJaw.position.set(side * 5.65, 3.35, -1.35);
          lowerJaw.rotation.z = side * -0.06;
          armature.add(shoulder, counterweight, horn, lowerJaw);

          for (let tier = 0; tier < 3; tier += 1) {
            const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.6 + tier * 0.8, 4.5 - tier * 0.72), trimMat);
            rib.position.set(side * (4.3 + tier * 0.52), -0.2 + tier * 2.05, 0);
            rib.rotation.z = side * (0.22 + tier * 0.08);
            armature.add(rib);
          }
          citadel.add(armature);
        }

        const crown = new THREE.Group();
        const solarRing = new THREE.Mesh(new THREE.TorusGeometry(6.35, 0.24, 12, 72), innerTrimMat);
        solarRing.rotation.x = Math.PI / 2;
        solarRing.position.y = 6.2;
        const solarGlow = new THREE.Mesh(new THREE.TorusGeometry(7.0, 0.18, 10, 56), glowMat);
        solarGlow.rotation.x = Math.PI / 2;
        solarGlow.position.y = 6.2;
        const forgeAxis = new THREE.Mesh(new THREE.TorusGeometry(5.0, 0.14, 10, 40), emberMat);
        forgeAxis.rotation.z = Math.PI / 2;
        forgeAxis.position.y = 1.1;
        const forgeAxisB = forgeAxis.clone();
        forgeAxisB.rotation.y = Math.PI / 2;
        crown.add(solarRing, solarGlow, forgeAxis, forgeAxisB);

        for (let i = 0; i < 8; i += 1) {
          const angle = (i / 8) * Math.PI * 2;
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.5 + (i % 2) * 0.7, 0.9), bodyMat);
          tooth.position.set(Math.cos(angle) * 5.95, 8.1 + (i % 2) * 0.32, Math.sin(angle) * 5.95);
          tooth.lookAt(0, 5.95, 0);
          crown.add(tooth);

          const ember = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.1, 0.36), innerTrimMat);
          ember.position.set(Math.cos(angle) * 6.65, 9.0 + (i % 2) * 0.22, Math.sin(angle) * 6.65);
          ember.rotation.set(angle * 0.3, angle, 0);
          crown.add(ember);
        }

        const retinue = new THREE.Group();
        for (let i = 0; i < 4; i += 1) {
          const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const satellite = new THREE.Group();
          const cube = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 1.7), bodyMat);
          const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.08, 8, 24), trimMat);
          ringA.rotation.x = Math.PI / 2;
          const ringB = ringA.clone();
          ringB.rotation.y = Math.PI / 2;
          const spark = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.54, 0.54), innerTrimMat);
          satellite.add(cube, ringA, ringB, spark);
          satellite.position.set(Math.cos(angle) * 7.4, -0.15 + (i % 2) * 1.2, Math.sin(angle) * 7.4);
          satellite.rotation.set(i * 0.18, angle, i % 2 === 0 ? 0.12 : -0.12);
          retinue.add(satellite);
        }

        const lowerCorona = new THREE.Mesh(new THREE.TorusGeometry(8.4, 0.22, 10, 56), emberMat);
        lowerCorona.rotation.x = Math.PI / 2;
        lowerCorona.position.y = -2.9;
        const sideCorona = new THREE.Mesh(new THREE.TorusGeometry(7.1, 0.16, 10, 48), glowMat);
        sideCorona.rotation.y = Math.PI / 2;
        sideCorona.position.y = 1.0;

        group.add(citadel, crown, retinue, lowerCorona, sideCorona);
        addHalo(8.8, 0.22, def.accent, 0.4);
  return true;
}

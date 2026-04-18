import * as THREE from 'three';

export function buildFrostBossMesh(ctx) {
  const {
    def,
    group,
    mainMaterial,
    accentMaterial,
    addHalo,
  } = ctx;
        const bodyMat = mainMaterial.clone();
        bodyMat.color.setHex(0xffffff);
        bodyMat.emissive.setHex(0xe9f7ff);
        bodyMat.emissiveIntensity = 0.44;
        bodyMat.roughness = 0.14;
        bodyMat.metalness = 0.88;
        const trimMat = accentMaterial.clone();
        trimMat.emissive.setHex(def.accent);
        trimMat.emissiveIntensity = 1.3;
        trimMat.roughness = 0.05;
        trimMat.metalness = 0.24;
        const innerTrimMat = trimMat.clone();
        innerTrimMat.emissiveIntensity = 1.48;
        innerTrimMat.roughness = 0.02;
        const glowMat = new THREE.MeshBasicMaterial({
          color: def.accent,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        });
        const paleGlowMat = new THREE.MeshBasicMaterial({
          color: 0xf7fdff,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        });
        const stormVeilMat = new THREE.MeshBasicMaterial({
          color: 0xdff8ff,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
          side: THREE.DoubleSide,
        });

        const sanctum = new THREE.Group();
        sanctum.name = 'frostBossSanctum';
        const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 8.6, 5, 12), bodyMat);
        spine.position.y = 1.25;
        const torso = new THREE.Mesh(new THREE.OctahedronGeometry(3.05, 0), bodyMat);
        torso.scale.set(0.96, 1.82, 0.96);
        torso.position.y = 1.25;
        const heart = new THREE.Mesh(new THREE.OctahedronGeometry(1.28, 0), innerTrimMat);
        heart.scale.set(0.74, 1.95, 0.74);
        heart.position.set(0, 1.4, 0.55);
        const heartAura = new THREE.Mesh(new THREE.OctahedronGeometry(2.26, 0), glowMat);
        heartAura.scale.set(0.56, 2.45, 0.56);
        heartAura.position.copy(heart.position);
        const breastHalo = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.13, 10, 30), trimMat);
        breastHalo.rotation.y = Math.PI / 2;
        breastHalo.position.copy(heart.position);
        const lowerSkirt = new THREE.Mesh(new THREE.ConeGeometry(2.45, 4.8, 8), bodyMat);
        lowerSkirt.position.y = -3.25;
        lowerSkirt.rotation.z = Math.PI;
        const crownSpire = new THREE.Mesh(new THREE.ConeGeometry(1.16, 4.8, 8), bodyMat);
        crownSpire.position.y = 7.9;
        sanctum.add(spine, torso, heart, heartAura, breastHalo, lowerSkirt, crownSpire);

        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * Math.PI * 2;
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 8.8, 1.08), trimMat);
          rib.position.set(Math.cos(angle) * 1.95, 1.1, Math.sin(angle) * 1.95);
          rib.rotation.y = angle;
          sanctum.add(rib);
        }

        for (let tier = 0; tier < 3; tier += 1) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(2.9 - tier * 0.42, 0.08 + tier * 0.015, 8, 28, Math.PI * (1.62 - tier * 0.12)),
            tier === 1 ? innerTrimMat : trimMat,
          );
          ring.rotation.x = Math.PI / 2;
          ring.rotation.z = 0.45 + tier * 0.34;
          ring.position.y = -0.8 + tier * 2.05;
          sanctum.add(ring);
        }

        const wingCrown = new THREE.Group();
        wingCrown.name = 'frostBossWingCrown';
        for (let side = -1; side <= 1; side += 2) {
          const wingFrame = new THREE.Group();
          const primaryWing = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 7.0, 4, 12), bodyMat);
          primaryWing.position.set(side * 4.2, 2.25, -0.35);
          primaryWing.rotation.z = side * (Math.PI / 2 - 0.2);
          primaryWing.rotation.y = side * 0.34;
          const secondaryWing = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 5.5, 4, 12), trimMat);
          secondaryWing.position.set(side * 4.95, 0.75, -1.05);
          secondaryWing.rotation.z = side * (Math.PI / 2 - 0.34);
          secondaryWing.rotation.y = side * 0.52;
          const tertiaryWing = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 4.1, 4, 10), trimMat);
          tertiaryWing.position.set(side * 5.4, 4.0, -0.85);
          tertiaryWing.rotation.z = side * (Math.PI / 2 - 0.06);
          tertiaryWing.rotation.y = side * 0.18;
          const shoulderHalo = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.07, 8, 22), glowMat);
          shoulderHalo.rotation.z = Math.PI / 2;
          shoulderHalo.position.set(side * 2.95, 2.1, 0.15);
          const lance = new THREE.Mesh(new THREE.ConeGeometry(0.48, 5.8, 6), innerTrimMat);
          lance.position.set(side * 6.55, 2.2, -1.35);
          lance.rotation.z = side * (Math.PI / 2 - 0.12);
          lance.rotation.y = side * 0.18;
          wingFrame.add(primaryWing, secondaryWing, tertiaryWing, shoulderHalo, lance);

          for (let tier = 0; tier < 3; tier += 1) {
            const feather = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.55 + tier * 0.38, 1.45 - tier * 0.24), trimMat);
            feather.position.set(side * (3.85 + tier * 1.0), 3.85 - tier * 1.35, -0.72 - tier * 0.36);
            feather.rotation.z = side * (-0.72 + tier * 0.14);
            feather.rotation.x = 0.18 + tier * 0.05;
            wingFrame.add(feather);
          }
          wingCrown.add(wingFrame);
        }

        const haloStack = new THREE.Group();
        haloStack.name = 'frostBossHaloStack';
        const crownHalo = new THREE.Mesh(new THREE.TorusGeometry(4.45, 0.18, 10, 44), trimMat);
        crownHalo.rotation.x = Math.PI / 2;
        crownHalo.position.y = 6.45;
        const choirHalo = new THREE.Mesh(new THREE.TorusGeometry(5.15, 0.12, 10, 40), paleGlowMat);
        choirHalo.rotation.z = Math.PI / 2;
        choirHalo.position.y = 2.25;
        const stormHalo = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.1, 10, 34), glowMat);
        stormHalo.rotation.y = Math.PI / 2;
        stormHalo.position.set(0, 3.5, -1.0);
        const lowerNimbus = new THREE.Mesh(new THREE.TorusGeometry(6.6, 0.18, 10, 48), glowMat);
        lowerNimbus.rotation.x = Math.PI / 2;
        lowerNimbus.position.y = -2.2;
        haloStack.add(crownHalo, choirHalo, stormHalo, lowerNimbus);

        for (let i = 0; i < 8; i += 1) {
          const angle = (i / 8) * Math.PI * 2;
          const crest = new THREE.Mesh(new THREE.ConeGeometry(0.42, 4.6, 6), trimMat);
          crest.position.set(Math.cos(angle) * 3.95, 8.2 + (i % 2) * 0.36, Math.sin(angle) * 3.95);
          crest.lookAt(0, 5.9, 0);
          crest.rotateX(Math.PI / 2);
          haloStack.add(crest);
        }

        const choir = new THREE.Group();
        choir.name = 'frostBossChoir';
        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const satellite = new THREE.Group();
          const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), trimMat);
          body.scale.set(0.88, 1.35, 0.88);
          const wingA = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 2.15, 3, 8), bodyMat);
          wingA.rotation.z = Math.PI / 2;
          wingA.position.y = 0.12;
          const wingB = wingA.clone();
          wingB.position.y = 0.62;
          wingB.scale.set(1.0, 0.82, 1.0);
          const halo = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.05, 8, 20), paleGlowMat);
          halo.rotation.x = Math.PI / 2;
          halo.position.y = 0.36;
          const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.8, 5), trimMat);
          tail.position.y = -1.55;
          tail.rotation.z = Math.PI;
          satellite.add(body, wingA, wingB, halo, tail);
          satellite.position.set(Math.cos(angle) * 7.2, 0.8 + Math.sin(i * 1.7) * 0.65, Math.sin(angle) * 7.2);
          satellite.rotation.set(i % 2 === 0 ? 0.08 : -0.08, angle + Math.PI / 2, i % 2 === 0 ? 0.12 : -0.12);
          choir.add(satellite);
        }

        const stormVeil = new THREE.Group();
        stormVeil.name = 'frostBossStormVeil';
        const stormDisc = new THREE.Mesh(new THREE.RingGeometry(5.2, 7.9, 48, 1), stormVeilMat);
        stormDisc.rotation.x = Math.PI / 2;
        stormDisc.position.y = 0.55;
        const stormDiscB = new THREE.Mesh(new THREE.RingGeometry(4.1, 6.4, 40, 1), glowMat.clone());
        stormDiscB.material.side = THREE.DoubleSide;
        stormDiscB.rotation.set(0.4, 0, 0.26);
        stormDiscB.position.y = 1.95;
        const stormDiscC = new THREE.Mesh(new THREE.RingGeometry(3.6, 5.7, 36, 1), paleGlowMat.clone());
        stormDiscC.material.side = THREE.DoubleSide;
        stormDiscC.rotation.set(-0.34, 0.42, -0.22);
        stormDiscC.position.y = -1.15;
        stormVeil.add(stormDisc, stormDiscB, stormDiscC);

        for (let i = 0; i < 12; i += 1) {
          const angle = (i / 12) * Math.PI * 2;
          const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.5 + (i % 3) * 0.12, 0), innerTrimMat);
          shard.position.set(Math.cos(angle) * (6.0 + (i % 2) * 0.8), -0.6 + (i % 3) * 0.9, Math.sin(angle) * (6.0 + (i % 2) * 0.8));
          shard.rotation.set(i * 0.18, angle, i % 2 === 0 ? 0.14 : -0.14);
          stormVeil.add(shard);
        }

        group.add(sanctum, wingCrown, haloStack, choir, stormVeil);
        group.userData.frostBossRig = {
          sanctum,
          wingCrown,
          haloStack,
          choir,
          stormVeil,
        };
        addHalo(8.5, 0.22, 0xffffff, 0.46);
  return true;
}

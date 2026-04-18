import * as THREE from 'three';

export function buildAstralBossMesh(ctx) {
  const {
    def,
    group,
    mainMaterial,
    accentMaterial,
    addHalo,
    createForwardTriPyramidGeometry,
  } = ctx;
        const reefBaseColor = new THREE.Color(def.color);
        const accentColor = new THREE.Color(def.accent);
        const auroraColor = reefBaseColor.clone().offsetHSL(-0.08, 0.24, 0.02);
        const prismColor = accentColor.clone().offsetHSL(-0.18, 0.1, 0.04);
        const pulseColor = accentColor.clone().offsetHSL(0.08, 0.18, 0.08);
        const crestColor = reefBaseColor.clone().offsetHSL(0.12, 0.12, 0.08);

        const hullMat = mainMaterial.clone();
        hullMat.color.copy(reefBaseColor.clone().lerp(new THREE.Color(0xffffff), 0.28));
        hullMat.emissive.copy(auroraColor);
        hullMat.emissiveIntensity = 0.58;
        hullMat.roughness = 0.12;
        hullMat.metalness = 0.92;

        const trimMat = accentMaterial.clone();
        trimMat.color.copy(pulseColor);
        trimMat.emissive.copy(pulseColor);
        trimMat.emissiveIntensity = 1.48;
        trimMat.roughness = 0.04;
        trimMat.metalness = 0.32;

        const prismMat = trimMat.clone();
        prismMat.color.copy(prismColor);
        prismMat.emissive.copy(prismColor);
        prismMat.emissiveIntensity = 1.6;
        prismMat.roughness = 0.03;
        prismMat.metalness = 0.26;

        const reactorMat = trimMat.clone();
        reactorMat.color.copy(crestColor);
        reactorMat.emissive.copy(crestColor);
        reactorMat.emissiveIntensity = 1.84;
        reactorMat.roughness = 0.02;

        const glowMat = new THREE.MeshBasicMaterial({
          color: crestColor,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        });
        const reefGlowMat = new THREE.MeshBasicMaterial({
          color: pulseColor,
          transparent: true,
          opacity: 0.26,
          depthWrite: false,
        });
        const auroraGlowMat = new THREE.MeshBasicMaterial({
          color: auroraColor,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
        });
        const prismGlowMat = new THREE.MeshBasicMaterial({
          color: prismColor,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        });
        const wakeMat = new THREE.MeshBasicMaterial({
          color: crestColor,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          side: THREE.DoubleSide,
        });

        const hull = new THREE.Group();
        hull.name = 'astralBossHull';
        const keel = new THREE.Mesh(new THREE.CapsuleGeometry(1.68, 10.8, 6, 16), hullMat);
        keel.rotation.x = Math.PI / 2;
        keel.scale.set(1.16, 0.9, 1.0);
        const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 8.8), hullMat);
        upperDeck.position.set(0, 0.95, 0.55);
        const lowerDeck = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.15, 7.2), prismMat);
        lowerDeck.position.set(0, -0.78, -0.65);
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.95, 2.9), hullMat);
        bridge.position.set(0, 1.95, 2.1);
        const prow = new THREE.Mesh(new THREE.ConeGeometry(1.48, 5.2, 8), hullMat);
        prow.rotation.x = Math.PI / 2;
        prow.position.set(0, 0.12, 7.85);
        const underside = new THREE.Mesh(new THREE.ConeGeometry(1.05, 4.2, 8), prismMat);
        underside.rotation.x = -Math.PI / 2;
        underside.position.set(0, -0.7, 7.1);
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(1.14, 1.48, 3.6, 8), hullMat);
        tail.rotation.x = Math.PI / 2;
        tail.position.set(0, -0.1, -7.25);
        const reactor = new THREE.Mesh(new THREE.OctahedronGeometry(1.18, 0), reactorMat);
        reactor.scale.set(0.82, 1.44, 0.82);
        reactor.position.set(0, 0.55, 0.75);
        const reactorAura = new THREE.Mesh(new THREE.OctahedronGeometry(2.0, 0), auroraGlowMat);
        reactorAura.scale.set(0.58, 1.95, 0.58);
        reactorAura.position.copy(reactor.position);
        const reactorHalo = new THREE.Mesh(new THREE.TorusGeometry(2.02, 0.11, 10, 28), reactorMat);
        reactorHalo.rotation.y = Math.PI / 2;
        reactorHalo.position.copy(reactor.position);
        hull.add(keel, upperDeck, lowerDeck, bridge, prow, underside, tail, reactor, reactorAura, reactorHalo);

        for (let i = 0; i < 5; i += 1) {
          const strake = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.82 - i * 0.08, 2.8 - i * 0.22), i % 2 === 0 ? trimMat : prismMat);
          strake.position.set(0, 0.25 + i * 0.48, -3.8 + i * 2.18);
          hull.add(strake);
        }

        for (let side = -1; side <= 1; side += 2) {
          const chine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.05, 9.6), prismMat);
          chine.position.set(side * 1.62, 0.18, 0.4);
          chine.rotation.z = side * 0.24;
          hull.add(chine);
          for (let tier = 0; tier < 3; tier += 1) {
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.22 + tier * 0.24, 2.2 - tier * 0.26), tier % 2 === 0 ? trimMat : prismMat);
            plate.position.set(side * (1.92 + tier * 0.55), 0.62 + tier * 0.54, -2.9 + tier * 3.0);
            plate.rotation.z = side * (0.42 - tier * 0.12);
            plate.rotation.x = -0.06 + tier * 0.04;
            hull.add(plate);
          }
        }

        const finRack = new THREE.Group();
        finRack.name = 'astralBossFinRack';
        for (let side = -1; side <= 1; side += 2) {
          const pectoral = new THREE.Mesh(createForwardTriPyramidGeometry(3.9, 4.8, 0.52), hullMat);
          pectoral.position.set(side * 3.2, -0.35, 0.9);
          pectoral.rotation.set(0, side > 0 ? Math.PI / 2 : -Math.PI / 2, side * 0.36);
          const scythe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 6.4), prismMat);
          scythe.position.set(side * 4.4, 0.42, -0.4);
          scythe.rotation.z = side * 0.76;
          scythe.rotation.x = 0.14;
          const dorsalWing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.9, 1.1), trimMat);
          dorsalWing.position.set(side * 1.95, 2.2, 1.8);
          dorsalWing.rotation.z = side * 0.26;
          const ventralWing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.45, 1.0), prismMat);
          ventralWing.position.set(side * 2.35, -1.8, -1.65);
          ventralWing.rotation.z = side * -0.38;
          const finHalo = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.05, 8, 20), side > 0 ? glowMat : prismGlowMat);
          finHalo.rotation.z = Math.PI / 2;
          finHalo.position.set(side * 2.08, 0.4, 1.2);
          finRack.add(pectoral, scythe, dorsalWing, ventralWing, finHalo);
        }

        const broadside = new THREE.Group();
        broadside.name = 'astralBossBroadside';
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 3; i += 1) {
            const turret = new THREE.Group();
            const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.9, 8), hullMat);
            pod.rotation.z = Math.PI / 2;
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.9, 8), i === 1 ? reactorMat : trimMat);
            barrel.rotation.z = Math.PI / 2;
            barrel.position.z = 1.55;
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 18), side > 0 ? reefGlowMat : prismGlowMat);
            ring.rotation.y = Math.PI / 2;
            turret.add(pod, barrel, ring);
            turret.position.set(side * 2.55, -0.22 + i * 0.78, -3.1 + i * 3.12);
            turret.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
            broadside.add(turret);
          }
        }

        const crown = new THREE.Group();
        crown.name = 'astralBossCrown';
        const commandRing = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.16, 10, 42), reactorMat);
        commandRing.rotation.x = Math.PI / 2;
        commandRing.position.y = 4.2;
        const reefRing = new THREE.Mesh(new THREE.TorusGeometry(4.7, 0.1, 10, 36), auroraGlowMat);
        reefRing.rotation.z = Math.PI / 2;
        reefRing.position.y = 1.5;
        const wakeRing = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.08, 10, 28), glowMat);
        wakeRing.rotation.y = Math.PI / 2;
        wakeRing.position.set(0, 2.4, -1.2);
        crown.add(commandRing, reefRing, wakeRing);

        for (let side = -1; side <= 1; side += 2) {
          for (let tier = 0; tier < 3; tier += 1) {
            const spine = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.8 + tier * 0.82, 0.8 - tier * 0.12), tier === 1 ? reactorMat : (tier % 2 === 0 ? trimMat : prismMat));
            spine.position.set(side * (1.45 + tier * 0.72), 3.3 + tier * 1.02, -0.45 - tier * 0.4);
            spine.rotation.z = side * (0.34 + tier * 0.1);
            spine.rotation.x = -0.12;
            crown.add(spine);
          }
        }

        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * Math.PI * 2;
          const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.46 + (i % 2) * 0.12, 0), i % 2 === 0 ? reactorMat : prismMat);
          node.position.set(Math.cos(angle) * 4.85, 4.2 + (i % 2) * 0.36, Math.sin(angle) * 4.85);
          node.lookAt(0, 2.6, 0);
          node.rotateX(Math.PI / 4);
          crown.add(node);
        }

        const engineCluster = new THREE.Group();
        engineCluster.name = 'astralBossEngineCluster';
        const wakeDisc = new THREE.Mesh(new THREE.RingGeometry(2.0, 3.65, 28, 1), wakeMat);
        wakeDisc.rotation.x = Math.PI / 2;
        wakeDisc.position.set(0, 0.1, -8.55);
        const wakeDiscB = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.6, 24, 1), prismGlowMat.clone());
        wakeDiscB.material.side = THREE.DoubleSide;
        wakeDiscB.rotation.set(0.22, 0, 0);
        wakeDiscB.position.set(0, 0.7, -7.85);
        engineCluster.add(wakeDisc, wakeDiscB);

        for (let side = -1; side <= 1; side += 2) {
          for (let lane = 0; lane < 2; lane += 1) {
            const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.9, 10), hullMat);
            nozzle.rotation.x = Math.PI / 2;
            nozzle.position.set(side * (0.78 + lane * 0.7), -0.24 + lane * 0.52, -8.05);
            const flare = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.3, 10), lane === 0 ? glowMat : prismGlowMat);
            flare.rotation.x = -Math.PI / 2;
            flare.position.set(side * (0.78 + lane * 0.7), -0.24 + lane * 0.52, -9.75);
            const trimRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.06, 8, 20), lane === 0 ? trimMat : prismMat);
            trimRing.rotation.x = Math.PI / 2;
            trimRing.position.copy(nozzle.position);
            engineCluster.add(nozzle, flare, trimRing);
          }
        }

        group.add(hull, finRack, broadside, crown, engineCluster);
        group.userData.astralBossRig = {
          hull,
          finRack,
          broadside,
          crown,
          engineCluster,
        };
        addHalo(8.6, 0.22, def.accent, 0.48);
  return true;
}

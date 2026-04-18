import * as THREE from 'three';

export function buildMirrorBossMesh(ctx) {
  const {
    def,
    group,
    mainMaterial,
    accentMaterial,
    addHalo,
    createForwardTriPyramidGeometry,
  } = ctx;
        const bodyMat = mainMaterial.clone();
        bodyMat.roughness = 0.12;
        bodyMat.metalness = 0.9;
        bodyMat.emissiveIntensity = 0.52;
        const trimMat = accentMaterial.clone();
        trimMat.roughness = 0.06;
        trimMat.metalness = 0.34;
        trimMat.emissiveIntensity = 1.24;
        const coreMat = trimMat.clone();
        coreMat.emissiveIntensity = 1.42;
        coreMat.roughness = 0.04;
        const glowMat = new THREE.MeshBasicMaterial({
          color: def.accent,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        });
        const paleGlowMat = new THREE.MeshBasicMaterial({
          color: 0xf7f7ff,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        });
        const mirrorPaneMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
          side: THREE.DoubleSide,
        });

        const throne = new THREE.Group();
        throne.name = 'mirrorBossThrone';
        const rootBase = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 5.0, 2.2, 8), bodyMat);
        rootBase.position.y = -4.4;
        const lowerSeat = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.5, 6.8), bodyMat);
        lowerSeat.position.set(0, -2.65, 1.0);
        const upperSeat = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.1, 4.7), trimMat);
        upperSeat.position.set(0, -1.7, 0.2);
        const forwardDais = new THREE.Mesh(createForwardTriPyramidGeometry(5.0, 5.4, 2.2), bodyMat);
        forwardDais.position.set(0, -2.35, 4.15);
        const spine = new THREE.Mesh(new THREE.BoxGeometry(3.4, 8.9, 2.8), bodyMat);
        spine.position.set(0, 1.25, -0.95);
        const spineCap = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.0, 2.8), trimMat);
        spineCap.position.set(0, 5.85, -0.95);
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.82, 0), coreMat);
        core.scale.set(0.82, 1.95, 0.82);
        core.position.set(0, 1.45, 1.15);
        const coreAura = new THREE.Mesh(new THREE.OctahedronGeometry(2.55, 0), glowMat);
        coreAura.scale.set(0.58, 2.28, 0.58);
        coreAura.position.copy(core.position);
        const heartHalo = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.13, 10, 32), trimMat);
        heartHalo.rotation.y = Math.PI / 2;
        heartHalo.position.copy(core.position);
        throne.add(rootBase, lowerSeat, upperSeat, forwardDais, spine, spineCap, core, coreAura, heartHalo);

        for (let i = 0; i < 4; i += 1) {
          const angle = (i / 4) * Math.PI * 2;
          const facetRail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 8.1, 2.9), trimMat);
          facetRail.position.set(Math.cos(angle) * 2.95, 1.1, Math.sin(angle) * 2.95 - 0.25);
          facetRail.rotation.y = angle;
          throne.add(facetRail);

          const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 6.6), mirrorPaneMat);
          pane.position.set(Math.cos(angle) * 2.28, 1.4, Math.sin(angle) * 2.28 + 0.15);
          pane.rotation.y = angle + Math.PI / 2;
          pane.rotation.x = Math.PI * 0.5;
          pane.scale.set(1, 1.1, 1);
          throne.add(pane);
        }

        const bladeRack = new THREE.Group();
        bladeRack.name = 'mirrorBossBladeRack';
        for (let side = -1; side <= 1; side += 2) {
          const armature = new THREE.Group();
          const armSpine = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 5.3, 4, 12), bodyMat);
          armSpine.position.set(side * 5.1, 1.6, -0.45);
          armSpine.rotation.z = side * (Math.PI / 2 - 0.18);
          armSpine.rotation.y = side * 0.34;
          const bladeA = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 6.0), trimMat);
          bladeA.position.set(side * 6.25, 2.25, 0.55);
          bladeA.rotation.z = side * 0.46;
          bladeA.rotation.x = -0.08;
          const bladeB = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 5.1), trimMat);
          bladeB.position.set(side * 6.0, 0.5, -1.25);
          bladeB.rotation.z = side * 0.88;
          bladeB.rotation.x = 0.12;
          const duelHalo = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.06, 8, 24), glowMat);
          duelHalo.rotation.z = Math.PI / 2;
          duelHalo.position.set(side * 3.55, 2.0, 0.1);
          armature.add(armSpine, bladeA, bladeB, duelHalo);

          for (let tier = 0; tier < 3; tier += 1) {
            const feather = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5 + tier * 0.34, 1.65 - tier * 0.26), trimMat);
            feather.position.set(side * (4.25 + tier * 0.92), 3.65 - tier * 1.28, -0.62 - tier * 0.4);
            feather.rotation.z = side * (-0.68 + tier * 0.16);
            feather.rotation.x = 0.2 + tier * 0.05;
            armature.add(feather);
          }
          bladeRack.add(armature);
        }

        const calculator = new THREE.Group();
        calculator.name = 'mirrorBossCalculator';
        const equationRingA = new THREE.Mesh(new THREE.TorusGeometry(4.9, 0.16, 10, 44), trimMat);
        equationRingA.rotation.x = Math.PI / 2;
        equationRingA.position.y = 6.5;
        const equationRingB = new THREE.Mesh(new THREE.TorusGeometry(4.15, 0.1, 10, 40), paleGlowMat);
        equationRingB.rotation.z = Math.PI / 2;
        equationRingB.position.y = 2.35;
        const equationRingC = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.08, 10, 32), glowMat);
        equationRingC.rotation.y = Math.PI / 2;
        equationRingC.position.set(0, 3.25, -1.05);
        const lowerBus = new THREE.Mesh(new THREE.TorusGeometry(6.7, 0.18, 10, 50), glowMat.clone());
        lowerBus.rotation.x = Math.PI / 2;
        lowerBus.position.y = -2.45;
        calculator.add(equationRingA, equationRingB, equationRingC, lowerBus);

        for (let i = 0; i < 8; i += 1) {
          const angle = (i / 8) * Math.PI * 2;
          const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.58 + (i % 2) * 0.14, 0), coreMat);
          shard.position.set(Math.cos(angle) * 4.05, 7.95 + (i % 2) * 0.42, Math.sin(angle) * 4.05);
          shard.lookAt(0, 4.9, 0);
          shard.rotateX(Math.PI / 4);
          calculator.add(shard);
        }

        const lattice = new THREE.Group();
        lattice.name = 'mirrorBossLattice';
        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const node = new THREE.Group();
          const facetCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.76, 0), trimMat);
          facetCore.scale.set(0.9, 1.35, 0.9);
          const slabA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.95, 1.2), bodyMat);
          const slabB = slabA.clone();
          slabB.rotation.y = Math.PI / 2;
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 2.2), trimMat);
          blade.rotation.z = Math.PI / 2;
          blade.position.y = -0.22;
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 8, 18), paleGlowMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 0.12;
          node.add(facetCore, slabA, slabB, blade, ring);
          node.position.set(Math.cos(angle) * 7.15, 0.95 + Math.sin(i * 1.4) * 0.48, Math.sin(angle) * 7.15);
          node.rotation.set(i % 2 === 0 ? 0.08 : -0.08, angle + Math.PI / 2, i % 2 === 0 ? 0.1 : -0.1);
          lattice.add(node);
        }

        const crown = new THREE.Group();
        crown.name = 'mirrorBossCrown';
        for (let side = -1; side <= 1; side += 2) {
          for (let tier = 0; tier < 3; tier += 1) {
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2 + tier * 0.8, 0.82 - tier * 0.12), trimMat);
            fin.position.set(side * (2.8 + tier * 0.82), 6.55 + tier * 1.2, -1.2 - tier * 0.44);
            fin.rotation.z = side * (0.46 + tier * 0.12);
            fin.rotation.x = -0.08;
            crown.add(fin);
          }
        }
        const crownAperture = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.08, 8, 24), mirrorPaneMat.clone());
        crownAperture.rotation.y = Math.PI / 2;
        crownAperture.position.set(0, 4.1, -0.95);
        crown.add(crownAperture);

        group.add(throne, bladeRack, calculator, lattice, crown);
        group.userData.mirrorBossRig = {
          throne,
          bladeRack,
          calculator,
          lattice,
          crown,
        };
        addHalo(8.0, 0.2, def.accent, 0.42);
  return true;
}

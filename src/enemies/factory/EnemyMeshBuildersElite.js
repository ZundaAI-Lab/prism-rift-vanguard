import * as THREE from 'three';

export function buildEliteEnemyMesh(ctx) {
  const { def, group, mainMaterial, accentMaterial, modelSize, addHalo, createBakedMesh } = ctx;
  switch (def.mesh) {
    case 'glacier': {
      const bodyMat = mainMaterial.clone();
      bodyMat.roughness = 0.18;
      bodyMat.metalness = 0.78;
      const trimMat = accentMaterial.clone();
      trimMat.emissiveIntensity = def.isBoss ? 1.18 : 0.98;
      const glowMat = new THREE.MeshBasicMaterial({
        color: def.accent,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      });
       const citadel = new THREE.Mesh(
        new THREE.BoxGeometry(2.2 * modelSize, 1.7 * modelSize, 1.8 * modelSize),
        bodyMat,
      );
      citadel.position.y = 0.1 * modelSize;
       const shoulderL = createBakedMesh(
        new THREE.BoxGeometry(0.88 * modelSize, 2.4 * modelSize, 2.6 * modelSize),
        bodyMat,
        { position: [-1.52 * modelSize, 0.06 * modelSize, 0], rotation: [0.04, 0.08, -0.08] },
      );
      const shoulderR = createBakedMesh(
        new THREE.BoxGeometry(0.88 * modelSize, 2.4 * modelSize, 2.6 * modelSize),
        bodyMat,
        { position: [1.52 * modelSize, 0.06 * modelSize, 0], rotation: [-0.04, -0.08, 0.08] },
      );
       const glacis = createBakedMesh(
        new THREE.BoxGeometry(2.95 * modelSize, 0.86 * modelSize, 1.34 * modelSize),
        bodyMat,
        { position: [0, -0.46 * modelSize, 1.16 * modelSize], rotation: [-0.4, 0, 0] },
      );
      const rearBulkhead = createBakedMesh(
        new THREE.BoxGeometry(2.52 * modelSize, 1.0 * modelSize, 0.9 * modelSize),
        bodyMat,
        { position: [0, -0.12 * modelSize, -1.14 * modelSize], rotation: [0.18, 0, 0] },
      );
       const tower = new THREE.Mesh(
        new THREE.BoxGeometry(1.32 * modelSize, 1.08 * modelSize, 1.32 * modelSize),
        trimMat,
      );
      tower.position.y = 1.22 * modelSize;
       const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.74 * modelSize, 0), trimMat);
      crown.scale.set(1.0, 1.45, 1.0);
      crown.position.y = 2.16 * modelSize;
       const visor = new THREE.Mesh(
        new THREE.BoxGeometry(1.28 * modelSize, 0.24 * modelSize, 0.28 * modelSize),
        trimMat,
      );
      visor.position.set(0, 0.58 * modelSize, 1.02 * modelSize);
       const coreGlow = new THREE.Mesh(new THREE.BoxGeometry(1.12 * modelSize, 0.52 * modelSize, 0.88 * modelSize), glowMat);
      coreGlow.position.set(0, 0.3 * modelSize, 0.18 * modelSize);
       group.add(citadel, shoulderL, shoulderR, glacis, rearBulkhead, tower, crown, visor, coreGlow);
       const cannonPositions = [
        [0, 0.26 * modelSize, 1.86 * modelSize, Math.PI / 2, 0],
        [0, 0.26 * modelSize, -1.82 * modelSize, Math.PI / 2, 0],
        [-2.08 * modelSize, 0.22 * modelSize, 0, 0, Math.PI / 2],
        [2.08 * modelSize, 0.22 * modelSize, 0, 0, Math.PI / 2],
      ];
      for (const [x, y, z, rotX, rotZ] of cannonPositions) {
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12 * modelSize, 0.18 * modelSize, 1.16 * modelSize, 10),
          trimMat,
        );
        barrel.position.set(x, y, z);
        barrel.rotation.x = rotX;
        barrel.rotation.z = rotZ;
        group.add(barrel);
      }
       const collar = new THREE.Mesh(new THREE.TorusGeometry(1.42 * modelSize, 0.12 * modelSize, 8, 30), trimMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.22 * modelSize;
      group.add(collar);
       const feet = [
        [-1.05 * modelSize, -1.32 * modelSize, 0.92 * modelSize],
        [1.05 * modelSize, -1.32 * modelSize, 0.92 * modelSize],
        [-1.05 * modelSize, -1.32 * modelSize, -0.92 * modelSize],
        [1.05 * modelSize, -1.32 * modelSize, -0.92 * modelSize],
      ];
      for (const [x, y, z] of feet) {
        const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * modelSize, 0.24 * modelSize, 0.72 * modelSize, 6), bodyMat);
        pylon.position.set(x, y, z);
        group.add(pylon);
         const claw = new THREE.Mesh(new THREE.ConeGeometry(0.28 * modelSize, 0.62 * modelSize, 5), trimMat);
        claw.position.set(x, y - 0.54 * modelSize, z);
        claw.rotation.z = Math.PI;
        group.add(claw);
      }
       const sideHalo = new THREE.Mesh(
        new THREE.TorusGeometry(2.1 * modelSize, 0.06 * modelSize, 8, 32),
        new THREE.MeshBasicMaterial({ color: def.accent, transparent: true, opacity: 0.16, depthWrite: false }),
      );
      sideHalo.rotation.y = Math.PI / 2;
      group.add(sideHalo);
      addHalo(1.9, 0.08, def.accent, 0.24);
      break;
    }
    case 'whiteout': {
      const cloud = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 * modelSize, 1), mainMaterial);
      const rim1 = new THREE.Mesh(new THREE.TorusGeometry(1.45 * modelSize, 0.1 * modelSize, 8, 28), accentMaterial);
      const rim2 = rim1.clone();
      rim1.rotation.x = Math.PI / 2;
      rim2.rotation.x = Math.PI / 2;
      rim2.rotation.y = Math.PI / 2;
      group.add(cloud, rim1, rim2);
      break;
    }
    case 'facet': {
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 0), accentMaterial);
      const slab1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 1.6), mainMaterial);
      const slab2 = slab1.clone();
      slab2.rotation.y = Math.PI / 2;
      group.add(core, slab1, slab2);
      addHalo(1.3, 0.06, def.accent);
      break;
    }
    case 'watcher': {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.92 * modelSize, 1.1 * modelSize, 2.9 * modelSize, 8), mainMaterial);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.52 * modelSize, 12, 12), accentMaterial);
      eye.position.set(0, 0.1 * modelSize, 0.92 * modelSize);
      group.add(pillar, eye);
      addHalo(1.4, 0.08, def.accent);
      break;
    }
    case 'duelist': {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.8, 4, 10), accentMaterial);
      const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 3.2), mainMaterial);
      const blade2 = blade1.clone();
      blade1.position.z = 0.8;
      blade2.rotation.y = Math.PI / 2;
      group.add(body, blade1, blade2);
      break;
    }
    case 'reflector': {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.4 * modelSize, 1.4 * modelSize, 0.25 * modelSize, 20), mainMaterial);
      const mirror = new THREE.Mesh(new THREE.RingGeometry(0.55 * modelSize, 1.15 * modelSize, 24), accentMaterial);
      disc.rotation.z = Math.PI / 2;
      mirror.rotation.y = Math.PI / 2;
      group.add(disc, mirror);
      addHalo(1.6, 0.08, def.accent);
      break;
    }
    case 'reefRay': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.24, 1.9), mainMaterial);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.9, 8), accentMaterial);
      tail.rotation.x = Math.PI / 2;
      tail.position.z = 1.55;
      group.add(body, tail);
      addHalo(1.7, 0.08, def.accent);
      break;
    }
    case 'urchin': {
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * modelSize, 0), accentMaterial);
      group.add(core);
      for (let i = 0; i < 10; i += 1) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14 * modelSize, 1.8 * modelSize, 5), mainMaterial);
        const angle = (i / 10) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.9 * modelSize, 0, Math.sin(angle) * 0.9 * modelSize);
        spike.lookAt(0, 0, 0);
        spike.rotateX(Math.PI / 2);
        group.add(spike);
      }
      break;
    }
    case 'drifter': {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.92, 14, 12), mainMaterial);
      const ring = new THREE.Mesh(new THREE.TorusKnotGeometry(0.75, 0.11, 54, 7), accentMaterial);
      group.add(orb, ring);
      break;
    }
    case 'coralKnight': {
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.4 * modelSize, 2.2 * modelSize, 1.2 * modelSize), mainMaterial);
      const crown = new THREE.Mesh(new THREE.TorusKnotGeometry(0.95 * modelSize, 0.12 * modelSize, 48, 7), accentMaterial);
      crown.position.y = 0.5 * modelSize;
      group.add(trunk, crown);
      addHalo(1.5, 0.08, def.accent);
      break;
    }
    default:
      return false;
  }
  return true;
}

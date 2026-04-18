import * as THREE from 'three';

export function buildBasicEnemyMesh(ctx) {
  const { def, group, mainMaterial, accentMaterial, modelSize, addHalo } = ctx;
  switch (def.mesh) {
    case 'trainingTarget': {
      const baseMaterial = mainMaterial.clone();
      baseMaterial.color.setHex(0x243349);
      baseMaterial.emissive.setHex(0x1a2238);
      baseMaterial.emissiveIntensity = 0.42;
      baseMaterial.roughness = 0.36;
      baseMaterial.metalness = 0.64;
       const plateMaterial = accentMaterial.clone();
      plateMaterial.color.setHex(0xfff3ca);
      plateMaterial.emissive.setHex(0xffd782);
      plateMaterial.emissiveIntensity = 0.84;
      plateMaterial.roughness = 0.14;
      plateMaterial.metalness = 0.22;
       const warningMaterial = new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: 1.3,
        roughness: 0.18,
        metalness: 0.24,
      });
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: def.accent,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
       const strutLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.7, 0.2), baseMaterial);
      strutLeft.position.set(-1.15, -0.15, 0);
      strutLeft.rotation.z = 0.08;
      const strutRight = strutLeft.clone();
      strutRight.position.x = 1.15;
      strutRight.rotation.z = -0.08;
      const footLeft = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.42), baseMaterial);
      footLeft.position.set(-1.15, -2.02, 0);
      const footRight = footLeft.clone();
      footRight.position.x = 1.15;
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.1, 0.28), baseMaterial);
      spine.position.y = -1.3;
       const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.82, 1.82, 0.4, 32), plateMaterial);
      plate.rotation.x = Math.PI / 2;
      plate.position.y = 0.7;
       const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.54, 0.15, 12, 40), warningMaterial);
      outerRing.position.y = 0.7;
      outerRing.rotation.x = Math.PI / 2;
      const midRing = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.14, 12, 36), warningMaterial);
      midRing.position.y = 0.7;
      midRing.rotation.x = Math.PI / 2;
      const bullseye = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.46, 24), warningMaterial);
      bullseye.rotation.x = Math.PI / 2;
      bullseye.position.y = 0.7;
       const crossbarH = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.11, 0.14), baseMaterial);
      crossbarH.position.set(0, 0.7, 0.22);
      const crossbarV = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.35, 0.14), baseMaterial);
      crossbarV.position.set(0, 0.7, 0.22);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.08, 10, 40), glowMaterial);
      halo.position.y = 0.7;
      halo.rotation.x = Math.PI / 2;
       group.add(
        strutLeft,
        strutRight,
        footLeft,
        footRight,
        spine,
        plate,
        outerRing,
        midRing,
        bullseye,
        crossbarH,
        crossbarV,
        halo,
      );
      break;
    }
    case 'scarab': {
      const body = new THREE.Mesh(new THREE.OctahedronGeometry(1.25, 0), mainMaterial);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 0.7), accentMaterial);
      const wing2 = wing.clone();
      wing.rotation.z = 0.16;
      wing2.rotation.z = -0.16;
      group.add(body, wing, wing2);
      break;
    }
    case 'glint': {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.8, 6), mainMaterial);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.08, 8, 32), accentMaterial);
      shard.rotation.x = Math.PI;
      halo.rotation.x = Math.PI / 2;
      group.add(shard, halo);
      break;
    }
    case 'obelisk': {
      const bodyMat = mainMaterial.clone();
      bodyMat.roughness = 0.2;
      bodyMat.metalness = 0.84;
      const trimMat = accentMaterial.clone();
      trimMat.emissiveIntensity = def.isBoss ? 1.18 : 0.98;
      const glowMat = new THREE.MeshBasicMaterial({
        color: def.accent,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      });
       const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.92, 4.7, 6), bodyMat);
      const capTop = new THREE.Mesh(new THREE.ConeGeometry(0.78, 1.0, 6), bodyMat);
      const capBottom = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.8, 6), bodyMat);
      capTop.position.y = 2.85;
      capBottom.position.y = -2.72;
      capBottom.rotation.z = Math.PI;
       const midBand = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.1, 8, 24, Math.PI * 1.6), trimMat);
      midBand.rotation.x = Math.PI / 2;
      midBand.rotation.z = Math.PI / 6;
       const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), trimMat);
      core.scale.set(0.85, 1.35, 0.85);
      core.position.y = 0.12;
       const aura = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), glowMat);
      aura.scale.set(0.75, 1.95, 0.75);
      aura.position.y = 0.12;
       group.add(spine, capTop, capBottom, midBand, core, aura);
       for (let i = 0; i < 4; i += 1) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.9, 0.88), trimMat);
        const angle = (i / 4) * Math.PI * 2;
        fin.position.set(Math.cos(angle) * 0.84, 0.1, Math.sin(angle) * 0.84);
        fin.rotation.y = angle;
        fin.rotation.x = Math.sin(angle * 2) * 0.06;
        group.add(fin);
      }
       for (let i = 0; i < 3; i += 1) {
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.92), trimMat);
        slit.position.set(0, 1.05 - i * 1.08, 0.83);
        group.add(slit);
        const slitBack = slit.clone();
        slitBack.position.z = -0.83;
        group.add(slitBack);
      }
       const sideHalo = new THREE.Mesh(
        new THREE.TorusGeometry(1.18, 0.05, 8, 20),
        new THREE.MeshBasicMaterial({ color: def.accent, transparent: true, opacity: 0.18, depthWrite: false }),
      );
      sideHalo.rotation.y = Math.PI / 2;
      group.add(sideHalo);
      break;
    }
    case 'mirage': {
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 12), mainMaterial);
      const blade = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 2.8, 3, 12), accentMaterial);
      const blade2 = blade.clone();
      blade.rotation.z = Math.PI / 2;
      blade2.rotation.z = Math.PI / 2;
      blade2.rotation.y = Math.PI / 2;
      group.add(body, blade, blade2);
      break;
    }
    case 'spore': {
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.18, 14, 14), mainMaterial);
      body.scale.y = 1.2;
      group.add(body);
      for (let i = 0; i < 5; i += 1) {
        const pod = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), accentMaterial);
        const angle = (i / 5) * Math.PI * 2;
        pod.position.set(Math.cos(angle) * 1.28, Math.sin(i * 1.2) * 0.35, Math.sin(angle) * 1.28);
        group.add(pod);
      }
      break;
    }
    case 'manta': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.28, 1.8), mainMaterial);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.5, 8), accentMaterial);
      tail.rotation.x = Math.PI / 2;
      tail.position.z = 1.3;
      group.add(body, tail);
      break;
    }
    case 'bloomer': {
      const center = new THREE.Mesh(new THREE.IcosahedronGeometry(0.82, 0), accentMaterial);
      group.add(center);
      for (let i = 0; i < 6; i += 1) {
        const petal = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.6, 5), mainMaterial);
        petal.position.set(Math.cos((i / 6) * Math.PI * 2) * 1.2, 0, Math.sin((i / 6) * Math.PI * 2) * 1.2);
        petal.lookAt(0, 0, 0);
        petal.rotateX(Math.PI / 2);
        group.add(petal);
      }
      break;
    }
    case 'leech': {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.5, 4, 8), mainMaterial);
      const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.12, 8, 20, Math.PI), accentMaterial);
      body.rotation.z = Math.PI / 2;
      jaw.position.x = 0.64;
      group.add(body, jaw);
      break;
    }
    case 'forgeCube': {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(2.2 * modelSize, 2.2 * modelSize, 2.2 * modelSize), mainMaterial);
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.45 * modelSize, 0.1 * modelSize, 8, 30), accentMaterial);
      const ring2 = ring1.clone();
      ring1.rotation.x = Math.PI / 2;
      ring2.rotation.y = Math.PI / 2;
      group.add(cube, ring1, ring2);
      break;
    }
    case 'hellray': {
      const bakedYaw = Math.PI / 2;
      const wingGeometry = new THREE.CylinderGeometry(0.15, 1.25, 4.0, 5);
      wingGeometry.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
      wingGeometry.applyMatrix4(new THREE.Matrix4().makeRotationY(bakedYaw));
      const wing = new THREE.Mesh(wingGeometry, mainMaterial);
       const spineGeometry = new THREE.BoxGeometry(0.18, 0.18, 2.6);
      spineGeometry.applyMatrix4(new THREE.Matrix4().makeRotationY(bakedYaw));
      const spine = new THREE.Mesh(spineGeometry, accentMaterial);
       group.add(wing, spine);
      break;
    }
    case 'mortar': {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05 * modelSize, 1.4 * modelSize, 2.2 * modelSize, 6), mainMaterial);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * modelSize, 0.34 * modelSize, 2.4 * modelSize, 10), accentMaterial);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.y = 0.3 * modelSize;
      group.add(body, barrel);
      break;
    }
    case 'blade': {
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.74, 0), accentMaterial);
      const edge1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 3.6, 3, 12), mainMaterial);
      const edge2 = edge1.clone();
      edge1.rotation.z = Math.PI / 2;
      edge2.rotation.z = Math.PI / 2;
      edge2.rotation.y = Math.PI / 2;
      group.add(core, edge1, edge2);
      break;
    }
    case 'shardfin': {
      const spear = new THREE.Mesh(new THREE.ConeGeometry(0.82, 3.6, 6), mainMaterial);
      const fins = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.7), accentMaterial);
      const fins2 = fins.clone();
      spear.rotation.x = Math.PI;
      fins.rotation.z = 0.28;
      fins2.rotation.z = -0.28;
      group.add(spear, fins, fins2);
      addHalo(1.1, 0.06, def.accent);
      break;
    }
    case 'haloSeraph': {
      const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), accentMaterial);
      const wing1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 3.2, 3, 10), mainMaterial);
      const wing2 = wing1.clone();
      wing1.rotation.z = Math.PI / 2;
      wing2.rotation.z = Math.PI / 2;
      wing2.position.y = 0.55;
      wing2.scale.set(1, 0.8, 1);
      group.add(body, wing1, wing2);
      addHalo(1.6, 0.08, 0xffffff);
      break;
    }
    default:
      return false;
  }
  return true;
}

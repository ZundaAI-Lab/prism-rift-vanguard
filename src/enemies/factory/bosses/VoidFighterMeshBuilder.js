import * as THREE from 'three';

export function buildVoidFighterMesh(ctx) {
  const {
    group,
    mainMaterial,
    accentMaterial,
    addHalo,
    createBakedMesh,
  } = ctx;
        const bakedYaw = -Math.PI / 2;
        const fuselage = createBakedMesh(
          new THREE.CapsuleGeometry(0.9, 5.4, 6, 12),
          accentMaterial,
          { rotation: [0, 0, Math.PI / 2], bakedYaw },
        );
        const nose = createBakedMesh(
          new THREE.ConeGeometry(0.78, 2.6, 8),
          mainMaterial,
          { position: [-3.8, 0, 0], rotation: [0, 0, -Math.PI / 2], bakedYaw },
        );
        const wingL = createBakedMesh(
          new THREE.BoxGeometry(0.24, 0.12, 8.6),
          mainMaterial,
          { position: [0.1, 0.0, -2.9], rotation: [0, 0.18, 0], bakedYaw },
        );
        const wingR = createBakedMesh(
          new THREE.BoxGeometry(0.24, 0.12, 8.6),
          mainMaterial,
          { position: [0.1, 0.0, 2.9], rotation: [0, -0.18, 0], bakedYaw },
        );
        const tail = createBakedMesh(
          new THREE.BoxGeometry(1.8, 0.12, 4.2),
          accentMaterial,
          { position: [2.3, 0, 0], bakedYaw },
        );
        const spine = createBakedMesh(
          new THREE.TorusGeometry(2.2, 0.16, 10, 42),
          mainMaterial,
          { rotation: [0, Math.PI / 2, 0], bakedYaw },
        );
        group.add(fuselage, nose, wingL, wingR, tail, spine);
        addHalo(3.0, 0.12, 0x7ecfff, 0.36);
  return true;
}

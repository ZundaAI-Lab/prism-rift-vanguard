import * as THREE from 'three';

/**
 * Responsibility:
 * - Creates the player ship mesh and its local attachment points.
 *
 * Rules:
 * - Pure construction only. No gameplay timers and no scene registration here.
 */
export function createPlayerShip() {
  const group = new THREE.Group();

  const coreMaterial = new THREE.MeshStandardMaterial({ color: 0xcfffff, emissive: 0x4de7ff, emissiveIntensity: 1.4, roughness: 0.16, metalness: 0.78 });
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.3, 1),
    coreMaterial,
  );
  core.castShadow = true;
  group.add(core);

  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x233047, emissive: 0x183555, emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.85 });
  const wingA = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 1.2), wingMaterial);
  wingA.position.y = -0.2;
  wingA.castShadow = true;
  group.add(wingA);

  const wingB = wingA.clone();
  wingB.rotation.y = Math.PI / 2;
  wingB.scale.set(0.42, 1, 1.4);
  wingB.position.y = -0.25;
  group.add(wingB);

  const engineMaterial = new THREE.MeshStandardMaterial({ color: 0xfef9ff, emissive: 0xff5dd8, emissiveIntensity: 2.4, roughness: 0.1, metalness: 0.4 });
  const engineL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.38, 1.4, 12), engineMaterial);
  engineL.rotation.z = Math.PI / 2;
  engineL.position.set(-1.9, -0.18, 0);
  group.add(engineL);
  const engineR = engineL.clone();
  engineR.position.x = 1.9;
  group.add(engineR);

  const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x4de7ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.82, roughness: 0.02, metalness: 0.2 });
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    canopyMaterial,
  );
  canopy.position.set(0, 0.46, 0.1);
  group.add(canopy);

  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0x8dffef }));
  muzzle.position.set(0, 0.1, -1.8);
  group.add(muzzle);
  group.userData.muzzle = muzzle;

  const hoverRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.95, 0.07, 10, 64),
    new THREE.MeshBasicMaterial({ color: 0x6bffe8, transparent: true, opacity: 0.42 }),
  );
  hoverRing.rotation.x = Math.PI / 2;
  hoverRing.position.y = -0.7;
  group.add(hoverRing);
  group.userData.hoverRing = hoverRing;
  group.userData.hoverRingBaseOpacity = hoverRing.material.opacity;
  group.userData.glowMaterials = [
    { material: coreMaterial, baseEmissiveIntensity: coreMaterial.emissiveIntensity },
    { material: wingMaterial, baseEmissiveIntensity: wingMaterial.emissiveIntensity },
    { material: engineMaterial, baseEmissiveIntensity: engineMaterial.emissiveIntensity },
    { material: canopyMaterial, baseEmissiveIntensity: canopyMaterial.emissiveIntensity },
  ];

  return group;
}

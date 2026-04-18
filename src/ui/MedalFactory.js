import * as THREE from 'three';

const GOLD = new THREE.MeshStandardMaterial({ color: 0xe7bf56, metalness: 0.78, roughness: 0.28 });
const GOLD_DARK = new THREE.MeshStandardMaterial({ color: 0x8d6623, metalness: 0.72, roughness: 0.42 });
const SILVER = new THREE.MeshStandardMaterial({ color: 0xd7eefc, metalness: 0.62, roughness: 0.26 });
const BRONZE = new THREE.MeshStandardMaterial({ color: 0xc7854a, metalness: 0.56, roughness: 0.34 });
const STEEL = new THREE.MeshStandardMaterial({ color: 0x6f879f, metalness: 0.54, roughness: 0.4 });
const CRYSTAL = new THREE.MeshStandardMaterial({ color: 0xbff8ff, metalness: 0.18, roughness: 0.06, transparent: true, opacity: 0.92 });
const EMERALD = new THREE.MeshStandardMaterial({ color: 0x63e0a0, metalness: 0.3, roughness: 0.24 });
const RUBY = new THREE.MeshStandardMaterial({ color: 0xff6b74, metalness: 0.26, roughness: 0.2 });
const CYAN = new THREE.MeshStandardMaterial({ color: 0x6be8ff, metalness: 0.28, roughness: 0.16 });
const BLUE = new THREE.MeshStandardMaterial({ color: 0x74a9ff, metalness: 0.3, roughness: 0.2 });
const MAGENTA = new THREE.MeshStandardMaterial({ color: 0xff7fed, metalness: 0.3, roughness: 0.16 });
const VIOLET = new THREE.MeshStandardMaterial({ color: 0xa47dff, metalness: 0.34, roughness: 0.18 });
const ORANGE = new THREE.MeshStandardMaterial({ color: 0xffae5d, metalness: 0.26, roughness: 0.18 });
const WHITE = new THREE.MeshStandardMaterial({ color: 0xf5fbff, metalness: 0.18, roughness: 0.14 });

const TORUS_GEO = new THREE.TorusGeometry(0.48, 0.08, 20, 48);
const DISC_GEO = new THREE.CylinderGeometry(0.5, 0.58, 0.18, 40);
const DISC_INNER_GEO = new THREE.CylinderGeometry(0.4, 0.44, 0.12, 36);
const RIBBON_BAR_GEO = new THREE.BoxGeometry(0.22, 0.44, 0.1);
const RIBBON_TAIL_GEO = new THREE.BoxGeometry(0.18, 0.38, 0.08);
const STAR_GEO = new THREE.ExtrudeGeometry(createStarShape(5, 0.2, 0.48), { depth: 0.12, bevelEnabled: false });
const DIAMOND_GEO = new THREE.OctahedronGeometry(0.28, 0);
const BULLET_BODY_GEO = new THREE.CylinderGeometry(0.11, 0.11, 0.62, 16);
const BULLET_TIP_GEO = new THREE.ConeGeometry(0.11, 0.22, 16);
const SPHERE_GEO = new THREE.SphereGeometry(0.16, 18, 18);

export const MEDAL_MODEL_SCALE = 2;

function createShieldShape(width = 0.64, height = 0.82) {
  const w = width * 0.5;
  const h = height * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(0, h);
  shape.lineTo(w * 0.9, h * 0.48);
  shape.lineTo(w * 0.88, -h * 0.02);
  shape.quadraticCurveTo(w * 0.78, -h * 0.56, 0, -h);
  shape.quadraticCurveTo(-w * 0.78, -h * 0.56, -w * 0.88, -h * 0.02);
  shape.lineTo(-w * 0.9, h * 0.48);
  shape.closePath();
  return shape;
}

function createBoltShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.12, 0.48);
  shape.lineTo(0.06, 0.48);
  shape.lineTo(-0.06, 0.08);
  shape.lineTo(0.18, 0.08);
  shape.lineTo(-0.04, -0.5);
  shape.lineTo(-0.02, -0.08);
  shape.lineTo(-0.24, -0.08);
  shape.closePath();
  return shape;
}

function createArrowShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.48, 0.06);
  shape.lineTo(0.02, 0.06);
  shape.lineTo(0.02, 0.22);
  shape.lineTo(0.46, 0);
  shape.lineTo(0.02, -0.22);
  shape.lineTo(0.02, -0.06);
  shape.lineTo(-0.48, -0.06);
  shape.closePath();
  return shape;
}

function createHeartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.48);
  shape.bezierCurveTo(0.48, -0.12, 0.58, 0.18, 0.28, 0.44);
  shape.bezierCurveTo(0.12, 0.6, -0.02, 0.42, 0, 0.28);
  shape.bezierCurveTo(0.02, 0.42, -0.12, 0.6, -0.28, 0.44);
  shape.bezierCurveTo(-0.58, 0.18, -0.48, -0.12, 0, -0.48);
  shape.closePath();
  return shape;
}

function createCrystalShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.58);
  shape.lineTo(0.28, 0.16);
  shape.lineTo(0.18, -0.56);
  shape.lineTo(-0.18, -0.56);
  shape.lineTo(-0.28, 0.16);
  shape.closePath();
  return shape;
}

function createStarShape(points, innerRadius, outerRadius) {
  const shape = new THREE.Shape();
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI * 0.5 + step * i;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function extrude(shape, depth = 0.12) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
}

function addMesh(group, geometry, material, options = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(options.x ?? 0, options.y ?? 0, options.z ?? 0);
  mesh.rotation.set(options.rx ?? 0, options.ry ?? 0, options.rz ?? 0);
  const sx = options.sx ?? options.scale ?? 1;
  const sy = options.sy ?? options.scale ?? 1;
  const sz = options.sz ?? options.scale ?? 1;
  mesh.scale.set(sx, sy, sz);
  group.add(mesh);
  return mesh;
}

function addBaseRibbon(group, { ribbonMaterial = BLUE, discOuter = GOLD, discInner = SILVER, ringMaterial = GOLD_DARK } = {}) {
  addMesh(group, RIBBON_BAR_GEO, ribbonMaterial, { x: -0.14, y: 0.92, z: -0.01 });
  addMesh(group, RIBBON_BAR_GEO, ribbonMaterial, { x: 0.14, y: 0.92, z: -0.01 });
  addMesh(group, RIBBON_TAIL_GEO, discOuter, { x: -0.14, y: 0.56, z: -0.02, rz: 0.1 });
  addMesh(group, RIBBON_TAIL_GEO, discOuter, { x: 0.14, y: 0.56, z: -0.02, rz: -0.1 });
  addMesh(group, TORUS_GEO, ringMaterial, { y: 0.48, rx: Math.PI * 0.5, scale: 0.66 });
  addMesh(group, DISC_GEO, discOuter, { y: -0.02 });
  addMesh(group, DISC_INNER_GEO, discInner, { y: 0.02 });
}

function createCrosshair(group, material, radius = 0.26, thickness = 0.028) {
  const ring = new THREE.TorusGeometry(radius, thickness, 16, 48);
  addMesh(group, ring, material, { y: 0.02, rx: Math.PI * 0.5 });
  addMesh(group, new THREE.BoxGeometry(radius * 1.65, thickness * 2.6, 0.08), material, { z: 0.04 });
  addMesh(group, new THREE.BoxGeometry(thickness * 2.6, radius * 1.65, 0.08), material, { z: 0.04 });
}

function createWing(group, material, direction = 1, y = 0.08) {
  addMesh(group, new THREE.BoxGeometry(0.36, 0.08, 0.08), material, { x: 0.34 * direction, y, z: -0.03, rz: 0.26 * direction });
  addMesh(group, new THREE.BoxGeometry(0.28, 0.07, 0.08), material, { x: 0.28 * direction, y: y - 0.12, z: -0.03, rz: 0.42 * direction });
}

function createBullet(group, bodyMaterial = WHITE, tipMaterial = BRONZE) {
  addMesh(group, BULLET_BODY_GEO, bodyMaterial, { rx: Math.PI * 0.5, z: 0.04 });
  addMesh(group, BULLET_TIP_GEO, tipMaterial, { y: 0.41, z: 0.04 });
  addMesh(group, new THREE.CylinderGeometry(0.125, 0.125, 0.08, 16), BRONZE, { y: -0.34, rx: Math.PI * 0.5, z: 0.03 });
}

export class MedalFactory {
  createMesh(medalId) {
    const root = new THREE.Group();
    switch (medalId) {
      case 'noDownBonus':
        this.createNoDown(root);
        break;
      case 'perfectGuard':
        this.createPerfectGuard(root);
        break;
      case 'deadlineSurvive':
        this.createDeadline(root);
        break;
      case 'megaMultiKill':
        this.createMegaMultiKill(root);
        break;
      case 'blitzSweep':
        this.createBlitzSweep(root);
        break;
      case 'pointBlank':
        this.createPointBlank(root);
        break;
      case 'longRangeHunter':
        this.createLongRangeHunter(root);
        break;
      case 'sharpShooter':
        this.createSharpShooter(root);
        break;
      case 'mainOnly':
        this.createMainOnly(root);
        break;
      case 'plasmaOnly':
        this.createPlasmaOnly(root);
        break;
      case 'crystalComplete':
        this.createCrystalComplete(root);
        break;
      default:
        this.createFallback(root);
        break;
    }
    root.scale.setScalar(MEDAL_MODEL_SCALE);
    return root;
  }

  createNoDown(group) {
    addBaseRibbon(group, { ribbonMaterial: EMERALD, discOuter: GOLD, discInner: SILVER, ringMaterial: GOLD_DARK });
    addMesh(group, extrude(createShieldShape(), 0.14), EMERALD, { y: -0.02, z: 0.06, scale: 0.74 });
    addMesh(group, STAR_GEO, GOLD, { y: -0.08, z: 0.16, scale: 0.34, rz: 0.08 });
    createWing(group, SILVER, -1, 0.04);
    createWing(group, SILVER, 1, 0.04);
  }

  createPerfectGuard(group) {
    addBaseRibbon(group, { ribbonMaterial: SILVER, discOuter: STEEL, discInner: SILVER, ringMaterial: BLUE });
    addMesh(group, extrude(createShieldShape(), 0.14), SILVER, { y: -0.02, z: 0.06, scale: 0.76 });
    addMesh(group, new THREE.TorusGeometry(0.26, 0.04, 16, 40), CYAN, { y: 0.2, z: 0.1, rx: Math.PI * 0.5 });
    addMesh(group, new THREE.BoxGeometry(0.1, 0.48, 0.08), WHITE, { y: -0.04, z: 0.14 });
    addMesh(group, new THREE.BoxGeometry(0.4, 0.1, 0.08), WHITE, { y: 0.02, z: 0.14 });
  }

  createDeadline(group) {
    addBaseRibbon(group, { ribbonMaterial: RUBY, discOuter: BRONZE, discInner: RUBY, ringMaterial: GOLD_DARK });
    addMesh(group, extrude(createHeartShape(), 0.16), RUBY, { y: -0.04, z: 0.08, scale: 0.74 });
    addMesh(group, new THREE.BoxGeometry(0.18, 0.08, 0.08), WHITE, { x: -0.28, y: -0.02, z: 0.18 });
    addMesh(group, new THREE.BoxGeometry(0.12, 0.08, 0.08), WHITE, { x: -0.1, y: 0.1, z: 0.18 });
    addMesh(group, new THREE.BoxGeometry(0.12, 0.08, 0.08), WHITE, { x: 0.04, y: -0.12, z: 0.18 });
    addMesh(group, new THREE.BoxGeometry(0.18, 0.08, 0.08), WHITE, { x: 0.24, y: 0.02, z: 0.18 });
  }

  createMegaMultiKill(group) {
    addBaseRibbon(group, { ribbonMaterial: ORANGE, discOuter: GOLD, discInner: ORANGE, ringMaterial: GOLD_DARK });
    addMesh(group, STAR_GEO, GOLD, { y: -0.04, z: 0.12, scale: 0.68, rz: 0.18 });
    const burstPositions = [
      [-0.34, 0.2],
      [0.34, 0.18],
      [-0.3, -0.24],
      [0.3, -0.26],
      [0, 0.36],
    ];
    for (const [x, y] of burstPositions) {
      addMesh(group, SPHERE_GEO, CYAN, { x, y, z: 0.12, scale: 0.55 });
    }
  }

  createBlitzSweep(group) {
    addBaseRibbon(group, { ribbonMaterial: CYAN, discOuter: BLUE, discInner: CYAN, ringMaterial: SILVER });
    addMesh(group, extrude(createBoltShape(), 0.16), CYAN, { y: -0.02, z: 0.08, scale: 0.9, rz: -0.08 });
    addMesh(group, new THREE.BoxGeometry(0.52, 0.07, 0.06), WHITE, { x: -0.22, y: -0.06, z: 0.14, rz: -0.36 });
    addMesh(group, new THREE.BoxGeometry(0.44, 0.06, 0.06), WHITE, { x: 0.16, y: 0.18, z: 0.14, rz: -0.24 });
  }

  createPointBlank(group) {
    addBaseRibbon(group, { ribbonMaterial: ORANGE, discOuter: BRONZE, discInner: ORANGE, ringMaterial: GOLD_DARK });
    createCrosshair(group, WHITE, 0.28, 0.03);
    const arrowGeo = extrude(createArrowShape(), 0.08);
    addMesh(group, arrowGeo, RUBY, { x: -0.38, y: 0, z: 0.12, scale: 0.4, rz: 0 });
    addMesh(group, arrowGeo, RUBY, { x: 0.38, y: 0, z: 0.12, scale: 0.4, rz: Math.PI });
  }

  createLongRangeHunter(group) {
    addBaseRibbon(group, { ribbonMaterial: BLUE, discOuter: STEEL, discInner: BLUE, ringMaterial: SILVER });
    createCrosshair(group, CYAN, 0.3, 0.028);
    addMesh(group, extrude(createArrowShape(), 0.08), WHITE, { y: -0.12, z: 0.14, scale: 0.68, rz: -0.18 });
    addMesh(group, new THREE.ConeGeometry(0.08, 0.18, 16), GOLD, { x: 0.32, y: -0.02, z: 0.14, rz: -Math.PI * 0.5 });
  }

  createSharpShooter(group) {
    addBaseRibbon(group, { ribbonMaterial: CYAN, discOuter: STEEL, discInner: CYAN, ringMaterial: GOLD_DARK });
    createCrosshair(group, WHITE, 0.28, 0.028);
    addMesh(group, DIAMOND_GEO, CYAN, { z: 0.14, scale: 0.9, ry: 0.4 });
    addMesh(group, new THREE.CylinderGeometry(0.03, 0.03, 0.42, 10), GOLD, { z: 0.16, rx: Math.PI * 0.5, rz: Math.PI * 0.25 });
  }

  createMainOnly(group) {
    addBaseRibbon(group, { ribbonMaterial: BLUE, discOuter: GOLD, discInner: BLUE, ringMaterial: SILVER });
    const bullet = new THREE.Group();
    createBullet(bullet, WHITE, BRONZE);
    bullet.rotation.z = -0.18;
    bullet.position.set(0, -0.02, 0.12);
    bullet.scale.setScalar(0.94);
    group.add(bullet);
    addMesh(group, new THREE.BoxGeometry(0.54, 0.08, 0.08), CYAN, { y: -0.28, z: 0.08, rz: -0.16 });
  }

  createPlasmaOnly(group) {
    addBaseRibbon(group, { ribbonMaterial: MAGENTA, discOuter: VIOLET, discInner: MAGENTA, ringMaterial: SILVER });
    addMesh(group, new THREE.SphereGeometry(0.24, 24, 24), MAGENTA, { z: 0.12 });
    addMesh(group, new THREE.TorusGeometry(0.36, 0.05, 18, 42), CYAN, { z: 0.1, rx: Math.PI * 0.5, rz: 0.18 });
    addMesh(group, new THREE.TorusGeometry(0.3, 0.035, 18, 32), WHITE, { z: 0.16, rx: 0.72, ry: 0.46 });
    addMesh(group, DIAMOND_GEO, WHITE, { y: -0.02, z: 0.22, scale: 0.36 });
  }

  createCrystalComplete(group) {
    addBaseRibbon(group, { ribbonMaterial: VIOLET, discOuter: SILVER, discInner: VIOLET, ringMaterial: BLUE });
    addMesh(group, extrude(createCrystalShape(), 0.16), CRYSTAL, { x: 0, y: 0, z: 0.08, scale: 0.76 });
    addMesh(group, extrude(createCrystalShape(), 0.14), CYAN, { x: -0.22, y: -0.04, z: 0.04, scale: 0.46 });
    addMesh(group, extrude(createCrystalShape(), 0.14), CYAN, { x: 0.22, y: -0.04, z: 0.04, scale: 0.46 });
    addMesh(group, new THREE.TorusGeometry(0.28, 0.035, 16, 36), WHITE, { y: -0.12, z: 0.12, rx: Math.PI * 0.5 });
  }

  createFallback(group) {
    addBaseRibbon(group, { ribbonMaterial: STEEL, discOuter: STEEL, discInner: SILVER, ringMaterial: GOLD_DARK });
    addMesh(group, STAR_GEO, GOLD, { y: -0.04, z: 0.12, scale: 0.5 });
  }
}

import * as THREE from 'three';
import { ENEMY_LIBRARY } from '../data/enemies.js';
import { createEnemyMeshContext, finalizeEnemyMesh } from './factory/EnemyMeshShared.js';
import { buildBasicEnemyMesh } from './factory/EnemyMeshBuildersBasic.js';
import { buildEliteEnemyMesh } from './factory/EnemyMeshBuildersElite.js';
import { buildBossEnemyMesh } from './factory/EnemyMeshBuildersBoss.js';

const ENEMY_COLLISION_DEBUG_SPHERE_GEOMETRY = new THREE.SphereGeometry(1, 18, 12);
ENEMY_COLLISION_DEBUG_SPHERE_GEOMETRY.userData.shared = true;

const ENEMY_COLLISION_DEBUG_CAPSULE_BODY_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true);
ENEMY_COLLISION_DEBUG_CAPSULE_BODY_GEOMETRY.userData.shared = true;

const ENEMY_COLLISION_DEBUG_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x6fe8ff,
  wireframe: true,
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
  depthTest: false,
  toneMapped: false,
});
ENEMY_COLLISION_DEBUG_MATERIAL.userData.shared = true;

const BOSS_COLLISION_DEBUG_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xffc46b,
  wireframe: true,
  transparent: true,
  opacity: 0.68,
  depthWrite: false,
  depthTest: false,
  toneMapped: false,
});
BOSS_COLLISION_DEBUG_MATERIAL.userData.shared = true;

/**
 * Responsibility:
 * - Mesh construction and runtime enemy object creation.
 *
 * Rules:
 * - Visual shape differences live here.
 * - Behavior selection lives in EnemySystem/BossSystem.
 * - Enemy readability helpers such as halos belong here. Do not hide enemy visibility tweaks inside AI code.
 * - New biome rosters should feel distinct through silhouette first, color second.
 */
export class EnemyFactory {
  constructor() {
    this.nextId = 1;
  }

  resetIds() {
    this.nextId = 1;
  }

  create(typeKey) {
    const def = ENEMY_LIBRARY[typeKey];
    if (!def) throw new Error(`Unknown enemy type: ${typeKey}`);
    const mesh = this.createMesh(def);
    const radius = Math.max(0, def.collisionRadius ?? def.radius ?? 0);
    const collisionHalfHeight = Math.max(0, def.collisionHalfHeight ?? 0);
    const collisionCenterYOffset = def.collisionCenterYOffset ?? 0;
    const collisionShape = def.collisionShape === 'cylinder' && collisionHalfHeight > 0
      ? 'cylinder'
      : (def.collisionShape === 'capsule' && collisionHalfHeight > 0) ? 'capsule' : 'sphere';
    const collisionDebugMesh = this.createCollisionDebugMesh({
      shape: collisionShape,
      radius,
      halfHeight: collisionHalfHeight,
      isBoss: !!def.isBoss,
    });
    if (collisionDebugMesh) {
      collisionDebugMesh.position.y = collisionCenterYOffset;
      mesh.add(collisionDebugMesh);
    }
    return {
      id: this.nextId++,
      typeKey,
      def,
      mesh,
      radius,
      collisionShape,
      collisionHalfHeight,
      collisionCenterYOffset,
      collisionDebugMesh,
      isBoss: !!def.isBoss,
      hp: def.hp,
      maxHp: def.hp,
      alive: true,
      age: 0,
      phase: 0,
      strafeDir: Math.random() < 0.5 ? -1 : 1,
      orbitPhase: Math.random() * Math.PI * 2,
      cooldown: THREE.MathUtils.randFloat(def.shootCd?.[0] ?? 0.9, def.shootCd?.[1] ?? 1.4),
      velocity: new THREE.Vector3(),
      localVelocity: new THREE.Vector3(),
      blinkTimer: THREE.MathUtils.randFloat(1.4, 2.6),
      hitShakeTimer: 0,
      hitShakeStrength: 0,
      hitShakePhase: 0,
      frameIndex: -1,
      frameActive: false,
      enemyFrameToken: 0,
      spatialRadius: 0,
      spatialMinX: 0,
      spatialMaxX: 0,
      spatialMinZ: 0,
      spatialMaxZ: 0,
      spatialCellMinX: 0,
      spatialCellMaxX: 0,
      spatialCellMinZ: 0,
      spatialCellMaxZ: 0,
      spatialIndexed: false,
    };
  }

  createCollisionDebugMesh({ shape = 'sphere', radius = 0, halfHeight = 0, isBoss = false } = {}) {
    const safeRadius = Math.max(0, radius || 0);
    if (safeRadius <= 0) return null;

    const material = isBoss ? BOSS_COLLISION_DEBUG_MATERIAL : ENEMY_COLLISION_DEBUG_MATERIAL;
    if ((shape === 'capsule' || shape === 'cylinder') && halfHeight > 0) {
      const group = new THREE.Group();
      group.name = 'EnemyCollisionDebug';
      group.visible = false;

      const body = new THREE.Mesh(ENEMY_COLLISION_DEBUG_CAPSULE_BODY_GEOMETRY, material);
      body.scale.set(safeRadius, halfHeight * 2, safeRadius);
      body.renderOrder = 999;
      group.add(body);

      if (shape === 'capsule') {
        const capTop = new THREE.Mesh(ENEMY_COLLISION_DEBUG_SPHERE_GEOMETRY, material);
        capTop.position.y = halfHeight;
        capTop.scale.setScalar(safeRadius);
        capTop.renderOrder = 999;
        group.add(capTop);

        const capBottom = new THREE.Mesh(ENEMY_COLLISION_DEBUG_SPHERE_GEOMETRY, material);
        capBottom.position.y = -halfHeight;
        capBottom.scale.setScalar(safeRadius);
        capBottom.renderOrder = 999;
        group.add(capBottom);
      }
      return group;
    }

    const mesh = new THREE.Mesh(ENEMY_COLLISION_DEBUG_SPHERE_GEOMETRY, material);
    mesh.name = 'EnemyCollisionDebug';
    mesh.visible = false;
    mesh.scale.setScalar(safeRadius);
    mesh.renderOrder = 999;
    return mesh;
  }

  setCollisionDebugVisible(enemy, visible) {
    const collisionDebugMesh = enemy?.collisionDebugMesh;
    if (!collisionDebugMesh) return false;
    collisionDebugMesh.visible = !!visible;
    return collisionDebugMesh.visible;
  }

  createMesh(def) {
    const ctx = createEnemyMeshContext(def);
    const handled = buildBasicEnemyMesh(ctx) || buildEliteEnemyMesh(ctx) || buildBossEnemyMesh(ctx);
    if (!handled) {
      ctx.group.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), ctx.mainMaterial));
    }
    return finalizeEnemyMesh(ctx);
  }
}

/**
 * Responsibility:
 * - 静的コライダ登録と astral gel 領域問い合わせを一元管理する。
 * - collision / avoidance / debug が共有する player collider shape の bake 結果を保持する。
 *
 * Rules:
 * - 静的ワールド障害物の単一の truth source であり続ける。
 * - Combat 側はこの登録結果を読むだけで、独自の障害物配列を持たない。
 * - playerAvoidanceDiscs はここで正規化・自動生成し、移動側は焼き込み済みの結果だけを読む。
 */
import {
  ASTRAL_FIELD_WORLD,
  COLLIDER_LOCAL_CURR,
  COLLIDER_LOCAL_PREV,
  COLLIDER_MATRIX_INV,
  COLLIDER_NORMAL,
  COLLIDER_QUATERNION,
  COLLIDER_RING_CENTER,
  COLLIDER_RING_NORMAL,
  COLLIDER_WORLD_POINT,
  COLLIDER_WORLD_POS,
  THREE,
} from '../EnvironmentBuilderShared.js';
import { SpatialHashGrid2D } from '../../spatial/SpatialHashGrid2D.js';
import { buildAutoPlayerAvoidanceDiscs, clonePlayerAvoidanceDiscs } from './PlayerColliderShapeShared.js';

const STATIC_COLLIDER_QUERY_RESULTS = [];
const STATIC_COLLIDER_AXIS_X = new THREE.Vector3();
const DEFAULT_STATIC_COLLIDER_GRID_CELL_SIZE = 16;

function ensureStaticColliderStorage(world) {
  if (!Array.isArray(world.staticColliders)) world.staticColliders = [];
  if (!Array.isArray(world.playerBlockerColliders)) world.playerBlockerColliders = [];
  if (!Array.isArray(world.projectileBlockerColliders)) world.projectileBlockerColliders = [];
  if (!Array.isArray(world.minimapObstacleColliders)) world.minimapObstacleColliders = [];
  if (!Array.isArray(world.reflectiveStaticColliders)) world.reflectiveStaticColliders = [];
  if (!world.staticColliderGrid) world.staticColliderGrid = new SpatialHashGrid2D(DEFAULT_STATIC_COLLIDER_GRID_CELL_SIZE);
  if (!Number.isFinite(world.staticColliderMaxGridRadius)) world.staticColliderMaxGridRadius = 0;
  if (world.staticColliderGridDirty == null) world.staticColliderGridDirty = true;
}

function compactCandidates(candidates, predicate) {
  let writeIndex = 0;
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    if (!candidate || (predicate && !predicate(candidate))) continue;
    candidates[writeIndex] = candidate;
    writeIndex += 1;
  }
  candidates.length = writeIndex;
  return candidates;
}

function normalizePlayerCollisionDiscs(discs) {
  return clonePlayerAvoidanceDiscs(discs);
}

function getCompoundGridRadius(discs) {
  if (!Array.isArray(discs) || discs.length === 0) return 0;
  let maxRadius = 0;
  for (let i = 0; i < discs.length; i += 1) {
    const disc = discs[i];
    if (!disc) continue;
    const planarRadius = Math.hypot(disc.x ?? 0, disc.z ?? 0) + Math.max(0, disc.radius ?? 0);
    if (planarRadius > maxRadius) maxRadius = planarRadius;
  }
  return maxRadius;
}

export function installStaticColliderRegistry(EnvironmentBuilder) {
  EnvironmentBuilder.prototype.markStaticColliderIndexDirty = function markStaticColliderIndexDirty() {
      ensureStaticColliderStorage(this);
      this.staticColliderGridDirty = true;
    }

  EnvironmentBuilder.prototype.bakeStaticCollider = function bakeStaticCollider(collider) {
      if (!collider) return collider;
      const source = collider.source;
      if (source) {
        source.updateWorldMatrix?.(true, false);
        source.getWorldPosition(COLLIDER_WORLD_POS);
        collider.x = COLLIDER_WORLD_POS.x;
        collider.y = COLLIDER_WORLD_POS.y + (collider.offsetY ?? 0);
        collider.z = COLLIDER_WORLD_POS.z;
        source.getWorldQuaternion?.(COLLIDER_QUATERNION);
        collider.worldQuaternion = COLLIDER_QUATERNION.clone();
        collider.matrixWorldStatic = source.matrixWorld?.clone?.() ?? null;
        collider.matrixWorldInverseStatic = collider.matrixWorldStatic?.clone?.().invert?.() ?? null;
      } else {
        collider.x = Number(collider.x) || 0;
        collider.y = Number(collider.y) || 0;
        collider.z = Number(collider.z) || 0;
      }

      const radius = Math.max(0, Number(collider.radius) || 0);
      collider.radius = radius;
      collider.verticalRadius = Math.max(0, Number(collider.verticalRadius ?? (radius * 1.35 + 1.4)) || 0);
      collider.halfHeight = Math.max(0, Number(collider.halfHeight ?? collider.verticalRadius ?? radius) || 0);
      collider.topY = collider.y + collider.halfHeight;
      collider.blocksPlayer = collider.blocksPlayer !== false;
      collider.blocksProjectiles = collider.blocksProjectiles !== false;
      collider.minimapObstacle = collider.minimapObstacle !== false && collider.blocksPlayer !== false;
      collider.playerCollisionDiscs = normalizePlayerCollisionDiscs(collider.playerCollisionDiscs);
      collider.playerAvoidanceDiscs = Array.isArray(collider.playerAvoidanceDiscs) && collider.playerAvoidanceDiscs.length > 0
        ? clonePlayerAvoidanceDiscs(collider.playerAvoidanceDiscs, collider.radius, collider.halfHeight ?? collider.verticalRadius ?? null)
        : buildAutoPlayerAvoidanceDiscs(collider);

      if (collider.surfaceNormalLocal) {
        if (!collider.worldQuaternion && source?.getWorldQuaternion) {
          source.getWorldQuaternion(COLLIDER_QUATERNION);
          collider.worldQuaternion = COLLIDER_QUATERNION.clone();
        }
        collider.surfaceNormalWorld = collider.surfaceNormalLocal.clone()
          .applyQuaternion(collider.worldQuaternion ?? COLLIDER_QUATERNION.identity())
          .normalize();
      }

      if (collider.localHalfExtents && source?.matrixWorld) {
        STATIC_COLLIDER_AXIS_X.setFromMatrixColumn(source.matrixWorld, 0);
        STATIC_COLLIDER_AXIS_X.y = 0;
        if (STATIC_COLLIDER_AXIS_X.lengthSq() < 0.0001) STATIC_COLLIDER_AXIS_X.set(1, 0, 0);
        else STATIC_COLLIDER_AXIS_X.normalize();
        collider.worldAxisX = STATIC_COLLIDER_AXIS_X.clone();
      }

      const ringRadius = Math.max(0, Number(collider.ringRadius ?? 0) || 0);
      const tubeRadius = Math.max(0, Number(collider.tubeRadius ?? 0) || 0);
      const halfExtents = collider.localHalfExtents;
      const planarHalfDiagonal = halfExtents ? Math.hypot(halfExtents.x ?? 0, halfExtents.z ?? 0) : 0;
      const compoundGridRadius = Math.max(
        getCompoundGridRadius(collider.playerCollisionDiscs),
        getCompoundGridRadius(collider.playerAvoidanceDiscs),
      );
      collider.gridRadius = Math.max(radius, planarHalfDiagonal, ringRadius + tubeRadius, compoundGridRadius);
      return collider;
    }

  EnvironmentBuilder.prototype.registerStaticCollider = function registerStaticCollider(object3d, radius, yOffset = 0, extra = {}) {
      ensureStaticColliderStorage(this);
      const verticalRadius = extra.verticalRadius ?? (radius * 1.35 + 1.4);
      const collider = {
        source: object3d,
        offsetY: yOffset,
        radius,
        verticalRadius,
        blocksPlayer: extra.blocksPlayer ?? true,
        blocksProjectiles: extra.blocksProjectiles ?? true,
        minimapObstacle: extra.minimapObstacle ?? (extra.blocksPlayer ?? true),
        halfHeight: extra.halfHeight ?? verticalRadius,
        orderIndex: this.staticColliders.length,
        ...extra,
      };
      if (extra.surfaceNormalLocal) collider.surfaceNormalLocal = extra.surfaceNormalLocal.clone();
      if (extra.localHalfExtents) collider.localHalfExtents = extra.localHalfExtents.clone();
      this.bakeStaticCollider(collider);
      this.staticColliders.push(collider);
      if (collider.blocksPlayer !== false) this.playerBlockerColliders.push(collider);
      if (collider.blocksProjectiles !== false) this.projectileBlockerColliders.push(collider);
      if (collider.minimapObstacle !== false) this.minimapObstacleColliders.push(collider);
      if (collider.reflective) this.reflectiveStaticColliders.push(collider);
      this.markStaticColliderIndexDirty();
    }

  EnvironmentBuilder.prototype.refreshCollider = function refreshCollider(collider) {
      if (!collider || collider.dynamic !== true) return collider;
      return this.bakeStaticCollider(collider);
    }

  EnvironmentBuilder.prototype.rebuildStaticColliderGrid = function rebuildStaticColliderGrid() {
      ensureStaticColliderStorage(this);
      this.staticColliderGrid.clear();
      let maxGridRadius = 0;
      for (let i = 0; i < this.staticColliders.length; i += 1) {
        const collider = this.staticColliders[i];
        if (!collider) continue;
        this.refreshCollider(collider);
        const gridRadius = Math.max(0, collider.gridRadius ?? collider.radius ?? 0);
        if (gridRadius > maxGridRadius) maxGridRadius = gridRadius;
        this.staticColliderGrid.insertAabb(
          (collider.x ?? 0) - gridRadius,
          (collider.x ?? 0) + gridRadius,
          (collider.z ?? 0) - gridRadius,
          (collider.z ?? 0) + gridRadius,
          collider,
        );
      }
      this.staticColliderMaxGridRadius = maxGridRadius;
      this.staticColliderGridDirty = false;
      return this.staticColliderGrid;
    }

  EnvironmentBuilder.prototype.ensureStaticColliderGrid = function ensureStaticColliderGrid() {
      ensureStaticColliderStorage(this);
      if (this.staticColliderGridDirty) this.rebuildStaticColliderGrid();
      return this.staticColliderGrid;
    }

  EnvironmentBuilder.prototype.collectStaticColliderCandidatesAabb = function collectStaticColliderCandidatesAabb(minX, maxX, minZ, maxZ, out = [], mode = 'all') {
      const grid = this.ensureStaticColliderGrid();
      grid.queryAabb(minX, maxX, minZ, maxZ, out);
      if (mode === 'player') return compactCandidates(out, (collider) => collider.blocksPlayer !== false);
      if (mode === 'projectile') return compactCandidates(out, (collider) => collider.blocksProjectiles !== false);
      if (mode === 'minimap') return compactCandidates(out, (collider) => collider.minimapObstacle !== false);
      return compactCandidates(out);
    }

  EnvironmentBuilder.prototype.collectPlayerCollisionCandidates = function collectPlayerCollisionCandidates(x, z, radius, out = []) {
      this.ensureStaticColliderGrid();
      const range = Math.max(0, radius || 0) + (this.staticColliderMaxGridRadius ?? 0) + 0.001;
      return this.collectStaticColliderCandidatesAabb(x - range, x + range, z - range, z + range, out, 'player');
    }

  EnvironmentBuilder.prototype.collectPlayerAvoidanceCandidatesSegment = function collectPlayerAvoidanceCandidatesSegment(startX, startZ, endX, endZ, pad = 0, out = []) {
      this.ensureStaticColliderGrid();
      const extra = Math.max(0, pad || 0) + (this.staticColliderMaxGridRadius ?? 0) + 0.001;
      return this.collectStaticColliderCandidatesAabb(
        Math.min(startX, endX) - extra,
        Math.max(startX, endX) + extra,
        Math.min(startZ, endZ) - extra,
        Math.max(startZ, endZ) + extra,
        out,
        'player',
      );
    }

  EnvironmentBuilder.prototype.collectProjectileCollisionCandidates = function collectProjectileCollisionCandidates(position, radius, previousPosition = null, out = []) {
      this.ensureStaticColliderGrid();
      const currentX = position?.x ?? 0;
      const currentZ = position?.z ?? 0;
      const previousX = previousPosition?.x ?? currentX;
      const previousZ = previousPosition?.z ?? currentZ;
      const pad = Math.max(0, radius || 0) + (this.staticColliderMaxGridRadius ?? 0) + 0.001;
      return this.collectStaticColliderCandidatesAabb(
        Math.min(currentX, previousX) - pad,
        Math.max(currentX, previousX) + pad,
        Math.min(currentZ, previousZ) - pad,
        Math.max(currentZ, previousZ) + pad,
        out,
        'projectile',
      );
    }

  EnvironmentBuilder.prototype.getMinimapStaticObstacleColliders = function getMinimapStaticObstacleColliders() {
      return this.minimapObstacleColliders ?? this.staticColliders ?? [];
    }

  EnvironmentBuilder.prototype.createResolvedHit = function createResolvedHit(collider, point, normal) {
      return {
        ...collider,
        normal: normal.clone(),
        point: point.clone(),
        reflective: !!collider.reflective,
      };
    }

  EnvironmentBuilder.prototype.tryPlaneColliderHit = function tryPlaneColliderHit(collider, position, radius, previousPosition) {
      if (!previousPosition || !collider?.source || !collider.localHalfExtents) return null;
      const half = collider.localHalfExtents;
      const matrixWorld = collider.matrixWorldStatic ?? collider.source.matrixWorld;
      if (!matrixWorld) return null;
      if (collider.matrixWorldInverseStatic) COLLIDER_MATRIX_INV.copy(collider.matrixWorldInverseStatic);
      else COLLIDER_MATRIX_INV.copy(matrixWorld).invert();
      COLLIDER_LOCAL_PREV.copy(previousPosition).applyMatrix4(COLLIDER_MATRIX_INV);
      COLLIDER_LOCAL_CURR.copy(position).applyMatrix4(COLLIDER_MATRIX_INV);

      const expandedX = half.x + radius;
      const expandedY = half.y + radius;
      const planeDepth = half.z + radius;
      const dz = COLLIDER_LOCAL_CURR.z - COLLIDER_LOCAL_PREV.z;
      if (Math.abs(dz) < 0.000001) return null;

      let bestT = Infinity;
      let bestSurfaceZ = null;
      for (const targetZ of [planeDepth, -planeDepth]) {
        const t = (targetZ - COLLIDER_LOCAL_PREV.z) / dz;
        if (t < 0 || t > 1 || t >= bestT) continue;
        const x = THREE.MathUtils.lerp(COLLIDER_LOCAL_PREV.x, COLLIDER_LOCAL_CURR.x, t);
        const y = THREE.MathUtils.lerp(COLLIDER_LOCAL_PREV.y, COLLIDER_LOCAL_CURR.y, t);
        if (Math.abs(x) > expandedX || Math.abs(y) > expandedY) continue;
        bestT = t;
        bestSurfaceZ = targetZ >= 0 ? half.z : -half.z;
        COLLIDER_LOCAL_CURR.set(x, y, bestSurfaceZ);
      }

      if (!Number.isFinite(bestT) || bestSurfaceZ == null) return null;

      if (collider.worldQuaternion) COLLIDER_QUATERNION.copy(collider.worldQuaternion);
      else collider.source.getWorldQuaternion?.(COLLIDER_QUATERNION);
      COLLIDER_WORLD_POINT.copy(COLLIDER_LOCAL_CURR).applyMatrix4(matrixWorld);
      COLLIDER_NORMAL.set(0, 0, Math.sign(bestSurfaceZ) || 1).applyQuaternion(COLLIDER_QUATERNION).normalize();
      return this.createResolvedHit(collider, COLLIDER_WORLD_POINT, COLLIDER_NORMAL);
    }

  EnvironmentBuilder.prototype.tryRingColliderHit = function tryRingColliderHit(collider, position, radius) {
      if (!collider?.source) return null;
      const matrixWorld = collider.matrixWorldStatic ?? collider.source.matrixWorld;
      if (!matrixWorld) return null;
      if (collider.matrixWorldInverseStatic) COLLIDER_MATRIX_INV.copy(collider.matrixWorldInverseStatic);
      else COLLIDER_MATRIX_INV.copy(matrixWorld).invert();
      COLLIDER_LOCAL_CURR.copy(position).applyMatrix4(COLLIDER_MATRIX_INV);

      const majorRadius = collider.ringRadius ?? collider.radius ?? 1;
      const tubeRadius = collider.tubeRadius ?? 0.12;
      const radial = Math.hypot(COLLIDER_LOCAL_CURR.x, COLLIDER_LOCAL_CURR.y);
      const radialGap = Math.abs(radial - majorRadius);
      if (radialGap > tubeRadius + radius || Math.abs(COLLIDER_LOCAL_CURR.z) > tubeRadius + radius) return null;

      if (radial < 0.0001) return null;
      COLLIDER_RING_CENTER.set((COLLIDER_LOCAL_CURR.x / radial) * majorRadius, (COLLIDER_LOCAL_CURR.y / radial) * majorRadius, 0);
      COLLIDER_RING_NORMAL.copy(COLLIDER_LOCAL_CURR).sub(COLLIDER_RING_CENTER);
      if (COLLIDER_RING_NORMAL.lengthSq() < 0.0001) COLLIDER_RING_NORMAL.set(0, 0, Math.sign(COLLIDER_LOCAL_CURR.z) || 1);
      else COLLIDER_RING_NORMAL.normalize();

      COLLIDER_LOCAL_CURR.copy(COLLIDER_RING_CENTER).addScaledVector(COLLIDER_RING_NORMAL, tubeRadius);
      if (collider.worldQuaternion) COLLIDER_QUATERNION.copy(collider.worldQuaternion);
      else collider.source.getWorldQuaternion?.(COLLIDER_QUATERNION);
      COLLIDER_WORLD_POINT.copy(COLLIDER_LOCAL_CURR).applyMatrix4(matrixWorld);
      COLLIDER_NORMAL.copy(COLLIDER_RING_NORMAL).applyQuaternion(COLLIDER_QUATERNION).normalize();
      return this.createResolvedHit(collider, COLLIDER_WORLD_POINT, COLLIDER_NORMAL);
    }

  EnvironmentBuilder.prototype.resolveColliderHit = function resolveColliderHit(collider, position, previousPosition = null) {
      this.refreshCollider(collider);
      if (collider.reflectionModel === 'plane') {
        const planeHit = this.tryPlaneColliderHit(collider, position, 0, previousPosition);
        if (planeHit) return planeHit;
      } else if (collider.reflectionModel === 'ring') {
        const ringHit = this.tryRingColliderHit(collider, position, 0);
        if (ringHit) return ringHit;
      }

      const normal = COLLIDER_NORMAL;
      if (collider.reflectionModel === 'plane' && collider.surfaceNormalWorld) {
        normal.copy(collider.surfaceNormalWorld);
      } else if (collider.reflectionModel === 'ring') {
        normal.set(position.x - collider.x, 0, position.z - collider.z);
        if (normal.lengthSq() < 0.0001) normal.set(0, 1, 0);
        else normal.normalize();
      } else {
        normal.set(position.x - collider.x, position.y - collider.y, position.z - collider.z);
        if (normal.lengthSq() < 0.0001) normal.set(0, 1, 0);
        else normal.normalize();
      }

      return this.createResolvedHit(collider, position, normal);
    }

  EnvironmentBuilder.prototype.hitStaticObstacle = function hitStaticObstacle(position, radius, previousPosition = null) {
      const perf = this.game?.debug?.getPerformanceMonitor?.();
      perf?.count?.('staticQueries', 1);
      const candidates = this.collectProjectileCollisionCandidates(position, radius, previousPosition, STATIC_COLLIDER_QUERY_RESULTS);
      perf?.sample?.('staticCandidates', candidates.length);
      const probeY = position.y;
      for (let i = 0; i < candidates.length; i += 1) {
        const collider = candidates[i];
        if (!collider) continue;
        this.refreshCollider(collider);

        if (collider.reflective) {
          if (collider.reflectionModel === 'plane') {
            const planeHit = this.tryPlaneColliderHit(collider, position, radius, previousPosition);
            if (planeHit) return planeHit;
          } else if (collider.reflectionModel === 'ring') {
            const ringHit = this.tryRingColliderHit(collider, position, radius);
            if (ringHit) return ringHit;
          }
        }

        const hitRadius = radius + collider.radius;
        const dx = collider.x - position.x;
        const dy = collider.y - position.y;
        const dz = collider.z - position.z;
        if (dx * dx + dy * dy + dz * dz <= hitRadius * hitRadius) return this.resolveColliderHit(collider, position, previousPosition);
        const xzHit = dx * dx + dz * dz <= hitRadius * hitRadius;
        if (xzHit && Math.abs(probeY - collider.y) <= collider.verticalRadius) return this.resolveColliderHit(collider, position, previousPosition);
      }
      return null;
    }

  EnvironmentBuilder.prototype.bakeAstralGelField = function bakeAstralGelField(field) {
      if (!field) return field;
      const source = field.source;
      if (source?.getWorldPosition) {
        source.updateWorldMatrix?.(true, false);
        source.getWorldPosition(ASTRAL_FIELD_WORLD);
        field.worldX = ASTRAL_FIELD_WORLD.x;
        field.worldY = ASTRAL_FIELD_WORLD.y + (field.offsetY ?? 0);
        field.worldZ = ASTRAL_FIELD_WORLD.z;
      } else {
        field.worldX = Number(field.worldX ?? field.x) || 0;
        field.worldY = Number(field.worldY ?? field.y) || 0;
        field.worldZ = Number(field.worldZ ?? field.z) || 0;
      }
      field.radiusX = Math.max(0.1, Number(field.radiusX ?? field.radius ?? 1) || 1);
      field.radiusY = Math.max(0.1, Number(field.radiusY ?? field.radiusX * 0.55) || field.radiusX * 0.55 || 0.55);
      field.radiusZ = Math.max(0.1, Number(field.radiusZ ?? field.radiusX) || field.radiusX || 1);
      return field;
    }

  EnvironmentBuilder.prototype.refreshAstralGelFields = function refreshAstralGelFields() {
      if (!Array.isArray(this.astralGelFields) || this.astralGelFields.length === 0) return this.astralGelFields ?? [];
      for (let i = 0; i < this.astralGelFields.length; i += 1) {
        this.bakeAstralGelField(this.astralGelFields[i]);
      }
      return this.astralGelFields;
    }

  EnvironmentBuilder.prototype.registerAstralGelField = function registerAstralGelField(field) {
      const bakedField = this.bakeAstralGelField(field);
      this.astralGelFields.push(bakedField);
      return bakedField;
    }

  EnvironmentBuilder.prototype.getMinimapAstralGelFields = function getMinimapAstralGelFields() {
      if (this.currentMissionId !== 'astral' || !Array.isArray(this.astralGelFields) || this.astralGelFields.length === 0) return [];
      return this.astralGelFields;
    }

  EnvironmentBuilder.prototype.getAstralGelFieldAt = function getAstralGelFieldAt(x, y, z, radius = 0) {
      if (this.currentMissionId !== 'astral' || !Array.isArray(this.astralGelFields) || this.astralGelFields.length === 0) return null;

      const probeY = y ?? (this.terrain?.getHeight?.(x, z) ?? 0) + 2.0;
      for (let i = 0; i < this.astralGelFields.length; i += 1) {
        const field = this.astralGelFields[i];
        if (!field) continue;
        const radiusX = field.radiusX ?? Math.max(0.1, field.radius ?? 1);
        const radiusY = field.radiusY ?? Math.max(0.1, radiusX * 0.55);
        const radiusZ = field.radiusZ ?? Math.max(0.1, radiusX);
        const nx = (x - (field.worldX ?? 0)) / (radiusX + radius);
        const ny = (probeY - (field.worldY ?? 0)) / radiusY;
        const nz = (z - (field.worldZ ?? 0)) / (radiusZ + radius);
        if ((nx * nx + ny * ny + nz * nz) <= 1) return field;
      }
      return null;
    }

  EnvironmentBuilder.prototype.getAstralGelSpeedScaleAt = function getAstralGelSpeedScaleAt(x, y, z, radius = 0) {
      return this.getAstralGelFieldAt(x, y, z, radius)?.speedScale ?? 1;
    }

  EnvironmentBuilder.prototype.getPlayerMoveScaleAt = function getPlayerMoveScaleAt(x, y, z) {
      return this.getAstralGelSpeedScaleAt(x, y, z, 1.2);
    }

  EnvironmentBuilder.prototype.isPointInsideAstralGel = function isPointInsideAstralGel(position, radius = 0) {
      if (!position) return false;
      return !!this.getAstralGelFieldAt(position.x, position.y, position.z, radius);
    }

  EnvironmentBuilder.prototype.getProjectileSpeedScaleAt = function getProjectileSpeedScaleAt(position, radius = 0) {
      if (!position) return 1;
      return this.getAstralGelSpeedScaleAt(position.x, position.y, position.z, radius);
    }
}

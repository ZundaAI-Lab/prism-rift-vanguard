import * as Shared from '../EnemySystemShared.js';

const {
  THREE,
  GAME_BOUNDS,
  MINIMAP,
  randRange,
  clampPointToPlayerTravelBounds,
  TEMP,
  SPAWN_POINT,
  SPAWN_FALLBACK,
  BLINK_BASE_DIR,
  BLINK_CANDIDATE,
  BLINK_BEST,
  BLINK_OFFSET,
} = Shared;

export function installEnemySpawnRuntime(EnemySystem) {
  EnemySystem.prototype.spawnEnemy = function spawnEnemy(typeKey, position = null) {
    const enemy = this.factory.create(typeKey);
    const spawnPoint = this.resolveSpawnPoint(enemy, position);
    const y = this.game.world.getHeight(spawnPoint.x, spawnPoint.z) + enemy.def.hover;
    enemy.mesh.position.set(spawnPoint.x, y, spawnPoint.z);
    enemy.spawnY = y;
    this.game.store.enemies.push(enemy);
    this.game.renderer.groups.actors.add(enemy.mesh);
    this.factory.setCollisionDebugVisible(enemy, this.game.debug?.isEnabled?.() === true);
    if (enemy.def.isBoss) this.bossSystem.setupBoss(enemy);
    if (this.shouldPlaySpawnIntro(enemy)) this.beginSpawnIntro(enemy);
    if (!enemy.def.isBoss) this.game.audio?.playSfx('enemySpawn', { cooldownMs: 70, worldPosition: enemy.mesh.position });
    this.game.missionAchievements?.registerEnemySpawned?.(enemy);
    this.registerEnemyFrameEntry(enemy);
    this.registerEnemySpatialEntry(enemy);
    return enemy;
  }

  EnemySystem.prototype.shouldPlaySpawnIntro = function shouldPlaySpawnIntro(enemy) {
    if (!enemy?.def) return false;
    if (!enemy.def.isBoss) return true;
    return !this.bossSystem.finalBoss.isFinalBoss(enemy);
  }

  EnemySystem.prototype.resolveSpawnPoint = function resolveSpawnPoint(enemy, explicitPosition = null) {
    const playerPos = this.game.store.playerMesh?.position ?? null;
    const minDistance = this.getEnemyNoSpawnDistance(enemy);
    const padding = enemy.def.radius + 2;

    if (explicitPosition) {
      SPAWN_POINT.set(explicitPosition.x, 0, explicitPosition.z);
      if (playerPos) this.constrainPointOutsidePlayerNoSpawn(SPAWN_POINT, playerPos, minDistance, padding);
      else this.clampSpawnPointToArena(SPAWN_POINT, padding);
      return SPAWN_POINT;
    }

    const minRadius = 70;
    const maxRadius = 122;
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      SPAWN_POINT.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      if (playerPos && SPAWN_POINT.distanceTo(playerPos) < minDistance) continue;
      this.clampSpawnPointToArena(SPAWN_POINT, padding);
      if (playerPos && SPAWN_POINT.distanceTo(playerPos) < minDistance) continue;
      return SPAWN_POINT;
    }

    if (playerPos) {
      SPAWN_FALLBACK.set(-playerPos.x, 0, -playerPos.z);
      if (SPAWN_FALLBACK.lengthSq() < 0.0001) SPAWN_FALLBACK.set(0, 0, -1);
      SPAWN_FALLBACK.normalize().multiplyScalar(minDistance + 16).add(playerPos);
      this.constrainPointOutsidePlayerNoSpawn(SPAWN_FALLBACK, playerPos, minDistance, padding);
      return SPAWN_FALLBACK;
    }

    SPAWN_POINT.set(0, 0, -(minDistance + 16));
    this.clampSpawnPointToArena(SPAWN_POINT, padding);
    return SPAWN_POINT;
  }

  EnemySystem.prototype.pushSpawnOutsideInnerRing = function pushSpawnOutsideInnerRing(point, playerPos, minDistance) {
    const distance = point.distanceTo(playerPos);
    if (distance >= minDistance) return;

    SPAWN_FALLBACK.copy(point).sub(playerPos);
    if (SPAWN_FALLBACK.lengthSq() < 0.0001) {
      SPAWN_FALLBACK.set(-playerPos.x, 0, -playerPos.z);
      if (SPAWN_FALLBACK.lengthSq() < 0.0001) {
        const angle = Math.random() * Math.PI * 2;
        SPAWN_FALLBACK.set(Math.cos(angle), 0, Math.sin(angle));
      }
    }
    SPAWN_FALLBACK.normalize();
    point.copy(playerPos).addScaledVector(SPAWN_FALLBACK, minDistance);
  }

  EnemySystem.prototype.getEnemyNoSpawnDistance = function getEnemyNoSpawnDistance(enemy, extraMargin = 0) {
    const enemyRadius = Math.max(0, enemy?.def?.radius ?? 0);
    const safetyPadding = enemyRadius + 2 + Math.max(0, extraMargin);
    return (MINIMAP.range * MINIMAP.innerRingRatio) + safetyPadding;
  }

  EnemySystem.prototype.constrainPointOutsidePlayerNoSpawn = function constrainPointOutsidePlayerNoSpawn(point, playerPos, minDistance, padding = 0) {
    if (!playerPos) {
      this.clampSpawnPointToArena(point, padding);
      return point;
    }
    this.pushSpawnOutsideInnerRing(point, playerPos, minDistance);
    this.clampSpawnPointToArena(point, padding);
    this.pushSpawnOutsideInnerRing(point, playerPos, minDistance);
    this.clampSpawnPointToArena(point, padding);
    return point;
  }

  EnemySystem.prototype.resolveDuelistBlinkPoint = function resolveDuelistBlinkPoint(enemy, playerPos, toPlayer, side, minDistance) {
    const padding = enemy.def.radius + 2;
    const enemyDistance = enemy.mesh.position.distanceTo(playerPos);
    const startsInsideNoSpawn = enemyDistance < minDistance;

    if (!startsInsideNoSpawn) {
      TEMP.copy(playerPos)
        .addScaledVector(side, enemy.strafeDir * THREE.MathUtils.randFloat(9, 15))
        .addScaledVector(toPlayer, -enemy.def.preferredDist * 0.75);
      clampPointToPlayerTravelBounds(TEMP, 30);
      this.constrainPointOutsidePlayerNoSpawn(TEMP, playerPos, minDistance, padding);
      return TEMP;
    }

    BLINK_BASE_DIR.set(toPlayer.x, 0, toPlayer.z);
    if (BLINK_BASE_DIR.lengthSq() < 0.0001) BLINK_BASE_DIR.set(0, 0, -1);
    BLINK_BASE_DIR.normalize();

    let bestScore = -Infinity;
    const baseAngle = Math.atan2(BLINK_BASE_DIR.z, BLINK_BASE_DIR.x);
    const preferredRadius = minDistance + 12;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const preferOppositeHalf = attempt < 9;
      const angle = preferOppositeHalf
        ? baseAngle + THREE.MathUtils.randFloatSpread(Math.PI)
        : Math.random() * Math.PI * 2;
      const radius = THREE.MathUtils.randFloat(minDistance + 5, minDistance + 22);
      BLINK_CANDIDATE.set(
        playerPos.x + Math.cos(angle) * radius,
        enemy.mesh.position.y,
        playerPos.z + Math.sin(angle) * radius,
      );
      clampPointToPlayerTravelBounds(BLINK_CANDIDATE, 30);
      this.constrainPointOutsidePlayerNoSpawn(BLINK_CANDIDATE, playerPos, minDistance, padding);

      BLINK_OFFSET.copy(BLINK_CANDIDATE).sub(playerPos);
      BLINK_OFFSET.y = 0;
      const candidateRadius = BLINK_OFFSET.length();
      if (candidateRadius < 0.0001) continue;
      BLINK_OFFSET.divideScalar(candidateRadius);

      const oppositeAlignment = BLINK_OFFSET.dot(BLINK_BASE_DIR);
      const sideBias = BLINK_OFFSET.dot(side) * enemy.strafeDir;
      let score = oppositeAlignment * 3.2;
      if (preferOppositeHalf) score += 1.15;
      if (candidateRadius >= minDistance) score += 0.55;
      score += Math.max(0, sideBias) * 0.35;
      score -= Math.abs(candidateRadius - preferredRadius) * 0.045;

      if (score > bestScore) {
        bestScore = score;
        BLINK_BEST.copy(BLINK_CANDIDATE);
      }
    }

    if (bestScore > -Infinity) return BLINK_BEST;

    TEMP.copy(playerPos).addScaledVector(BLINK_BASE_DIR, minDistance + 10);
    clampPointToPlayerTravelBounds(TEMP, 30);
    this.constrainPointOutsidePlayerNoSpawn(TEMP, playerPos, minDistance, padding);
    return TEMP;
  }

  EnemySystem.prototype.buildWaveBurstSpawnPoints = function buildWaveBurstSpawnPoints(pattern, count) {
    if (pattern === 'encircle') return this.buildEncircleWaveBurstSpawnPoints(count);
    return this.buildClusterWaveBurstSpawnPoints(count);
  }

  EnemySystem.prototype.buildClusterWaveBurstSpawnPoints = function buildClusterWaveBurstSpawnPoints(count) {
    const playerPos = this.game.store.playerMesh?.position ?? null;
    if (!playerPos) return [];

    const points = [];
    const minDistance = MINIMAP.range * MINIMAP.innerRingRatio + 10;
    const anchorAngle = Math.random() * Math.PI * 2;
    const anchorRadius = randRange(minDistance + 4, minDistance + 24);
    const anchor = new THREE.Vector3(
      playerPos.x + Math.cos(anchorAngle) * anchorRadius,
      0,
      playerPos.z + Math.sin(anchorAngle) * anchorRadius,
    );

    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const offsetRadius = randRange(3.5, 12.5) * (count > 3 ? 1.08 : 1);
      SPAWN_POINT.set(
        anchor.x + Math.cos(angle) * offsetRadius,
        0,
        anchor.z + Math.sin(angle) * offsetRadius,
      );
      this.pushSpawnOutsideInnerRing(SPAWN_POINT, playerPos, minDistance);
      this.clampSpawnPointToArena(SPAWN_POINT, 3.2);
      points.push({ x: SPAWN_POINT.x, z: SPAWN_POINT.z });
    }
    return points;
  }

  EnemySystem.prototype.buildEncircleWaveBurstSpawnPoints = function buildEncircleWaveBurstSpawnPoints(count) {
    const playerPos = this.game.store.playerMesh?.position ?? null;
    if (!playerPos) return [];

    const points = [];
    const minDistance = MINIMAP.range * MINIMAP.innerRingRatio + 8;
    const baseRadius = randRange(minDistance + 4, minDistance + 16);
    const rotation = Math.random() * Math.PI * 2;
    const spacing = (Math.PI * 2) / Math.max(1, count);

    for (let i = 0; i < count; i += 1) {
      const angle = rotation + spacing * i + THREE.MathUtils.randFloatSpread(0.18);
      const radius = baseRadius + THREE.MathUtils.randFloatSpread(5.5);
      SPAWN_POINT.set(
        playerPos.x + Math.cos(angle) * radius,
        0,
        playerPos.z + Math.sin(angle) * radius,
      );
      this.pushSpawnOutsideInnerRing(SPAWN_POINT, playerPos, minDistance);
      this.clampSpawnPointToArena(SPAWN_POINT, 3.2);
      points.push({ x: SPAWN_POINT.x, z: SPAWN_POINT.z });
    }
    return points;
  }

  EnemySystem.prototype.clampSpawnPointToArena = function clampSpawnPointToArena(point, padding = 0) {
    const limit = Math.max(8, GAME_BOUNDS.softRadius - padding);
    const radial = Math.hypot(point.x, point.z);
    if (radial <= limit) return;
    point.x *= limit / radial;
    point.z *= limit / radial;
  }

}

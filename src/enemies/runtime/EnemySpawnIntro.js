import * as Shared from '../EnemySystemShared.js';

const {
  THREE,
  SPAWN_INTRO_LOOK,
} = Shared;

export function installEnemySpawnIntro(EnemySystem) {
  EnemySystem.prototype.beginSpawnIntro = function beginSpawnIntro(enemy) {
    const riseHeight = Math.max(enemy.def.isBoss ? 4.8 : 3.2, enemy.def.hover + (enemy.def.isBoss ? 1.8 : 1.1));
    const duration = enemy.def.isBoss ? 1.42 : 1.08;
    const introMaterials = this.collectSpawnIntroMaterials(enemy.mesh);
    enemy.spawnIntro = {
      active: true,
      elapsed: 0,
      duration,
      baseY: enemy.spawnY,
      riseHeight,
      baseScale: enemy.mesh.scale.clone(),
      materials: introMaterials,
      wobblePhase: Math.random() * Math.PI * 2,
    };

    this.applySpawnIntroVisual(enemy, 0);
    this.game.effects.spawnSpawnRift(
      new THREE.Vector3(enemy.mesh.position.x, this.game.world.getHeight(enemy.mesh.position.x, enemy.mesh.position.z) + 0.12, enemy.mesh.position.z),
      enemy.def.accent,
      Math.max(1.45, enemy.def.radius * (enemy.def.isBoss ? 1.08 : 0.92)),
      duration + 0.12,
      enemy.def.isBoss ? 1.15 : 1,
    );
  }

  EnemySystem.prototype.collectSpawnIntroMaterials = function collectSpawnIntroMaterials(root) {
    const seen = new Set();
    const entries = [];
    root.traverse((object) => {
      if (!object?.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material || seen.has(material)) continue;
        seen.add(material);
        entries.push({
          material,
          opacity: typeof material.opacity === 'number' ? material.opacity : 1,
          transparent: !!material.transparent,
          depthWrite: 'depthWrite' in material ? material.depthWrite : true,
        });
      }
    });
    return entries;
  }

  EnemySystem.prototype.applySpawnIntroVisual = function applySpawnIntroVisual(enemy, normalized) {
    const intro = enemy.spawnIntro;
    if (!intro) return;

    const t = THREE.MathUtils.clamp(normalized, 0, 1);
    const eased = t * t * (3 - (2 * t));
    const wobble = Math.sin((t * Math.PI * 2.2) + intro.wobblePhase) * (1 - t);
    const lateralScale = 0.16 + (0.84 * eased);
    const verticalScale = 0.42 + (0.58 * eased) + (Math.sin(t * Math.PI) * 0.08);

    enemy.mesh.position.y = intro.baseY - (intro.riseHeight * (1 - eased)) + (wobble * 0.2);
    enemy.mesh.scale.set(
      intro.baseScale.x * lateralScale * (1.06 + (wobble * 0.05)),
      intro.baseScale.y * verticalScale,
      intro.baseScale.z * lateralScale * (1.06 - (wobble * 0.05)),
    );
    enemy.mesh.rotation.x = wobble * 0.16;
    enemy.mesh.rotation.z = Math.cos((t * Math.PI * 1.7) + intro.wobblePhase * 0.7) * (1 - t) * 0.13;
    enemy.mesh.rotation.y += 0.01 + ((1 - t) * 0.03);

    const opacity = Math.min(1, 0.04 + (eased * 1.02));
    for (const entry of intro.materials) {
      entry.material.transparent = true;
      entry.material.depthWrite = opacity > 0.82 ? entry.depthWrite : false;
      entry.material.opacity = entry.opacity * opacity;
    }
  }

  EnemySystem.prototype.finishSpawnIntro = function finishSpawnIntro(enemy) {
    const intro = enemy.spawnIntro;
    if (!intro) return;

    enemy.mesh.position.y = intro.baseY;
    enemy.mesh.scale.copy(intro.baseScale);
    enemy.mesh.rotation.x = 0;
    enemy.mesh.rotation.z = 0;
    for (const entry of intro.materials) {
      entry.material.opacity = entry.opacity;
      entry.material.transparent = entry.transparent;
      entry.material.depthWrite = entry.depthWrite;
    }
    enemy.spawnIntro = null;
  }

  EnemySystem.prototype.updateSpawnIntro = function updateSpawnIntro(enemy, dt) {
    const intro = enemy.spawnIntro;
    if (!intro?.active) return false;

    intro.elapsed += dt;
    const normalized = intro.duration > 0 ? intro.elapsed / intro.duration : 1;
    this.applySpawnIntroVisual(enemy, normalized);

    const playerPos = this.game.store.playerMesh?.position;
    if (playerPos) {
      SPAWN_INTRO_LOOK.set(playerPos.x, enemy.mesh.position.y, playerPos.z);
      enemy.mesh.lookAt(SPAWN_INTRO_LOOK);
      enemy.mesh.rotation.x += Math.sin(intro.wobblePhase + (normalized * Math.PI * 2.1)) * (1 - Math.min(1, normalized)) * 0.08;
      enemy.mesh.rotation.z += Math.cos(intro.wobblePhase * 0.7 + (normalized * Math.PI * 1.8)) * (1 - Math.min(1, normalized)) * 0.06;
    }

    enemy.velocity.set(0, 0, 0);
    enemy.localVelocity.set(0, 0, 0);

    if (normalized >= 1) {
      this.finishSpawnIntro(enemy);
      return false;
    }
    return true;
  }

}

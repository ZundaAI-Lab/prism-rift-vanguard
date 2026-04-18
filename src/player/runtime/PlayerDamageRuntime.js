import * as THREE from 'three';
import { PLAYER_BASE } from '../../data/balance.js';
import { clamp } from '../../utils/math.js';

const UP = new THREE.Vector3(0, 1, 0);
const DAMAGE_SOURCE_WORLD = new THREE.Vector3();
const DAMAGE_DIRECTION_WORLD = new THREE.Vector3();
const DAMAGE_CAMERA_FORWARD = new THREE.Vector3();
const DAMAGE_CAMERA_RIGHT = new THREE.Vector3();

export function installPlayerDamageRuntime(PlayerSystem) {
  PlayerSystem.prototype.queueDamageIndicator = function queueDamageIndicator(meta = null, intensity = 1) {
    const indicatorMode = this.game.optionState?.hud?.hitDirectionIndicator ?? 'off';
    if (indicatorMode === 'off') return;
    const playerMesh = this.game.store.playerMesh;
    const camera = this.game.renderer?.camera;
    const uiState = this.game.state.ui;
    if (!playerMesh || !camera || !uiState) return;

    let hasDirection = false;
    if (meta?.sourcePosition) {
      const sourcePosition = meta.sourcePosition;
      DAMAGE_SOURCE_WORLD.set(sourcePosition.x ?? 0, sourcePosition.y ?? 0, sourcePosition.z ?? 0);
      DAMAGE_DIRECTION_WORLD.subVectors(DAMAGE_SOURCE_WORLD, playerMesh.position);
      DAMAGE_DIRECTION_WORLD.y = 0;
      hasDirection = DAMAGE_DIRECTION_WORLD.lengthSq() > 0.0001;
    } else if (meta?.sourceDirection) {
      DAMAGE_DIRECTION_WORLD.copy(meta.sourceDirection).multiplyScalar(-1);
      DAMAGE_DIRECTION_WORLD.y = 0;
      hasDirection = DAMAGE_DIRECTION_WORLD.lengthSq() > 0.0001;
    }
    if (!hasDirection) return;

    DAMAGE_DIRECTION_WORLD.normalize();
    camera.getWorldDirection(DAMAGE_CAMERA_FORWARD);
    DAMAGE_CAMERA_FORWARD.y = 0;
    if (DAMAGE_CAMERA_FORWARD.lengthSq() < 0.0001) DAMAGE_CAMERA_FORWARD.set(0, 0, -1);
    DAMAGE_CAMERA_FORWARD.normalize();
    DAMAGE_CAMERA_RIGHT.crossVectors(DAMAGE_CAMERA_FORWARD, UP).normalize();

    const x = DAMAGE_DIRECTION_WORLD.dot(DAMAGE_CAMERA_RIGHT);
    const y = DAMAGE_DIRECTION_WORLD.dot(DAMAGE_CAMERA_FORWARD);
    const angle = Math.atan2(x, y);
    const holdDuration = 1.0;
    const fadeDuration = 0.3;
    const duration = holdDuration + fadeDuration;
    const strength = clamp(intensity * 1.08, 0.35, 1.2);
    const indicator = {
      id: (uiState.damageIndicatorCounter = (uiState.damageIndicatorCounter ?? 0) + 1),
      angle,
      strength,
      timer: duration,
      duration,
      holdDuration,
      fadeDuration,
    };
    const indicators = Array.isArray(uiState.damageIndicators) ? uiState.damageIndicators : (uiState.damageIndicators = []);
    indicators.push(indicator);
    const maxCount = 4;
    while (indicators.length > maxCount) indicators.shift();
  };

  PlayerSystem.prototype.applyDamage = function applyDamage(amount, meta = null) {
    const { state } = this.game;
    const { player } = state;
    if (player.invulnTimer > 0 || state.mode !== 'playing') return false;
    const armorReduction = this.game.upgrades?.getArmorDamageReduction?.() ?? 0;
    const finalDamage = Math.max(0, amount - armorReduction);
    if (finalDamage <= 0) return false;
    const prevHealth = player.health;
    player.health = Math.max(0, player.health - finalDamage);
    this.game.missionAchievements?.registerDamageTaken?.(finalDamage);
    player.invulnTimer = PLAYER_BASE.invulnAfterHit;
    this.queueDamageIndicator(meta, finalDamage / 18);
    state.damageFlash = Math.max(state.damageFlash ?? 0, clamp(finalDamage / 20, 0.18, 0.54));
    this.game.audio?.playSfx('playerDamage', { cooldownMs: 90 });
    const lowHpThreshold = player.maxHealth * 0.25;
    if (player.health > 0 && prevHealth > lowHpThreshold && player.health <= lowHpThreshold) {
      this.game.audio?.playSfx('playerLowHpAlarm');
    }
    if (player.health <= 0) {
      this.game.audio?.playSfx('playerDestroyed', { cooldownMs: 400 });
      this.game.missionSystem.failRun();
    }
    return true;
  };

  PlayerSystem.prototype.heal = function heal(amount) {
    const { player } = this.game.state;
    player.health = Math.min(player.maxHealth, player.health + amount);
  };
}

import * as Shared from '../EnemySystemShared.js';

const {
  THREE,
  ENEMY_HIT_SHAKE_DURATION,
  ENEMY_HIT_SHAKE_PITCH,
  ENEMY_HIT_SHAKE_ROLL,
  ENEMY_HIT_SHAKE_YAW,
} = Shared;

export function installEnemyDamageRuntime(EnemySystem) {
  EnemySystem.prototype.triggerDamageShake = function triggerDamageShake(enemy, amount = 1) {
    enemy.hitShakeTimer = ENEMY_HIT_SHAKE_DURATION;
    enemy.hitShakeStrength = Math.max(enemy.hitShakeStrength ?? 0, THREE.MathUtils.clamp(amount, 0.45, enemy.def.isBoss ? 1.2 : 1));
    enemy.hitShakePhase = Math.random() * Math.PI * 2;
  }

  EnemySystem.prototype.applyDamageShake = function applyDamageShake(enemy) {
    if (!enemy.hitShakeTimer || enemy.hitShakeStrength <= 0) return;

    const elapsed = ENEMY_HIT_SHAKE_DURATION - enemy.hitShakeTimer;
    const normalized = elapsed / ENEMY_HIT_SHAKE_DURATION;
    const envelope = Math.pow(enemy.hitShakeTimer / ENEMY_HIT_SHAKE_DURATION, 0.72);
    const strength = enemy.hitShakeStrength * envelope;
    const pulse = enemy.hitShakePhase + normalized * Math.PI * 11.5;

    enemy.mesh.rotation.x += Math.sin(pulse * 1.08) * ENEMY_HIT_SHAKE_PITCH * strength;
    enemy.mesh.rotation.y += Math.sin(pulse * 0.82) * ENEMY_HIT_SHAKE_YAW * strength;
    enemy.mesh.rotation.z += Math.cos(pulse * 1.76) * ENEMY_HIT_SHAKE_ROLL * strength;
  }

}

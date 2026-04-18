/**
 * Responsibility:
 * - ボス共通の照準・先読み・地形参照を担当する。
 *
 * Rules:
 * - ここでは共通数学だけを扱い、個別パターン分岐を持ち込まない。
 * - ボス固有の phase 条件は各 Controller に残す。
 */
import {
  DIRECT_AIM,
  HEIGHT_ALIGNED,
  HEIGHT_FORWARD,
  LEAD_AIM,
  LEAD_TARGET,
  PLAYER_VELOCITY,
  REMAPPED,
  TARGET_DIR,
  UP,
} from '../../BossSystemShared.js';
import {
  alignShotToPlayerHeight as alignShotToPlayerHeightShared,
  solveLeadTime as solveLeadTimeShared,
  writePlayerVelocity,
} from '../../shared/ShotAimMath.js';

export function installBossAim(BossSystem) {
  BossSystem.prototype.alignShotToPlayerHeight = function alignShotToPlayerHeight(origin, direction) {
    return alignShotToPlayerHeightShared(
      origin,
      direction,
      this.game.store.playerMesh?.position,
      HEIGHT_FORWARD,
      HEIGHT_ALIGNED,
    );
  }

  BossSystem.prototype.getPlayerVelocity = function getPlayerVelocity() {
    return writePlayerVelocity(this.game.state.player, PLAYER_VELOCITY);
  }

  BossSystem.prototype.solveLeadTime = function solveLeadTime(origin, projectileSpeed, leadStrength = 1) {
    return solveLeadTimeShared(
      origin,
      projectileSpeed,
      leadStrength,
      this.game.store.playerMesh?.position,
      this.getPlayerVelocity(),
      1.9,
    );
  }

  BossSystem.prototype.getLeadDirection = function getLeadDirection(origin, projectileSpeed, leadStrength = 1) {
    const playerPos = this.game.store.playerMesh?.position;
    if (!playerPos) return this.alignShotToPlayerHeight(origin, TARGET_DIR);

    const t = this.solveLeadTime(origin, projectileSpeed, leadStrength);
    const vel = this.getPlayerVelocity();
    LEAD_TARGET.set(
      playerPos.x + vel.x * leadStrength * t,
      playerPos.y,
      playerPos.z + vel.z * leadStrength * t,
    ).sub(origin);

    if (LEAD_TARGET.lengthSq() < 0.000001) return this.alignShotToPlayerHeight(origin, TARGET_DIR);
    return LEAD_TARGET.normalize();
  }

  BossSystem.prototype.remapDirectionToLead = function remapDirectionToLead(enemy, direction, projectileSpeed, leadStrength = 1) {
    const normalized = direction.clone().normalize();
    DIRECT_AIM.copy(this.alignShotToPlayerHeight(enemy.mesh.position, TARGET_DIR));
    LEAD_AIM.copy(this.getLeadDirection(enemy.mesh.position, projectileSpeed, leadStrength));

    const baseFlat = Math.hypot(DIRECT_AIM.x, DIRECT_AIM.z);
    const dirFlat = Math.hypot(normalized.x, normalized.z);
    if (baseFlat < 0.0001 || dirFlat < 0.0001) return LEAD_AIM.clone();

    const baseYaw = Math.atan2(DIRECT_AIM.x, DIRECT_AIM.z);
    const dirYaw = Math.atan2(normalized.x, normalized.z);
    REMAPPED.copy(LEAD_AIM).applyAxisAngle(UP, dirYaw - baseYaw);
    if (REMAPPED.lengthSq() < 0.000001) return LEAD_AIM.clone();
    return this.alignShotToPlayerHeight(enemy.mesh.position, REMAPPED).clone();
  }

  BossSystem.prototype.resolveBossShotDirection = function resolveBossShotDirection(enemy, direction, projectileSpeed, leadRatio = 0, leadStrength = 1) {
    const normalized = direction.clone().normalize();
    const heightAligned = this.alignShotToPlayerHeight(enemy.mesh.position, normalized);
    if (leadRatio > 0 && Math.random() < leadRatio) return this.remapDirectionToLead(enemy, normalized, projectileSpeed, leadStrength);
    return heightAligned;
  }

  BossSystem.prototype.getGroundY = function getGroundY(x, z) {
    return this.game.world.getHeight?.(x, z) ?? 0;
  }
}

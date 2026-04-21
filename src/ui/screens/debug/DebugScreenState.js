/**
 * Responsibility:
 * - デバッグ画面の state 反映と summary 表示を担当する。
 */
import { MISSIONS } from '../../../data/missions.js';

export function installDebugScreenState(UIRoot) {
  UIRoot.prototype.setDebugScreenOpen = function setDebugScreenOpen(open) {
    if (!this.game.debug.isEnabled()) {
      this.debugScreenOpen = false;
      return;
    }
    this.debugScreenOpen = !!open;
    if (this.debugScreenOpen) {
      this.compendiumOpen = false;
      this.dataScreenOpen = false;
      this.creditScreenOpen = false;
    }
    this.refreshDataButtonState();
  };

  UIRoot.prototype.refreshDebugScreenState = function refreshDebugScreenState() {
    if (!this.game.debug.isEnabled()) return;

    const invincibleBtn = this.refs.debugInvincibleBtn;
    const bossModeBtn = this.refs.debugBossModeBtn;
    const collisionOverlayBtn = this.refs.debugCollisionOverlayBtn;
    const select = this.refs.debugStageSelect;
    const summary = this.refs.debugStageSummary;
    const openBtn = this.refs.debugOpenBtn;
    const pauseDebugBtn = this.refs.pauseDebugBtn;
    const selectedIndex = this.game.debug.getTitleStartMissionIndex();
    const mission = MISSIONS[selectedIndex] ?? MISSIONS[0];
    const invincible = this.game.debug.isInvincible();
    const bossMode = this.game.debug.isBossMode();
    const collisionOverlay = this.game.debug.isCollisionOverlayEnabled();
    const missionBossOnly = !!mission?.bossOnly;
    const missionHasBoss = !!mission?.boss;

    const applyOpenButtonState = (button) => {
      if (!button) return;
      button.textContent = this.debugScreenOpen ? this.t('debug.buttonOpen') : this.t('common.debug');
      button.style.borderColor = this.debugScreenOpen ? 'rgba(255, 204, 120, 0.42)' : 'rgba(255, 192, 96, 0.28)';
      button.style.background = this.debugScreenOpen
        ? 'linear-gradient(180deg, rgba(110, 76, 20, 0.34), rgba(28, 18, 10, 0.20))'
        : 'linear-gradient(180deg, rgba(70, 48, 12, 0.32), rgba(18, 12, 8, 0.18))';
    };

    applyOpenButtonState(openBtn);
    applyOpenButtonState(pauseDebugBtn);

    if (select && select.value !== String(selectedIndex)) select.value = String(selectedIndex);

    if (invincibleBtn) {
      invincibleBtn.textContent = invincible ? this.t('debug.godmodeOn') : this.t('debug.godmodeOff');
      invincibleBtn.style.borderColor = invincible ? 'rgba(255, 192, 96, 0.42)' : 'rgba(255,255,255,0.12)';
      invincibleBtn.style.background = invincible
        ? 'linear-gradient(180deg, rgba(255,186,84,0.28), rgba(255,148,64,0.16))'
        : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
      invincibleBtn.style.color = invincible ? '#fff1cf' : '';
    }

    if (bossModeBtn) {
      bossModeBtn.textContent = bossMode ? this.t('debug.bossModeOn') : this.t('debug.bossModeOff');
      bossModeBtn.style.borderColor = bossMode ? 'rgba(131, 236, 255, 0.42)' : 'rgba(255,255,255,0.12)';
      bossModeBtn.style.background = bossMode
        ? 'linear-gradient(180deg, rgba(58, 148, 182, 0.24), rgba(28, 76, 118, 0.14))'
        : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
      bossModeBtn.style.color = bossMode ? '#dffbff' : '';
    }

    if (collisionOverlayBtn) {
      collisionOverlayBtn.textContent = collisionOverlay ? this.t('debug.colliderOverlayOn') : this.t('debug.colliderOverlayOff');
      collisionOverlayBtn.style.borderColor = collisionOverlay ? 'rgba(255, 139, 232, 0.48)' : 'rgba(255,255,255,0.12)';
      collisionOverlayBtn.style.background = collisionOverlay
        ? 'linear-gradient(180deg, rgba(255, 139, 232, 0.24), rgba(94, 52, 132, 0.14))'
        : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
      collisionOverlayBtn.style.color = collisionOverlay ? '#ffe5fb' : '';
    }

    this.refreshDebugPerformanceReportView();

    if (summary) {
      const baseMissionText = mission.isTutorial
        ? this.t('debug.tutorialMission', { subtitle: this.getMissionSubtitle(mission) })
        : missionBossOnly
          ? this.t('debug.bossDirectMission', { subtitle: this.getMissionSubtitle(mission), boss: this.getEnemyName(mission.boss) })
          : this.t('debug.wavesMission', { subtitle: this.getMissionSubtitle(mission), waves: mission.waves, boss: this.getEnemyName(mission.boss) });
      const modeNotes = [];
      if (invincible) modeNotes.push(this.t('debug.godmodeNote'));
      if (bossMode) {
        if (!missionHasBoss) modeNotes.push(this.t('debug.modeNoBossTarget'));
        else if (missionBossOnly) modeNotes.push(this.t('debug.modeAlreadyBossDirect'));
        else modeNotes.push(this.t('debug.modeWaveSkip'));
      }
      if (collisionOverlay) modeNotes.push(this.t('debug.colliderOverlayNote'));
      modeNotes.push(this.t('debug.runtimePurge'));
      summary.textContent = [baseMissionText, ...modeNotes].join(' / ');
    }
  };
}

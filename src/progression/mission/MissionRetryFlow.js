export function installMissionRetryFlow(MissionSystem) {
  MissionSystem.prototype.retryCurrentMission = function retryCurrentMission() {
    this.game.debug?.finalizeMissionPerformance?.(this.game, 'retry', { reason: 'retryCurrentMission' });
    const checkpoint = this.game.state.progression.missionCheckpoint ?? {
      missionIndex: this.game.state.missionIndex,
      score: 0,
      crystals: 0,
    };
    this.cancelIntervalTransition();
    this.game.state.score = checkpoint.score;
    this.game.state.crystals = checkpoint.crystals;
    this.game.state.progression.missionTimer = 0;
    this.game.state.progression.missionTimerActive = false;
    this.game.state.progression.missionTimeBonus = 0;
    this.game.state.progression.missionNoDownBonus = 0;
    this.game.state.progression.missionFinalCrystalBonus = 0;
    this.game.state.progression.missionFailCrystalAward = 0;
    this.game.state.progression.missionFailCrystalBanked = 0;
    this.beginMission(checkpoint.missionIndex);
  }

  MissionSystem.prototype.applyMissionFailCrystalRecovery = function applyMissionFailCrystalRecovery() {
    const progression = this.game.state.progression;
    const checkpoint = progression.missionCheckpoint ?? {
      missionIndex: this.game.state.missionIndex,
      score: this.game.state.score,
      crystals: this.game.state.crystals,
    };
    const missionStartCrystals = Math.max(0, Math.floor(checkpoint.crystals ?? 0));
    const currentCrystals = Math.max(0, Math.floor(this.game.state.crystals ?? 0));
    const earnedThisMission = Math.max(0, currentCrystals - missionStartCrystals);
    const recoveredCrystals = Math.max(0, Math.floor(earnedThisMission / 4));
    const bankedCrystals = missionStartCrystals + recoveredCrystals;

    progression.missionFailCrystalAward = recoveredCrystals;
    progression.missionFailCrystalBanked = bankedCrystals;
    checkpoint.crystals = bankedCrystals;
    progression.missionCheckpoint = checkpoint;
    this.game.state.crystals = bankedCrystals;
  }

}

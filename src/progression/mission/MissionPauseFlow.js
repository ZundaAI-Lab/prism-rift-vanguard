export function installMissionPauseFlow(MissionSystem) {
  MissionSystem.prototype.pauseForUnlock = function pauseForUnlock() {
    const { state } = this.game;
    if (state.mode !== 'playing') return;
    if (state.progression.missionStatus === 'clearSequence') return;
    state.progression.pausedStatus = state.progression.missionStatus;
    state.mode = 'paused';
    this.game.audio?.playSfx('uiPause', { cooldownMs: 120 });
  }

  MissionSystem.prototype.resumePlay = function resumePlay() {
    const { state } = this.game;
    if (state.mode !== 'paused') return;
    state.mode = 'playing';
    this.clearNotice();
    this.game.audio?.playSfx('uiResume', { cooldownMs: 120 });
  }

  MissionSystem.prototype.beginGameOverSequence = function beginGameOverSequence() {
    const { state } = this.game;
    if (state.mode === 'gameoverSequence' || state.mode === 'gameover') return;

    state.mode = 'gameoverSequence';
    const started = this.game.playerSystem.startGameOverSequence();
    if (!started) {
      this.completeGameOverSequence();
    }
  }

  MissionSystem.prototype.completeGameOverSequence = function completeGameOverSequence() {
    this.game.debug?.finalizeMissionPerformance?.(this.game, 'gameover', { reason: 'completeGameOverSequence' });
    this.game.state.mode = 'gameover';
  }

}

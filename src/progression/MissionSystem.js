import { MISSIONS } from './MissionSystemShared.js';
import { installMissionLifecycle } from './mission/MissionLifecycle.js';
import { installMissionPauseFlow } from './mission/MissionPauseFlow.js';
import { installMissionTutorialFlow } from './mission/MissionTutorialFlow.js';
import { installMissionWaveFlow } from './mission/MissionWaveFlow.js';
import { installMissionClearFlow } from './mission/MissionClearFlow.js';
import { installMissionRetryFlow } from './mission/MissionRetryFlow.js';

/**
 * Responsibility:
 * - Campaign flow, wave pacing, boss spawn, mission clear, run fail.
 *
 * Rules:
 * - This is the only gameplay module allowed to change the global game mode.
 * - Systems may report events in, but should not decide mission transitions themselves.
 * - Post-boss clear timing belongs here. Do not trigger interval/clear screens directly from enemy code.
 * - Mission start heal/full-restock also belongs here so shop and player modules do not secretly disagree about when HP is refreshed.
 * - Mission retry checkpoint capture also lives here. UI may ask for a retry, but only this module decides what mission-start state is restored.
 * - Debug start-mission selection may request a non-zero starting mission, but the value must be clamped here.
 *   This keeps campaign flow authoritative and prevents UI from skipping beyond defined mission data.
 * - User-pause caused by pointer-lock release is part of campaign flow. Keep pause/resume mode changes here so the game cannot
 *   accidentally continue spawning or clearing missions under a UI-only pause overlay.
 * - Boss-only missions are still owned here. Even if a boss module handles choreography, this file decides when that intro counts as the active mission state.
 */
export class MissionSystem {
  constructor(game) {
    this.game = game;
  }

  get currentMission() {
    return MISSIONS[this.game.state.missionIndex];
  }
}

installMissionLifecycle(MissionSystem);
installMissionPauseFlow(MissionSystem);
installMissionTutorialFlow(MissionSystem);
installMissionWaveFlow(MissionSystem);
installMissionClearFlow(MissionSystem);
installMissionRetryFlow(MissionSystem);

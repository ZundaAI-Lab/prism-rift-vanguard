import { PLAYER_BASE } from '../data/balance.js';
import { angleWrap, clamp, randInt } from '../utils/math.js';
import { CAMPAIGN_START_MISSION_INDEX, MISSIONS } from '../data/missions.js';
import { getEnemyName, getMissionLabel, getMissionName, getMissionSubtitle, translate } from '../i18n/index.js';

export {
  PLAYER_BASE,
  angleWrap,
  clamp,
  randInt,
  CAMPAIGN_START_MISSION_INDEX,
  MISSIONS,
  getEnemyName,
  getMissionLabel,
  getMissionName,
  getMissionSubtitle,
  translate,
};

export const CLEAR_SEQUENCE_TRANSITION_LEAD = 0.85;
export const TUTORIAL_STEP_COUNT = 4;
export const TUTORIAL_CLEAR_CRYSTALS = 10;
export const SERAPH_WRAITH_CLEAR_SPECIAL_DURATION = 2.0;
export const SERAPH_WRAITH_CLEAR_SKY_REVEAL_DELAY = 2.0;
export const SERAPH_WRAITH_CLEAR_SKY_REVEAL_DURATION = 4.0;
export const SERAPH_WRAITH_CLEAR_ANNOUNCEMENT_DELAY = 6.0;
export const SERAPH_WRAITH_CLEAR_RESULT_DELAY = 8.0;
export const SERAPH_WRAITH_CLEAR_FLYAWAY_START = 12.1;
export const SERAPH_WRAITH_CLEAR_FLYAWAY_DURATION = 5.2;
export const SERAPH_WRAITH_CLEAR_CAMERA_BLEND_DURATION = 1.0;
export const SERAPH_WRAITH_CLEAR_FLIGHT_DELAY = 0.9;
export const SERAPH_WRAITH_CLEAR_STRAIGHT_DURATION = 4.3;
export const SERAPH_WRAITH_CLEAR_CURVE_DURATION = 0;
export const SERAPH_WRAITH_CLEAR_PATH_DEPTH = 42;
export const SERAPH_WRAITH_CLEAR_PATH_SCREEN_RISE = 8.5;

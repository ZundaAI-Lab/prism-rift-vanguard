import { APP_TITLE, APP_VERSION_LABEL } from './AppMeta.js';
import { Game } from '../core/Game.js';

document.title = `${APP_TITLE} ${APP_VERSION_LABEL}`;

const game = new Game();
game.start();

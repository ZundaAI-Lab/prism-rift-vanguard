import { APP_TITLE, APP_VERSION_LABEL } from '../AppMeta.js';
import { Game } from '../../core/Game.js';
import {
  createBootLoadingOverlay,
  hideBootLoadingOverlay,
  updateBootLoadingOverlay,
} from './BootLoadingOverlay.js';

export async function bootstrapApp() {
  document.title = `${APP_TITLE} ${APP_VERSION_LABEL}`;

  const loadingOverlay = createBootLoadingOverlay();
  const game = new Game();
  let finalSnapshot = game.audio?.getAudioPreloadSnapshot?.() ?? {};

  try {
    updateBootLoadingOverlay(loadingOverlay, finalSnapshot);
    finalSnapshot = await game.audio?.preloadAllAssets?.({
      onProgress: (snapshot) => updateBootLoadingOverlay(loadingOverlay, snapshot),
    }) ?? finalSnapshot;
  } finally {
    updateBootLoadingOverlay(loadingOverlay, { ...finalSnapshot, pending: 0, percent: 100 });
    game.start();
    requestAnimationFrame(() => hideBootLoadingOverlay(loadingOverlay));
  }
}

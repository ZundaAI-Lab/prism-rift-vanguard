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
    finalSnapshot = await game.audio?.preloadBootAssets?.({
      onProgress: (snapshot) => updateBootLoadingOverlay(loadingOverlay, snapshot),
    }) ?? finalSnapshot;
  } catch (error) {
    console.warn('[boot] Audio preload failed; continuing startup.', error);
  } finally {
    updateBootLoadingOverlay(loadingOverlay, { ...finalSnapshot, pending: 0, percent: 100 });
    // 起動時は resident BGM と全 SFX だけをベストエフォートで読む。
    // ミッション専用 BGM は beginMission 側で個別 preload し、失敗時も無音継続で起動を止めない。
    game.start();
    requestAnimationFrame(() => hideBootLoadingOverlay(loadingOverlay));
  }
}

import { App } from './app/App.ts';
import { Hud } from './ui/Hud.ts';
import { RedirectOverlay } from './ui/RedirectOverlay.ts';
import { mustGet } from './util/dom.ts';
import type { QualityProfile } from './util/quality.ts';

/**
 * Builds and starts the scene. Imported lazily by main.ts so that three.js
 * and the post-processing chain are only downloaded when the device gets
 * the scene at all.
 */
export function bootScene(quality: QualityProfile, stayOnRedirect: boolean): App {
  const overlay = new RedirectOverlay(mustGet('redirect'), () => {
    app.returnToStage();
  });
  const app = new App({
    container: mustGet('stage'),
    hud: new Hud(mustGet('hud')),
    overlay,
    stayOnRedirect,
    quality,
  });
  app.start();
  return app;
}

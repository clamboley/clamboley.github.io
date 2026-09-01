import './styles/main.css';
import { App } from './app/App.ts';
import { showFallback } from './ui/Fallback.ts';
import { Hud } from './ui/Hud.ts';
import { RedirectOverlay } from './ui/RedirectOverlay.ts';
import { mustGet } from './util/dom.ts';
import { needsFallback, readDeviceHints, resolveQuality } from './util/quality.ts';
import { supportsWebGL } from './util/webgl.ts';

const params = new URLSearchParams(location.search);
const hints = readDeviceHints();
// `?fallback` shows the plain navigation, `?force3d` insists on the scene
const fallback =
  params.has('fallback') || !supportsWebGL() || (needsFallback(hints) && !params.has('force3d'));

if (fallback) {
  showFallback();
} else {
  const stayOnRedirect = import.meta.env.DEV || params.has('stay');
  const overlay = new RedirectOverlay(mustGet('redirect'), () => {
    app.returnToStage();
  });
  const app = new App({
    container: mustGet('stage'),
    hud: new Hud(mustGet('hud')),
    overlay,
    stayOnRedirect,
    quality: resolveQuality(hints, params.get('quality')),
  });
  app.start();
  // debugging hook, development only
  if (import.meta.env.DEV) (window as unknown as { app: App }).app = app;
}

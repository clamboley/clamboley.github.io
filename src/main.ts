import './styles/main.css';
import { App } from './app/App.ts';
import { showFallback } from './ui/Fallback.ts';
import { Hud } from './ui/Hud.ts';
import { RedirectOverlay } from './ui/RedirectOverlay.ts';
import { mustGet } from './util/dom.ts';
import { supportsWebGL } from './util/webgl.ts';

if (supportsWebGL()) {
  const stayOnRedirect = import.meta.env.DEV || new URLSearchParams(location.search).has('stay');
  const overlay = new RedirectOverlay(mustGet('redirect'), () => {
    app.returnToStage();
  });
  const app = new App({
    container: mustGet('stage'),
    hud: new Hud(mustGet('hud')),
    overlay,
    stayOnRedirect,
  });
  app.start();
} else {
  showFallback();
}

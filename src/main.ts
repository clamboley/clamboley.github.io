import './styles/main.css';
import { showFallback } from './ui/Fallback.ts';
import { needsFallback, readDeviceHints, resolveQuality } from './util/quality.ts';
import { supportsWebGL } from './util/webgl.ts';

const params = new URLSearchParams(location.search);
const hints = readDeviceHints();
// `?fallback` shows the plain navigation, `?force3d` insists on the scene
const webgl = supportsWebGL();
const fallback =
  params.has('fallback') || !webgl || (needsFallback(hints) && !params.has('force3d'));

if (fallback) {
  const reason = params.has('fallback')
    ? 'affichage demandé'
    : !webgl
      ? 'WebGL indisponible'
      : !hints.webgl2
        ? 'WebGL2 indisponible'
        : 'économie de données activée';
  console.info('[vitrine] navigation instead of the scene', { reason, hints });
  // without WebGL there is nothing to try; otherwise the visitor may insist
  showFallback({ offer3d: webgl, reason });
} else {
  const quality = resolveQuality(hints, params.get('quality'));
  // the scene (three.js included) is a separate chunk: only fetched when it will run
  import('./boot.ts')
    .then(({ bootScene }) => {
      const app = bootScene(quality);
      // debugging hook, development only
      if (import.meta.env.DEV) (window as unknown as { app: unknown }).app = app;
    })
    .catch((error: unknown) => {
      console.error('Scene failed to start, showing the navigation', error);
      showFallback({ offer3d: false, reason: 'la scène n’a pas pu démarrer' });
    });
}

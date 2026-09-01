import { defineConfig, type Plugin } from 'vitest/config';
import { KIT } from './src/kit.config.ts';
import { site } from './src/site.config.ts';

/**
 * `BASE_PATH` lets the CI build for a sub-path deployment
 * (e.g. `/vitrine/` on GitHub Pages) without touching the source.
 */
const base = process.env.BASE_PATH ?? '/';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Fills `{{site.*}}` and `{{nav.items}}` in index.html from the TypeScript
 * config, so identity, metadata and the crawler-facing navigation share the
 * single source of truth used by the scene.
 */
function siteHtml(): Plugin {
  // a pending destination stays focusable for the keyboard path but is no link
  const navItems = KIT.map(({ key, destination }) =>
    destination.pending === true
      ? `<li><a data-key="${key}" data-pending="true" tabindex="0" aria-disabled="true">${escapeHtml(destination.label)}</a></li>`
      : `<li><a href="${escapeHtml(destination.url)}" data-key="${key}">${escapeHtml(destination.label)}</a></li>`,
  ).join('\n        ');
  const sameAs = KIT.map(({ destination }) => destination.url).filter((url) =>
    url.startsWith('https://'),
  );
  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    jobTitle: site.tagline,
    url: site.url,
    image: `${site.url}og.jpg`,
    sameAs,
  });
  const tokens: Record<string, string> = {
    'site.lang': site.lang,
    'site.name': escapeHtml(site.name),
    'site.tagline': escapeHtml(site.tagline),
    'site.title': escapeHtml(site.title),
    'site.description': escapeHtml(site.description),
    'site.url': escapeHtml(site.url),
    'nav.items': navItems,
    // a script body: HTML-escaping would corrupt it, `</` cannot occur in these values
    'site.jsonld': jsonld,
  };
  return {
    name: 'vitrine:site-html',
    transformIndexHtml(html) {
      return html.replace(/\{\{([\w.]+)\}\}/g, (match, key: string) => tokens[key] ?? match);
    },
  };
}

export default defineConfig({
  base,
  plugins: [siteHtml()],
  build: {
    target: 'es2022',
    sourcemap: false,
    // three.js alone is ~550 kB minified: it gets its own long-lived chunk,
    // fetched only when the scene runs (see main.ts)
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            { name: 'postprocessing', test: /node_modules[\\/]postprocessing[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});

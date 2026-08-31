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
  const navItems = KIT.map(
    ({ destination }) =>
      `<li><a href="${escapeHtml(destination.url)}">${escapeHtml(destination.label)}</a></li>`,
  ).join('\n        ');
  const tokens: Record<string, string> = {
    'site.lang': site.lang,
    'site.name': escapeHtml(site.name),
    'site.tagline': escapeHtml(site.tagline),
    'site.title': escapeHtml(site.title),
    'site.description': escapeHtml(site.description),
    'site.url': escapeHtml(site.url),
    'nav.items': navItems,
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
    // three.js alone is ~550 kB minified; loading strategy is handled at the optimisation step
    chunkSizeWarningLimit: 700,
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

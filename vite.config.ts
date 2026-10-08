import { defineConfig, loadEnv, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/*
 * sitemap.xml and robots.txt, written at build time.
 *
 * The public pages and every feature page come from the source.
 */
function seoFiles(mode: string): Plugin {
  const env = loadEnv(mode, rootDir, '');
  const site = (env.VITE_SITE_URL || 'https://afterbi.com').replace(/\/$/, '');

  return {
    name: 'seo-files',
    apply: 'build',
    async generateBundle() {
      const source = readFileSync(path.resolve(rootDir, 'src/lib/site.ts'), 'utf8');
      const block = source.slice(source.indexOf('export const MODULES'), source.indexOf('];', source.indexOf('export const MODULES')));
      const modules = [...block.matchAll(/slug: '([a-z0-9-]+)'/g)].map((m) => m[1]);
      const today = new Date().toISOString().slice(0, 10);
      const pages = [
        { loc: '/', priority: '1.0' },
        { loc: '/features', priority: '0.9' },
        ...modules.map((slug) => ({ loc: `/features/${slug}`, priority: '0.8' })),
        { loc: '/solutions', priority: '0.8' },
        { loc: '/pricing', priority: '0.8' },
        { loc: '/demo', priority: '0.6' },
        { loc: '/terms', priority: '0.3' },
        { loc: '/privacy', priority: '0.3' },
      ];
      const xml =
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        pages
          .map(
            (page) =>
              `  <url><loc>${site}${page.loc === '/' ? '/' : page.loc}</loc><lastmod>${(page as { date?: string }).date || today}</lastmod><priority>${page.priority}</priority></url>`,
          )
          .join('\n') +
        '\n</urlset>\n';
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: xml });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: [
          '# AfterBI. The public site and the blog are meant to be found; nothing behind sign in is.',
          '# firestore.rules is what keeps a stranger out of anybody\'s records, not this file.',
          '',
          'User-agent: *',
          'Allow: /',
          'Disallow: /portal/',
          'Disallow: /login',
          'Disallow: /forgot-password',
          '',
          `Sitemap: ${site}/sitemap.xml`,
          '',
        ].join('\n'),
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), seoFiles(mode)],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        /*
         * Only React gets a hand-placed chunk. Everything else is left to the
         * bundler, and that is a fix rather than a simplification.
         *
         * The version this replaces shipped exceljs, chart.js, recharts,
         * d3-geo and topojson-client in one graph, so a distributor opening one
         * invoice downloaded a spreadsheet engine and two charting libraries
         * first. None of them is reached before a click. Left alone, the
         * bundler makes each one an async chunk fetched the first time somebody
         * actually opens the screen that needs it.
         *
         * React is different: it is genuinely needed by the first byte of every
         * page, and giving it a stable name means it stays in the browser cache
         * across deploys instead of being re-downloaded whenever app code
         * changes.
         */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id)) return 'react';
          // Firebase is fetched on demand now (see AuthContext), but it changes
          // only when the SDK is upgraded, so a stable name keeps it in the
          // browser cache across app deploys.
          if (/[\\/]node_modules[\\/]@?firebase/.test(id)) return 'firebase';
          // lucide-react is deliberately NOT forced into one chunk: that made
          // every visitor download every icon the whole app uses before first
          // paint. Left alone, each page ships only its own icons.
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
}));

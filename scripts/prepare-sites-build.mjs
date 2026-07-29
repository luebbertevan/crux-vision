import { mkdir, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(projectRoot, 'dist');
const clientRoot = path.join(outputRoot, 'client');
const serverRoot = path.join(outputRoot, 'server');

await mkdir(clientRoot, { recursive: true });
for (const entry of await readdir(outputRoot)) {
  if (entry === 'client' || entry === 'server') continue;
  await rename(path.join(outputRoot, entry), path.join(clientRoot, entry));
}

await mkdir(serverRoot, { recursive: true });
await writeFile(
  path.join(serverRoot, 'index.js'),
  `export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    }

    const requestUrl = new URL(request.url);
    const isMediaAdapterModule =
      requestUrl.pathname === '/assets/mediaAdapter.js' ||
      (
        requestUrl.pathname.startsWith('/assets/mediaAdapter-') &&
        requestUrl.pathname.endsWith('.js')
      );
    const assetRequest = isMediaAdapterModule
      ? new Request(new URL('/assets/mediaAdapter.js', request.url), request)
      : request;
    const response = await env.ASSETS.fetch(assetRequest);
    if (response.status !== 404) {
      if (!isMediaAdapterModule) return response;

      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store, max-age=0');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    if (requestUrl.pathname.startsWith('/assets/')) return response;

    const fallbackUrl = new URL('/index.html', request.url);
    return env.ASSETS.fetch(new Request(fallbackUrl, request));
  },
};
`,
);
await writeFile(
  path.join(serverRoot, 'wrangler.json'),
  `${JSON.stringify({
    name: 'crux-vision-phone-test',
    main: 'index.js',
    compatibility_date: '2026-07-23',
    assets: {
      directory: '../client',
      binding: 'ASSETS',
      not_found_handling: 'single-page-application',
    },
  })}\n`,
);

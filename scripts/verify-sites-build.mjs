import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsRoot = path.join(projectRoot, 'dist', 'client', 'assets');
const workerPath = path.join(projectRoot, 'dist', 'server', 'index.js');
const assetNames = await readdir(assetsRoot);

if (!assetNames.includes('mediaAdapter.js')) {
  throw new Error('Sites build is missing the stable mediaAdapter.js chunk.');
}
if (assetNames.some((name) => /^mediaAdapter-.+\.js$/.test(name))) {
  throw new Error('Sites build unexpectedly emitted a hashed media-adapter chunk.');
}

const workerUrl = pathToFileURL(workerPath);
workerUrl.searchParams.set('verify', Date.now().toString());
const worker = (await import(workerUrl.href)).default;
const requestedPaths = [];
const env = {
  ASSETS: {
    fetch: async (request) => {
      const pathname = new URL(request.url).pathname;
      requestedPaths.push(pathname);
      if (pathname === '/assets/mediaAdapter.js') {
        return new Response('export const BrowserMediaAdapter = {};', {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=31536000',
            'Content-Type': 'text/javascript',
          },
        });
      }
      return new Response('Not Found', { status: 404 });
    },
  },
};
const response = await worker.fetch(
  new Request(
    'https://crux-vision.example/assets/mediaAdapter-previous-build.js',
  ),
  env,
);

if (response.status !== 200) {
  throw new Error(`Stale media-adapter alias returned ${response.status}.`);
}
if (response.headers.get('Cache-Control') !== 'no-store, max-age=0') {
  throw new Error('Stable media-adapter response is missing its no-store policy.');
}
if (requestedPaths.join(',') !== '/assets/mediaAdapter.js') {
  throw new Error(
    `Stale media-adapter alias requested unexpected assets: ${requestedPaths.join(',')}`,
  );
}

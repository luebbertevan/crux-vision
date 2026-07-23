import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const port = 4174;
const baseUrl = `http://127.0.0.1:${port}`;
const fixtureRoot =
  process.env.CRUX_FIXTURE_ROOT ??
  '/Users/evan/crux-vision-legacy/backend/static/originals';
const fixture = path.join(fixtureRoot, 'lache-send.MOV');
const outputPath = path.resolve('docs/spike-results/desktop-chrome-m3.json');
const overlayPath = path.resolve('docs/spike-results/desktop-overlay-lite.png');

const server = await createServer({
  root: process.cwd(),
  server: { host: '127.0.0.1', port, strictPort: true },
  logLevel: 'error',
});

let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto(baseUrl);
  await page.getByTestId('video-input').setInputFiles(fixture);
  await page.getByTestId('source-metadata').waitFor();
  await page.getByLabel('Samples/sec').selectOption('15');
  await page.getByLabel('Start (s)').fill('7');
  await page.getByLabel('End (s)').fill('12');

  const environment = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemoryGiB:
      'deviceMemory' in navigator
        ? navigator.deviceMemory
        : null,
    crossOriginIsolated: window.crossOriginIsolated,
  }));

  const runs = [];
  const runMediaPipe = async (model, delegate, label) => {
    await page.getByLabel('Model').selectOption(model);
    await page.getByLabel('Delegate').selectOption(delegate);
    await page.getByRole('button', { name: `Run ${label}`, exact: true }).click();
    await page.waitForFunction(
      ({ expectedLabel, expectedDelegate }) => {
        const summary = window.__CRUX_SPIKE__?.summary;
        return summary?.modelLabel === expectedLabel && summary.delegate === expectedDelegate;
      },
      { expectedLabel: label, expectedDelegate: delegate },
      { timeout: 180_000 },
    );
    runs.push(await page.evaluate(() => window.__CRUX_SPIKE__?.summary));

    if (model === 'lite' && delegate === 'CPU') {
      await page.locator('video').evaluate((video) => {
        video.currentTime = 10;
      });
      await page.waitForTimeout(750);
      mkdirSync(path.dirname(overlayPath), { recursive: true });
      await page.locator('.video-stage').screenshot({ path: overlayPath });
    }
  };

  for (const model of ['lite', 'full', 'heavy']) {
    const label = `MediaPipe ${model[0].toUpperCase()}${model.slice(1)}`;
    await runMediaPipe(model, 'CPU', label);
    await runMediaPipe(model, 'GPU', label);
  }

  await page.getByRole('button', { name: 'Run MoveNet baseline', exact: true }).click();
  await page.waitForFunction(
    () => window.__CRUX_SPIKE__?.summary?.modelLabel === 'MoveNet Lightning',
    undefined,
    { timeout: 180_000 },
  );
  runs.push(await page.evaluate(() => window.__CRUX_SPIKE__?.summary));

  const metadata = await page.evaluate(() => window.__CRUX_SPIKE__?.metadata);
  const browserVersion = await browser.version();
  const result = {
    generatedAt: new Date().toISOString(),
    fixture: 'lache-send.MOV',
    analysisRangeSeconds: [7, 12],
    sampleRate: 15,
    browserVersion,
    environment,
    metadata,
    runs,
  };

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await Promise.race([
    Promise.allSettled([browser?.close(), server.close()]),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
}

// Media/WASM runtimes can retain idle handles after the evidence is flushed.
process.exit(0);

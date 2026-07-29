import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const defaultFixtureRoot = '/Users/evan/crux-vision-legacy/backend/static/originals';
const fixtureRoot = process.env.CRUX_FIXTURE_ROOT ?? defaultFixtureRoot;
const portraitFixture = path.join(fixtureRoot, 'portrait-test.MOV');
const landscapeFixture = path.join(fixtureRoot, 'landscape-test.MOV');
const climbingFixture = path.join(fixtureRoot, 'lache-send.MOV');

async function importVideo(page: Page, fixture: string) {
  await page.getByTestId('video-input').setInputFiles(fixture);
  await expect(page.getByTestId('video-stage')).toBeVisible();
  await expect
    .poll(() =>
      page.locator('video').evaluate((element) => (element as HTMLVideoElement).readyState),
    )
    .toBeGreaterThan(1);
}

async function setRange(page: Page, startMicroseconds: number, endMicroseconds: number) {
  await page.getByLabel('Analysis start').fill(String(startMicroseconds));
  await page.getByLabel('Analysis end').fill(String(endMicroseconds));
}

test('imports portrait media upright from a local blob without upload', async ({ page }) => {
  const mutatingRequests: string[] = [];
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH'].includes(request.method())) mutatingRequests.push(request.url());
  });

  await page.goto('/');
  await importVideo(page, portraitFixture);

  const videoElement = page.locator('video');
  await expect(videoElement).toHaveAttribute('poster', /^blob:/);
  await expect
    .poll(() =>
      videoElement.evaluate((element) => (element as HTMLVideoElement).muted),
    )
    .toBe(true);
  await expect(page.getByRole('button', { name: 'Unmute video' })).toBeVisible();
  const posterUrl = await videoElement.getAttribute('poster');
  const posterSize = await page.evaluate(async (url) => {
    const image = new Image();
    image.src = url!;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, posterUrl);
  expect(posterSize.width).toBeGreaterThan(0);
  expect(posterSize.height).toBeGreaterThan(posterSize.width);
  const stage = page.getByTestId('video-stage');
  await expect(stage).toHaveAttribute('data-display-width', '1080');
  await expect(stage).toHaveAttribute('data-display-height', '1920');
  await expect(stage).toHaveAttribute('data-rotation', '90');
  const alignedBounds = await page.evaluate(() => {
    const stage = document.querySelector('[data-testid="video-stage"]')!.getBoundingClientRect();
    const video = document.querySelector('video')!.getBoundingClientRect();
    const canvas = document.querySelector('[data-testid="overlay-canvas"]')!.getBoundingClientRect();
    return {
      stage: [stage.x, stage.y, stage.width, stage.height],
      video: [video.x, video.y, video.width, video.height],
      canvas: [canvas.x, canvas.y, canvas.width, canvas.height],
    };
  });
  expect(alignedBounds.video).toEqual(alignedBounds.canvas);
  expect(Math.abs(alignedBounds.video[0] - alignedBounds.stage[0])).toBeLessThanOrEqual(1);
  expect(Math.abs(alignedBounds.video[1] - alignedBounds.stage[1])).toBeLessThanOrEqual(1);
  expect(Math.abs(alignedBounds.video[2] - alignedBounds.stage[2])).toBeLessThanOrEqual(2);
  expect(Math.abs(alignedBounds.video[3] - alignedBounds.stage[3])).toBeLessThanOrEqual(2);
  await expect
    .poll(() =>
      page
        .locator('video')
        .evaluate((element) => (element as HTMLVideoElement).currentSrc.startsWith('blob:')),
    )
    .toBe(true);
  expect(mutatingRequests).toEqual([]);
});

test('preserves the landscape display contract', async ({ page }) => {
  await page.goto('/');
  await importVideo(page, landscapeFixture);

  const stage = page.getByTestId('video-stage');
  await expect(stage).toHaveAttribute('data-display-width', '1920');
  await expect(stage).toHaveAttribute('data-display-height', '1080');
  await expect(stage).toHaveAttribute('data-rotation', '180');
});

test('publishes MediaPipe Full progressively and draws a timestamped overlay', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/');
  await importVideo(page, climbingFixture);
  await setRange(page, 7_000_000, 12_000_000);

  await page.evaluate(() => {
    const root = document.querySelector('main')!;
    const phases: string[] = [root.getAttribute('data-analysis-phase') ?? ''];
    (window as Window & { __r2aPhases?: string[] }).__r2aPhases = phases;
    new MutationObserver(() => phases.push(root.getAttribute('data-analysis-phase') ?? '')).observe(
      root,
      { attributes: true, attributeFilter: ['data-analysis-phase'] },
    );
    const progressSamples: Array<{ percent: number; fillRatio: number }> = [];
    (
      window as Window & {
        __r2aProgressSamples?: Array<{ percent: number; fillRatio: number }>;
      }
    ).__r2aProgressSamples = progressSamples;
    new MutationObserver(() => {
      const progress = document.querySelector<HTMLElement>(
        '[data-testid="analysis-progress"]',
      );
      const fill = progress?.querySelector<HTMLElement>('span');
      if (!progress || !fill || progress.clientWidth === 0) return;
      const percent = Number(progress.getAttribute('aria-valuenow'));
      if (percent >= 10 && percent <= 90) {
        progressSamples.push({
          percent,
          fillRatio: fill.getBoundingClientRect().width / progress.getBoundingClientRect().width,
        });
      }
    }).observe(root, {
      attributes: true,
      attributeFilter: ['aria-valuenow', 'style'],
      childList: true,
      subtree: true,
    });
  });
  await page.getByRole('button', { name: 'Analyze range' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', 'ready', {
    timeout: 150_000,
  });

  const phases = await page.evaluate(
    () => (window as Window & { __r2aPhases?: string[] }).__r2aPhases,
  );
  expect(phases).toContain('analyzing');
  expect(phases).toContain('partial');
  const progressSamples = await page.evaluate(
    () =>
      (
        window as Window & {
          __r2aProgressSamples?: Array<{ percent: number; fillRatio: number }>;
        }
      ).__r2aProgressSamples ?? [],
  );
  expect(progressSamples.length).toBeGreaterThan(0);
  for (const sample of progressSamples) {
    expect(Math.abs(sample.fillRatio - sample.percent / 100)).toBeLessThan(0.015);
  }
  await expect(page.getByTestId('analysis-status')).toContainText('Analysis ready');

  await page.locator('video').evaluate(async (element) => {
    const video = element as HTMLVideoElement;
    video.pause();
    video.currentTime = 10;
    await new Promise<void>((resolve) => video.addEventListener('seeked', () => resolve(), { once: true }));
  });
  await page.waitForTimeout(250);
  const coloredPixels = await page.getByTestId('overlay-canvas').evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement;
    const data = element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data;
    let count = 0;
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] > 0) count += 1;
    }
    return count;
  });
  expect(coloredPixels).toBeGreaterThan(20);

  await page.locator('video').evaluate(async (element) => {
    const video = element as HTMLVideoElement;
    video.currentTime = 8;
    await new Promise<void>((resolve) => video.addEventListener('seeked', () => resolve(), { once: true }));
  });
  await expect(page.getByText('Pose unavailable here')).toBeVisible();
});

test('preserves copyable diagnostics for worker initialization failures', async ({ page }) => {
  await page.route('**/pose_landmarker_full.task', (route) => route.abort());
  await page.goto('/');
  await importVideo(page, climbingFixture);
  await setRange(page, 7_000_000, 8_000_000);
  await page.getByRole('button', { name: 'Analyze range' }).click();

  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', 'error', {
    timeout: 30_000,
  });
  await page.getByText('Diagnostic details').click();
  await expect(page.getByRole('button', { name: 'Copy diagnostics' })).toBeVisible();

  const report = await page.locator('.analysis-diagnostics pre').textContent();
  expect(report).toContain('"diagnosticRevision": "r2a1-phone-worker-2026-07-23-2"');
  expect(report).toContain('"errors"');
  expect(report).toContain('"delegate": "CPU"');
  expect(report).toContain('"delegate": "GPU"');
  expect(report).toContain('"canvasStrategy": "explicit-offscreen"');
  expect(report).toContain('"canvasGlobalsBefore"');
  expect(report).toContain('"canvasGlobalsAfter"');
  expect(report).not.toContain('ModuleFactory not set');
});

test('cancels progressive work, preserves partial results, and resumes', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await importVideo(page, climbingFixture);
  await setRange(page, 5_000_000, 15_000_000);
  await page.getByRole('button', { name: 'Analyze range' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', 'partial', {
    timeout: 150_000,
  });
  await page.getByRole('button', { name: 'Cancel analysis' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', 'cancelled');
  const partialCount = Number(await page.locator('main').getAttribute('data-sample-count'));
  expect(partialCount).toBeGreaterThan(0);

  await page.waitForTimeout(500);
  await expect(page.locator('main')).toHaveAttribute('data-sample-count', String(partialCount));
  await page.getByRole('button', { name: 'Resume analysis' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', 'ready', {
    timeout: 150_000,
  });
  const finalCount = Number(await page.locator('main').getAttribute('data-sample-count'));
  expect(finalCount).toBeGreaterThan(partialCount);
});

test('replacing a source during analysis clears stale jobs and pose', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/');
  await importVideo(page, portraitFixture);
  await page.getByRole('button', { name: 'Analyze range' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', /analyzing|partial/, {
    timeout: 120_000,
  });

  await page.getByTestId('video-input').setInputFiles(landscapeFixture);
  const stage = page.getByTestId('video-stage');
  await expect(stage).toHaveAttribute('data-display-width', '1920');
  await expect(stage).toHaveAttribute('data-display-height', '1080');
  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', 'idle');
  await expect(page.locator('main')).toHaveAttribute('data-sample-count', '0');
  await page.waitForTimeout(750);
  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', 'idle');
  await expect(page.locator('main')).toHaveAttribute('data-sample-count', '0');
});

test('recomputes cached pose quality without inference and clears calibration evidence on replacement', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto('/');
  await importVideo(page, climbingFixture);
  await setRange(page, 7_000_000, 12_000_000);
  await page.getByRole('button', { name: 'Analyze range' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', 'ready', {
    timeout: 150_000,
  });

  const rawSampleCount = await page.locator('main').getAttribute('data-sample-count');
  expect(Number(rawSampleCount)).toBeGreaterThan(0);
  await expect(page.locator('main')).not.toHaveAttribute(
    'data-quality-observed',
    '0',
  );
  await page.getByText('Pose quality calibration').click();
  const coverageBefore = await page
    .getByTestId('quality-metrics')
    .getAttribute('data-accepted-coverage');
  await page.getByText('Body-group override', { exact: true }).click();
  await page.getByTestId('group-visibility-threshold').fill('0.95');
  await expect(page.locator('main')).toHaveAttribute(
    'data-quality-policy',
    'balanced-display-custom',
  );
  await expect(page.locator('main')).toHaveAttribute(
    'data-sample-count',
    rawSampleCount!,
  );
  await expect(page.locator('main')).toHaveAttribute(
    'data-quality-sample-count',
    rawSampleCount!,
  );
  await expect
    .poll(() =>
      page
        .getByTestId('quality-metrics')
        .getAttribute('data-accepted-coverage'),
    )
    .not.toBe(coverageBefore);

  await page.getByText('Joint override and inspection', { exact: true }).click();
  await page.locator('video').evaluate(async (element) => {
    const video = element as HTMLVideoElement;
    video.pause();
    video.currentTime = 10;
    await new Promise<void>((resolve) =>
      video.addEventListener('seeked', () => resolve(), { once: true }),
    );
  });
  await page.getByRole('button', { name: 'usable' }).click();
  await expect(page.getByTestId('calibration-label-count')).toContainText('1');

  await page.getByTestId('video-input').setInputFiles(landscapeFixture);
  await expect(page.getByTestId('video-stage')).toHaveAttribute(
    'data-display-width',
    '1920',
  );
  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', 'idle');
  await expect(page.locator('main')).toHaveAttribute('data-sample-count', '0');
  await expect(page.locator('main')).toHaveAttribute(
    'data-quality-sample-count',
    '0',
  );
  await expect(page.getByTestId('calibration-label-count')).toContainText('0');
});

test('reports an invalid local file without leaving the empty shell', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('video-input').setInputFiles({
    name: 'broken.mov',
    mimeType: 'video/quicktime',
    buffer: Buffer.from('not a media container'),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { name: /See your climbing/i })).toBeVisible();
});

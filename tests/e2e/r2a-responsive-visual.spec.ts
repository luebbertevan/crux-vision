import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const defaultFixtureRoot = '/Users/evan/crux-vision-legacy/backend/static/originals';
const fixtureRoot = process.env.CRUX_FIXTURE_ROOT ?? defaultFixtureRoot;
const portraitFixture = path.join(fixtureRoot, 'portrait-test.MOV');
const landscapeFixture = path.join(fixtureRoot, 'landscape-test.MOV');

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

const importVideo = async (
  page: Page,
  fixture:
    | string
    | {
        name: string;
        mimeType: string;
        buffer: Buffer;
      },
) => {
  await page.getByTestId('video-input').setInputFiles(fixture);
  await expect(page.getByTestId('video-stage')).toBeVisible();
  await expect
    .poll(() =>
      page.locator('video').evaluate((element) => (element as HTMLVideoElement).readyState),
    )
    .toBeGreaterThan(1);
};

const getReviewBounds = async (page: Page) =>
  page.evaluate(() => {
    const bounds = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    };
    return {
      stage: bounds('[data-testid="video-stage"]'),
      video: bounds('video'),
      canvas: bounds('[data-testid="overlay-canvas"]'),
      transport: bounds('.transport'),
      rail: bounds('.control-rail'),
      main: bounds('.review-main'),
    };
  });

const expectAligned = (video: Bounds, canvas: Bounds) => {
  expect(Math.abs(video.x - canvas.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(video.y - canvas.y)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(video.width - canvas.width)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(video.height - canvas.height)).toBeLessThanOrEqual(0.5);
};

const expectNoHorizontalOverflow = async (page: import('@playwright/test').Page) => {
  expect(
    await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    })),
  ).toEqual(expect.objectContaining({
    scrollWidth: expect.any(Number),
    viewportWidth: expect.any(Number),
  }));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
};

test('desktop empty shell visual acceptance', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /See your climbing/i })).toBeVisible();
  await expect(page.getByText('Nothing leaves this device.')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('desktop-empty.png'), fullPage: true });
});

test('desktop portrait and landscape stages use the available review surface', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await importVideo(page, portraitFixture);

  const portrait = await getReviewBounds(page);
  expect(portrait.stage.height).toBeGreaterThanOrEqual(665);
  expect(portrait.transport.bottom).toBeLessThanOrEqual(880);
  expect(Math.abs((portrait.stage.x + portrait.stage.right) / 2 - 720)).toBeLessThanOrEqual(1);
  expect(portrait.rail.x - portrait.stage.right).toBeGreaterThan(100);
  expectAligned(portrait.video, portrait.canvas);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('desktop-portrait-imported.png'),
    fullPage: true,
  });

  await importVideo(page, landscapeFixture);
  const landscape = await getReviewBounds(page);
  expect(landscape.stage.width).toBeGreaterThanOrEqual(1_020);
  expect(landscape.stage.height).toBeGreaterThanOrEqual(570);
  expect(landscape.stage.right).toBeLessThan(landscape.rail.x);
  expect(landscape.transport.bottom).toBeLessThan(900);
  expectAligned(landscape.video, landscape.canvas);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('desktop-landscape-imported.png'),
    fullPage: true,
  });
});

test('iPhone portrait uses full width with reachable transport and resilient chrome', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /See your climbing/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const openButton = page.getByTestId('video-input').locator('..');
  expect((await openButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: testInfo.outputPath('iphone-empty.png'), fullPage: true });

  await importVideo(page, {
    name: 'portrait-session-with-a-deliberately-long-climbing-video-filename.MOV',
    mimeType: 'video/quicktime',
    buffer: await readFile(portraitFixture),
  });
  await expect(page.getByText('Hip midpoint')).toBeVisible();
  await expect(page.getByText('Shoulder midpoint')).toBeVisible();
  const portrait = await getReviewBounds(page);
  expect(portrait.stage.width).toBeGreaterThanOrEqual(368);
  expect(portrait.stage.height).toBeGreaterThanOrEqual(650);
  expect(portrait.stage.x).toBeLessThanOrEqual(12.5);
  expect(portrait.transport.bottom).toBeLessThanOrEqual(852);
  expectAligned(portrait.video, portrait.canvas);
  await expectNoHorizontalOverflow(page);
  const analysisRange = page.getByTestId('playback-analysis-range');
  await expect(analysisRange).toBeVisible();
  const timeline = page.locator('.playback-timeline');
  const rangeBounds = await analysisRange.boundingBox();
  const timelineBounds = await timeline.boundingBox();
  expect(rangeBounds).not.toBeNull();
  expect(timelineBounds).not.toBeNull();
  expect(rangeBounds!.width).toBeGreaterThan(0);
  expect(rangeBounds!.x).toBeGreaterThanOrEqual(timelineBounds!.x - 1);
  expect(rangeBounds!.x + rangeBounds!.width).toBeLessThanOrEqual(
    timelineBounds!.x + timelineBounds!.width + 1,
  );
  const playButton = page.getByRole('button', { name: /Play video|Pause video/ });
  expect((await playButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  const analyzeButton = page.getByRole('button', { name: 'Analyze range' });
  await analyzeButton.scrollIntoViewIfNeeded();
  expect((await analyzeButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: testInfo.outputPath('iphone-imported.png'), fullPage: true });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByTestId('video-input').setInputFiles({
    name: 'unsupported-video-with-a-very-long-filename.mov',
    mimeType: 'video/quicktime',
    buffer: Buffer.from('not a media container'),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('video-stage')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const withError = await getReviewBounds(page);
  expect(withError.transport.bottom).toBeLessThanOrEqual(852);
  await page.screenshot({
    path: testInfo.outputPath('iphone-import-error-with-source.png'),
    fullPage: true,
  });
});

test('landscape phone keeps portrait and landscape review controls usable', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 852, height: 393 });
  await page.goto('/');
  await importVideo(page, portraitFixture);
  let bounds = await getReviewBounds(page);
  expect(bounds.transport.bottom).toBeLessThanOrEqual(393);
  expect(bounds.stage.right).toBeLessThan(bounds.rail.x);
  expectAligned(bounds.video, bounds.canvas);
  await expectNoHorizontalOverflow(page);
  await expect(page.getByTestId('video-stage')).toBeVisible();
  expect(
    (await page.getByRole('button', { name: /Play video|Pause video/ }).boundingBox())?.height,
  ).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: testInfo.outputPath('iphone-landscape-portrait-video.png'),
    fullPage: true,
  });

  await importVideo(page, landscapeFixture);
  bounds = await getReviewBounds(page);
  expect(bounds.stage.width).toBeGreaterThanOrEqual(360);
  expect(bounds.transport.bottom).toBeLessThanOrEqual(393);
  expect(bounds.stage.right).toBeLessThan(bounds.rail.x);
  expectAligned(bounds.video, bounds.canvas);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('iphone-landscape-landscape-video.png'),
    fullPage: true,
  });
});

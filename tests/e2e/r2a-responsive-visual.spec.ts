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
      topbar: bounds('.topbar'),
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

const expectPlaybackInputCentered = async (page: Page) => {
  const [timeline, input] = await Promise.all([
    page.locator('.playback-timeline').boundingBox(),
    page.locator('.playback-slider').boundingBox(),
  ]);
  expect(timeline).not.toBeNull();
  expect(input).not.toBeNull();
  expect(
    Math.abs(
      timeline!.y + timeline!.height / 2 - (input!.y + input!.height / 2),
    ),
  ).toBeLessThanOrEqual(0.5);
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
  expect(portrait.stage.height).toBeGreaterThanOrEqual(875);
  expect(portrait.stage.y).toBeLessThanOrEqual(10);
  expect(portrait.transport.y).toBeGreaterThanOrEqual(portrait.stage.bottom - 55);
  expect(portrait.transport.bottom).toBeLessThanOrEqual(portrait.stage.bottom - 4);
  expect(Math.abs((portrait.stage.x + portrait.stage.right) / 2 - 720)).toBeLessThanOrEqual(1);
  expect(portrait.rail.x - portrait.stage.right).toBeGreaterThan(100);
  expect(portrait.topbar.right).toBeLessThan(portrait.stage.x);
  expect(portrait.topbar.width).toBeGreaterThanOrEqual(220);
  expect(portrait.topbar.height).toBeLessThanOrEqual(140);
  expectAligned(portrait.video, portrait.canvas);
  await expectPlaybackInputCentered(page);
  await expect(page.locator('.topbar > .source-filename')).toBeHidden();
  await expect(page.locator('.stage-source-filename')).toHaveText('portrait-test.MOV');
  await expect(page.locator('.stage-source-filename')).toBeVisible();
  await expect(page.locator('.topbar-actions')).toHaveCount(0);
  await expect(page.getByText('Local only')).toHaveCount(0);
  await expect(page.locator('.file-button-label-full')).toHaveText('Replace video');
  await expect(page.locator('.file-button-label-full')).toBeVisible();
  expect((await page.locator('.brand-mark').boundingBox())?.width).toBeGreaterThanOrEqual(38);
  const portraitShell = await page.locator('.topbar').evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      background: styles.backgroundColor,
      border: styles.borderTopWidth,
      shadow: styles.boxShadow,
    };
  });
  expect(portraitShell).toEqual({
    background: 'rgba(0, 0, 0, 0)',
    border: '0px',
    shadow: 'none',
  });
  const [analyzeBounds, replaceBounds] = await Promise.all([
    page.getByRole('button', { name: 'Analyze range' }).boundingBox(),
    page.locator('.analysis-actions .file-button-compact').boundingBox(),
  ]);
  expect(analyzeBounds).not.toBeNull();
  expect(replaceBounds).not.toBeNull();
  expect(Math.abs(replaceBounds!.width - analyzeBounds!.width)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(replaceBounds!.height - analyzeBounds!.height)).toBeLessThanOrEqual(0.5);
  expect(replaceBounds!.y).toBeGreaterThan(analyzeBounds!.y + analyzeBounds!.height);
  expect(
    (await page.getByRole('button', { name: /Play video|Pause video/ }).boundingBox())?.height,
  ).toBeLessThanOrEqual(36);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('desktop-portrait-imported.png'),
    fullPage: true,
  });

  await importVideo(page, landscapeFixture);
  await expect
    .poll(async () => (await getReviewBounds(page)).stage.width)
    .toBeGreaterThanOrEqual(1_020);
  const landscape = await getReviewBounds(page);
  expect(landscape.stage.width).toBeGreaterThanOrEqual(1_020);
  expect(landscape.stage.height).toBeGreaterThanOrEqual(570);
  expect(landscape.stage.right).toBeLessThan(landscape.rail.x);
  expect(landscape.transport.bottom).toBeLessThan(900);
  expect(landscape.topbar.width).toBeGreaterThan(1_000);
  expect(landscape.transport.y).toBeGreaterThanOrEqual(landscape.stage.bottom);
  expectAligned(landscape.video, landscape.canvas);
  await expect(page.locator('.file-button-label-full')).toHaveText('Replace video');
  await expect(page.locator('.file-button-label-full')).toBeVisible();
  await expect(page.locator('.analysis-actions .file-button-compact')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('desktop-landscape-imported.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 1024, height: 768 });
  await importVideo(page, portraitFixture);
  await expect
    .poll(async () => (await getReviewBounds(page)).stage.height)
    .toBeGreaterThanOrEqual(745);
  const compactDesktopPortrait = await getReviewBounds(page);
  expect(compactDesktopPortrait.stage.height).toBeGreaterThanOrEqual(745);
  expect(compactDesktopPortrait.stage.y).toBeLessThanOrEqual(10);
  expect(compactDesktopPortrait.topbar.right).toBeLessThan(
    compactDesktopPortrait.stage.x,
  );
  expect(compactDesktopPortrait.stage.right).toBeLessThan(
    compactDesktopPortrait.rail.x,
  );
  expect(compactDesktopPortrait.transport.y).toBeGreaterThanOrEqual(
    compactDesktopPortrait.stage.bottom - 55,
  );
  expect(compactDesktopPortrait.transport.right).toBeLessThanOrEqual(
    compactDesktopPortrait.stage.right - 7,
  );
  expect(compactDesktopPortrait.transport.right).toBeGreaterThanOrEqual(
    compactDesktopPortrait.stage.right - 9,
  );
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('compact-desktop-portrait-imported.png'),
    fullPage: true,
  });
});

test('iPhone portrait uses full width with reachable transport and resilient chrome', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    /maximum-scale=1\.0, user-scalable=no/,
  );
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
  expect(portrait.stage.width).toBeGreaterThanOrEqual(392);
  expect(portrait.stage.height).toBeGreaterThanOrEqual(695);
  expect(portrait.stage.x).toBeLessThanOrEqual(0.5);
  expect(portrait.stage.right).toBeGreaterThanOrEqual(392.5);
  expect(portrait.transport.x).toBeGreaterThanOrEqual(7.5);
  expect(portrait.transport.right).toBeLessThanOrEqual(385.5);
  expect(portrait.transport.y).toBeGreaterThanOrEqual(portrait.stage.bottom - 70);
  expect(portrait.transport.bottom).toBeLessThanOrEqual(portrait.stage.bottom - 4);
  expectAligned(portrait.video, portrait.canvas);
  await expectPlaybackInputCentered(page);
  await expectNoHorizontalOverflow(page);
  const rangeCard = await page.locator('.range-section').boundingBox();
  expect(rangeCard).not.toBeNull();
  expect(
    Math.abs(rangeCard!.x - (393 - rangeCard!.x - rangeCard!.width)),
  ).toBeLessThanOrEqual(1);

  await page.evaluate(() => {
    document.documentElement.style.setProperty('--visual-viewport-width', '360px');
    document.documentElement.style.setProperty('--visual-viewport-left', '18px');
    document.documentElement.style.setProperty('--visual-viewport-center-offset', '1.5px');
  });
  await expect
    .poll(async () => (await getReviewBounds(page)).stage.width)
    .toBeCloseTo(360, 0);
  const shiftedViewport = await getReviewBounds(page);
  expect(shiftedViewport.stage.x).toBeCloseTo(18, 0);
  expect(shiftedViewport.stage.right).toBeCloseTo(378, 0);
  const shiftedRangeCard = await page.locator('.range-section').boundingBox();
  expect(shiftedRangeCard).not.toBeNull();
  expect(shiftedRangeCard!.width).toBeGreaterThanOrEqual(368);
  expect(
    shiftedRangeCard!.x + shiftedRangeCard!.width / 2,
  ).toBeCloseTo((18 + 378) / 2, 0);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--visual-viewport-width', '393px');
    document.documentElement.style.setProperty('--visual-viewport-left', '0px');
    document.documentElement.style.setProperty('--visual-viewport-center-offset', '0px');
  });

  await page.setViewportSize({ width: 393, height: 740 });
  await expect
    .poll(async () => (await getReviewBounds(page)).stage.width)
    .toBeGreaterThanOrEqual(392);
  const withCollapsedViewport = await getReviewBounds(page);
  expect(withCollapsedViewport.stage.width).toBeGreaterThanOrEqual(392);
  expect(withCollapsedViewport.stage.height).toBeGreaterThanOrEqual(695);
  expect(withCollapsedViewport.stage.x).toBeLessThanOrEqual(0.5);
  await page.evaluate(() => window.scrollTo(0, 400));
  const afterScroll = await getReviewBounds(page);
  expect(afterScroll.stage.width).toBe(withCollapsedViewport.stage.width);
  expect(afterScroll.stage.height).toBe(withCollapsedViewport.stage.height);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.evaluate(() => window.scrollTo(0, 0));

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
  expect(withError.stage.width).toBeGreaterThanOrEqual(392);
  expect(withError.transport.y).toBeGreaterThanOrEqual(withError.stage.bottom - 70);
  expect(withError.transport.bottom).toBeLessThanOrEqual(withError.stage.bottom - 4);
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
  await expect
    .poll(async () => (await getReviewBounds(page)).stage.width)
    .toBeGreaterThanOrEqual(360);
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

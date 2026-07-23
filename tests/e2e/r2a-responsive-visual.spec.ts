import path from 'node:path';

import { expect, test } from '@playwright/test';

const defaultFixtureRoot = '/Users/evan/crux-vision-legacy/backend/static/originals';
const fixtureRoot = process.env.CRUX_FIXTURE_ROOT ?? defaultFixtureRoot;
const portraitFixture = path.join(fixtureRoot, 'portrait-test.MOV');

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

test('iPhone-sized empty and imported shell visual acceptance', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /See your climbing/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const openButton = page.getByTestId('video-input').locator('..');
  expect((await openButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: testInfo.outputPath('iphone-empty.png'), fullPage: true });

  await page.getByTestId('video-input').setInputFiles(portraitFixture);
  await expect(page.getByTestId('video-stage')).toBeVisible();
  await expect(page.getByText('Hip midpoint')).toBeVisible();
  await expect(page.getByText('Shoulder midpoint')).toBeVisible();
  await expect
    .poll(() =>
      page.locator('video').evaluate((element) => (element as HTMLVideoElement).readyState),
    )
    .toBeGreaterThan(1);
  await expectNoHorizontalOverflow(page);
  const playButton = page.getByRole('button', { name: /Play video|Pause video/ });
  expect((await playButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: testInfo.outputPath('iphone-imported.png'), fullPage: true });

  await page.setViewportSize({ width: 852, height: 393 });
  await expectNoHorizontalOverflow(page);
  await expect(page.getByTestId('video-stage')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('iphone-landscape.png'), fullPage: true });
});

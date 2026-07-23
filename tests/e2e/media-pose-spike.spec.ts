import path from 'node:path';

import { expect, test } from '@playwright/test';

const defaultFixtureRoot = '/Users/evan/crux-vision-legacy/backend/static/originals';
const fixtureRoot = process.env.CRUX_FIXTURE_ROOT ?? defaultFixtureRoot;
const portraitFixture = path.join(fixtureRoot, 'portrait-test.MOV');
const landscapeFixture = path.join(fixtureRoot, 'landscape-test.MOV');

test('reads display-oriented metadata from the portrait iPhone fixture', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('video-input').setInputFiles(portraitFixture);

  await expect(page.getByTestId('source-metadata')).toBeVisible();
  await expect(page.getByTestId('display-size')).toHaveText('1080 × 1920');
  await expect(page.getByTestId('rotation')).toHaveText('90° clockwise');
});

test('preserves the landscape fixture display contract', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('video-input').setInputFiles(landscapeFixture);

  await expect(page.getByTestId('source-metadata')).toBeVisible();
  await expect(page.getByTestId('display-size')).toHaveText('1920 × 1080');
  await expect(page.getByTestId('rotation')).toHaveText('180° clockwise');
});

test('runs MediaPipe Lite in a worker against display-oriented samples', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.getByTestId('video-input').setInputFiles(portraitFixture);
  await expect(page.getByTestId('source-metadata')).toBeVisible();

  await page.getByLabel('Delegate').selectOption('CPU');
  await page.getByLabel('Samples/sec').selectOption('5');
  await page.getByLabel('End (s)').fill('1');
  await page.getByRole('button', { name: 'Run MediaPipe Lite' }).click();

  await expect(page.getByTestId('benchmark-summary')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('benchmark-summary')).toContainText('Inference throughput');
  await expect(page.locator('.status')).toHaveText('complete');
});

test('runs the MoveNet Lightning comparison baseline', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.getByTestId('video-input').setInputFiles(portraitFixture);
  await expect(page.getByTestId('source-metadata')).toBeVisible();

  await page.getByLabel('Samples/sec').selectOption('5');
  await page.getByLabel('End (s)').fill('1');
  await page.getByRole('button', { name: 'Run MoveNet baseline' }).click();

  await expect(page.getByTestId('benchmark-summary')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('benchmark-summary')).toContainText('MoveNet Lightning');
  await expect(page.locator('.status')).toHaveText('complete');
});

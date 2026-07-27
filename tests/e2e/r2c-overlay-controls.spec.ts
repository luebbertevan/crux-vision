import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const defaultFixtureRoot =
  '/Users/evan/crux-vision-legacy/backend/static/originals';
const fixtureRoot = process.env.CRUX_FIXTURE_ROOT ?? defaultFixtureRoot;
const portraitFixture = path.join(fixtureRoot, 'portrait-test.MOV');
const landscapeFixture = path.join(fixtureRoot, 'landscape-test.MOV');
const climbingFixture = path.join(fixtureRoot, 'lache-send.MOV');

async function importVideo(page: Page, fixture: string) {
  await page.getByTestId('video-input').setInputFiles(fixture);
  await expect(page.getByTestId('video-stage')).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('video')
        .evaluate((element) => (element as HTMLVideoElement).readyState),
    )
    .toBeGreaterThan(1);
}

async function setRange(
  page: Page,
  startMicroseconds: number,
  endMicroseconds: number,
) {
  await page.getByLabel('Analysis end').fill(String(endMicroseconds));
  await page.getByLabel('Analysis start').fill(String(startMicroseconds));
}

async function seekPaused(page: Page, timeSeconds: number) {
  await page.locator('video').evaluate(async (element, time) => {
    const video = element as HTMLVideoElement;
    video.pause();
    video.currentTime = time;
    await new Promise<void>((resolve) =>
      video.addEventListener('seeked', () => resolve(), { once: true }),
    );
  }, timeSeconds);
}

test('redraws cached overlays without analysis and preserves sub-selections behind the master', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto('/');
  await importVideo(page, climbingFixture);

  const overlaySettings = page.getByTestId('overlay-settings');
  await expect(overlaySettings).not.toHaveAttribute('open', '');
  await overlaySettings.locator('summary').click();
  await expect(overlaySettings).toHaveAttribute('open', '');

  const skeleton = page.getByRole('checkbox', { name: 'Skeleton' });
  const trails = page.getByRole('checkbox', { name: 'Trails', exact: true });
  const addSource = page.getByLabel('Add trail source');
  const activeSources = page.getByTestId('active-trail-sources');
  const master = page.getByRole('checkbox', { name: 'Overlays' });

  await expect(skeleton).toBeChecked();
  await expect(trails).toBeChecked();
  await expect(activeSources.locator('.trail-source-row')).toHaveCount(2);
  await expect(
    page.getByTestId('active-trail-source-hip-midpoint'),
  ).toBeVisible();
  await expect(
    page.getByTestId('active-trail-source-shoulder-midpoint'),
  ).toBeVisible();
  await expect(addSource.locator('optgroup[label="Arms"] option')).toHaveText([
    'Left wrist',
    'Right wrist',
    'Left elbow',
    'Right elbow',
  ]);
  await expect(addSource.locator('optgroup[label="Legs"] option')).toHaveText([
    'Left ankle',
    'Right ankle',
    'Left knee',
    'Right knee',
  ]);

  await setRange(page, 9_000_000, 11_000_000);
  await page.getByRole('button', { name: 'Analyze range' }).click();
  await expect(page.locator('main')).toHaveAttribute(
    'data-analysis-phase',
    'ready',
    { timeout: 150_000 },
  );
  await seekPaused(page, 10);

  const canvas = page.getByTestId('overlay-canvas');
  await expect
    .poll(async () =>
      Number(await canvas.getAttribute('data-trail-segment-count')),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(async () =>
      Number(await canvas.getAttribute('data-skeleton-segment-count')),
    )
    .toBeGreaterThan(0);

  const cachedSampleCount = await page
    .locator('main')
    .getAttribute('data-sample-count');
  const drawRevision = Number(
    await canvas.getAttribute('data-draw-revision'),
  );
  await addSource.selectOption('left-elbow');
  await addSource.selectOption('right-knee');
  await skeleton.uncheck();
  await expect(page.getByTestId('active-trail-source-left-elbow')).toBeVisible();
  await expect(page.getByTestId('active-trail-source-right-knee')).toBeVisible();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-draw-revision')))
    .toBeGreaterThan(drawRevision);
  await expect(canvas).toHaveAttribute('data-skeleton-segment-count', '0');
  await expect(page.locator('main')).toHaveAttribute(
    'data-analysis-phase',
    'ready',
  );
  await expect(page.locator('main')).toHaveAttribute(
    'data-sample-count',
    cachedSampleCount!,
  );

  await master.focus();
  await page.keyboard.press('Space');
  await expect(master).not.toBeChecked();
  await expect(canvas).toHaveAttribute('data-draw-reason', 'master-hidden');
  await expect(canvas).toHaveAttribute('data-skeleton-segment-count', '0');
  await expect(canvas).toHaveAttribute('data-trail-segment-count', '0');
  await expect(skeleton).not.toBeChecked();
  await expect(page.getByTestId('active-trail-source-left-elbow')).toBeVisible();
  await expect(page.getByTestId('active-trail-source-right-knee')).toBeVisible();
  await expect(trails).toBeChecked();

  await master.focus();
  await page.keyboard.press('Space');
  await expect(master).toBeChecked();
  await expect(canvas).toHaveAttribute('data-draw-reason', 'rendered');
  await expect(skeleton).not.toBeChecked();
  await expect(page.getByTestId('active-trail-source-left-elbow')).toBeVisible();
  await expect(page.getByTestId('active-trail-source-right-knee')).toBeVisible();
  await expect
    .poll(async () =>
      Number(await canvas.getAttribute('data-trail-segment-count')),
    )
    .toBeGreaterThan(0);
  await expect(page.locator('main')).toHaveAttribute(
    'data-sample-count',
    cachedSampleCount!,
  );
  await page.getByRole('button', { name: 'Remove Left elbow trail' }).click();
  await expect(
    page.getByTestId('active-trail-source-left-elbow'),
  ).toHaveCount(0);
  await expect(addSource.locator('option[value="left-elbow"]')).toHaveText(
    'Left elbow',
  );

  await page.getByTestId('video-input').setInputFiles(landscapeFixture);
  await expect(page.getByTestId('video-stage')).toHaveAttribute(
    'data-display-width',
    '1920',
  );
  await expect(page.getByTestId('overlay-settings')).not.toHaveAttribute(
    'open',
    '',
  );
  await page.getByTestId('overlay-settings').locator('summary').click();
  await expect(page.getByRole('checkbox', { name: 'Overlays' })).toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Skeleton' }),
  ).toBeChecked();
  await expect(
    page.getByTestId('active-trail-source-right-knee'),
  ).toHaveCount(0);
  await expect(
    page.getByTestId('active-trail-sources').locator('.trail-source-row'),
  ).toHaveCount(2);
});

test('keeps the disclosure touchable without changing or obscuring the stage', async ({
  page,
}) => {
  const layouts = [
    {
      viewport: { width: 1440, height: 900 },
      fixture: portraitFixture,
    },
    {
      viewport: { width: 393, height: 852 },
      fixture: portraitFixture,
    },
    {
      viewport: { width: 852, height: 393 },
      fixture: landscapeFixture,
    },
  ];

  for (const layout of layouts) {
    await page.setViewportSize(layout.viewport);
    await page.goto('/');
    await importVideo(page, layout.fixture);

    const stage = page.getByTestId('video-stage');
    const before = await stage.boundingBox();
    const settings = page.getByTestId('overlay-settings');
    await settings.locator('summary').click();
    await expect(settings).toHaveAttribute('open', '');
    const after = await stage.boundingBox();

    expect(after?.width).toBe(before?.width);
    expect(after?.height).toBe(before?.height);
    await expect(page.getByText('Layer visibility', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Active trail sources', { exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);

    if (layout.viewport.width <= 852) {
      const targetHeights = await settings
        .locator(
          'summary, .overlay-option, .trail-source-row, .trail-source-picker, .trail-source-remove',
        )
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().height),
        );
      expect(targetHeights.every((height) => height >= 44)).toBe(true);
    }
  }
});

test('captures the R2C.1 real-fixture visual review matrix', async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.CRUX_VISUAL_QA !== '1',
    'Run explicitly for the documented real-fixture visual review.',
  );
  test.setTimeout(240_000);
  const cases = [
    {
      label: 'desktop-portrait',
      viewport: { width: 1440, height: 900 },
      fixture: climbingFixture,
      range: [9_000_000, 11_000_000] as const,
      moment: 10,
      settingsOpen: true,
    },
    {
      label: 'desktop-landscape',
      viewport: { width: 1440, height: 900 },
      fixture: path.join(fixtureRoot, 'landscape-climb.MOV'),
      range: [16_000_000, 18_000_000] as const,
      moment: 17,
      settingsOpen: true,
    },
    {
      label: 'phone-portrait',
      viewport: { width: 393, height: 852 },
      fixture: climbingFixture,
      range: [9_000_000, 11_000_000] as const,
      moment: 10,
      settingsOpen: false,
    },
    {
      label: 'phone-landscape',
      viewport: { width: 852, height: 393 },
      fixture: path.join(fixtureRoot, 'landscape-climb.MOV'),
      range: [16_000_000, 18_000_000] as const,
      moment: 17,
      settingsOpen: true,
    },
  ];

  for (const visualCase of cases) {
    await page.setViewportSize(visualCase.viewport);
    await page.goto('/');
    await importVideo(page, visualCase.fixture);
    await setRange(page, visualCase.range[0], visualCase.range[1]);
    await page.getByRole('button', { name: 'Analyze range' }).click();
    await expect(page.locator('main')).toHaveAttribute(
      'data-analysis-phase',
      'ready',
      { timeout: 150_000 },
    );
    await seekPaused(page, visualCase.moment);
    await expect
      .poll(async () =>
        Number(
          await page
            .getByTestId('overlay-canvas')
            .getAttribute('data-trail-segment-count'),
        ),
      )
      .toBeGreaterThan(0);
    if (visualCase.settingsOpen) {
      await page.getByTestId('overlay-settings').locator('summary').click();
    }
    if (visualCase.label === 'desktop-portrait') {
      const addSource = page.getByLabel('Add trail source');
      await addSource.selectOption('left-elbow');
      await addSource.selectOption('right-knee');
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`${visualCase.label}.png`),
      fullPage: false,
    });
    if (visualCase.label === 'phone-portrait') {
      const settings = page.getByTestId('overlay-settings');
      await settings.locator('summary').click();
      await settings.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath('phone-portrait-settings.png'),
        fullPage: false,
      });
    }
  }
});

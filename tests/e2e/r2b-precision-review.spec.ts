import path from 'node:path';

import { devices, expect, test, type Page } from '@playwright/test';

const defaultFixtureRoot = '/Users/evan/crux-vision-legacy/backend/static/originals';
const fixtureRoot = process.env.CRUX_FIXTURE_ROOT ?? defaultFixtureRoot;
const portraitFixture = path.join(fixtureRoot, 'portrait-test.MOV');
const landscapeFixture = path.join(fixtureRoot, 'landscape-test.MOV');

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

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
}

test('changes speed and loops the selected range with controls and shortcuts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await importVideo(page, portraitFixture);
  await setRange(page, 2_000_000, 3_000_000);

  const video = page.locator('video');
  await video.evaluate((element) => (element as HTMLVideoElement).pause());

  const quarterSpeed = page.getByRole('button', {
    name: 'Play at 0.25× speed',
  });
  await expect(quarterSpeed).toHaveText('.25x');
  await expect(
    page.getByRole('button', { name: 'Play at 0.5× speed' }),
  ).toHaveText('.5x');
  await expect(
    page.getByRole('button', { name: 'Play at 1× speed' }),
  ).toHaveText('1x');
  await quarterSpeed.click();
  await expect(quarterSpeed).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('main')).toHaveAttribute('data-playback-rate', '0.25');
  expect(
    await video.evaluate((element) => (element as HTMLVideoElement).playbackRate),
  ).toBe(0.25);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('3');
  await expect(page.locator('main')).toHaveAttribute('data-playback-rate', '1');

  const loopButton = page.getByRole('button', { name: 'Loop analysis range' });
  await page.keyboard.press('l');
  await expect(loopButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('main')).toHaveAttribute('data-range-loop', 'enabled');
  await expect
    .poll(() =>
      video.evaluate((element) =>
        Math.round((element as HTMLVideoElement).currentTime * 10),
      ),
    )
    .toBe(20);

  await video.evaluate(async (element) => {
    const media = element as HTMLVideoElement;
    (
      window as Window & { __r2bLoopRestarts?: number }
    ).__r2bLoopRestarts = 0;
    media.addEventListener('seeking', () => {
      if (media.currentTime <= 2.05) {
        const state = window as Window & { __r2bLoopRestarts?: number };
        state.__r2bLoopRestarts = (state.__r2bLoopRestarts ?? 0) + 1;
      }
    });
    media.currentTime = 2.9;
    await new Promise<void>((resolve) =>
      media.addEventListener('seeked', () => resolve(), { once: true }),
    );
    await media.play();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __r2bLoopRestarts?: number })
            .__r2bLoopRestarts ?? 0,
      ),
    )
    .toBeGreaterThan(0);
  expect(
    await video.evaluate((element) => (element as HTMLVideoElement).paused),
  ).toBe(false);
  expect(
    await video.evaluate((element) => (element as HTMLVideoElement).currentTime),
  ).toBeLessThan(3);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('l');
  await expect(loopButton).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('main')).toHaveAttribute('data-range-loop', 'disabled');
  await video.evaluate((element) => (element as HTMLVideoElement).pause());

  await video.evaluate(async (element) => {
    const media = element as HTMLVideoElement;
    media.currentTime = 1.2;
    await new Promise<void>((resolve) =>
      media.addEventListener('seeked', () => resolve(), { once: true }),
    );
  });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Checkpoint 1 name').fill('Start move');

  await video.evaluate(async (element) => {
    const media = element as HTMLVideoElement;
    media.currentTime = 2.4;
    await new Promise<void>((resolve) =>
      media.addEventListener('seeked', () => resolve(), { once: true }),
    );
  });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Checkpoint 2 name').fill('Catch');

  const checkpointControls = page.getByTestId('checkpoint-controls');
  const checkpointMarkers = page.getByTestId('playback-checkpoint-marker');
  await expect(checkpointControls).toHaveAttribute('data-checkpoint-count', '2');
  await expect(checkpointMarkers).toHaveCount(2);
  await expect(checkpointMarkers.nth(0)).toHaveAttribute(
    'data-checkpoint-time',
    '1200000',
  );
  await expect(checkpointMarkers.nth(1)).toHaveAttribute(
    'data-checkpoint-time',
    '2400000',
  );
  const markerBounds = await checkpointMarkers.evaluateAll((markers) =>
    markers.map((marker) => {
      const bounds = marker.getBoundingClientRect();
      return {
        left: bounds.left,
        height: bounds.height,
      };
    }),
  );
  expect(markerBounds[0].left).toBeLessThan(markerBounds[1].left);
  expect(markerBounds.every((bounds) => bounds.height >= 10)).toBe(true);

  expect(
    await page.evaluate(() =>
      window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    ),
  ).toBe(true);
  await video.evaluate(async (element) => {
    const media = element as HTMLVideoElement;
    media.currentTime = 0.5;
    await new Promise<void>((resolve) =>
      media.addEventListener('seeked', () => resolve(), { once: true }),
    );
    await media.play();
  });
  await page.getByRole('button', { name: 'Go to Start move' }).click();
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).paused),
    )
    .toBe(false);
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThanOrEqual(1.2);
  await video.evaluate((element) => (element as HTMLVideoElement).pause());

  await video.evaluate(async (element) => {
    const media = element as HTMLVideoElement;
    media.currentTime = 0.5;
    await new Promise<void>((resolve) =>
      media.addEventListener('seeked', () => resolve(), { once: true }),
    );
  });
  await page.getByRole('button', { name: 'Next checkpoint' }).click();
  await expect(checkpointControls).toHaveAttribute(
    'data-current-checkpoint-index',
    '0',
  );
  await page.getByRole('button', { name: 'Next checkpoint' }).click();
  await expect(checkpointControls).toHaveAttribute(
    'data-current-checkpoint-index',
    '1',
  );
  await expect(checkpointMarkers.nth(1)).toHaveClass(/is-current/);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(checkpointControls).toHaveAttribute(
    'data-current-checkpoint-index',
    '0',
  );
  await expect(checkpointMarkers.nth(0)).toHaveClass(/is-current/);
  await expect(page.getByLabel('Checkpoint 1 name')).toHaveValue('Start move');
  await expect(page.getByLabel('Checkpoint 2 name')).toHaveValue('Catch');

  await page.getByTestId('video-input').setInputFiles(landscapeFixture);
  await expect(page.getByTestId('video-stage')).toHaveAttribute(
    'data-display-width',
    '1920',
  );
  await expect(page.getByTestId('checkpoint-controls')).toHaveAttribute(
    'data-checkpoint-count',
    '0',
  );
  await expect(page.getByTestId('playback-checkpoint-marker')).toHaveCount(0);
});

test('keeps precision controls clear and touchable across review layouts', async ({
  page,
}, testInfo) => {
  const cases = [
    {
      label: 'desktop-portrait',
      viewport: { width: 1440, height: 900 },
      fixture: portraitFixture,
    },
    {
      label: 'desktop-landscape',
      viewport: { width: 1440, height: 900 },
      fixture: landscapeFixture,
    },
    {
      label: 'phone-portrait',
      viewport: { width: 393, height: 852 },
      fixture: portraitFixture,
    },
    {
      label: 'phone-landscape',
      viewport: { width: 852, height: 393 },
      fixture: landscapeFixture,
    },
  ];

  for (const layout of cases) {
    await page.setViewportSize(layout.viewport);
    await page.goto('/');
    await importVideo(page, layout.fixture);

    const controls = page.getByTestId('precision-review-controls');
    await expect(controls).toBeVisible();
    const checkpointControls = page.getByTestId('checkpoint-controls');
    await expect(checkpointControls).toBeVisible();
    await page.locator('video').evaluate((element) => {
      const media = element as HTMLVideoElement;
      media.pause();
      media.currentTime = 0;
    });
    await expect
      .poll(() =>
        page
          .locator('video')
          .evaluate((element) => (element as HTMLVideoElement).currentTime),
      )
      .toBe(0);
    await expect(controls).toHaveAttribute('data-frame-step-mode', 'estimated');
    await expect(page.getByRole('button', { name: 'Loop analysis range' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous estimated frame' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next estimated frame' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous estimated frame' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Next estimated frame' })).toBeEnabled();

    await page.locator('video').evaluate(async (element) => {
      const media = element as HTMLVideoElement;
      media.pause();
      media.currentTime = media.duration * 0.4;
      await new Promise<void>((resolve) =>
        media.addEventListener('seeked', () => resolve(), { once: true }),
      );
    });
    await checkpointControls
      .getByRole('button', { name: 'Add', exact: true })
      .click();
    await page.locator('video').evaluate(async (element) => {
      const media = element as HTMLVideoElement;
      media.currentTime = media.duration * 0.2;
      await new Promise<void>((resolve) =>
        media.addEventListener('seeked', () => resolve(), { once: true }),
      );
    });

    const timeline = page.locator('.playback-timeline');
    const checkpointMarker = page.getByTestId('playback-checkpoint-marker');
    await expect(checkpointMarker).toHaveCount(1);
    const [timelineBounds, markerBounds] = await Promise.all([
      timeline.boundingBox(),
      checkpointMarker.boundingBox(),
    ]);
    expect(timelineBounds).not.toBeNull();
    expect(markerBounds).not.toBeNull();
    expect(markerBounds!.x).toBeGreaterThan(timelineBounds!.x);
    expect(markerBounds!.x + markerBounds!.width).toBeLessThan(
      timelineBounds!.x + timelineBounds!.width,
    );

    const [controlBounds, rangeBounds] = await Promise.all([
      controls.boundingBox(),
      page.locator('.range-section').boundingBox(),
    ]);
    expect(controlBounds).not.toBeNull();
    expect(rangeBounds).not.toBeNull();
    expect(controlBounds!.x).toBeGreaterThanOrEqual(rangeBounds!.x);
    expect(controlBounds!.x + controlBounds!.width).toBeLessThanOrEqual(
      rangeBounds!.x + rangeBounds!.width + 0.5,
    );

    if (layout.label.startsWith('phone')) {
      for (const button of await controls.getByRole('button').all()) {
        expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      }
      expect(
        (
          await checkpointControls
            .getByRole('button', { name: 'Add', exact: true })
            .boundingBox()
        )?.height,
      ).toBeGreaterThanOrEqual(44);
    }

    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`${layout.label}-precision-review.png`),
      fullPage: true,
    });
  }
});

test.describe('touch-first checkpoint playback', () => {
  test.use({
    userAgent: devices['iPhone 13'].userAgent,
    viewport: devices['iPhone 13'].viewport,
    deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
    isMobile: devices['iPhone 13'].isMobile,
    hasTouch: devices['iPhone 13'].hasTouch,
  });

  test('pauses before navigating to a checkpoint on mobile', async ({ page }) => {
    await page.goto('/');
    await importVideo(page, portraitFixture);

    expect(
      await page.evaluate(() =>
        window.matchMedia('(hover: hover) and (pointer: fine)').matches,
      ),
    ).toBe(false);

    const video = page.locator('video');
    await video.evaluate(async (element) => {
      const media = element as HTMLVideoElement;
      media.currentTime = 1.2;
      await new Promise<void>((resolve) =>
        media.addEventListener('seeked', () => resolve(), { once: true }),
      );
    });
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await video.evaluate(async (element) => {
      const media = element as HTMLVideoElement;
      media.currentTime = 0.5;
      await new Promise<void>((resolve) =>
        media.addEventListener('seeked', () => resolve(), { once: true }),
      );
      await media.play();
    });
    await expect
      .poll(() =>
        video.evaluate((element) => (element as HTMLVideoElement).paused),
      )
      .toBe(false);

    await page
      .getByTestId('checkpoint-controls')
      .locator('.checkpoint-time')
      .click();
    await expect
      .poll(() =>
        video.evaluate((element) => (element as HTMLVideoElement).paused),
      )
      .toBe(true);
    await expect
      .poll(() =>
        video.evaluate((element) => (element as HTMLVideoElement).currentTime),
      )
      .toBeCloseTo(1.2, 1);
  });
});

import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const defaultFixtureRoot =
  '/Users/evan/crux-vision-legacy/backend/static/originals';
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

async function showTools(
  page: Page,
  mode: 'Analyze' | 'Playback' | 'Overlay',
) {
  const button = page.getByRole('button', {
    name: `Show ${mode} tools`,
  });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('main')).toHaveAttribute(
    'data-mobile-workspace-mode',
    mode.toLowerCase(),
  );
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

test('keeps transport and workspace state intact while changing mobile tools', async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await importVideo(page, portraitFixture);

  const nav = page.getByTestId('mobile-workspace-nav');
  const transport = page.locator('.transport');
  const precision = page.getByTestId('precision-review-controls');
  const analysisStatus = page.getByTestId('analysis-status');
  const checkpoints = page.getByTestId('checkpoint-controls');
  const overlaySettings = page.getByTestId('overlay-settings');
  const poseQuality = page.getByTestId('pose-quality-preset');
  const video = page.locator('video');

  await expect(nav).toBeVisible();
  await expect(transport).toBeVisible();
  await expect(precision).toBeHidden();
  await expect(analysisStatus).toBeVisible();
  await expect(checkpoints).toBeHidden();
  await expect(overlaySettings).toBeHidden();
  await expect(poseQuality).toBeVisible();
  const unmuteButton = page.getByRole('button', { name: 'Unmute video' });
  await expect(unmuteButton).toBeVisible();
  await expect(unmuteButton).toHaveAttribute('aria-pressed', 'true');
  expect(
    await video.evaluate((element) => (element as HTMLVideoElement).muted),
  ).toBe(true);
  const transportBounds = await transport.boundingBox();
  const unmuteBounds = await unmuteButton.boundingBox();
  expect(transportBounds).not.toBeNull();
  expect(unmuteBounds).not.toBeNull();
  expect(unmuteBounds!.width).toBeGreaterThanOrEqual(44);
  expect(unmuteBounds!.height).toBeGreaterThanOrEqual(44);
  expect(unmuteBounds!.x + unmuteBounds!.width).toBeLessThanOrEqual(
    transportBounds!.x + transportBounds!.width,
  );
  await unmuteButton.click();
  await expect(page.getByRole('button', { name: 'Mute video' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(
    await video.evaluate((element) => (element as HTMLVideoElement).muted),
  ).toBe(false);

  for (const button of await nav.getByRole('button').all()) {
    const bounds = await button.boundingBox();
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }

  await showTools(page, 'Playback');
  await expect(precision).toBeVisible();
  await expect(analysisStatus).toBeHidden();
  await expect(checkpoints).toBeVisible();
  await expect(overlaySettings).toBeHidden();
  await expect(poseQuality).toBeHidden();
  await page.getByRole('button', { name: 'Play at 0.5× speed' }).click();
  await expect(page.locator('main')).toHaveAttribute(
    'data-playback-rate',
    '0.5',
  );

  await showTools(page, 'Analyze');
  await expect(transport).toBeVisible();
  await expect(precision).toBeHidden();
  await expect(analysisStatus).toBeVisible();
  await expect(checkpoints).toBeHidden();
  await expect(overlaySettings).toBeHidden();
  await expect(poseQuality).toBeVisible();
  const startButtonBounds = await page
    .getByRole('button', { name: 'Set start' })
    .boundingBox();
  const endButtonBounds = await page
    .getByRole('button', { name: 'Set end' })
    .boundingBox();
  expect(startButtonBounds).not.toBeNull();
  expect(endButtonBounds).not.toBeNull();
  expect(startButtonBounds!.height).toBeGreaterThanOrEqual(44);
  expect(endButtonBounds!.height).toBeGreaterThanOrEqual(44);
  expect(startButtonBounds!.width).toBeGreaterThanOrEqual(44);
  expect(endButtonBounds!.width).toBeGreaterThanOrEqual(44);
  expect(startButtonBounds!.width).toBeLessThan(120);
  expect(endButtonBounds!.width).toBeLessThan(120);
  expect(
    Math.abs(startButtonBounds!.width - endButtonBounds!.width),
  ).toBeLessThan(8);
  expect(startButtonBounds!.y).toBeCloseTo(endButtonBounds!.y, 0);
  for (const button of [
    page.getByRole('button', { name: 'Set start' }),
    page.getByRole('button', { name: 'Set end' }),
  ]) {
    expect(
      Number.parseFloat(
        await button.evaluate(
          (element) => getComputedStyle(element, '::before').height,
        ),
      ),
    ).toBeCloseTo(24, 0);
    await expect(button).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  }

  await showTools(page, 'Playback');
  await page.locator('video').evaluate(async (element) => {
    const video = element as HTMLVideoElement;
    video.pause();
    video.currentTime = 0.5;
    await new Promise<void>((resolve) =>
      video.addEventListener('seeked', () => resolve(), { once: true }),
    );
  });
  await checkpoints.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(checkpoints).toHaveAttribute('data-checkpoint-count', '1');

  await showTools(page, 'Overlay');
  await expect(transport).toBeVisible();
  await expect(precision).toBeHidden();
  await expect(analysisStatus).toBeHidden();
  await expect(checkpoints).toBeHidden();
  await expect(overlaySettings).toBeVisible();
  await expect(poseQuality).toBeHidden();

  const skeleton = page.getByRole('checkbox', { name: 'Skeleton' });
  await skeleton.uncheck();
  await expect(skeleton).not.toBeChecked();
  await overlaySettings.locator(':scope > summary').click();
  await expect(overlaySettings).not.toHaveAttribute('open', '');

  await showTools(page, 'Playback');
  await expect(page.locator('main')).toHaveAttribute(
    'data-playback-rate',
    '0.5',
  );
  await expect(checkpoints).toHaveAttribute('data-checkpoint-count', '1');
  await showTools(page, 'Overlay');
  await expect(overlaySettings).not.toHaveAttribute('open', '');
  await overlaySettings.locator(':scope > summary').click();
  await expect(skeleton).not.toBeChecked();

  await page.setViewportSize({ width: 852, height: 393 });
  await expect(nav).toBeVisible();
  await expect(
    nav.getByRole('button', { name: 'Show Overlay tools' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(overlaySettings).toBeVisible();
  await expect(transport).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mute video' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(
    await video.evaluate((element) => (element as HTMLVideoElement).muted),
  ).toBe(false);
  await expectNoHorizontalOverflow(page);

  await importVideo(page, landscapeFixture);
  await expect(page.getByRole('button', { name: 'Unmute video' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(
    await video.evaluate((element) => (element as HTMLVideoElement).muted),
  ).toBe(true);
  await expect(
    nav.getByRole('button', { name: 'Show Analyze tools' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(precision).toBeHidden();
  await expect(analysisStatus).toBeVisible();
  await expect(poseQuality).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute(
    'data-playback-rate',
    '1',
  );
  await expect(page.locator('main')).toHaveAttribute(
    'data-checkpoint-count',
    '0',
  );
});

test('keeps the compact navigation usable for portrait and landscape phone layouts', async ({
  page,
}, testInfo) => {
  const cases = [
    {
      label: 'portrait-phone-portrait-video',
      viewport: { width: 393, height: 852 },
      fixture: portraitFixture,
    },
    {
      label: 'portrait-phone-landscape-video',
      viewport: { width: 393, height: 852 },
      fixture: landscapeFixture,
    },
    {
      label: 'landscape-phone-portrait-video',
      viewport: { width: 852, height: 393 },
      fixture: portraitFixture,
    },
    {
      label: 'narrow-landscape-phone-portrait-video',
      viewport: { width: 667, height: 375 },
      fixture: portraitFixture,
    },
    {
      label: 'compact-landscape-phone-portrait-video',
      viewport: { width: 568, height: 320 },
      fixture: portraitFixture,
    },
    {
      label: 'landscape-phone-landscape-video',
      viewport: { width: 852, height: 393 },
      fixture: landscapeFixture,
    },
  ];

  for (const layout of cases) {
    await page.setViewportSize(layout.viewport);
    await page.goto('/');
    await importVideo(page, layout.fixture);
    await page.locator('video').evaluate((element) => {
      (element as HTMLVideoElement).pause();
    });

    const nav = page.getByTestId('mobile-workspace-nav');
    const stage = page.getByTestId('video-stage');
    const transport = page.locator('.transport');
    await expect(nav).toBeVisible();
    await expect(stage).toBeVisible();
    await expect(transport).toBeVisible();
    await expect(page.locator('.topbar')).toBeHidden();
    await expect(page.locator('.stage-brand')).toBeVisible();
    await expect(page.locator('.stage-brand small')).toHaveCount(0);
    const startValueBounds = await page
      .locator('.range-readout-edge > span')
      .first()
      .boundingBox();
    const setStartBounds = await page
      .getByRole('button', { name: 'Set start' })
      .boundingBox();
    const endValueBounds = await page
      .locator('.range-readout-edge > span')
      .last()
      .boundingBox();
    const setEndBounds = await page
      .getByRole('button', { name: 'Set end' })
      .boundingBox();
    expect(startValueBounds).not.toBeNull();
    expect(setStartBounds).not.toBeNull();
    expect(endValueBounds).not.toBeNull();
    expect(setEndBounds).not.toBeNull();
    expect(setStartBounds!.y).toBeLessThan(
      startValueBounds!.y + startValueBounds!.height,
    );
    expect(setEndBounds!.y).toBeLessThan(
      endValueBounds!.y + endValueBounds!.height,
    );
    expect(startValueBounds!.x + startValueBounds!.width).toBeLessThanOrEqual(
      setStartBounds!.x,
    );
    expect(setEndBounds!.x + setEndBounds!.width).toBeLessThanOrEqual(
      endValueBounds!.x,
    );
    expect(setStartBounds!.width).toBeLessThan(120);
    expect(setEndBounds!.width).toBeLessThan(120);

    if (layout.viewport.width > layout.viewport.height) {
      const [stageBounds, navBounds, railBounds] = await Promise.all([
        stage.boundingBox(),
        nav.boundingBox(),
        page.locator('.control-rail').boundingBox(),
      ]);
      expect(stageBounds).not.toBeNull();
      expect(navBounds).not.toBeNull();
      expect(railBounds).not.toBeNull();
      expect(navBounds!.x + navBounds!.width).toBeLessThan(railBounds!.x);
      expect(railBounds!.x + railBounds!.width).toBeLessThanOrEqual(
        layout.viewport.width + 0.5,
      );
      const navButtons = await nav.getByRole('button').all();
      const navButtonBounds = await Promise.all(
        navButtons.map((button) => button.boundingBox()),
      );
      expect(navButtonBounds).toHaveLength(3);
      expect(navButtonBounds[1]!.y).toBeGreaterThan(
        navButtonBounds[0]!.y + navButtonBounds[0]!.height,
      );
      expect(navButtonBounds[2]!.y).toBeGreaterThan(
        navButtonBounds[1]!.y + navButtonBounds[1]!.height,
      );

      if (layout.fixture === portraitFixture) {
        expect(stageBounds!.x + stageBounds!.width).toBeLessThan(navBounds!.x);
        const navY = navBounds!.y;
        await page.locator('.control-rail').evaluate((element) => {
          element.scrollTop = 200;
        });
        expect((await nav.boundingBox())?.y).toBeCloseTo(navY, 0);
      } else {
        expect(
          Math.abs(
            railBounds!.x + railBounds!.width / 2 - layout.viewport.width / 2,
          ),
        ).toBeLessThanOrEqual(1);
        await page.evaluate(() => window.scrollTo(0, 500));
        expect((await nav.boundingBox())?.y).toBeLessThanOrEqual(9);
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    }

    for (const mode of ['Analyze', 'Playback', 'Overlay'] as const) {
      await showTools(page, mode);
      await expect(nav).toBeVisible();
      await expect(stage).toBeVisible();
      await expect(transport).toBeVisible();
      const stageBounds = await stage.boundingBox();
      const transportBounds = await transport.boundingBox();
      const stageBrandBounds = await page.locator('.stage-brand').boundingBox();
      expect(stageBounds).not.toBeNull();
      expect(transportBounds).not.toBeNull();
      expect(stageBrandBounds).not.toBeNull();
      expect(stageBrandBounds!.x - stageBounds!.x).toBeGreaterThanOrEqual(9.5);
      expect(stageBrandBounds!.x - stageBounds!.x).toBeLessThanOrEqual(11.5);
      expect(stageBrandBounds!.y - stageBounds!.y).toBeGreaterThanOrEqual(9.5);
      expect(stageBrandBounds!.y - stageBounds!.y).toBeLessThanOrEqual(11.5);
      expect(transportBounds!.y).toBeGreaterThanOrEqual(
        stageBounds!.y + stageBounds!.height - 72,
      );
      expect(
        transportBounds!.y + transportBounds!.height,
      ).toBeLessThanOrEqual(stageBounds!.y + stageBounds!.height - 4);
      expect(transportBounds!.height).toBeLessThanOrEqual(48);
      await expect(
        page.getByRole('button', { name: /Play video|Pause video/ }),
      ).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      expect(
        Number.parseFloat(await transport.evaluate(
          (element) => getComputedStyle(element).borderRadius,
        )),
      ).toBeGreaterThanOrEqual(20);
      expect(
        Number.parseFloat(await transport.evaluate(
          (element) => getComputedStyle(element, '::before').height,
        )),
      ).toBeCloseTo(36, 0);

      if (layout.label === 'landscape-phone-landscape-video') {
        const railBounds = await page.locator('.control-rail').boundingBox();
        expect(railBounds).not.toBeNull();
        expect(stageBounds!.width).toBeGreaterThanOrEqual(697);
        expect(stageBounds!.width).toBeLessThanOrEqual(700);
        expect(stageBounds!.height).toBeGreaterThanOrEqual(392);
        expect(stageBounds!.height).toBeLessThanOrEqual(393);
        expect(stageBounds!.x).toBeGreaterThanOrEqual(75);
        expect(stageBounds!.y).toBeLessThanOrEqual(0.5);
        expect(
          stageBounds!.y + stageBounds!.height,
        ).toBeLessThanOrEqual(layout.viewport.height + 0.5);
        expect(transportBounds!.x).toBeGreaterThanOrEqual(
          stageBounds!.x + 7.5,
        );
        expect(
          transportBounds!.x + transportBounds!.width,
        ).toBeLessThanOrEqual(
          stageBounds!.x + stageBounds!.width - 7.5,
        );
        expect(railBounds!.y).toBeGreaterThanOrEqual(
          stageBounds!.y + stageBounds!.height + 10,
        );
      }
      await expectNoHorizontalOverflow(page);
      await page.waitForTimeout(100);
      await page.screenshot({
        path: testInfo.outputPath(
          `${layout.label}-${mode.toLowerCase()}.png`,
        ),
      });
    }
  }
});

test('keeps the mobile navigation out of the desktop workspace', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await importVideo(page, portraitFixture);

  await expect(page.getByTestId('mobile-workspace-nav')).toBeHidden();
  await expect(page.getByTestId('precision-review-controls')).toBeVisible();
  await expect(page.getByTestId('analysis-status')).toBeVisible();
  await expect(page.getByTestId('checkpoint-controls')).toBeVisible();
  await expect(page.getByTestId('overlay-settings')).toBeVisible();
});

test('keeps active phone controls at least 44 pixels in both dimensions', async ({
  page,
}) => {
  for (const viewport of [
    { width: 393, height: 852 },
    { width: 852, height: 393 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await importVideo(page, portraitFixture);

    for (const mode of ['Analyze', 'Playback', 'Overlay'] as const) {
      await showTools(page, mode);
      const undersized = await page.evaluate(() => {
        const selectors = [
          'button:not([disabled])',
          'summary',
          'select:not([disabled])',
          'input:not([disabled]):not([type="checkbox"]):not([type="radio"]):not([type="file"])',
          '.file-button-compact',
          '.switch-control',
          '.overlay-option',
          '.trail-source-visibility',
        ];
        return Array.from(
          document.querySelectorAll<HTMLElement>(selectors.join(',')),
        )
          .filter((element) => {
            const style = getComputedStyle(element);
            const bounds = element.getBoundingClientRect();
            return (
              element.closest('details:not([open])') === null &&
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              bounds.width > 0 &&
              bounds.height > 0
            );
          })
          .map((element) => {
            const bounds = element.getBoundingClientRect();
            return {
              element:
                `${element.tagName.toLowerCase()}.${element.className}` +
                `[type="${element.getAttribute('type') ?? ''}"] ` +
                (element.getAttribute('aria-label') ??
                  element.textContent
                    ?.trim()
                    .replace(/\s+/g, ' ')
                    .slice(0, 60) ??
                  '') +
                ` parent=${element.parentElement?.className ?? ''}` +
                ` details=${element.closest('details')?.className ?? ''}` +
                ` open=${element.closest('details')?.open ?? false}`,
              width: bounds.width,
              height: bounds.height,
            };
          })
          .filter(({ width, height }) => width < 43.5 || height < 43.5);
      });
      expect(undersized).toEqual([]);
    }
  }
});

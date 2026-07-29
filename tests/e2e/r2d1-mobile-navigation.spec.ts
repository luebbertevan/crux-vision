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
  mode: 'Review' | 'Timeline' | 'Inspect',
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

test('keeps transport and review state intact while changing mobile tools', async ({
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

  await expect(nav).toBeVisible();
  await expect(transport).toBeVisible();
  await expect(precision).toBeVisible();
  await expect(analysisStatus).toBeHidden();
  await expect(checkpoints).toBeHidden();
  await expect(overlaySettings).toBeHidden();

  for (const button of await nav.getByRole('button').all()) {
    const bounds = await button.boundingBox();
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }

  await page.getByRole('button', { name: 'Play at 0.5× speed' }).click();
  await expect(page.locator('main')).toHaveAttribute(
    'data-playback-rate',
    '0.5',
  );

  await showTools(page, 'Timeline');
  await expect(transport).toBeVisible();
  await expect(precision).toBeHidden();
  await expect(analysisStatus).toBeVisible();
  await expect(checkpoints).toBeVisible();
  await expect(overlaySettings).toBeHidden();

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

  await showTools(page, 'Inspect');
  await expect(transport).toBeVisible();
  await expect(precision).toBeHidden();
  await expect(analysisStatus).toBeHidden();
  await expect(checkpoints).toBeHidden();
  await expect(overlaySettings).toBeVisible();

  const skeleton = page.getByRole('checkbox', { name: 'Skeleton' });
  await skeleton.uncheck();
  await expect(skeleton).not.toBeChecked();
  await overlaySettings.locator(':scope > summary').click();
  await expect(overlaySettings).not.toHaveAttribute('open', '');

  await showTools(page, 'Review');
  await expect(page.locator('main')).toHaveAttribute(
    'data-playback-rate',
    '0.5',
  );
  await showTools(page, 'Timeline');
  await expect(checkpoints).toHaveAttribute('data-checkpoint-count', '1');
  await showTools(page, 'Inspect');
  await expect(overlaySettings).not.toHaveAttribute('open', '');
  await overlaySettings.locator(':scope > summary').click();
  await expect(skeleton).not.toBeChecked();

  await page.setViewportSize({ width: 852, height: 393 });
  await expect(nav).toBeVisible();
  await expect(
    nav.getByRole('button', { name: 'Show Inspect tools' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(overlaySettings).toBeVisible();
  await expect(transport).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await importVideo(page, landscapeFixture);
  await expect(
    nav.getByRole('button', { name: 'Show Review tools' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(precision).toBeVisible();
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

    for (const mode of ['Review', 'Timeline', 'Inspect'] as const) {
      await showTools(page, mode);
      await expect(nav).toBeVisible();
      await expect(stage).toBeVisible();
      await expect(transport).toBeVisible();
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

    for (const mode of ['Review', 'Timeline', 'Inspect'] as const) {
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

import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const defaultFixtureRoot =
  '/Users/evan/crux-vision-legacy/backend/static/originals';
const fixtureRoot = process.env.CRUX_FIXTURE_ROOT ?? defaultFixtureRoot;
const portraitFixture = path.join(fixtureRoot, 'portrait-test.MOV');
const landscapeFixture = path.join(fixtureRoot, 'landscape-test.MOV');

async function importVideo(page: Page, fixture = portraitFixture) {
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

async function undo(page: Page, label: string) {
  const history = page.getByTestId('global-history-controls');
  await expect(history).toHaveAttribute('data-undo-label', label);
  await history.getByRole('button', { name: 'Undo last change' }).click();
}

async function redo(page: Page, label: string) {
  const history = page.getByTestId('global-history-controls');
  await expect(history).toHaveAttribute('data-redo-label', label);
  await history.getByRole('button', { name: 'Redo last change' }).click();
}

test('offers global history for clip, overlay, and pose settings', async ({
  page,
}) => {
  await page.goto('/');
  await importVideo(page);

  const history = page.getByTestId('global-history-controls');
  await expect(history).toBeVisible();
  await expect(
    history.getByRole('button', { name: 'Undo last change' }),
  ).toBeDisabled();
  await expect(
    history.getByRole('button', { name: 'Redo last change' }),
  ).toBeDisabled();

  const analysisStart = page.getByLabel('Analysis start');
  await analysisStart.fill('1000000');
  await analysisStart.fill('1500000');
  await undo(page, 'Analysis start');
  await expect(analysisStart).toHaveValue('0');
  await redo(page, 'Analysis start');
  await expect(analysisStart).toHaveValue('1500000');

  await page
    .getByRole('button', { name: 'Play at 0.25× speed' })
    .click();
  await expect(page.locator('main')).toHaveAttribute(
    'data-playback-rate',
    '0.25',
  );
  await page.getByRole('button', { name: 'Loop analysis range' }).click();
  await expect(page.locator('main')).toHaveAttribute(
    'data-range-loop',
    'enabled',
  );
  await undo(page, 'Range loop');
  await expect(page.locator('main')).toHaveAttribute(
    'data-range-loop',
    'disabled',
  );
  await undo(page, 'Playback speed');
  await expect(page.locator('main')).toHaveAttribute('data-playback-rate', '1');

  const master = page.getByRole('checkbox', { name: 'Overlays' });
  await master.evaluate((input) => (input as HTMLInputElement).click());
  await undo(page, 'Overlay visibility');
  await expect(master).toBeChecked();

  const overlaySettings = page.getByTestId('overlay-settings');
  await overlaySettings.locator(':scope > summary').click();
  const skeleton = page.getByRole('checkbox', { name: 'Skeleton' });
  await skeleton.uncheck();
  await undo(page, 'Skeleton visibility');
  await expect(skeleton).toBeChecked();

  const addSource = page.getByLabel('Add trail source');
  await addSource.selectOption('left-wrist');
  await expect(
    page.getByTestId('active-trail-source-left-wrist'),
  ).toBeVisible();
  await undo(page, 'Add Left wrist');
  await expect(
    page.getByTestId('active-trail-source-left-wrist'),
  ).toHaveCount(0);

  const advanced = page.getByTestId('trail-advanced-settings');
  await advanced.locator('summary').click();
  const hipWidth = page.getByLabel('Hip midpoint trail width');
  await hipWidth.fill('1.6');
  await hipWidth.fill('1.8');
  await undo(page, 'Hip midpoint width');
  await expect(hipWidth).toHaveValue('1.25');

  const qualityPreset = page.getByTestId('pose-quality-preset');
  await qualityPreset.selectOption('strict');
  await undo(page, 'Pose quality preset');
  await expect(qualityPreset).toHaveValue('balanced');

  await page.getByText('Pose quality calibration').click();
  const model = page.getByTestId('calibration-model');
  await model.selectOption('lite');
  await expect(page.locator('main')).toHaveAttribute(
    'data-analysis-model',
    'lite',
  );
  await undo(page, 'Inference model');
  await expect(model).toHaveValue('full');
});

test('undoes checkpoint edits atomically and resets history for a new source', async ({
  page,
}) => {
  await page.goto('/');
  await importVideo(page);

  await page.locator('video').evaluate(async (element) => {
    const video = element as HTMLVideoElement;
    video.pause();
    video.currentTime = 1;
    await new Promise<void>((resolve) =>
      video.addEventListener('seeked', () => resolve(), { once: true }),
    );
  });

  const checkpoints = page.getByTestId('checkpoint-controls');
  await checkpoints.getByRole('button', { name: 'Add' }).click();
  const name = page.getByLabel('Checkpoint 1 name');
  await name.fill('Crux');
  await page.getByRole('button', { name: 'Remove Crux' }).click();
  await expect(checkpoints).toHaveAttribute('data-checkpoint-count', '0');

  await undo(page, 'Remove checkpoint');
  await expect(page.getByLabel('Checkpoint 1 name')).toHaveValue('Crux');
  await undo(page, 'Checkpoint name');
  await expect(page.getByLabel('Checkpoint 1 name')).toHaveValue(
    'Checkpoint 1',
  );
  await undo(page, 'Add checkpoint');
  await expect(checkpoints).toHaveAttribute('data-checkpoint-count', '0');

  await redo(page, 'Add checkpoint');
  await redo(page, 'Checkpoint name');
  await redo(page, 'Remove checkpoint');
  await expect(checkpoints).toHaveAttribute('data-checkpoint-count', '0');

  await page.getByTestId('video-input').setInputFiles(landscapeFixture);
  await expect(page.getByTestId('video-stage')).toHaveAttribute(
    'data-display-width',
    '1920',
  );
  await expect(
    page
      .getByTestId('global-history-controls')
      .getByRole('button', { name: 'Undo last change' }),
  ).toBeDisabled();
  await expect(
    page
      .getByTestId('global-history-controls')
      .getByRole('button', { name: 'Redo last change' }),
  ).toBeDisabled();
});

test('keeps global history visible and touchable on phone layouts', async ({
  page,
}) => {
  for (const viewport of [
    { width: 393, height: 852 },
    { width: 852, height: 393 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await importVideo(page);

    const controls = page.getByTestId('global-history-controls');
    await expect(controls).toBeVisible();
    const buttonBounds = await controls.getByRole('button').evaluateAll(
      (buttons) =>
        buttons.map((button) => {
          const bounds = button.getBoundingClientRect();
          return { width: bounds.width, height: bounds.height };
        }),
    );
    expect(buttonBounds).toHaveLength(2);
    expect(
      buttonBounds.every(
        ({ width, height }) => width >= 44 && height >= 44,
      ),
    ).toBe(true);
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
});

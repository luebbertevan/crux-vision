import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const defaultFixtureRoot = '/Users/evan/crux-vision-legacy/backend/static/originals';
const fixtureRoot = process.env.CRUX_FIXTURE_ROOT ?? defaultFixtureRoot;
const climbingFixture = path.join(fixtureRoot, 'lache-send.MOV');
const overhangFixture = path.join(fixtureRoot, 'overhang-orange.MOV');
const landscapeFixture = path.join(fixtureRoot, 'landscape-climb.MOV');
const portraitFixture = path.join(fixtureRoot, 'portrait-test.MOV');

const importVideo = async (page: Page, fixture = climbingFixture) => {
  await page.getByTestId('video-input').setInputFiles(fixture);
  await expect(page.getByTestId('video-stage')).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('video')
        .evaluate((element) => (element as HTMLVideoElement).readyState),
    )
    .toBeGreaterThan(1);
};

const setRange = async (
  page: Page,
  startMicroseconds = 7_000_000,
  endMicroseconds = 12_000_000,
) => {
  await page.getByLabel('Analysis end').fill(String(endMicroseconds));
  await page
    .getByLabel('Analysis start')
    .fill(String(startMicroseconds));
};

const collectEvidence = async (page: Page, wallMilliseconds: number) =>
  page.locator('main').evaluate(
    (element, wall) => {
      const root = element as HTMLElement;
      return {
        model: root.dataset.analysisModel,
        rawSampleCount: Number(root.dataset.sampleCount),
        structurallyObservedJointSlots: Number(root.dataset.qualityObserved),
        acceptedCoverage: Number(root.dataset.qualityCoverage),
        modelEmptySamples: Number(root.dataset.qualityModelEmpty),
        confidenceRejectedJointSlots: Number(
          root.dataset.qualityConfidenceRejects,
        ),
        temporalRejectedJointSlots: Number(root.dataset.qualityTemporalRejects),
        meanInferenceMilliseconds: Number(
          root.dataset.analysisMeanInferenceMs,
        ),
        p95InferenceMilliseconds: Number(root.dataset.analysisP95InferenceMs),
        flickerCount: Number(root.dataset.qualityFlicker),
        longestGapMicroseconds: Number(root.dataset.qualityLongestGapUs),
        meanReacquisitionMicroseconds: Number(
          root.dataset.qualityMeanReacquisitionUs,
        ),
        meanSmoothingDisplacement: Number(
          root.dataset.qualitySmoothingDisplacement,
        ),
        groupCoverage: JSON.parse(root.dataset.qualityGroupCoverage ?? '{}'),
        wallMilliseconds: wall,
      };
    },
    wallMilliseconds,
  );

test('runs a bounded MediaPipe Full quality challenge against the Lite default', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await importVideo(page);
  await setRange(page);

  const liteStartedAt = Date.now();
  await page.getByRole('button', { name: 'Analyze range' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', 'ready', {
    timeout: 150_000,
  });
  const lite = await collectEvidence(page, Date.now() - liteStartedAt);
  expect(lite.model).toBe('lite');
  expect(lite.rawSampleCount).toBeGreaterThan(0);
  expect(lite.structurallyObservedJointSlots).toBeGreaterThan(0);

  await page.getByText('Pose quality calibration').click();
  await page.getByTestId('calibration-model').selectOption('full');
  await expect(page.locator('main')).toHaveAttribute('data-analysis-model', 'full');
  await expect(page.locator('main')).toHaveAttribute('data-sample-count', '0');

  const fullStartedAt = Date.now();
  await page.getByRole('button', { name: 'Analyze range' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', 'ready', {
    timeout: 150_000,
  });
  const full = await collectEvidence(page, Date.now() - fullStartedAt);
  expect(full.model).toBe('full');
  expect(full.rawSampleCount).toBeGreaterThan(0);
  expect(full.structurallyObservedJointSlots).toBeGreaterThan(0);

  const evidence = {
    fixture: 'lache-send.MOV',
    rangeSeconds: [7, 12],
    policy: 'balanced-display',
    lite,
    full,
  };
  if (process.env.CRUX_CALIBRATION_LOG === '1') {
    console.log(`CRUX_CALIBRATION_EVIDENCE ${JSON.stringify(evidence)}`);
  }
  await testInfo.attach('lite-versus-full-calibration.json', {
    body: Buffer.from(
      `${JSON.stringify(evidence, null, 2)}\n`,
    ),
    contentType: 'application/json',
  });
});

test('records Strict, Balanced, and Permissive tradeoffs on representative cached ranges', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const ranges = [
    {
      fixture: climbingFixture,
      label: 'portrait dynamic reach',
      startMicroseconds: 7_000_000,
      endMicroseconds: 12_000_000,
    },
    {
      fixture: overhangFixture,
      label: 'portrait overhang and occlusion',
      startMicroseconds: 7_000_000,
      endMicroseconds: 12_000_000,
    },
    {
      fixture: landscapeFixture,
      label: 'landscape extended movement',
      startMicroseconds: 15_000_000,
      endMicroseconds: 20_000_000,
    },
  ];
  const evidence: Array<{
    fixture: string;
    label: string;
    rangeSeconds: number[];
    presets: Record<string, Awaited<ReturnType<typeof collectEvidence>>>;
  }> = [];

  for (const range of ranges) {
    await page.goto('/');
    await importVideo(page, range.fixture);
    await setRange(
      page,
      range.startMicroseconds,
      range.endMicroseconds,
    );
    const startedAt = Date.now();
    await page.getByRole('button', { name: 'Analyze range' }).click();
    await expect(page.locator('main')).toHaveAttribute(
      'data-analysis-phase',
      'ready',
      { timeout: 150_000 },
    );
    const wallMilliseconds = Date.now() - startedAt;
    const rawSampleCount = await page
      .locator('main')
      .getAttribute('data-sample-count');
    await page.getByText('Pose quality calibration').click();

    const presets: Record<
      string,
      Awaited<ReturnType<typeof collectEvidence>>
    > = {};
    for (const preset of ['strict', 'balanced', 'permissive'] as const) {
      await page.getByTestId('pose-quality-preset').selectOption(preset);
      await expect(page.locator('main')).toHaveAttribute(
        'data-quality-policy',
        `${preset}-display`,
      );
      await expect(page.locator('main')).toHaveAttribute(
        'data-sample-count',
        rawSampleCount!,
      );
      presets[preset] = await collectEvidence(page, wallMilliseconds);
    }

    evidence.push({
      fixture: path.basename(range.fixture),
      label: range.label,
      rangeSeconds: [
        range.startMicroseconds / 1_000_000,
        range.endMicroseconds / 1_000_000,
      ],
      presets,
    });
  }

  if (process.env.CRUX_CALIBRATION_LOG === '1') {
    console.log(`CRUX_PRESET_EVIDENCE ${JSON.stringify(evidence)}`);
  }
  await testInfo.attach('pose-quality-preset-evidence.json', {
    body: Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`),
    contentType: 'application/json',
  });
});

test('seeks deterministic analyzed presentation frames for calibration', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto('/');
  await importVideo(page);
  await setRange(page);
  await page.getByRole('button', { name: 'Analyze range' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-analysis-phase', 'ready', {
    timeout: 150_000,
  });
  await page.getByText('Pose quality calibration').click();

  const sampleCount = Number(
    await page.locator('main').getAttribute('data-sample-count'),
  );
  expect(sampleCount).toBeGreaterThan(10);
  await expect(page.getByTestId('calibration-frame-navigator')).toContainText(
    `/ ${sampleCount}`,
  );

  await page.locator('video').evaluate(async (element) => {
    const video = element as HTMLVideoElement;
    video.pause();
    video.currentTime = 0;
    await new Promise<void>((resolve) =>
      video.addEventListener('seeked', () => resolve(), { once: true }),
    );
  });
  const navigator = page.getByTestId('calibration-frame-navigator');
  await expect(navigator).toHaveAttribute('data-frame-index', '');
  await page.getByRole('button', { name: 'Next analyzed frame' }).click();
  await expect(navigator).toHaveAttribute('data-frame-index', '0');

  await page.getByLabel('Exact analyzed frame').fill('10');
  await page.getByLabel('Exact analyzed frame').press('Enter');
  await expect(navigator).toHaveAttribute('data-frame-index', '9');
  const tenthTimestamp = Number(
    await navigator.getAttribute('data-frame-timestamp-microseconds'),
  );
  expect(tenthTimestamp).toBeGreaterThan(0);
  await expect
    .poll(() =>
      page
        .locator('video')
        .evaluate((video) => Math.round((video as HTMLVideoElement).currentTime * 1_000_000)),
    )
    .toBe(tenthTimestamp);
  expect(
    await page
      .locator('video')
      .evaluate((video) => (video as HTMLVideoElement).paused),
  ).toBe(true);

  await page.getByRole('button', { name: 'Next analyzed frame' }).click();
  await expect(navigator).toHaveAttribute('data-frame-index', '10');
  const eleventhTimestamp = Number(
    await navigator.getAttribute('data-frame-timestamp-microseconds'),
  );
  expect(eleventhTimestamp).toBeGreaterThan(tenthTimestamp);

  await page.getByRole('button', { name: 'Previous analyzed frame' }).click();
  await expect(navigator).toHaveAttribute('data-frame-index', '9');
  await expect(page.getByLabel('Exact analyzed frame')).toHaveValue('10');
});

test('keeps the advanced calibration workspace usable at iPhone width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await importVideo(page, portraitFixture);
  await page.getByText('Pose quality calibration').click();

  await expect(page.getByTestId('calibration-model')).toBeVisible();
  await expect(page.getByTestId('pose-preview-mode')).toBeVisible();
  await page.getByRole('button', { name: 'Export calibration JSON' })
    .scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Export calibration JSON' }))
    .toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  for (const locator of [
    page.getByTestId('calibration-model'),
    page.getByTestId('pose-preview-mode'),
    page.getByRole('button', { name: 'Export calibration JSON' }),
  ]) {
    expect((await locator.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
});

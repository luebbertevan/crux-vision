import { describe, expect, it } from 'vitest';

import type { QualityPoseSample } from '../pose/poseQuality';
import type { PoseLandmark, RawPoseSample } from '../types';
import type { DisplayTransform } from './displayTransform';
import {
  createDefaultOverlaySettings,
  withOverlayLayerVisibility,
  withOverlayMasterVisibility,
  withTrailSourceVisibility,
} from './overlaySettings';
import { renderOverlay } from './renderOverlay';

const transform: DisplayTransform = {
  contentRect: { x: 0, y: 0, width: 720, height: 480 },
  scale: 1,
};

function qualitySample(timestampMicroseconds: number): QualityPoseSample {
  const point: PoseLandmark = {
    x: 0.4 + timestampMicroseconds / 10_000_000,
    y: 0.5,
    z: 0,
    visibility: 1,
    presence: 1,
  };
  const rawSample = {
    requestedTimestampMicroseconds: timestampMicroseconds,
    timestampMicroseconds,
    model: 'full',
    delegate: 'CPU',
    landmarks: Array.from({ length: 33 }, () => point),
    worldLandmarks: [],
    inferenceMilliseconds: 1,
  } satisfies RawPoseSample;
  return {
    requestedTimestampMicroseconds: timestampMicroseconds,
    timestampMicroseconds,
    rawSample,
    decisions: Array.from({ length: 33 }, (_, landmarkIndex) => ({
      landmarkIndex,
      bodyGroup: 'head',
      raw: point,
      accepted: point,
      smoothed: point,
      centered: point,
      threshold: { visibility: 0.5, presence: 0.5 },
      status: 'accepted',
      reasons: [],
    })),
  } as QualityPoseSample;
}

function recordingContext() {
  const strokes: Array<{ lineWidth: number; strokeStyle: string }> = [];
  const fills: Array<{ fillStyle: string }> = [];
  const context = {
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    strokeStyle: '',
    fillStyle: '',
    shadowColor: '',
    shadowBlur: 0,
    clearRect: () => undefined,
    beginPath: () => undefined,
    arc: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    stroke: () =>
      strokes.push({
        lineWidth: Number(context.lineWidth),
        strokeStyle: String(context.strokeStyle),
      }),
    fill: () => fills.push({ fillStyle: String(context.fillStyle) }),
  };
  return {
    context: context as unknown as CanvasRenderingContext2D,
    strokes,
    fills,
  };
}

describe('overlay renderer settings', () => {
  const samples = [qualitySample(0), qualitySample(30_000)];

  it('renders skeleton and trails as independent layers', () => {
    const first = recordingContext();
    const trailsOnly = withOverlayLayerVisibility(
      createDefaultOverlaySettings(),
      'skeleton',
      false,
    );
    const trailResult = renderOverlay(
      first.context,
      720,
      480,
      transform,
      samples,
      samples[1],
      30_000,
      'centered',
      trailsOnly,
    );
    expect(trailResult.skeletonSegmentCount).toBe(0);
    expect(trailResult.trailSegmentCount).toBe(2);

    const second = recordingContext();
    const skeletonOnly = withOverlayLayerVisibility(
      createDefaultOverlaySettings(),
      'trails',
      false,
    );
    const skeletonResult = renderOverlay(
      second.context,
      720,
      480,
      transform,
      samples,
      samples[1],
      30_000,
      'centered',
      skeletonOnly,
    );
    expect(skeletonResult.skeletonSegmentCount).toBeGreaterThan(0);
    expect(skeletonResult.trailSegmentCount).toBe(0);
  });

  it('renders only selected stable trail sources', () => {
    let settings = createDefaultOverlaySettings();
    settings = withOverlayLayerVisibility(settings, 'skeleton', false);
    settings = withTrailSourceVisibility(
      settings,
      'shoulder-midpoint',
      false,
    );
    const hipOnly = renderOverlay(
      recordingContext().context,
      720,
      480,
      transform,
      samples,
      samples[1],
      30_000,
      'centered',
      settings,
    );
    expect(hipOnly.trailSegmentCount).toBe(1);

    settings = withTrailSourceVisibility(settings, 'left-wrist', true);
    const hipAndWrist = renderOverlay(
      recordingContext().context,
      720,
      480,
      transform,
      samples,
      samples[1],
      30_000,
      'centered',
      settings,
    );
    expect(hipAndWrist.trailSegmentCount).toBe(2);
  });

  it('draws a wider contrasting pass before each colored trail stroke', () => {
    let settings = createDefaultOverlaySettings();
    settings = withOverlayLayerVisibility(settings, 'skeleton', false);
    settings = withTrailSourceVisibility(
      settings,
      'shoulder-midpoint',
      false,
    );
    const recording = recordingContext();
    renderOverlay(
      recording.context,
      720,
      480,
      transform,
      samples,
      samples[1],
      30_000,
      'centered',
      settings,
    );

    expect(recording.strokes).toHaveLength(2);
    expect(recording.strokes[0].lineWidth).toBeGreaterThan(
      recording.strokes[1].lineWidth,
    );
    expect(recording.strokes[0].strokeStyle).toContain('7, 10, 8');
    expect(recording.strokes[1].strokeStyle).toContain('255, 178, 77');
  });

  it('lets the master hide all drawing without mutating sub-selections', () => {
    const settings = withOverlayMasterVisibility(
      withTrailSourceVisibility(
        createDefaultOverlaySettings(),
        'right-ankle',
        true,
      ),
      false,
    );
    const result = renderOverlay(
      recordingContext().context,
      720,
      480,
      transform,
      samples,
      samples[1],
      30_000,
      'centered',
      settings,
    );
    expect(result).toEqual({
      currentPoseAvailable: true,
      skeletonSegmentCount: 0,
      trailSegmentCount: 0,
    });
    expect(settings.layers).toEqual({ skeleton: true, trails: true });
    expect(settings.trailSources['right-ankle']).toBe(true);
  });
});

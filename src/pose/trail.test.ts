import { describe, expect, it } from 'vitest';

import type { PoseLandmark, RawPoseSample } from '../types';
import { buildTrailSegments } from './trail';

const sample = (timestampMicroseconds: number, visibility = 1): RawPoseSample => {
  const missing: PoseLandmark = { x: 0, y: 0, z: 0, visibility: 0, presence: 0 };
  const landmarks = Array.from({ length: 33 }, () => missing);
  landmarks[15] = {
    x: timestampMicroseconds / 1_000_000,
    y: 0.5,
    z: 0,
    visibility,
    presence: visibility,
  };
  return {
    requestedTimestampMicroseconds: timestampMicroseconds,
    timestampMicroseconds,
    model: 'lite',
    delegate: 'CPU',
    landmarks,
    worldLandmarks: [],
    inferenceMilliseconds: 1,
  };
};

describe('trail segmentation', () => {
  it('starts a new segment after a low-confidence sample', () => {
    const segments = buildTrailSegments(
      [sample(0), sample(60_000), sample(120_000, 0.2), sample(180_000), sample(240_000)],
      240_000,
      { jointIndex: 15, durationMicroseconds: 1_000_000, maximumGapMicroseconds: 100_000 },
    );
    expect(segments.map((segment) => segment.length)).toEqual([2, 2]);
  });

  it('does not bridge a long timestamp gap even when both endpoints are accepted', () => {
    const segments = buildTrailSegments(
      [sample(0), sample(60_000), sample(250_000)],
      250_000,
      { jointIndex: 15, durationMicroseconds: 1_000_000, maximumGapMicroseconds: 100_000 },
    );
    expect(segments.map((segment) => segment.length)).toEqual([2, 1]);
  });

  it('limits the trail to the configured timestamp window', () => {
    const segments = buildTrailSegments(
      [sample(0), sample(500_000), sample(1_000_000)],
      1_000_000,
      { jointIndex: 15, durationMicroseconds: 600_000, maximumGapMicroseconds: 600_000 },
    );
    expect(segments.flat().map((point) => point.timestampMicroseconds)).toEqual([500_000, 1_000_000]);
  });
});

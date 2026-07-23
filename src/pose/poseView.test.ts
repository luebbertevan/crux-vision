import { describe, expect, it } from 'vitest';

import type { PoseLandmark, RawPoseSample } from '../types';
import { buildSkeletonSegments, isLandmarkAccepted } from './poseView';

const landmark = (visibility = 1): PoseLandmark => ({
  x: 0.5,
  y: 0.5,
  z: 0,
  visibility,
  presence: 1,
});

const pose = (): RawPoseSample => ({
  requestedTimestampMicroseconds: 0,
  timestampMicroseconds: 0,
  model: 'lite',
  delegate: 'CPU',
  landmarks: Array.from({ length: 33 }, () => landmark()),
  worldLandmarks: [],
  inferenceMilliseconds: 1,
});

describe('accepted pose view', () => {
  it('rejects low confidence, low presence, non-finite, and out-of-bounds landmarks', () => {
    expect(isLandmarkAccepted(landmark(0.49))).toBe(false);
    expect(isLandmarkAccepted({ ...landmark(), presence: 0.49 })).toBe(false);
    expect(isLandmarkAccepted({ ...landmark(), x: Number.NaN })).toBe(false);
    expect(isLandmarkAccepted({ ...landmark(), y: 1.01 })).toBe(false);
  });

  it('removes a skeleton segment when either endpoint is rejected', () => {
    const sample = pose();
    const completeCount = buildSkeletonSegments(sample).length;
    sample.landmarks[13] = landmark(0.2);
    const segments = buildSkeletonSegments(sample);
    expect(segments.length).toBeLessThan(completeCount);
    expect(segments.some(({ startIndex, endIndex }) => startIndex === 11 && endIndex === 13)).toBe(false);
    expect(segments.some(({ startIndex, endIndex }) => startIndex === 13 && endIndex === 15)).toBe(false);
  });
});

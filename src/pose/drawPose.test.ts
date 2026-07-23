import { describe, expect, it } from 'vitest';

import type { TimedPose } from '../types';
import { containRect, nearestPose } from './drawPose';

const poseAt = (seconds: number): TimedPose => ({
  timestampMicroseconds: seconds * 1_000_000,
  sourceTimestampSeconds: seconds,
  landmarks: [],
  worldLandmarks: [],
  inferenceMilliseconds: 1,
});

describe('containRect', () => {
  it('centers portrait video inside a landscape player', () => {
    const rect = containRect(796, 478, 1080, 1920);

    expect(rect.width).toBeCloseTo(268.875);
    expect(rect.height).toBe(478);
    expect(rect.x).toBeCloseTo(263.5625);
    expect(rect.y).toBe(0);
  });

  it('centers landscape video inside a portrait player', () => {
    const rect = containRect(300, 600, 1920, 1080);

    expect(rect.width).toBe(300);
    expect(rect.height).toBeCloseTo(168.75);
    expect(rect.x).toBe(0);
    expect(rect.y).toBeCloseTo(215.625);
  });
});

describe('nearestPose', () => {
  const poses = [poseAt(0), poseAt(0.1), poseAt(0.2)];

  it('uses presentation timestamps instead of array indexes', () => {
    expect(nearestPose(poses, 0.14, 0.06)?.sourceTimestampSeconds).toBe(0.1);
    expect(nearestPose(poses, 0.17, 0.06)?.sourceTimestampSeconds).toBe(0.2);
  });

  it('does not hold a stale pose across a long gap', () => {
    expect(nearestPose(poses, 0.8, 0.06)).toBeNull();
  });
});

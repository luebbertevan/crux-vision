import type { RawPoseSample } from '../types';
import { isLandmarkAccepted } from './poseView';

export type TrailPoint = {
  x: number;
  y: number;
  timestampMicroseconds: number;
  ageRatio: number;
};

export type TrailSegment = TrailPoint[];

export type TrailConfig = {
  jointIndex: number;
  durationMicroseconds: number;
  maximumGapMicroseconds: number;
};

export function buildTrailSegments(
  samples: readonly RawPoseSample[],
  presentationTimestampMicroseconds: number,
  config: TrailConfig,
): TrailSegment[] {
  const windowStart = presentationTimestampMicroseconds - config.durationMicroseconds;
  const windowLength = Math.max(1, config.durationMicroseconds);
  const segments: TrailSegment[] = [];
  let current: TrailSegment | null = null;
  let previousRawTimestamp: number | null = null;

  for (const sample of samples) {
    if (sample.timestampMicroseconds < windowStart) continue;
    if (sample.timestampMicroseconds > presentationTimestampMicroseconds) break;

    const landmark = sample.landmarks[config.jointIndex];
    const hasLargeGap =
      previousRawTimestamp !== null &&
      sample.timestampMicroseconds - previousRawTimestamp > config.maximumGapMicroseconds;
    previousRawTimestamp = sample.timestampMicroseconds;

    if (!isLandmarkAccepted(landmark)) {
      current = null;
      continue;
    }

    if (!current || hasLargeGap) {
      current = [];
      segments.push(current);
    }
    current.push({
      x: landmark.x,
      y: landmark.y,
      timestampMicroseconds: sample.timestampMicroseconds,
      ageRatio: Math.max(
        0,
        Math.min(1, (sample.timestampMicroseconds - windowStart) / windowLength),
      ),
    });
  }

  return segments;
}

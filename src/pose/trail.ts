import type { RawPoseSample } from '../types';
import { resolvePosePoint, type PosePointSource } from './poseView';

export type TrailPoint = {
  x: number;
  y: number;
  timestampMicroseconds: number;
  ageRatio: number;
};

export type TrailSegment = TrailPoint[];

export type TrailConfig = {
  source: PosePointSource;
  durationMicroseconds: number;
  maximumGapMicroseconds: number;
};

export type TrailWindow = {
  startMicroseconds: number;
  endMicroseconds: number;
};

export function buildTrailSegmentsForWindowWithResolver<
  T extends { timestampMicroseconds: number },
>(
  samples: readonly T[],
  window: TrailWindow,
  config: Pick<TrailConfig, 'source' | 'maximumGapMicroseconds'>,
  resolvePoint: (
    sample: T,
    source: PosePointSource,
  ) => { x: number; y: number } | null,
  ageWindow: TrailWindow = window,
): TrailSegment[] {
  const windowLength = Math.max(
    1,
    ageWindow.endMicroseconds - ageWindow.startMicroseconds,
  );
  const segments: TrailSegment[] = [];
  let current: TrailSegment | null = null;
  let previousRawTimestamp: number | null = null;

  for (const sample of samples) {
    if (sample.timestampMicroseconds < window.startMicroseconds) continue;
    if (sample.timestampMicroseconds > window.endMicroseconds) break;

    const timestampDelta =
      previousRawTimestamp === null
        ? null
        : sample.timestampMicroseconds - previousRawTimestamp;
    previousRawTimestamp = sample.timestampMicroseconds;
    if (timestampDelta !== null && timestampDelta <= 0) {
      current = null;
      continue;
    }

    const point = resolvePoint(sample, config.source);
    const hasLargeGap =
      timestampDelta !== null &&
      timestampDelta > config.maximumGapMicroseconds;
    if (!point) {
      current = null;
      continue;
    }

    if (!current || hasLargeGap) {
      current = [];
      segments.push(current);
    }
    current.push({
      x: point.x,
      y: point.y,
      timestampMicroseconds: sample.timestampMicroseconds,
      ageRatio: Math.max(
        0,
        Math.min(
          1,
          (sample.timestampMicroseconds - ageWindow.startMicroseconds) /
            windowLength,
        ),
      ),
    });
  }

  return segments;
}

export function buildTrailSegmentsWithResolver<T extends { timestampMicroseconds: number }>(
  samples: readonly T[],
  presentationTimestampMicroseconds: number,
  config: TrailConfig,
  resolvePoint: (sample: T, source: PosePointSource) => { x: number; y: number } | null,
): TrailSegment[] {
  const windowStart = presentationTimestampMicroseconds - config.durationMicroseconds;
  return buildTrailSegmentsForWindowWithResolver(
    samples,
    {
      startMicroseconds: windowStart,
      endMicroseconds: presentationTimestampMicroseconds,
    },
    config,
    resolvePoint,
  );
}

export function buildTrailSegments(
  samples: readonly RawPoseSample[],
  presentationTimestampMicroseconds: number,
  config: TrailConfig,
): TrailSegment[] {
  return buildTrailSegmentsWithResolver(
    samples,
    presentationTimestampMicroseconds,
    config,
    resolvePosePoint,
  );
}

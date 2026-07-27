export type PresentationTimed = {
  timestampMicroseconds: number;
};

export const DEFAULT_ESTIMATED_FRAME_RATE = 30;

export type ReviewFrameStepTarget = {
  kind: 'analyzed' | 'estimated';
  timestampMicroseconds: number;
  frameIndex: number | null;
};

export function normalizeEstimatedFrameRate(
  averageFrameRate: number | null | undefined,
): number {
  return typeof averageFrameRate === 'number' &&
    Number.isFinite(averageFrameRate) &&
    averageFrameRate >= 1 &&
    averageFrameRate <= 240
    ? averageFrameRate
    : DEFAULT_ESTIMATED_FRAME_RATE;
}

export function isWithinPresentationFrameSpan(
  samples: readonly PresentationTimed[],
  targetMicroseconds: number,
  equalityToleranceMicroseconds = 250,
): boolean {
  if (samples.length === 0) return false;
  return (
    targetMicroseconds >=
      samples[0].timestampMicroseconds - equalityToleranceMicroseconds &&
    targetMicroseconds <=
      samples[samples.length - 1].timestampMicroseconds +
        equalityToleranceMicroseconds
  );
}

export function nearestPresentationFrameIndex(
  samples: readonly PresentationTimed[],
  targetMicroseconds: number,
  maximumDistanceMicroseconds = Number.POSITIVE_INFINITY,
): number | null {
  if (samples.length === 0) return null;

  let low = 0;
  let high = samples.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const timestamp = samples[middle].timestampMicroseconds;
    if (timestamp === targetMicroseconds) return middle;
    if (timestamp < targetMicroseconds) low = middle + 1;
    else high = middle - 1;
  }

  const earlierIndex = Math.max(0, high);
  const laterIndex = Math.min(samples.length - 1, low);
  const earlierDistance = Math.abs(
    samples[earlierIndex].timestampMicroseconds - targetMicroseconds,
  );
  const laterDistance = Math.abs(
    samples[laterIndex].timestampMicroseconds - targetMicroseconds,
  );
  const nearestIndex =
    earlierDistance <= laterDistance ? earlierIndex : laterIndex;

  return Math.abs(
    samples[nearestIndex].timestampMicroseconds - targetMicroseconds,
  ) <= maximumDistanceMicroseconds
    ? nearestIndex
    : null;
}

export function adjacentPresentationFrameIndex(
  samples: readonly PresentationTimed[],
  targetMicroseconds: number,
  direction: 'previous' | 'next',
  equalityToleranceMicroseconds = 250,
): number | null {
  if (samples.length === 0) return null;

  if (direction === 'next') {
    const threshold = targetMicroseconds + equalityToleranceMicroseconds;
    let low = 0;
    let high = samples.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (samples[middle].timestampMicroseconds <= threshold) low = middle + 1;
      else high = middle;
    }
    return low < samples.length ? low : null;
  }

  const threshold = targetMicroseconds - equalityToleranceMicroseconds;
  let low = 0;
  let high = samples.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].timestampMicroseconds < threshold) low = middle + 1;
    else high = middle;
  }
  const previousIndex = low - 1;
  return previousIndex >= 0 ? previousIndex : null;
}

export function reviewFrameStepTarget(
  samples: readonly PresentationTimed[],
  targetMicroseconds: number,
  durationMicroseconds: number,
  direction: 'previous' | 'next',
  averageFrameRate?: number | null,
): ReviewFrameStepTarget | null {
  const duration = Math.max(0, Math.round(durationMicroseconds));
  const current = Math.min(duration, Math.max(0, Math.round(targetMicroseconds)));
  const withinAnalyzedSpan = isWithinPresentationFrameSpan(samples, current);

  if (withinAnalyzedSpan) {
    const frameIndex = adjacentPresentationFrameIndex(
      samples,
      current,
      direction,
    );
    if (frameIndex !== null) {
      return {
        kind: 'analyzed',
        timestampMicroseconds: samples[frameIndex].timestampMicroseconds,
        frameIndex,
      };
    }
  }

  const estimatedFrameRate = normalizeEstimatedFrameRate(averageFrameRate);
  const estimatedDelta = Math.max(
    1,
    Math.round(1_000_000 / estimatedFrameRate),
  );
  const estimatedTarget =
    direction === 'previous'
      ? Math.max(0, current - estimatedDelta)
      : Math.min(duration, current + estimatedDelta);

  if (!withinAnalyzedSpan && samples.length > 0) {
    const firstTimestamp = samples[0].timestampMicroseconds;
    const lastIndex = samples.length - 1;
    const lastTimestamp = samples[lastIndex].timestampMicroseconds;
    if (
      direction === 'next' &&
      current < firstTimestamp &&
      estimatedTarget >= firstTimestamp
    ) {
      return {
        kind: 'analyzed',
        timestampMicroseconds: firstTimestamp,
        frameIndex: 0,
      };
    }
    if (
      direction === 'previous' &&
      current > lastTimestamp &&
      estimatedTarget <= lastTimestamp
    ) {
      return {
        kind: 'analyzed',
        timestampMicroseconds: lastTimestamp,
        frameIndex: lastIndex,
      };
    }
  }

  return estimatedTarget === current
    ? null
    : {
        kind: 'estimated',
        timestampMicroseconds: estimatedTarget,
        frameIndex: null,
      };
}

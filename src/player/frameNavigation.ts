export type PresentationTimed = {
  timestampMicroseconds: number;
};

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

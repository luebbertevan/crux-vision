export function nearestByTimestamp<T extends { timestampMicroseconds: number }>(
  samples: readonly T[],
  timestampMicroseconds: number,
  toleranceMicroseconds: number,
): T | null {
  if (samples.length === 0) return null;

  let low = 0;
  let high = samples.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const value = samples[middle].timestampMicroseconds;
    if (value < timestampMicroseconds) low = middle + 1;
    else if (value > timestampMicroseconds) high = middle - 1;
    else return samples[middle];
  }

  const earlier = high >= 0 ? samples[high] : null;
  const later = low < samples.length ? samples[low] : null;
  const nearest =
    earlier && later
      ? timestampMicroseconds - earlier.timestampMicroseconds <=
        later.timestampMicroseconds - timestampMicroseconds
        ? earlier
        : later
      : (earlier ?? later);

  return nearest &&
    Math.abs(nearest.timestampMicroseconds - timestampMicroseconds) <=
      toleranceMicroseconds
    ? nearest
    : null;
}

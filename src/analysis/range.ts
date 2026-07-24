import type { AnalysisRange } from '../types';

export const SECOND_MICROSECONDS = 1_000_000;
export const MIN_RANGE_MICROSECONDS = 500_000;
export const MAX_RANGE_MICROSECONDS = 20_000_000;
export const DEFAULT_RANGE_MICROSECONDS = 10_000_000;
export const DEFAULT_SAMPLE_RATE = 30;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const secondsToMicroseconds = (seconds: number) =>
  Math.round(seconds * SECOND_MICROSECONDS);

export const microsecondsToSeconds = (microseconds: number) =>
  microseconds / SECOND_MICROSECONDS;

export function defaultAnalysisRange(durationMicroseconds: number): AnalysisRange {
  const duration = Math.max(0, Math.round(durationMicroseconds));
  return {
    startMicroseconds: 0,
    endMicroseconds: Math.min(duration, DEFAULT_RANGE_MICROSECONDS),
  };
}

export function normalizeRange(
  range: AnalysisRange,
  durationMicroseconds: number,
  activeEdge: 'start' | 'end' = 'end',
): AnalysisRange {
  const duration = Math.max(0, Math.round(durationMicroseconds));
  if (duration === 0) return { startMicroseconds: 0, endMicroseconds: 0 };

  const minimumLength = Math.min(MIN_RANGE_MICROSECONDS, duration);
  let start = clamp(Math.round(range.startMicroseconds), 0, duration);
  let end = clamp(Math.round(range.endMicroseconds), 0, duration);

  if (activeEdge === 'start') {
    end = clamp(end, minimumLength, duration);
    start = clamp(
      start,
      Math.max(0, end - MAX_RANGE_MICROSECONDS),
      Math.max(0, end - minimumLength),
    );
  } else {
    start = clamp(start, 0, Math.max(0, duration - minimumLength));
    end = clamp(
      end,
      Math.min(duration, start + minimumLength),
      Math.min(duration, start + MAX_RANGE_MICROSECONDS),
    );
  }

  return { startMicroseconds: start, endMicroseconds: end };
}

export function setRangeFromPlayhead(
  range: AnalysisRange,
  edge: 'start' | 'end',
  playheadMicroseconds: number,
  durationMicroseconds: number,
): AnalysisRange {
  const duration = Math.max(0, Math.round(durationMicroseconds));
  const playhead = clamp(Math.round(playheadMicroseconds), 0, duration);
  const minimumLength = Math.min(MIN_RANGE_MICROSECONDS, duration);

  if (edge === 'start') {
    const start = Math.min(playhead, Math.max(0, duration - minimumLength));
    const end =
      range.endMicroseconds >= start + minimumLength
        ? Math.min(range.endMicroseconds, start + MAX_RANGE_MICROSECONDS)
        : Math.min(duration, start + DEFAULT_RANGE_MICROSECONDS);
    return normalizeRange(
      { startMicroseconds: start, endMicroseconds: end },
      duration,
      'start',
    );
  }

  const end = Math.max(playhead, minimumLength);
  const start =
    range.startMicroseconds <= end - minimumLength
      ? Math.max(range.startMicroseconds, end - MAX_RANGE_MICROSECONDS)
      : Math.max(0, end - DEFAULT_RANGE_MICROSECONDS);
  return normalizeRange(
    { startMicroseconds: start, endMicroseconds: end },
    duration,
    'end',
  );
}

export function analysisTimestamps(
  range: AnalysisRange,
  sampleRate = DEFAULT_SAMPLE_RATE,
): number[] {
  if (sampleRate <= 0 || range.endMicroseconds < range.startMicroseconds) return [];
  if (range.endMicroseconds === range.startMicroseconds) {
    return [range.startMicroseconds];
  }

  const interval = SECOND_MICROSECONDS / sampleRate;
  const stepCount = Math.ceil(
    ((range.endMicroseconds - range.startMicroseconds) * sampleRate) /
      SECOND_MICROSECONDS,
  );
  const timestamps: number[] = [];
  for (let step = 0; step < stepCount; step += 1) {
    const timestamp =
      range.startMicroseconds + Math.round(step * interval);
    if (timestamp >= range.endMicroseconds) break;
    if (timestamps.at(-1) !== timestamp) timestamps.push(timestamp);
  }
  if (timestamps.at(-1) !== range.endMicroseconds) {
    timestamps.push(range.endMicroseconds);
  }
  return timestamps;
}

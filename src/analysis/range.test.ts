import { describe, expect, it } from 'vitest';

import {
  analysisTimestamps,
  DEFAULT_SAMPLE_RATE,
  defaultAnalysisRange,
  MAX_RANGE_MICROSECONDS,
  MIN_RANGE_MICROSECONDS,
  normalizeRange,
  setRangeFromPlayhead,
} from './range';

describe('analysis ranges', () => {
  it('defaults to the first ten seconds and respects a shorter source', () => {
    expect(defaultAnalysisRange(45_000_000)).toEqual({
      startMicroseconds: 0,
      endMicroseconds: 10_000_000,
    });
    expect(defaultAnalysisRange(4_200_000).endMicroseconds).toBe(4_200_000);
  });

  it('clamps the active edge without crossing or exceeding the R2A maximum', () => {
    expect(
      normalizeRange(
        { startMicroseconds: 9_900_000, endMicroseconds: 10_000_000 },
        30_000_000,
        'start',
      ),
    ).toEqual({ startMicroseconds: 9_500_000, endMicroseconds: 10_000_000 });

    const normalized = normalizeRange(
      { startMicroseconds: 2_000_000, endMicroseconds: 90_000_000 },
      100_000_000,
      'end',
    );
    expect(normalized.endMicroseconds - normalized.startMicroseconds).toBe(
      MAX_RANGE_MICROSECONDS,
    );
    expect(MAX_RANGE_MICROSECONDS).toBe(60_000_000);
  });

  it('moves the opposite edge when setting a playhead outside the current range', () => {
    const moved = setRangeFromPlayhead(
      { startMicroseconds: 0, endMicroseconds: 10_000_000 },
      'start',
      25_000_000,
      40_000_000,
    );
    expect(moved.startMicroseconds).toBe(25_000_000);
    expect(moved.endMicroseconds).toBeGreaterThanOrEqual(
      moved.startMicroseconds + MIN_RANGE_MICROSECONDS,
    );
  });

  it('builds an inclusive integer-microsecond timestamp schedule', () => {
    expect(
      analysisTimestamps(
        { startMicroseconds: 0, endMicroseconds: 1_000_000 },
        2,
      ),
    ).toEqual([0, 500_000, 1_000_000]);
  });

  it('defaults to 30 requested samples per second', () => {
    expect(
      analysisTimestamps({ startMicroseconds: 0, endMicroseconds: 1_000_000 }),
    ).toHaveLength(DEFAULT_SAMPLE_RATE + 1);
    expect(DEFAULT_SAMPLE_RATE).toBe(30);
  });
});

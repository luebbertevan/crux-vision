import { describe, expect, it } from 'vitest';

import {
  adjacentPresentationFrameIndex,
  isWithinPresentationFrameSpan,
  nearestPresentationFrameIndex,
  normalizeEstimatedFrameRate,
  reviewFrameStepTarget,
} from './frameNavigation';

const samples = [1_000_000, 1_033_366, 1_083_366, 1_100_000].map(
  (timestampMicroseconds) => ({ timestampMicroseconds }),
);

describe('presentation-frame navigation', () => {
  it('finds exact and nearest variable-frame-rate presentation timestamps', () => {
    expect(nearestPresentationFrameIndex(samples, 1_083_366)).toBe(2);
    expect(nearestPresentationFrameIndex(samples, 1_060_000)).toBe(2);
  });

  it('prefers the earlier frame when a playhead is exactly between frames', () => {
    expect(nearestPresentationFrameIndex(samples, 1_016_683)).toBe(0);
  });

  it('returns null outside the permitted presentation-time tolerance', () => {
    expect(
      nearestPresentationFrameIndex(samples, 1_200_000, 25_000),
    ).toBeNull();
  });

  it('steps to strict presentation-time neighbors from an exact frame', () => {
    expect(adjacentPresentationFrameIndex(samples, 1_083_366, 'previous')).toBe(1);
    expect(adjacentPresentationFrameIndex(samples, 1_083_366, 'next')).toBe(3);
  });

  it('steps toward the nearest frame on the requested side between samples', () => {
    expect(adjacentPresentationFrameIndex(samples, 1_060_000, 'previous')).toBe(1);
    expect(adjacentPresentationFrameIndex(samples, 1_060_000, 'next')).toBe(2);
  });

  it('enters and exits an analyzed range without inventing frames', () => {
    expect(adjacentPresentationFrameIndex(samples, 0, 'next')).toBe(0);
    expect(adjacentPresentationFrameIndex(samples, 2_000_000, 'previous')).toBe(3);
    expect(adjacentPresentationFrameIndex(samples, 0, 'previous')).toBeNull();
    expect(adjacentPresentationFrameIndex(samples, 2_000_000, 'next')).toBeNull();
  });

  it('uses exact timestamps within analyzed coverage', () => {
    expect(isWithinPresentationFrameSpan(samples, 1_060_000)).toBe(true);
    expect(
      reviewFrameStepTarget(
        samples,
        1_060_000,
        3_000_000,
        'next',
        60,
      ),
    ).toEqual({
      kind: 'analyzed',
      timestampMicroseconds: 1_083_366,
      frameIndex: 2,
    });
  });

  it('estimates source-rate frame steps before analysis and outside coverage', () => {
    expect(
      reviewFrameStepTarget([], 0, 3_000_000, 'next', 25),
    ).toEqual({
      kind: 'estimated',
      timestampMicroseconds: 40_000,
      frameIndex: null,
    });
    expect(
      reviewFrameStepTarget(
        samples,
        2_000_000,
        3_000_000,
        'next',
        50,
      ),
    ).toEqual({
      kind: 'estimated',
      timestampMicroseconds: 2_020_000,
      frameIndex: null,
    });
  });

  it('snaps onto the analyzed boundary when a proxy step crosses it', () => {
    expect(
      reviewFrameStepTarget(
        samples,
        980_000,
        3_000_000,
        'next',
        30,
      ),
    ).toEqual({
      kind: 'analyzed',
      timestampMicroseconds: 1_000_000,
      frameIndex: 0,
    });
    expect(
      reviewFrameStepTarget(
        samples,
        1_120_000,
        3_000_000,
        'previous',
        30,
      ),
    ).toEqual({
      kind: 'analyzed',
      timestampMicroseconds: 1_100_000,
      frameIndex: 3,
    });
  });

  it('falls back to 30 fps for missing or implausible source rates', () => {
    expect(normalizeEstimatedFrameRate(null)).toBe(30);
    expect(normalizeEstimatedFrameRate(0)).toBe(30);
    expect(normalizeEstimatedFrameRate(500)).toBe(30);
    expect(normalizeEstimatedFrameRate(59.94)).toBe(59.94);
  });
});

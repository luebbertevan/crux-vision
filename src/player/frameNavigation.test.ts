import { describe, expect, it } from 'vitest';

import {
  adjacentPresentationFrameIndex,
  nearestPresentationFrameIndex,
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
});

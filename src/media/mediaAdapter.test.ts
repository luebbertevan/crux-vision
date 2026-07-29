import { describe, expect, it } from 'vitest';

import { mediaFrameLookupSeconds } from './mediaAdapter';

describe('media frame lookup timestamps', () => {
  it('crosses fractional-microsecond source-frame boundaries without duplicating the prior frame', () => {
    const sourceFrameTimestampsSeconds = [
      15.248333333,
      15.283333333,
      15.316666667,
    ];
    const lookupSeconds = mediaFrameLookupSeconds(15_283_333, 28_563_333);
    const selectedFrame = sourceFrameTimestampsSeconds
      .filter((timestamp) => timestamp <= lookupSeconds)
      .at(-1);

    expect(lookupSeconds).toBe(15.283334);
    expect(selectedFrame).toBe(15.283333333);
  });

  it('does not move a lookup beyond the source duration', () => {
    expect(mediaFrameLookupSeconds(28_563_333, 28_563_333)).toBe(28.563333);
  });
});

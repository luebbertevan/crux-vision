import { describe, expect, it } from 'vitest';

import { computeContainTransform, mapNormalizedPoint } from './displayTransform';

describe('display transforms', () => {
  it('centers portrait video in a landscape stage', () => {
    const transform = computeContainTransform(796, 478, 1080, 1920);
    expect(transform.contentRect.width).toBeCloseTo(268.875);
    expect(transform.contentRect.height).toBe(478);
    expect(transform.contentRect.x).toBeCloseTo(263.5625);
  });

  it('centers landscape video in a portrait stage', () => {
    const transform = computeContainTransform(300, 600, 1920, 1080);
    expect(transform.contentRect.height).toBeCloseTo(168.75);
    expect(transform.contentRect.y).toBeCloseTo(215.625);
  });

  it('maps normalized corners and center through the same content rectangle', () => {
    const transform = computeContainTransform(400, 400, 200, 100);
    expect(mapNormalizedPoint(transform, { x: 0, y: 0 })).toEqual({ x: 0, y: 100 });
    expect(mapNormalizedPoint(transform, { x: 0.5, y: 0.5 })).toEqual({ x: 200, y: 200 });
    expect(mapNormalizedPoint(transform, { x: 1, y: 1 })).toEqual({ x: 400, y: 300 });
  });
});

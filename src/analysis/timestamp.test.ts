import { describe, expect, it } from 'vitest';

import { nearestByTimestamp } from './timestamp';

const sample = (timestampMicroseconds: number) => ({ timestampMicroseconds });

describe('nearestByTimestamp', () => {
  const samples = [sample(0), sample(70_000), sample(145_000), sample(250_000)];

  it('uses actual presentation timestamps and prefers the earlier sample on a tie', () => {
    expect(nearestByTimestamp(samples, 107_500, 50_000)?.timestampMicroseconds).toBe(70_000);
    expect(nearestByTimestamp(samples, 210_000, 50_000)?.timestampMicroseconds).toBe(250_000);
  });

  it('honors the tolerance boundary and does not hold stale pose', () => {
    expect(nearestByTimestamp(samples, 300_000, 50_000)?.timestampMicroseconds).toBe(250_000);
    expect(nearestByTimestamp(samples, 300_001, 50_000)).toBeNull();
    expect(nearestByTimestamp(samples, 900_000, 50_000)).toBeNull();
  });
});

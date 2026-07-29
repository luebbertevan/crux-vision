import { describe, expect, it } from 'vitest';

import { createMediaPipeWorkerCanvas } from './workerCanvasCompatibility';

describe('MediaPipe worker canvas compatibility', () => {
  it('constructs an explicit one-pixel OffscreenCanvas', () => {
    class FakeOffscreenCanvas {
      constructor(
        readonly width: number,
        readonly height: number,
      ) {}
    }

    const canvas = createMediaPipeWorkerCanvas({
      OffscreenCanvas: FakeOffscreenCanvas,
    });

    expect(canvas).toBeInstanceOf(FakeOffscreenCanvas);
    expect(canvas.width).toBe(1);
    expect(canvas.height).toBe(1);
  });

  it('fails clearly when worker canvas support is unavailable', () => {
    expect(() => createMediaPipeWorkerCanvas({})).toThrow(
      'This browser does not support OffscreenCanvas pose analysis.',
    );
  });

  it('creates a fresh canvas for each delegate initialization attempt', () => {
    class FakeOffscreenCanvas {
      constructor(
        readonly width: number,
        readonly height: number,
      ) {}
    }
    const globals = { OffscreenCanvas: FakeOffscreenCanvas };

    expect(createMediaPipeWorkerCanvas(globals)).not.toBe(
      createMediaPipeWorkerCanvas(globals),
    );
  });
});

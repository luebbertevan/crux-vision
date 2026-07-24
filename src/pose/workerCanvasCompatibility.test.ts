import { describe, expect, it } from 'vitest';

import { preferOffscreenCanvasInDocumentlessWorker } from './workerCanvasCompatibility';

describe('MediaPipe worker canvas compatibility', () => {
  it('forces the OffscreenCanvas path in a documentless WebKit-like worker', () => {
    const globals = {
      HTMLCanvasElement: class HTMLCanvasElement {},
      OffscreenCanvas: class OffscreenCanvas {},
    };

    expect(preferOffscreenCanvasInDocumentlessWorker(globals)).toBe(true);
    expect(globals.HTMLCanvasElement).toBeUndefined();
  });

  it('does not alter a page environment with a document', () => {
    const htmlCanvasElement = class HTMLCanvasElement {};
    const globals = {
      document: {},
      HTMLCanvasElement: htmlCanvasElement,
      OffscreenCanvas: class OffscreenCanvas {},
    };

    expect(preferOffscreenCanvasInDocumentlessWorker(globals)).toBe(false);
    expect(globals.HTMLCanvasElement).toBe(htmlCanvasElement);
  });

  it('does not hide HTMLCanvasElement without an OffscreenCanvas fallback', () => {
    const htmlCanvasElement = class HTMLCanvasElement {};
    const globals = { HTMLCanvasElement: htmlCanvasElement };

    expect(preferOffscreenCanvasInDocumentlessWorker(globals)).toBe(false);
    expect(globals.HTMLCanvasElement).toBe(htmlCanvasElement);
  });
});

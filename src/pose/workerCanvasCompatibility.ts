type WorkerCanvasGlobals = {
  document?: unknown;
  HTMLCanvasElement?: unknown;
  OffscreenCanvas?: unknown;
};

/**
 * MediaPipe's generated canvas bridge chooses its worker-safe OffscreenCanvas
 * path only when HTMLCanvasElement is absent. Some WebKit workers expose the
 * interface without exposing document, which selects an unusable DOM path.
 */
export function preferOffscreenCanvasInDocumentlessWorker(
  globals: WorkerCanvasGlobals,
): boolean {
  if (
    globals.document !== undefined ||
    typeof globals.OffscreenCanvas !== 'function' ||
    globals.HTMLCanvasElement === undefined
  ) {
    return false;
  }

  try {
    Object.defineProperty(globals, 'HTMLCanvasElement', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  } catch {
    try {
      globals.HTMLCanvasElement = undefined;
    } catch {
      return false;
    }
  }

  return globals.HTMLCanvasElement === undefined;
}

import { PHONE_DIAGNOSTIC_REVISION } from '../diagnosticVersion';

type DiagnosticError = Error & {
  cause?: unknown;
  workerDiagnostics?: unknown;
};

const globalType = (name: string) =>
  typeof (globalThis as unknown as Record<string, unknown>)[name];

const errorChain = (error: unknown) => {
  const errors: Array<Record<string, unknown>> = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      const diagnosticError = current as DiagnosticError;
      errors.push({
        name: current.name,
        message: current.message,
        stack: current.stack ?? null,
        workerDiagnostics: diagnosticError.workerDiagnostics ?? null,
      });
      current = diagnosticError.cause;
    } else {
      errors.push({ value: String(current) });
      break;
    }
  }

  return errors;
};

export function createAnalysisDiagnostics(error: unknown): string {
  const navigatorValue =
    typeof navigator === 'undefined' ? null : navigator;
  const locationValue =
    typeof location === 'undefined' ? null : location;

  return JSON.stringify(
    {
      diagnosticRevision: PHONE_DIAGNOSTIC_REVISION,
      generatedAt: new Date().toISOString(),
      page: {
        url: locationValue?.href ?? null,
        userAgent: navigatorValue?.userAgent ?? null,
        platform: navigatorValue?.platform ?? null,
        language: navigatorValue?.language ?? null,
        isSecureContext:
          typeof isSecureContext === 'boolean' ? isSecureContext : null,
        crossOriginIsolated:
          typeof crossOriginIsolated === 'boolean' ? crossOriginIsolated : null,
        globals: {
          Worker: globalType('Worker'),
          OffscreenCanvas: globalType('OffscreenCanvas'),
          HTMLCanvasElement: globalType('HTMLCanvasElement'),
          createImageBitmap: globalType('createImageBitmap'),
          VideoFrame: globalType('VideoFrame'),
          WebAssembly: globalType('WebAssembly'),
        },
      },
      errors: errorChain(error),
    },
    null,
    2,
  );
}

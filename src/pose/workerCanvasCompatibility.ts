type OffscreenCanvasConstructor<TCanvas> = new (
  width: number,
  height: number,
) => TCanvas;

type WorkerCanvasGlobals<TCanvas> = {
  OffscreenCanvas?: OffscreenCanvasConstructor<TCanvas>;
};

/**
 * Always give MediaPipe an explicit worker-owned canvas. Its internal browser
 * detection mistakes Chrome on iOS (`CriOS`) for old Safari and otherwise
 * attempts `document.createElement()` inside a documentless worker.
 */
export function createMediaPipeWorkerCanvas<TCanvas>(
  globals: WorkerCanvasGlobals<TCanvas>,
): TCanvas {
  if (typeof globals.OffscreenCanvas !== 'function') {
    throw new Error('This browser does not support OffscreenCanvas pose analysis.');
  }

  return new globals.OffscreenCanvas(1, 1);
}

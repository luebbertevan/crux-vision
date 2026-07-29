import type { BrowserMediaAdapter } from '../media/mediaAdapter';
import { DEFAULT_POSE_MODEL } from '../pose/modelCatalog';
import { MediaPipeWorkerClient } from '../pose/mediapipeClient';
import type {
  AnalysisRange,
  Delegate,
  PoseModelId,
  RawPoseSample,
} from '../types';
import { analysisTimestamps, DEFAULT_SAMPLE_RATE } from './range';

export type AnalysisAttempt = {
  requestedTimestampMicroseconds: number;
  sample: RawPoseSample | null;
  completed: number;
  total: number;
};

export type PoseAnalysisOptions = {
  adapter: BrowserMediaAdapter;
  range: AnalysisRange;
  model?: PoseModelId;
  completedRequestMicroseconds?: readonly number[];
  existingSamples?: readonly RawPoseSample[];
  onDelegate: (delegate: Delegate) => void;
  onAttempt: (attempt: AnalysisAttempt) => void;
};

const throwIfAborted = (signal: AbortSignal) => {
  if (signal.aborted) {
    throw signal.reason ?? new DOMException('Pose analysis was cancelled.', 'AbortError');
  }
};

export class PoseAnalysisController {
  private readonly abortController = new AbortController();
  private worker: MediaPipeWorkerClient | null = null;

  async run(options: PoseAnalysisOptions): Promise<void> {
    const signal = this.abortController.signal;
    const model = options.model ?? DEFAULT_POSE_MODEL;
    const schedule = analysisTimestamps(options.range, DEFAULT_SAMPLE_RATE);
    const completedRequests = new Set(options.completedRequestMicroseconds ?? []);
    const remaining = schedule.filter((timestamp) => !completedRequests.has(timestamp));
    const seenPresentationTimestamps = new Set(
      (options.existingSamples ?? []).map((sample) => sample.timestampMicroseconds),
    );
    let completed = completedRequests.size;

    this.worker = new MediaPipeWorkerClient();
    let delegate: Delegate = 'GPU';
    try {
      try {
        await this.worker.initialize(model, delegate);
      } catch (gpuError) {
        throwIfAborted(signal);
        // MediaPipe's loader and WebGL state are worker-global. A failed GPU
        // initialization can leave ModuleFactory or its canvas unusable, so
        // retry CPU in a fresh worker instead of reusing contaminated state.
        this.worker.terminate(
          gpuError instanceof Error ? gpuError : new Error(String(gpuError)),
        );
        this.worker = new MediaPipeWorkerClient();
        delegate = 'CPU';
        try {
          await this.worker.initialize(model, delegate);
        } catch (cpuError) {
          if (cpuError instanceof Error && gpuError instanceof Error) {
            (cpuError as Error & { cause?: unknown }).cause = gpuError;
          }
          throw cpuError;
        }
      }
      options.onDelegate(delegate);

      for await (const frame of options.adapter.framesAt(remaining, signal)) {
        throwIfAborted(signal);
        let sample: RawPoseSample | null = null;

        if (
          frame.canvas &&
          frame.timestampMicroseconds !== null &&
          !seenPresentationTimestamps.has(frame.timestampMicroseconds)
        ) {
          const bitmap = await createImageBitmap(frame.canvas);
          let transferred = false;
          try {
            throwIfAborted(signal);
            const resultPromise = this.worker.analyze(bitmap, frame.timestampMicroseconds);
            transferred = true;
            const result = await resultPromise;
            throwIfAborted(signal);
            seenPresentationTimestamps.add(result.timestampMicroseconds);
            sample = {
              requestedTimestampMicroseconds: frame.requestedTimestampMicroseconds,
              timestampMicroseconds: result.timestampMicroseconds,
              model,
              delegate,
              landmarks: result.landmarks,
              worldLandmarks: result.worldLandmarks,
              inferenceMilliseconds: result.inferenceMilliseconds,
            };
          } finally {
            if (!transferred) bitmap.close();
          }
        }

        completed += 1;
        completedRequests.add(frame.requestedTimestampMicroseconds);
        options.onAttempt({
          requestedTimestampMicroseconds: frame.requestedTimestampMicroseconds,
          sample,
          completed,
          total: schedule.length,
        });
      }

      throwIfAborted(signal);
      await this.worker.dispose();
      this.worker = null;
    } catch (error) {
      this.worker?.terminate(error instanceof Error ? error : new Error(String(error)));
      this.worker = null;
      throw error;
    }
  }

  cancel(): void {
    if (!this.abortController.signal.aborted) {
      this.abortController.abort(
        new DOMException('Pose analysis was cancelled.', 'AbortError'),
      );
    }
    this.worker?.terminate();
    this.worker = null;
  }
}

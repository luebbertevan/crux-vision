import type { Delegate, PoseLandmark, PoseModelId } from '../types';
import { MEDIAPIPE_WASM_ROOT, POSE_MODELS } from './modelCatalog';
import type { PoseWorkerRequest, PoseWorkerResponse } from './workerProtocol';

type PendingRequest = {
  resolve: (response: PoseWorkerResponse) => void;
  reject: (error: Error) => void;
};

type RequestWithoutId = PoseWorkerRequest extends infer Request
  ? Request extends { requestId: number }
    ? Omit<Request, 'requestId'>
    : never
  : never;

export type WorkerPoseResult = {
  timestampMicroseconds: number;
  landmarks: PoseLandmark[];
  worldLandmarks: PoseLandmark[];
  inferenceMilliseconds: number;
};

export class MediaPipeWorkerClient {
  private readonly worker = new Worker(new URL('./mediapipe.worker.ts', import.meta.url), {
    type: 'module',
  });
  private readonly pending = new Map<number, PendingRequest>();
  private nextRequestId = 1;
  private terminated = false;

  constructor() {
    this.worker.onmessage = (event: MessageEvent<PoseWorkerResponse>) => {
      const response = event.data;
      const pending = this.pending.get(response.requestId);
      if (!pending) return;

      this.pending.delete(response.requestId);
      if (response.type === 'error') pending.reject(new Error(response.message));
      else pending.resolve(response);
    };

    this.worker.onerror = (event) => {
      this.terminate(new Error(event.message || 'Pose worker failed.'));
    };
  }

  async initialize(model: PoseModelId, delegate: Delegate): Promise<number> {
    const response = await this.send({
      type: 'initialize',
      model,
      delegate,
      modelUrl: POSE_MODELS[model].url,
      wasmRoot: MEDIAPIPE_WASM_ROOT,
    });
    if (response.type !== 'initialized') {
      throw new Error(`Unexpected worker response: ${response.type}`);
    }
    return response.loadMilliseconds;
  }

  async analyze(frame: ImageBitmap, timestampMicroseconds: number): Promise<WorkerPoseResult> {
    const response = await this.send(
      { type: 'analyze', frame, timestampMicroseconds },
      [frame],
    );
    if (response.type !== 'result') {
      throw new Error(`Unexpected worker response: ${response.type}`);
    }
    return {
      timestampMicroseconds: response.timestampMicroseconds,
      landmarks: response.landmarks,
      worldLandmarks: response.worldLandmarks,
      inferenceMilliseconds: response.inferenceMilliseconds,
    };
  }

  async dispose(): Promise<void> {
    if (this.terminated) return;
    try {
      await this.send({ type: 'dispose' });
    } finally {
      this.terminate();
    }
  }

  terminate(reason: Error = new DOMException('Pose analysis was cancelled.', 'AbortError')): void {
    if (this.terminated) return;
    this.terminated = true;
    this.worker.terminate();
    for (const pending of this.pending.values()) pending.reject(reason);
    this.pending.clear();
  }

  private send(
    request: RequestWithoutId,
    transfer: Transferable[] = [],
  ): Promise<PoseWorkerResponse> {
    if (this.terminated) {
      return Promise.reject(new DOMException('Pose worker is closed.', 'AbortError'));
    }
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      try {
        this.worker.postMessage({ ...request, requestId } as PoseWorkerRequest, transfer);
      } catch (error) {
        this.pending.delete(requestId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}

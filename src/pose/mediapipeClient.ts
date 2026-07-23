import type { Delegate, PoseModelId, TimedPose } from '../types';
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

export class MediaPipeWorkerClient {
  private readonly worker = new Worker(new URL('./mediapipe.worker.ts', import.meta.url), {
    type: 'module',
  });
  private readonly pending = new Map<number, PendingRequest>();
  private nextRequestId = 1;

  constructor() {
    this.worker.onmessage = (event: MessageEvent<PoseWorkerResponse>) => {
      const response = event.data;
      const pending = this.pending.get(response.requestId);
      if (!pending) return;

      this.pending.delete(response.requestId);
      if (response.type === 'error') {
        pending.reject(new Error(response.message));
      } else {
        pending.resolve(response);
      }
    };

    this.worker.onerror = (event) => {
      const error = new Error(event.message || 'Pose worker failed.');
      for (const pending of this.pending.values()) {
        pending.reject(error);
      }
      this.pending.clear();
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

  async analyze(frame: ImageBitmap, timestampSeconds: number): Promise<TimedPose> {
    const timestampMicroseconds = Math.round(timestampSeconds * 1_000_000);
    const response = await this.send(
      {
        type: 'analyze',
        frame,
        timestampMicroseconds,
      },
      [frame],
    );
    if (response.type !== 'result') {
      throw new Error(`Unexpected worker response: ${response.type}`);
    }

    return {
      timestampMicroseconds: response.timestampMicroseconds,
      sourceTimestampSeconds: response.timestampMicroseconds / 1_000_000,
      landmarks: response.landmarks,
      worldLandmarks: response.worldLandmarks,
      inferenceMilliseconds: response.inferenceMilliseconds,
    };
  }

  async dispose(): Promise<void> {
    try {
      await this.send({ type: 'dispose' });
    } finally {
      this.worker.terminate();
    }
  }

  private send(
    request: RequestWithoutId,
    transfer: Transferable[] = [],
  ): Promise<PoseWorkerResponse> {
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({ ...request, requestId } as PoseWorkerRequest, transfer);
    });
  }
}

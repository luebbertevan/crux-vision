import type { Delegate, PoseLandmark, PoseModelId } from '../types';

export type PoseWorkerDiagnostics = {
  phase: PoseWorkerRequest['type'];
  delegate: Delegate | null;
  userAgent: string | null;
  isSecureContext: boolean;
  crossOriginIsolated: boolean;
  canvasStrategy: 'explicit-offscreen';
  canvasSize: { width: number; height: number } | null;
  canvasGlobalsBefore: Record<string, string>;
  canvasGlobalsAfter: Record<string, string>;
};

export type PoseWorkerRequest =
  | {
      type: 'initialize';
      requestId: number;
      model: PoseModelId;
      delegate: Delegate;
      modelUrl: string;
      wasmRoot: string;
    }
  | {
      type: 'analyze';
      requestId: number;
      frame: ImageBitmap;
      timestampMicroseconds: number;
    }
  | { type: 'dispose'; requestId: number };

export type PoseWorkerResponse =
  | {
      type: 'initialized';
      requestId: number;
      loadMilliseconds: number;
    }
  | {
      type: 'result';
      requestId: number;
      timestampMicroseconds: number;
      landmarks: PoseLandmark[];
      worldLandmarks: PoseLandmark[];
      inferenceMilliseconds: number;
    }
  | { type: 'disposed'; requestId: number }
  | {
      type: 'error';
      requestId: number;
      message: string;
      stack?: string;
      diagnostics: PoseWorkerDiagnostics;
    };

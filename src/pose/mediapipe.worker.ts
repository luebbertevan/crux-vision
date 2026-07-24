/// <reference lib="webworker" />

import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

import type { PoseLandmark } from '../types';
import type { PoseWorkerRequest, PoseWorkerResponse } from './workerProtocol';
import { preferOffscreenCanvasInDocumentlessWorker } from './workerCanvasCompatibility';

const workerScope: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;
const canvasGlobals = () => ({
  document: typeof (globalThis as { document?: unknown }).document,
  HTMLCanvasElement: typeof (globalThis as { HTMLCanvasElement?: unknown }).HTMLCanvasElement,
  OffscreenCanvas: typeof (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas,
  WebGLRenderingContext: typeof (
    globalThis as { WebGLRenderingContext?: unknown }
  ).WebGLRenderingContext,
  WebGL2RenderingContext: typeof (
    globalThis as { WebGL2RenderingContext?: unknown }
  ).WebGL2RenderingContext,
});
const canvasGlobalsBefore = canvasGlobals();
const canvasCompatibilityApplied = preferOffscreenCanvasInDocumentlessWorker(
  globalThis as typeof globalThis & {
    document?: unknown;
    HTMLCanvasElement?: unknown;
    OffscreenCanvas?: unknown;
  },
);
const canvasGlobalsAfter = canvasGlobals();
let landmarker: PoseLandmarker | null = null;

const copyLandmarks = (
  landmarks: Array<{
    x: number;
    y: number;
    z: number;
    visibility?: number;
    presence?: number;
  }>,
): PoseLandmark[] =>
  landmarks.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility ?? 0,
    presence: landmark.presence ?? null,
  }));

const respond = (response: PoseWorkerResponse): void => {
  workerScope.postMessage(response);
};

workerScope.onmessage = async (event: MessageEvent<PoseWorkerRequest>) => {
  const request = event.data;

  try {
    if (request.type === 'initialize') {
      landmarker?.close();
      landmarker = null;

      const startedAt = performance.now();
      // Module workers cannot execute MediaPipe's classic importScripts loader.
      // The second argument selects its ESM loader, which installs ModuleFactory
      // on globalThis before task construction.
      const vision = await FilesetResolver.forVisionTasks(request.wasmRoot, true);
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: request.modelUrl,
          delegate: request.delegate,
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      });

      respond({
        type: 'initialized',
        requestId: request.requestId,
        loadMilliseconds: performance.now() - startedAt,
      });
      return;
    }

    if (request.type === 'analyze') {
      try {
        if (!landmarker) {
          throw new Error('Pose worker has not been initialized.');
        }

        const startedAt = performance.now();
        const result = landmarker.detectForVideo(
          request.frame,
          request.timestampMicroseconds / 1_000,
        );
        respond({
          type: 'result',
          requestId: request.requestId,
          timestampMicroseconds: request.timestampMicroseconds,
          landmarks: copyLandmarks(result.landmarks[0] ?? []),
          worldLandmarks: copyLandmarks(result.worldLandmarks[0] ?? []),
          inferenceMilliseconds: performance.now() - startedAt,
        });
      } finally {
        request.frame.close();
      }
      return;
    }

    landmarker?.close();
    landmarker = null;
    respond({ type: 'disposed', requestId: request.requestId });
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    const diagnostics = {
      phase: request.type,
      delegate: request.type === 'initialize' ? request.delegate : null,
      userAgent: workerScope.navigator?.userAgent ?? null,
      isSecureContext: workerScope.isSecureContext,
      crossOriginIsolated: workerScope.crossOriginIsolated,
      canvasCompatibilityApplied,
      canvasGlobalsBefore,
      canvasGlobalsAfter,
    };
    console.error('Crux pose worker failure', {
      message: normalized.message,
      stack: normalized.stack,
      diagnostics,
    });
    respond({
      type: 'error',
      requestId: request.requestId,
      message: normalized.message,
      stack: normalized.stack,
      diagnostics,
    });
  }
};

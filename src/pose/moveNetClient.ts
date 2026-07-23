import { SINGLEPOSE_LIGHTNING } from '@tensorflow-models/pose-detection/dist/movenet/constants.js';
import { load as loadMoveNet } from '@tensorflow-models/pose-detection/dist/movenet/detector.js';
import type { PoseDetector } from '@tensorflow-models/pose-detection/dist/pose_detector.js';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

import type { PoseLandmark, TimedPose } from '../types';

const COCO_TO_MEDIAPIPE = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const missingLandmark = (): PoseLandmark => ({ x: 0, y: 0, z: 0, visibility: 0 });

export class MoveNetClient {
  private detector: PoseDetector | null = null;

  async initialize(): Promise<number> {
    const startedAt = performance.now();
    await tf.setBackend('webgl');
    await tf.ready();
    this.detector = await loadMoveNet({
      modelType: SINGLEPOSE_LIGHTNING,
      enableSmoothing: false,
    });
    return performance.now() - startedAt;
  }

  async analyze(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    timestampSeconds: number,
  ): Promise<TimedPose> {
    if (!this.detector) throw new Error('MoveNet has not been initialized.');

    const startedAt = performance.now();
    const detected = await this.detector.estimatePoses(
      canvas as HTMLCanvasElement,
      { flipHorizontal: false, maxPoses: 1 },
      Math.round(timestampSeconds * 1_000),
    );
    const inferenceMilliseconds = performance.now() - startedAt;
    const pose = detected[0];
    const width = canvas.width;
    const height = canvas.height;
    const landmarks: PoseLandmark[] = pose
      ? Array.from({ length: 33 }, missingLandmark)
      : [];
    for (const [index, keypoint] of (pose?.keypoints ?? []).entries()) {
      const mediaPipeIndex = COCO_TO_MEDIAPIPE[index];
      if (mediaPipeIndex === undefined) continue;
      landmarks[mediaPipeIndex] = {
        x: keypoint.x / width,
        y: keypoint.y / height,
        z: 0,
        visibility: keypoint.score ?? 0,
      };
    }

    return {
      timestampMicroseconds: Math.round(timestampSeconds * 1_000_000),
      sourceTimestampSeconds: timestampSeconds,
      landmarks,
      worldLandmarks: [],
      inferenceMilliseconds,
    };
  }

  dispose(): void {
    this.detector?.dispose();
    this.detector = null;
  }
}

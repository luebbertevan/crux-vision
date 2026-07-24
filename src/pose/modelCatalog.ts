import type { PoseModelId } from '../types';

const MODEL_ROOT = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker';

export const MEDIAPIPE_WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';

export const POSE_MODELS: Record<PoseModelId, { label: string; url: string }> = {
  lite: {
    label: 'MediaPipe Lite',
    url: `${MODEL_ROOT}/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
  },
  full: {
    label: 'MediaPipe Full',
    url: `${MODEL_ROOT}/pose_landmarker_full/float16/1/pose_landmarker_full.task`,
  },
};

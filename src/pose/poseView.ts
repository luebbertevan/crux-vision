import type { PoseLandmark, RawPoseSample } from '../types';

export const DEFAULT_VISIBILITY_THRESHOLD = 0.5;
export const DEFAULT_PRESENCE_THRESHOLD = 0.5;

export const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [15, 17],
  [15, 19],
  [15, 21],
  [17, 19],
  [12, 14],
  [14, 16],
  [16, 18],
  [16, 20],
  [16, 22],
  [18, 20],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [27, 29],
  [29, 31],
  [27, 31],
  [24, 26],
  [26, 28],
  [28, 30],
  [30, 32],
  [28, 32],
];

export function isLandmarkAccepted(
  landmark: PoseLandmark | undefined,
  visibilityThreshold = DEFAULT_VISIBILITY_THRESHOLD,
  presenceThreshold = DEFAULT_PRESENCE_THRESHOLD,
): landmark is PoseLandmark {
  return Boolean(
    landmark &&
      Number.isFinite(landmark.x) &&
      Number.isFinite(landmark.y) &&
      landmark.x >= 0 &&
      landmark.x <= 1 &&
      landmark.y >= 0 &&
      landmark.y <= 1 &&
      landmark.visibility >= visibilityThreshold &&
      (landmark.presence === null || landmark.presence >= presenceThreshold),
  );
}

export type SkeletonSegment = {
  start: PoseLandmark;
  end: PoseLandmark;
  startIndex: number;
  endIndex: number;
};

export function buildSkeletonSegments(sample: RawPoseSample | null): SkeletonSegment[] {
  if (!sample) return [];
  const segments: SkeletonSegment[] = [];
  for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
    const start = sample.landmarks[startIndex];
    const end = sample.landmarks[endIndex];
    if (!isLandmarkAccepted(start) || !isLandmarkAccepted(end)) continue;
    segments.push({ start, end, startIndex, endIndex });
  }
  return segments;
}

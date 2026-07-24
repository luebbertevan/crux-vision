import type { PoseLandmark, RawPoseSample } from '../types';

export const DEFAULT_VISIBILITY_THRESHOLD = 0.5;
export const DEFAULT_PRESENCE_THRESHOLD = 0.5;

export type PosePointSource =
  | { kind: 'landmark'; landmarkIndex: number }
  | {
      kind: 'midpoint';
      firstLandmarkIndex: number;
      secondLandmarkIndex: number;
    };

export type PosePointProvenance = {
  kind: PosePointSource['kind'];
  sourceLandmarkIndices: number[];
  derivedVersion: 'direct-v1' | 'midpoint-v1';
};

export type ResolvedPosePoint = {
  point: PoseLandmark;
  provenance: PosePointProvenance;
};

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

export const PRODUCT_POSE_LANDMARK_INDICES: readonly number[] = [
  0,
  ...new Set(POSE_CONNECTIONS.flat()),
].sort((first, second) => first - second);

const PRODUCT_POSE_LANDMARK_INDEX_SET = new Set(
  PRODUCT_POSE_LANDMARK_INDICES,
);

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
  startIndex: number | 'shoulder-midpoint';
  endIndex: number | 'shoulder-midpoint';
};

export function resolvePosePointFromGetter(
  getLandmark: (landmarkIndex: number) => PoseLandmark | null | undefined,
  source: PosePointSource,
): ResolvedPosePoint | null {
  if (source.kind === 'landmark') {
    const point = getLandmark(source.landmarkIndex);
    return point
      ? {
          point,
          provenance: {
            kind: 'landmark',
            sourceLandmarkIndices: [source.landmarkIndex],
            derivedVersion: 'direct-v1',
          },
        }
      : null;
  }

  const first = getLandmark(source.firstLandmarkIndex);
  const second = getLandmark(source.secondLandmarkIndex);
  if (!first || !second) return null;
  return {
    point: {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
      z: (first.z + second.z) / 2,
      visibility: Math.min(first.visibility, second.visibility),
      presence:
        first.presence === null && second.presence === null
          ? null
          : Math.min(first.presence ?? 1, second.presence ?? 1),
    },
    provenance: {
      kind: 'midpoint',
      sourceLandmarkIndices: [
        source.firstLandmarkIndex,
        source.secondLandmarkIndex,
      ],
      derivedVersion: 'midpoint-v1',
    },
  };
}

export function resolvePosePointWithProvenance(
  sample: RawPoseSample | null,
  source: PosePointSource,
): ResolvedPosePoint | null {
  if (!sample) return null;
  return resolvePosePointFromGetter((landmarkIndex) => {
    const landmark = sample.landmarks[landmarkIndex];
    return isLandmarkAccepted(landmark) ? landmark : null;
  }, source);
}

export function resolvePosePoint(
  sample: RawPoseSample | null,
  source: PosePointSource,
): PoseLandmark | null {
  return resolvePosePointWithProvenance(sample, source)?.point ?? null;
}

export function isSkeletonLandmarkVisible(
  landmarkIndex: number,
  landmark: PoseLandmark | undefined,
): landmark is PoseLandmark {
  return (
    PRODUCT_POSE_LANDMARK_INDEX_SET.has(landmarkIndex) &&
    isLandmarkAccepted(landmark)
  );
}

export function buildSkeletonSegments(sample: RawPoseSample | null): SkeletonSegment[] {
  if (!sample) return [];
  return buildSkeletonSegmentsFromGetter((landmarkIndex) => {
    const landmark = sample.landmarks[landmarkIndex];
    return isLandmarkAccepted(landmark) ? landmark : null;
  });
}

export function buildSkeletonSegmentsFromGetter(
  getLandmark: (landmarkIndex: number) => PoseLandmark | null | undefined,
): SkeletonSegment[] {
  const segments: SkeletonSegment[] = [];
  for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
    const start = getLandmark(startIndex);
    const end = getLandmark(endIndex);
    if (!start || !end) continue;
    segments.push({ start, end, startIndex, endIndex });
  }

  const nose = getLandmark(0);
  const shoulderMidpoint = resolvePosePointFromGetter(getLandmark, {
    kind: 'midpoint',
    firstLandmarkIndex: 11,
    secondLandmarkIndex: 12,
  })?.point;
  if (nose && shoulderMidpoint) {
    segments.push({
      start: shoulderMidpoint,
      end: nose,
      startIndex: 'shoulder-midpoint',
      endIndex: 0,
    });
  }

  return segments;
}

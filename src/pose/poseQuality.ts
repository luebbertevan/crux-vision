import type { PoseLandmark, RawPoseSample } from '../types';
import { PRODUCT_POSE_LANDMARK_INDICES } from './poseView';

export const POSE_QUALITY_POLICY_VERSION =
  'balanced-v2.1-product-landmarks-2026-07-24';
export const POSE_LANDMARK_COUNT = 33;
export const DEFAULT_CENTERED_SMOOTHING_RADIUS_MICROSECONDS = 66_667;

export type PoseQualityPresetId = 'strict' | 'balanced' | 'permissive';
export type PosePolicyTarget = 'display' | 'analytics';
export type PosePreviewMode =
  | 'raw'
  | 'accepted'
  | 'rejected'
  | 'smoothed'
  | 'centered';
export type BodyGroup =
  | 'head'
  | 'torso'
  | 'shoulders'
  | 'elbows'
  | 'wristsHands'
  | 'hips'
  | 'knees'
  | 'anklesFeet';

export type ConfidenceThresholds = {
  visibility: number;
  presence: number;
};

export type PoseQualityPolicy = {
  id: string;
  label: string;
  version: string;
  global: ConfidenceThresholds;
  bodyGroups: Partial<Record<BodyGroup, ConfidenceThresholds>>;
  joints: Partial<Record<number, ConfidenceThresholds>>;
  hysteresis: {
    enabled: boolean;
    acquireDelta: number;
    keepDelta: number;
  };
  temporal: {
    enabled: boolean;
    maximumSpeedBodyLengthsPerSecond: number;
    maximumAccelerationBodyLengthsPerSecondSquared: number;
    maximumSegmentLengthChangeRatio: number;
    isolatedJumpBodyLengths: number;
    isolatedReturnRatio: number;
  };
  smoothing: {
    enabled: boolean;
    minimumCutoff: number;
    beta: number;
    derivativeCutoff: number;
    maximumGapMicroseconds: number;
  };
};

export type PoseQualityProfile = {
  id: PoseQualityPresetId;
  label: string;
  description: string;
  display: PoseQualityPolicy;
  analytics: PoseQualityPolicy;
};

export const BODY_GROUPS: readonly BodyGroup[] = [
  'head',
  'torso',
  'shoulders',
  'elbows',
  'wristsHands',
  'hips',
  'knees',
  'anklesFeet',
];

export const BODY_GROUP_LABELS: Record<BodyGroup, string> = {
  head: 'Head',
  torso: 'Torso fallback',
  shoulders: 'Shoulders',
  elbows: 'Elbows',
  wristsHands: 'Wrists / hands',
  hips: 'Hips',
  knees: 'Knees',
  anklesFeet: 'Ankles / feet',
};

export const POSE_LANDMARK_NAMES = [
  'Nose',
  'Left eye inner',
  'Left eye',
  'Left eye outer',
  'Right eye inner',
  'Right eye',
  'Right eye outer',
  'Left ear',
  'Right ear',
  'Mouth left',
  'Mouth right',
  'Left shoulder',
  'Right shoulder',
  'Left elbow',
  'Right elbow',
  'Left wrist',
  'Right wrist',
  'Left pinky',
  'Right pinky',
  'Left index',
  'Right index',
  'Left thumb',
  'Right thumb',
  'Left hip',
  'Right hip',
  'Left knee',
  'Right knee',
  'Left ankle',
  'Right ankle',
  'Left heel',
  'Right heel',
  'Left foot index',
  'Right foot index',
] as const;

const LANDMARK_GROUPS: readonly BodyGroup[] = [
  'head',
  'head',
  'head',
  'head',
  'head',
  'head',
  'head',
  'head',
  'head',
  'head',
  'head',
  'shoulders',
  'shoulders',
  'elbows',
  'elbows',
  'wristsHands',
  'wristsHands',
  'wristsHands',
  'wristsHands',
  'wristsHands',
  'wristsHands',
  'wristsHands',
  'wristsHands',
  'hips',
  'hips',
  'knees',
  'knees',
  'anklesFeet',
  'anklesFeet',
  'anklesFeet',
  'anklesFeet',
  'anklesFeet',
  'anklesFeet',
];

const DISTAL_PARENT: Partial<Record<number, number>> = {
  13: 11,
  14: 12,
  15: 13,
  16: 14,
  17: 15,
  18: 16,
  19: 15,
  20: 16,
  21: 15,
  22: 16,
  25: 23,
  26: 24,
  27: 25,
  28: 26,
  29: 27,
  30: 28,
  31: 27,
  32: 28,
};

export type LandmarkRejectionReason =
  | 'missing'
  | 'non-finite'
  | 'out-of-bounds'
  | 'visibility'
  | 'presence'
  | 'isolated-jump'
  | 'velocity'
  | 'acceleration'
  | 'segment-length';

export type PoseLandmarkDecision = {
  landmarkIndex: number;
  bodyGroup: BodyGroup;
  raw: PoseLandmark | null;
  accepted: PoseLandmark | null;
  smoothed: PoseLandmark | null;
  centered: PoseLandmark | null;
  threshold: ConfidenceThresholds;
  status: 'accepted' | 'rejected' | 'missing';
  reasons: LandmarkRejectionReason[];
};

export type QualityPoseSample = {
  requestedTimestampMicroseconds: number;
  timestampMicroseconds: number;
  rawSample: RawPoseSample;
  decisions: Array<PoseLandmarkDecision | null>;
};

export type PoseQualityMetrics = {
  sampleCount: number;
  modelEmptySamples: number;
  totalJointSlots: number;
  structurallyObservedJointSlots: number;
  acceptedJointSlots: number;
  acceptedCoverage: number;
  groupCoverage: Record<BodyGroup, number>;
  confidenceRejectedJointSlots: number;
  temporalRejectedJointSlots: number;
  rejectionCounts: Partial<Record<LandmarkRejectionReason, number>>;
  flickerCount: number;
  reacquisitionCount: number;
  longestJointGapMicroseconds: number;
  longestJointGapLandmarkIndex: number | null;
  longestWholePoseGapMicroseconds: number;
  meanReacquisitionMicroseconds: number;
  meanRequestedTimestampErrorMicroseconds: number;
  meanSmoothingDisplacement: number;
  meanCenteredSmoothingDisplacement: number;
  meanInferenceMilliseconds: number;
  p95InferenceMilliseconds: number;
};

export type PoseQualityEvaluation = {
  policy: PoseQualityPolicy;
  centeredSmoothingRadiusMicroseconds: number;
  samples: QualityPoseSample[];
  metrics: PoseQualityMetrics;
};

export type PoseQualityEvaluationOptions = {
  centeredSmoothingRadiusMicroseconds?: number;
};

export type CalibrationLabel = 'usable' | 'wrong' | 'swapped' | 'unavailable';

export type CalibrationLabelRecord = {
  sessionId: number;
  timestampMicroseconds: number;
  landmarkIndex: number;
  label: CalibrationLabel;
};

export type CalibrationLabelMetrics = {
  total: number;
  usable: number;
  badOrUnavailable: number;
  retainedUsable: number;
  falseVisible: number;
  retainedUsableRate: number | null;
  falseVisibleRate: number | null;
};

const threshold = (visibility: number, presence = visibility): ConfidenceThresholds => ({
  visibility,
  presence,
});

const displayPolicy = (
  id: PoseQualityPresetId,
  label: string,
  global: ConfidenceThresholds,
  groups: Partial<Record<BodyGroup, ConfidenceThresholds>>,
  temporal: PoseQualityPolicy['temporal'],
  smoothing: PoseQualityPolicy['smoothing'],
): PoseQualityPolicy => ({
  id: `${id}-display`,
  label: `${label} display`,
  version: POSE_QUALITY_POLICY_VERSION,
  global,
  bodyGroups: groups,
  joints: {},
  hysteresis: {
    enabled: true,
    acquireDelta: 0.04,
    keepDelta: -0.08,
  },
  temporal,
  smoothing,
});

const analyticsFromDisplay = (
  policy: PoseQualityPolicy,
  visibilityDelta: number,
): PoseQualityPolicy => ({
  ...policy,
  id: policy.id.replace('-display', '-analytics'),
  label: policy.label.replace('display', 'analytics'),
  global: {
    visibility: Math.min(0.95, policy.global.visibility + visibilityDelta),
    presence: Math.min(0.95, policy.global.presence + visibilityDelta),
  },
  bodyGroups: Object.fromEntries(
    Object.entries(policy.bodyGroups).map(([group, value]) => [
      group,
      {
        visibility: Math.min(0.95, value.visibility + visibilityDelta),
        presence: Math.min(0.95, value.presence + visibilityDelta),
      },
    ]),
  ),
  hysteresis: {
    enabled: true,
    acquireDelta: 0.05,
    keepDelta: -0.04,
  },
  temporal: {
    ...policy.temporal,
    maximumSpeedBodyLengthsPerSecond:
      policy.temporal.maximumSpeedBodyLengthsPerSecond * 0.85,
    maximumAccelerationBodyLengthsPerSecondSquared:
      policy.temporal.maximumAccelerationBodyLengthsPerSecondSquared * 0.8,
    maximumSegmentLengthChangeRatio:
      policy.temporal.maximumSegmentLengthChangeRatio * 0.8,
  },
  smoothing: {
    ...policy.smoothing,
    enabled: false,
  },
});

const strictDisplay = displayPolicy(
  'strict',
  'Strict',
  threshold(0.65, 0.6),
  {
    head: threshold(0.7, 0.65),
    torso: threshold(0.7, 0.65),
    shoulders: threshold(0.68, 0.62),
    elbows: threshold(0.65, 0.6),
    wristsHands: threshold(0.7, 0.62),
    hips: threshold(0.7, 0.65),
    knees: threshold(0.65, 0.6),
    anklesFeet: threshold(0.7, 0.62),
  },
  {
    enabled: true,
    maximumSpeedBodyLengthsPerSecond: 20,
    maximumAccelerationBodyLengthsPerSecondSquared: 600,
    maximumSegmentLengthChangeRatio: 0.65,
    isolatedJumpBodyLengths: 0.55,
    isolatedReturnRatio: 0.35,
  },
  {
    enabled: true,
    minimumCutoff: 1.7,
    beta: 8,
    derivativeCutoff: 1,
    maximumGapMicroseconds: 50_000,
  },
);

const balancedDisplay = displayPolicy(
  'balanced',
  'Balanced',
  threshold(0.5, 0.5),
  {
    head: threshold(0.6, 0.55),
    torso: threshold(0.58, 0.55),
    shoulders: threshold(0.55, 0.5),
    elbows: threshold(0.5, 0.5),
    wristsHands: threshold(0.55, 0.5),
    hips: threshold(0.58, 0.55),
    knees: threshold(0.52, 0.5),
    anklesFeet: threshold(0.55, 0.5),
  },
  {
    enabled: true,
    maximumSpeedBodyLengthsPerSecond: 28,
    maximumAccelerationBodyLengthsPerSecondSquared: 900,
    maximumSegmentLengthChangeRatio: 0.8,
    isolatedJumpBodyLengths: 0.65,
    isolatedReturnRatio: 0.4,
  },
  {
    enabled: true,
    minimumCutoff: 2,
    beta: 12,
    derivativeCutoff: 1,
    maximumGapMicroseconds: 50_000,
  },
);

const permissiveDisplay = displayPolicy(
  'permissive',
  'Permissive',
  threshold(0.4, 0.4),
  {
    head: threshold(0.48, 0.42),
    torso: threshold(0.45, 0.42),
    shoulders: threshold(0.42, 0.4),
    elbows: threshold(0.4, 0.4),
    wristsHands: threshold(0.45, 0.4),
    hips: threshold(0.45, 0.42),
    knees: threshold(0.42, 0.4),
    anklesFeet: threshold(0.45, 0.4),
  },
  {
    enabled: true,
    maximumSpeedBodyLengthsPerSecond: 40,
    maximumAccelerationBodyLengthsPerSecondSquared: 1400,
    maximumSegmentLengthChangeRatio: 1.1,
    isolatedJumpBodyLengths: 0.85,
    isolatedReturnRatio: 0.35,
  },
  {
    enabled: true,
    minimumCutoff: 2.4,
    beta: 16,
    derivativeCutoff: 1,
    maximumGapMicroseconds: 50_000,
  },
);

export const POSE_QUALITY_PROFILES: Record<PoseQualityPresetId, PoseQualityProfile> = {
  strict: {
    id: 'strict',
    label: 'Strict',
    description: 'Reject more uncertain or implausible motion and accept more gaps.',
    display: strictDisplay,
    analytics: analyticsFromDisplay(strictDisplay, 0.05),
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    description: 'Balanced v2: responsive smoothing with balanced pose retention.',
    display: balancedDisplay,
    analytics: analyticsFromDisplay(balancedDisplay, 0.08),
  },
  permissive: {
    id: 'permissive',
    label: 'Permissive',
    description: 'Retain more marginal joints while keeping structural and temporal guards.',
    display: permissiveDisplay,
    analytics: analyticsFromDisplay(permissiveDisplay, 0.1),
  },
};

const clampThreshold = (value: number) => Math.max(0, Math.min(1, value));

export function clonePoseQualityPolicy(policy: PoseQualityPolicy): PoseQualityPolicy {
  return {
    ...policy,
    global: { ...policy.global },
    bodyGroups: Object.fromEntries(
      Object.entries(policy.bodyGroups).map(([group, value]) => [group, { ...value }]),
    ) as Partial<Record<BodyGroup, ConfidenceThresholds>>,
    joints: Object.fromEntries(
      Object.entries(policy.joints).map(([index, value]) => [index, { ...value }]),
    ) as Partial<Record<number, ConfidenceThresholds>>,
    hysteresis: { ...policy.hysteresis },
    temporal: { ...policy.temporal },
    smoothing: { ...policy.smoothing },
  };
}

export function getLandmarkBodyGroup(landmarkIndex: number): BodyGroup {
  return LANDMARK_GROUPS[landmarkIndex] ?? 'torso';
}

export function resolveConfidenceThreshold(
  policy: PoseQualityPolicy,
  landmarkIndex: number,
): ConfidenceThresholds {
  const joint = policy.joints[landmarkIndex];
  if (joint) return joint;
  const group = getLandmarkBodyGroup(landmarkIndex);
  const groupThreshold = policy.bodyGroups[group];
  if (groupThreshold) return groupThreshold;
  if (
    (group === 'shoulders' || group === 'hips') &&
    policy.bodyGroups.torso
  ) {
    return policy.bodyGroups.torso;
  }
  return policy.global;
}

const structuralReasons = (
  landmark: PoseLandmark | undefined,
): LandmarkRejectionReason[] => {
  if (!landmark) return ['missing'];
  if (
    !Number.isFinite(landmark.x) ||
    !Number.isFinite(landmark.y) ||
    !Number.isFinite(landmark.z) ||
    !Number.isFinite(landmark.visibility) ||
    (landmark.presence !== null && !Number.isFinite(landmark.presence))
  ) {
    return ['non-finite'];
  }
  if (landmark.x < 0 || landmark.x > 1 || landmark.y < 0 || landmark.y > 1) {
    return ['out-of-bounds'];
  }
  return [];
};

const distance = (first: PoseLandmark, second: PoseLandmark) =>
  Math.hypot(first.x - second.x, first.y - second.y);

const midpoint = (
  first: PoseLandmark | undefined,
  second: PoseLandmark | undefined,
): PoseLandmark | null => {
  if (structuralReasons(first).length || structuralReasons(second).length) return null;
  return {
    x: (first!.x + second!.x) / 2,
    y: (first!.y + second!.y) / 2,
    z: (first!.z + second!.z) / 2,
    visibility: Math.min(first!.visibility, second!.visibility),
    presence:
      first!.presence === null && second!.presence === null
        ? null
        : Math.min(first!.presence ?? 1, second!.presence ?? 1),
  };
};

const bodyScale = (sample: RawPoseSample, fallback: number): number => {
  const shoulders = midpoint(sample.landmarks[11], sample.landmarks[12]);
  const hips = midpoint(sample.landmarks[23], sample.landmarks[24]);
  if (shoulders && hips) return Math.max(0.08, distance(shoulders, hips));
  const shoulderWidth =
    structuralReasons(sample.landmarks[11]).length === 0 &&
    structuralReasons(sample.landmarks[12]).length === 0
      ? distance(sample.landmarks[11], sample.landmarks[12])
      : 0;
  const hipWidth =
    structuralReasons(sample.landmarks[23]).length === 0 &&
    structuralReasons(sample.landmarks[24]).length === 0
      ? distance(sample.landmarks[23], sample.landmarks[24])
      : 0;
  return Math.max(0.08, shoulderWidth, hipWidth, fallback);
};

const passesBaseConfidence = (
  sample: RawPoseSample | undefined,
  landmarkIndex: number,
  policy: PoseQualityPolicy,
): PoseLandmark | null => {
  const landmark = sample?.landmarks[landmarkIndex];
  if (structuralReasons(landmark).length) return null;
  const required = resolveConfidenceThreshold(policy, landmarkIndex);
  if (
    landmark!.visibility < required.visibility ||
    (landmark!.presence !== null && landmark!.presence < required.presence)
  ) {
    return null;
  }
  return landmark!;
};

type MotionState = {
  timestampMicroseconds: number;
  point: PoseLandmark;
  velocityX: number;
  velocityY: number;
  hasVelocity: boolean;
};

type OneEuroAxisState = {
  raw: number;
  filtered: number;
  derivative: number;
};

type OneEuroLandmarkState = {
  timestampMicroseconds: number;
  x: OneEuroAxisState;
  y: OneEuroAxisState;
  z: OneEuroAxisState;
};

const smoothingAlpha = (cutoff: number, deltaSeconds: number) => {
  const tau = 1 / (2 * Math.PI * Math.max(0.0001, cutoff));
  return 1 / (1 + tau / Math.max(0.000001, deltaSeconds));
};

const smoothAxis = (
  value: number,
  previous: OneEuroAxisState,
  deltaSeconds: number,
  policy: PoseQualityPolicy['smoothing'],
): OneEuroAxisState => {
  const rawDerivative = (value - previous.raw) / deltaSeconds;
  const derivativeAlpha = smoothingAlpha(policy.derivativeCutoff, deltaSeconds);
  const derivative =
    derivativeAlpha * rawDerivative + (1 - derivativeAlpha) * previous.derivative;
  const cutoff = policy.minimumCutoff + policy.beta * Math.abs(derivative);
  const valueAlpha = smoothingAlpha(cutoff, deltaSeconds);
  return {
    raw: value,
    filtered: valueAlpha * value + (1 - valueAlpha) * previous.filtered,
    derivative,
  };
};

const applySmoothing = (
  samples: QualityPoseSample[],
  policy: PoseQualityPolicy,
): void => {
  const states: Array<OneEuroLandmarkState | null> = Array.from(
    { length: POSE_LANDMARK_COUNT },
    () => null,
  );

  for (const sample of samples) {
    for (const decision of sample.decisions) {
      if (!decision) continue;
      const accepted = decision.accepted;
      const previous = states[decision.landmarkIndex];
      if (!accepted || !policy.smoothing.enabled) {
        decision.smoothed = accepted;
        states[decision.landmarkIndex] = accepted
          ? {
              timestampMicroseconds: sample.timestampMicroseconds,
              x: { raw: accepted.x, filtered: accepted.x, derivative: 0 },
              y: { raw: accepted.y, filtered: accepted.y, derivative: 0 },
              z: { raw: accepted.z, filtered: accepted.z, derivative: 0 },
            }
          : null;
        continue;
      }

      const gap = previous
        ? sample.timestampMicroseconds - previous.timestampMicroseconds
        : Number.POSITIVE_INFINITY;
      if (
        !previous ||
        gap <= 0 ||
        gap > policy.smoothing.maximumGapMicroseconds
      ) {
        decision.smoothed = accepted;
        states[decision.landmarkIndex] = {
          timestampMicroseconds: sample.timestampMicroseconds,
          x: { raw: accepted.x, filtered: accepted.x, derivative: 0 },
          y: { raw: accepted.y, filtered: accepted.y, derivative: 0 },
          z: { raw: accepted.z, filtered: accepted.z, derivative: 0 },
        };
        continue;
      }

      const deltaSeconds = gap / 1_000_000;
      const nextState: OneEuroLandmarkState = {
        timestampMicroseconds: sample.timestampMicroseconds,
        x: smoothAxis(accepted.x, previous.x, deltaSeconds, policy.smoothing),
        y: smoothAxis(accepted.y, previous.y, deltaSeconds, policy.smoothing),
        z: smoothAxis(accepted.z, previous.z, deltaSeconds, policy.smoothing),
      };
      states[decision.landmarkIndex] = nextState;
      decision.smoothed = {
        ...accepted,
        x: nextState.x.filtered,
        y: nextState.y.filtered,
        z: nextState.z.filtered,
      };
    }
  }
};

type CenteredTrackPoint = {
  timestampMicroseconds: number;
  decision: PoseLandmarkDecision;
  landmark: PoseLandmark;
};

type CenteredIntegral = {
  x: number;
  y: number;
  z: number;
};

const cumulativeIntegralAt = (
  segment: readonly CenteredTrackPoint[],
  prefix: readonly CenteredIntegral[],
  timestampMicroseconds: number,
): CenteredIntegral => {
  const firstTimestamp = segment[0].timestampMicroseconds;
  const lastIndex = segment.length - 1;
  const lastTimestamp = segment[lastIndex].timestampMicroseconds;
  if (timestampMicroseconds <= firstTimestamp) return { x: 0, y: 0, z: 0 };
  if (timestampMicroseconds >= lastTimestamp) return prefix[lastIndex];

  let lower = 0;
  let upper = lastIndex;
  while (lower + 1 < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (segment[middle].timestampMicroseconds <= timestampMicroseconds) {
      lower = middle;
    } else {
      upper = middle;
    }
  }

  const left = segment[lower];
  const right = segment[lower + 1];
  const intervalMicroseconds =
    right.timestampMicroseconds - left.timestampMicroseconds;
  const elapsedMicroseconds =
    timestampMicroseconds - left.timestampMicroseconds;
  const interpolation = elapsedMicroseconds / intervalMicroseconds;
  const interpolated = {
    x: left.landmark.x + (right.landmark.x - left.landmark.x) * interpolation,
    y: left.landmark.y + (right.landmark.y - left.landmark.y) * interpolation,
    z: left.landmark.z + (right.landmark.z - left.landmark.z) * interpolation,
  };

  return {
    x:
      prefix[lower].x +
      elapsedMicroseconds * (left.landmark.x + interpolated.x) / 2,
    y:
      prefix[lower].y +
      elapsedMicroseconds * (left.landmark.y + interpolated.y) / 2,
    z:
      prefix[lower].z +
      elapsedMicroseconds * (left.landmark.z + interpolated.z) / 2,
  };
};

const smoothCenteredSegment = (
  segment: readonly CenteredTrackPoint[],
  radiusMicroseconds: number,
): void => {
  if (segment.length < 3 || radiusMicroseconds <= 0) return;

  const prefix: CenteredIntegral[] = [{ x: 0, y: 0, z: 0 }];
  for (let index = 1; index < segment.length; index += 1) {
    const previous = segment[index - 1];
    const current = segment[index];
    const duration =
      current.timestampMicroseconds - previous.timestampMicroseconds;
    prefix.push({
      x:
        prefix[index - 1].x +
        duration * (previous.landmark.x + current.landmark.x) / 2,
      y:
        prefix[index - 1].y +
        duration * (previous.landmark.y + current.landmark.y) / 2,
      z:
        prefix[index - 1].z +
        duration * (previous.landmark.z + current.landmark.z) / 2,
    });
  }

  const segmentStart = segment[0].timestampMicroseconds;
  const segmentEnd = segment.at(-1)!.timestampMicroseconds;
  for (const point of segment) {
    const balancedRadius = Math.min(
      radiusMicroseconds,
      point.timestampMicroseconds - segmentStart,
      segmentEnd - point.timestampMicroseconds,
    );
    if (balancedRadius <= 0) continue;

    const start = cumulativeIntegralAt(
      segment,
      prefix,
      point.timestampMicroseconds - balancedRadius,
    );
    const end = cumulativeIntegralAt(
      segment,
      prefix,
      point.timestampMicroseconds + balancedRadius,
    );
    const duration = balancedRadius * 2;
    point.decision.centered = {
      ...point.landmark,
      x: (end.x - start.x) / duration,
      y: (end.y - start.y) / duration,
      z: (end.z - start.z) / duration,
    };
  }
};

const applyCenteredSmoothing = (
  samples: QualityPoseSample[],
  policy: PoseQualityPolicy,
  radiusMicroseconds: number,
): void => {
  for (const landmarkIndex of PRODUCT_POSE_LANDMARK_INDICES) {
    let segment: CenteredTrackPoint[] = [];
    const flush = () => {
      smoothCenteredSegment(segment, radiusMicroseconds);
      segment = [];
    };

    for (const sample of samples) {
      const decision = sample.decisions[landmarkIndex];
      if (!decision?.accepted) {
        flush();
        continue;
      }

      const previous = segment.at(-1);
      const gap = previous
        ? sample.timestampMicroseconds - previous.timestampMicroseconds
        : 0;
      if (
        previous &&
        (gap <= 0 || gap > policy.smoothing.maximumGapMicroseconds)
      ) {
        flush();
      }
      segment.push({
        timestampMicroseconds: sample.timestampMicroseconds,
        decision,
        landmark: decision.accepted,
      });
    }
    flush();
  }
};

const buildMetrics = (
  samples: QualityPoseSample[],
  policy: PoseQualityPolicy,
): PoseQualityMetrics => {
  const rejectionCounts: PoseQualityMetrics['rejectionCounts'] = {};
  const groupTotals = Object.fromEntries(BODY_GROUPS.map((group) => [group, 0])) as Record<
    BodyGroup,
    number
  >;
  const groupAccepted = { ...groupTotals };
  let structurallyObservedJointSlots = 0;
  let acceptedJointSlots = 0;
  let confidenceRejectedJointSlots = 0;
  let temporalRejectedJointSlots = 0;
  let smoothingDisplacement = 0;
  let smoothingCount = 0;
  let centeredSmoothingDisplacement = 0;
  let centeredSmoothingCount = 0;

  for (const sample of samples) {
    for (const decision of sample.decisions) {
      if (!decision) continue;
      groupTotals[decision.bodyGroup] += 1;
      if (decision.raw && !decision.reasons.some((reason) =>
        reason === 'missing' || reason === 'non-finite' || reason === 'out-of-bounds'
      )) {
        structurallyObservedJointSlots += 1;
      }
      if (decision.accepted) {
        acceptedJointSlots += 1;
        groupAccepted[decision.bodyGroup] += 1;
      }
      if (decision.reasons.some((reason) => reason === 'visibility' || reason === 'presence')) {
        confidenceRejectedJointSlots += 1;
      }
      if (
        decision.reasons.some((reason) =>
          reason === 'isolated-jump' ||
          reason === 'velocity' ||
          reason === 'acceleration' ||
          reason === 'segment-length'
        )
      ) {
        temporalRejectedJointSlots += 1;
      }
      for (const reason of decision.reasons) {
        rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + 1;
      }
      if (decision.accepted && decision.smoothed) {
        smoothingDisplacement += distance(decision.accepted, decision.smoothed);
        smoothingCount += 1;
      }
      if (decision.accepted && decision.centered) {
        centeredSmoothingDisplacement += distance(
          decision.accepted,
          decision.centered,
        );
        centeredSmoothingCount += 1;
      }
    }
  }

  let flickerCount = 0;
  let reacquisitionCount = 0;
  let longestJointGapMicroseconds = 0;
  let longestJointGapLandmarkIndex: number | null = null;
  let reacquisitionTotal = 0;
  const recordJointGap = (landmarkIndex: number, duration: number) => {
    if (duration > longestJointGapMicroseconds) {
      longestJointGapMicroseconds = duration;
      longestJointGapLandmarkIndex = landmarkIndex;
    }
  };
  for (const landmarkIndex of PRODUCT_POSE_LANDMARK_INDICES) {
    let hadAccepted = false;
    let gapStart: number | null = null;
    let rejectedIntervals = 0;
    for (const sample of samples) {
      const accepted = Boolean(sample.decisions[landmarkIndex]?.accepted);
      if (accepted) {
        if (gapStart !== null) {
          const duration = sample.timestampMicroseconds - gapStart;
          recordJointGap(landmarkIndex, duration);
          if (hadAccepted) {
            reacquisitionCount += 1;
            reacquisitionTotal += duration;
            if (
              rejectedIntervals <= 2 &&
              duration <= policy.smoothing.maximumGapMicroseconds * 3
            ) {
              flickerCount += 1;
            }
          }
        }
        hadAccepted = true;
        gapStart = null;
        rejectedIntervals = 0;
      } else {
        if (gapStart === null) gapStart = sample.timestampMicroseconds;
        rejectedIntervals += 1;
      }
    }
    if (gapStart !== null && samples.length) {
      recordJointGap(
        landmarkIndex,
        samples[samples.length - 1].timestampMicroseconds - gapStart,
      );
    }
  }

  let longestWholePoseGapMicroseconds = 0;
  let wholePoseGapStart: number | null = null;
  for (const sample of samples) {
    const poseAccepted = PRODUCT_POSE_LANDMARK_INDICES.some((landmarkIndex) =>
      Boolean(sample.decisions[landmarkIndex]?.accepted),
    );
    if (poseAccepted) {
      if (wholePoseGapStart !== null) {
        longestWholePoseGapMicroseconds = Math.max(
          longestWholePoseGapMicroseconds,
          sample.timestampMicroseconds - wholePoseGapStart,
        );
      }
      wholePoseGapStart = null;
    } else if (wholePoseGapStart === null) {
      wholePoseGapStart = sample.timestampMicroseconds;
    }
  }
  if (wholePoseGapStart !== null && samples.length) {
    longestWholePoseGapMicroseconds = Math.max(
      longestWholePoseGapMicroseconds,
      samples[samples.length - 1].timestampMicroseconds - wholePoseGapStart,
    );
  }

  const totalJointSlots =
    samples.length * PRODUCT_POSE_LANDMARK_INDICES.length;
  const timestampErrorTotal = samples.reduce(
    (total, sample) =>
      total +
      Math.abs(
        sample.requestedTimestampMicroseconds - sample.timestampMicroseconds,
      ),
    0,
  );
  const inferenceTimes = samples
    .map((sample) => sample.rawSample.inferenceMilliseconds)
    .filter(Number.isFinite)
    .sort((first, second) => first - second);
  const inferenceTotal = inferenceTimes.reduce((total, value) => total + value, 0);
  const p95Index = Math.max(
    0,
    Math.ceil(inferenceTimes.length * 0.95) - 1,
  );

  return {
    sampleCount: samples.length,
    modelEmptySamples: samples.filter((sample) => sample.rawSample.landmarks.length === 0)
      .length,
    totalJointSlots,
    structurallyObservedJointSlots,
    acceptedJointSlots,
    acceptedCoverage: totalJointSlots ? acceptedJointSlots / totalJointSlots : 0,
    groupCoverage: Object.fromEntries(
      BODY_GROUPS.map((group) => [
        group,
        groupTotals[group] ? groupAccepted[group] / groupTotals[group] : 0,
      ]),
    ) as Record<BodyGroup, number>,
    confidenceRejectedJointSlots,
    temporalRejectedJointSlots,
    rejectionCounts,
    flickerCount,
    reacquisitionCount,
    longestJointGapMicroseconds,
    longestJointGapLandmarkIndex,
    longestWholePoseGapMicroseconds,
    meanReacquisitionMicroseconds: reacquisitionCount
      ? reacquisitionTotal / reacquisitionCount
      : 0,
    meanRequestedTimestampErrorMicroseconds: samples.length
      ? timestampErrorTotal / samples.length
      : 0,
    meanSmoothingDisplacement: smoothingCount
      ? smoothingDisplacement / smoothingCount
      : 0,
    meanCenteredSmoothingDisplacement: centeredSmoothingCount
      ? centeredSmoothingDisplacement / centeredSmoothingCount
      : 0,
    meanInferenceMilliseconds: inferenceTimes.length
      ? inferenceTotal / inferenceTimes.length
      : 0,
    p95InferenceMilliseconds: inferenceTimes[p95Index] ?? 0,
  };
};

export function evaluatePoseQuality(
  rawSamples: readonly RawPoseSample[],
  policy: PoseQualityPolicy,
  options: PoseQualityEvaluationOptions = {},
): PoseQualityEvaluation {
  const requestedCenteredRadius =
    options.centeredSmoothingRadiusMicroseconds;
  const centeredSmoothingRadiusMicroseconds =
    typeof requestedCenteredRadius === 'number' &&
    Number.isFinite(requestedCenteredRadius)
    ? Math.max(0, requestedCenteredRadius)
    : DEFAULT_CENTERED_SMOOTHING_RADIUS_MICROSECONDS;
  const ordered = [...rawSamples].sort(
    (first, second) => first.timestampMicroseconds - second.timestampMicroseconds,
  );
  const trackAccepted = Array.from({ length: POSE_LANDMARK_COUNT }, () => false);
  const motion: Array<MotionState | null> = Array.from(
    { length: POSE_LANDMARK_COUNT },
    () => null,
  );
  const qualitySamples: QualityPoseSample[] = [];
  let previousBodyScale = 0.25;

  for (let sampleIndex = 0; sampleIndex < ordered.length; sampleIndex += 1) {
    const sample = ordered[sampleIndex];
    const nextSample = ordered[sampleIndex + 1];
    const scale = bodyScale(sample, previousBodyScale);
    previousBodyScale = scale;
    const previousMotion = [...motion];
    const decisions: Array<PoseLandmarkDecision | null> = Array.from(
      { length: POSE_LANDMARK_COUNT },
      () => null,
    );

    for (const landmarkIndex of PRODUCT_POSE_LANDMARK_INDICES) {
      const raw = sample.landmarks[landmarkIndex];
      const reasons = structuralReasons(raw);
      const baseThreshold = resolveConfidenceThreshold(policy, landmarkIndex);
      const hysteresisDelta = policy.hysteresis.enabled
        ? trackAccepted[landmarkIndex]
          ? policy.hysteresis.keepDelta
          : policy.hysteresis.acquireDelta
        : 0;
      const required = {
        visibility: clampThreshold(baseThreshold.visibility + hysteresisDelta),
        presence: clampThreshold(baseThreshold.presence + hysteresisDelta),
      };

      if (reasons.length === 0) {
        if (raw!.visibility < required.visibility) reasons.push('visibility');
        if (raw!.presence !== null && raw!.presence < required.presence) {
          reasons.push('presence');
        }
      }

      if (reasons.length === 0 && policy.temporal.enabled) {
        const previous = previousMotion[landmarkIndex];
        if (previous) {
          const deltaMicroseconds =
            sample.timestampMicroseconds - previous.timestampMicroseconds;
          if (
            deltaMicroseconds <= 0 ||
            deltaMicroseconds > policy.smoothing.maximumGapMicroseconds * 2
          ) {
            motion[landmarkIndex] = null;
          } else {
            const deltaSeconds = deltaMicroseconds / 1_000_000;
            const movement = distance(raw!, previous.point);
            const next = passesBaseConfidence(nextSample, landmarkIndex, policy);
            if (next) {
              const nextScale = bodyScale(nextSample!, scale);
              const normalizedJump = movement / scale;
              const returnedDistance = distance(next, previous.point) / nextScale;
              if (
                normalizedJump > policy.temporal.isolatedJumpBodyLengths &&
                returnedDistance <
                  normalizedJump * policy.temporal.isolatedReturnRatio
              ) {
                reasons.push('isolated-jump');
              }
            }

            const velocityX = (raw!.x - previous.point.x) / deltaSeconds;
            const velocityY = (raw!.y - previous.point.y) / deltaSeconds;
            const speed = Math.hypot(velocityX, velocityY) / scale;
            if (
              reasons.length === 0 &&
              speed > policy.temporal.maximumSpeedBodyLengthsPerSecond
            ) {
              reasons.push('velocity');
            }
            if (reasons.length === 0 && previous.hasVelocity) {
              const acceleration =
                Math.hypot(
                  velocityX - previous.velocityX,
                  velocityY - previous.velocityY,
                ) /
                deltaSeconds /
                scale;
              if (
                acceleration >
                policy.temporal.maximumAccelerationBodyLengthsPerSecondSquared
              ) {
                reasons.push('acceleration');
              }
            }

            const parentIndex = DISTAL_PARENT[landmarkIndex];
            const parentRaw =
              parentIndex === undefined
                ? null
                : decisions[parentIndex]?.accepted ?? null;
            const previousParent =
              parentIndex === undefined ? null : previousMotion[parentIndex];
            if (
              reasons.length === 0 &&
              parentRaw &&
              previousParent &&
              previousParent.timestampMicroseconds === previous.timestampMicroseconds
            ) {
              const previousLength = distance(previous.point, previousParent.point);
              const currentLength = distance(raw!, parentRaw);
              if (
                previousLength > 0.01 &&
                Math.abs(currentLength - previousLength) / previousLength >
                  policy.temporal.maximumSegmentLengthChangeRatio
              ) {
                reasons.push('segment-length');
              }
            }

            if (reasons.length === 0) {
              motion[landmarkIndex] = {
                timestampMicroseconds: sample.timestampMicroseconds,
                point: raw!,
                velocityX,
                velocityY,
                hasVelocity: true,
              };
            }
          }
        }
      }

      const accepted = reasons.length === 0 ? raw! : null;
      if (accepted && !motion[landmarkIndex]) {
        motion[landmarkIndex] = {
          timestampMicroseconds: sample.timestampMicroseconds,
          point: accepted,
          velocityX: 0,
          velocityY: 0,
          hasVelocity: false,
        };
      }
      trackAccepted[landmarkIndex] = Boolean(accepted);
      if (!accepted) motion[landmarkIndex] = null;
      decisions[landmarkIndex] = {
        landmarkIndex,
        bodyGroup: getLandmarkBodyGroup(landmarkIndex),
        raw: raw ?? null,
        accepted,
        smoothed: accepted,
        centered: accepted,
        threshold: required,
        status: accepted
          ? 'accepted'
          : reasons.length === 1 && reasons[0] === 'missing'
            ? 'missing'
            : 'rejected',
        reasons,
      };
    }

    qualitySamples.push({
      requestedTimestampMicroseconds: sample.requestedTimestampMicroseconds,
      timestampMicroseconds: sample.timestampMicroseconds,
      rawSample: sample,
      decisions,
    });
  }

  applySmoothing(qualitySamples, policy);
  applyCenteredSmoothing(
    qualitySamples,
    policy,
    centeredSmoothingRadiusMicroseconds,
  );
  return {
    policy,
    centeredSmoothingRadiusMicroseconds,
    samples: qualitySamples,
    metrics: buildMetrics(qualitySamples, policy),
  };
}

export function landmarksForPreview(
  sample: QualityPoseSample,
  preview: PosePreviewMode,
): Array<PoseLandmark | null> {
  return sample.decisions.map((decision) => {
    if (!decision) return null;
    if (preview === 'raw') return decision.raw;
    if (preview === 'smoothed') return decision.smoothed;
    if (preview === 'centered') return decision.centered;
    return decision.accepted;
  });
}

export function landmarkForPreview(
  sample: QualityPoseSample,
  landmarkIndex: number,
  preview: PosePreviewMode,
): PoseLandmark | null {
  const decision = sample.decisions[landmarkIndex];
  if (!decision) return null;
  if (preview === 'raw') return decision.raw;
  if (preview === 'smoothed') return decision.smoothed;
  if (preview === 'centered') return decision.centered;
  return decision.accepted;
}

export function evaluateCalibrationLabels(
  labels: readonly CalibrationLabelRecord[],
  evaluation: PoseQualityEvaluation,
): CalibrationLabelMetrics {
  const sampleByTimestamp = new Map(
    evaluation.samples.map((sample) => [sample.timestampMicroseconds, sample]),
  );
  let usable = 0;
  let badOrUnavailable = 0;
  let retainedUsable = 0;
  let falseVisible = 0;

  for (const label of labels) {
    if (!PRODUCT_POSE_LANDMARK_INDICES.includes(label.landmarkIndex)) continue;
    const decision =
      sampleByTimestamp.get(label.timestampMicroseconds)?.decisions[label.landmarkIndex];
    if (!decision) continue;
    if (label.label === 'usable') {
      usable += 1;
      if (decision.accepted) retainedUsable += 1;
    } else {
      badOrUnavailable += 1;
      if (decision.accepted) falseVisible += 1;
    }
  }

  return {
    total: usable + badOrUnavailable,
    usable,
    badOrUnavailable,
    retainedUsable,
    falseVisible,
    retainedUsableRate: usable ? retainedUsable / usable : null,
    falseVisibleRate: badOrUnavailable ? falseVisible / badOrUnavailable : null,
  };
}

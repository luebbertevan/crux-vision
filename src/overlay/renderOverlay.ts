import { DEFAULT_SAMPLE_RATE, SECOND_MICROSECONDS } from '../analysis/range';
import {
  buildSkeletonSegmentsFromGetter,
  PRODUCT_POSE_LANDMARK_INDICES,
  resolvePosePointFromGetter,
  type PosePointSource,
} from '../pose/poseView';
import {
  landmarkForPreview,
  type PosePreviewMode,
  type QualityPoseSample,
} from '../pose/poseQuality';
import { buildTrailSegmentsWithResolver } from '../pose/trail';
import type { PoseLandmark } from '../types';
import type { DisplayTransform } from './displayTransform';
import { mapNormalizedPoint } from './displayTransform';

export const TRAIL_DURATION_MICROSECONDS = 1.5 * SECOND_MICROSECONDS;
export const TRAIL_MAXIMUM_GAP_MICROSECONDS = Math.round(
  (1.5 * SECOND_MICROSECONDS) / DEFAULT_SAMPLE_RATE,
);

const TRAIL_MINIMUM_ALPHA = 0.38;
const TRAIL_MAXIMUM_ALPHA = 0.98;

const TRAILS = [
  {
    source: {
      kind: 'midpoint',
      firstLandmarkIndex: 23,
      secondLandmarkIndex: 24,
    },
    color: '244, 170, 74',
  },
  {
    source: {
      kind: 'midpoint',
      firstLandmarkIndex: 11,
      secondLandmarkIndex: 12,
    },
    color: '72, 205, 225',
  },
] satisfies ReadonlyArray<{ source: PosePointSource; color: string }>;

export type OverlayRenderResult = {
  currentPoseAvailable: boolean;
  skeletonSegmentCount: number;
  trailSegmentCount: number;
};

export function renderOverlay(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: DisplayTransform,
  samples: readonly QualityPoseSample[],
  currentSample: QualityPoseSample | null,
  presentationTimestampMicroseconds: number,
  previewMode: PosePreviewMode,
): OverlayRenderResult {
  context.clearRect(0, 0, width, height);

  const getPreviewLandmark = (
    sample: QualityPoseSample,
    landmarkIndex: number,
  ): PoseLandmark | null => {
    const landmark = landmarkForPreview(sample, landmarkIndex, previewMode);
    return landmark &&
      Number.isFinite(landmark.x) &&
      Number.isFinite(landmark.y)
      ? landmark
      : null;
  };

  let trailSegmentCount = 0;
  for (const trail of TRAILS) {
    const segments = buildTrailSegmentsWithResolver(
      samples,
      presentationTimestampMicroseconds,
      {
        source: trail.source,
        durationMicroseconds: TRAIL_DURATION_MICROSECONDS,
        maximumGapMicroseconds: TRAIL_MAXIMUM_GAP_MICROSECONDS,
      },
      (sample, source) =>
        resolvePosePointFromGetter(
          (landmarkIndex) => getPreviewLandmark(sample, landmarkIndex),
          source,
        )?.point ?? null,
    );
    trailSegmentCount += segments.length;

    for (const segment of segments) {
      if (segment.length === 1) {
        const point = mapNormalizedPoint(transform, segment[0]);
        context.beginPath();
        context.arc(point.x, point.y, Math.max(4, width / 190), 0, Math.PI * 2);
        const alpha =
          TRAIL_MINIMUM_ALPHA +
          segment[0].ageRatio * (TRAIL_MAXIMUM_ALPHA - TRAIL_MINIMUM_ALPHA);
        context.fillStyle = `rgba(${trail.color}, ${alpha})`;
        context.fill();
        continue;
      }

      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = Math.max(4, width / 180);
      for (let index = 1; index < segment.length; index += 1) {
        const start = mapNormalizedPoint(transform, segment[index - 1]);
        const end = mapNormalizedPoint(transform, segment[index]);
        const ageRatio =
          (segment[index - 1].ageRatio + segment[index].ageRatio) / 2;
        const alpha =
          TRAIL_MINIMUM_ALPHA +
          ageRatio * (TRAIL_MAXIMUM_ALPHA - TRAIL_MINIMUM_ALPHA);
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.strokeStyle = `rgba(${trail.color}, ${alpha})`;
        context.stroke();
      }
    }
  }

  const skeleton = currentSample
    ? buildSkeletonSegmentsFromGetter((landmarkIndex) =>
        getPreviewLandmark(currentSample, landmarkIndex),
      )
    : [];
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(2, width / 300);
  context.strokeStyle = 'rgba(188, 255, 112, 0.92)';
  context.shadowColor = 'rgba(0, 0, 0, 0.65)';
  context.shadowBlur = Math.max(2, width / 360);

  for (const segment of skeleton) {
    const start = mapNormalizedPoint(transform, segment.start);
    const end = mapNormalizedPoint(transform, segment.end);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }

  context.shadowBlur = 0;
  const acceptedLandmarks =
    currentSample
      ? PRODUCT_POSE_LANDMARK_INDICES.map((landmarkIndex) =>
          getPreviewLandmark(currentSample, landmarkIndex),
        ).filter((landmark): landmark is PoseLandmark => Boolean(landmark))
      : [];
  const radius = Math.max(2.2, width / 260);
  for (const landmark of acceptedLandmarks) {
    const point = mapNormalizedPoint(transform, landmark);
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = '#f6f1df';
    context.fill();
    context.lineWidth = Math.max(1, width / 700);
    context.strokeStyle = '#182014';
    context.stroke();
  }

  if (previewMode === 'rejected' && currentSample) {
    const rejectedRadius = Math.max(3.2, width / 220);
    for (const decision of currentSample.decisions) {
      if (!decision) continue;
      if (decision.status !== 'rejected' || !decision.raw) continue;
      if (!Number.isFinite(decision.raw.x) || !Number.isFinite(decision.raw.y)) continue;
      const point = mapNormalizedPoint(transform, decision.raw);
      const temporal = decision.reasons.some((reason) =>
        reason === 'isolated-jump' ||
        reason === 'velocity' ||
        reason === 'acceleration' ||
        reason === 'segment-length'
      );
      context.beginPath();
      context.arc(point.x, point.y, rejectedRadius, 0, Math.PI * 2);
      context.fillStyle = temporal
        ? 'rgba(242, 104, 164, 0.82)'
        : 'rgba(244, 170, 74, 0.82)';
      context.fill();
      context.lineWidth = Math.max(1.5, width / 600);
      context.strokeStyle = '#161916';
      context.stroke();
    }
  }

  const currentTrailAvailable = TRAILS.some((trail) =>
    Boolean(
      currentSample &&
        resolvePosePointFromGetter(
          (landmarkIndex) => getPreviewLandmark(currentSample, landmarkIndex),
          trail.source,
        ),
    ),
  );

  return {
    currentPoseAvailable: skeleton.length > 0 || currentTrailAvailable,
    skeletonSegmentCount: skeleton.length,
    trailSegmentCount,
  };
}

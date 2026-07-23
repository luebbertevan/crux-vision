import { DEFAULT_SAMPLE_RATE, SECOND_MICROSECONDS } from '../analysis/range';
import { buildSkeletonSegments, isLandmarkAccepted } from '../pose/poseView';
import { buildTrailSegments } from '../pose/trail';
import type { RawPoseSample } from '../types';
import type { DisplayTransform } from './displayTransform';
import { mapNormalizedPoint } from './displayTransform';

export const TRAIL_DURATION_MICROSECONDS = 2 * SECOND_MICROSECONDS;
export const TRAIL_MAXIMUM_GAP_MICROSECONDS = Math.round(
  (1.5 * SECOND_MICROSECONDS) / DEFAULT_SAMPLE_RATE,
);

const TRAILS = [
  { jointIndex: 15, color: '244, 170, 74' },
  { jointIndex: 16, color: '72, 205, 225' },
] as const;

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
  samples: readonly RawPoseSample[],
  currentSample: RawPoseSample | null,
  presentationTimestampMicroseconds: number,
): OverlayRenderResult {
  context.clearRect(0, 0, width, height);

  let trailSegmentCount = 0;
  for (const trail of TRAILS) {
    const segments = buildTrailSegments(samples, presentationTimestampMicroseconds, {
      jointIndex: trail.jointIndex,
      durationMicroseconds: TRAIL_DURATION_MICROSECONDS,
      maximumGapMicroseconds: TRAIL_MAXIMUM_GAP_MICROSECONDS,
    });
    trailSegmentCount += segments.length;

    for (const segment of segments) {
      if (segment.length === 1) {
        const point = mapNormalizedPoint(transform, segment[0]);
        context.beginPath();
        context.arc(point.x, point.y, Math.max(2.5, width / 260), 0, Math.PI * 2);
        context.fillStyle = `rgba(${trail.color}, ${0.25 + segment[0].ageRatio * 0.7})`;
        context.fill();
        continue;
      }

      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = Math.max(2.5, width / 230);
      for (let index = 1; index < segment.length; index += 1) {
        const start = mapNormalizedPoint(transform, segment[index - 1]);
        const end = mapNormalizedPoint(transform, segment[index]);
        const alpha = 0.16 + ((segment[index - 1].ageRatio + segment[index].ageRatio) / 2) * 0.78;
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.strokeStyle = `rgba(${trail.color}, ${alpha})`;
        context.stroke();
      }
    }
  }

  const skeleton = buildSkeletonSegments(currentSample);
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
  const acceptedLandmarks = currentSample?.landmarks.filter((landmark) =>
    isLandmarkAccepted(landmark),
  ) ?? [];
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

  const currentWristAvailable = [15, 16].some((index) =>
    isLandmarkAccepted(currentSample?.landmarks[index]),
  );

  return {
    currentPoseAvailable: skeleton.length > 0 || currentWristAvailable,
    skeletonSegmentCount: skeleton.length,
    trailSegmentCount,
  };
}

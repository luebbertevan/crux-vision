import {
  buildSkeletonSegmentsFromGetter,
  PRODUCT_POSE_LANDMARK_INDICES,
  resolvePosePointFromGetter,
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
import {
  calculateTrailPointRadii,
  calculateTrailStrokeWidths,
  TRAIL_MAXIMUM_GAP_MICROSECONDS,
  TRAIL_SOURCE_DEFINITIONS,
  type OverlaySettings,
} from './overlaySettings';

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
  settings: OverlaySettings,
): OverlayRenderResult {
  context.clearRect(0, 0, width, height);
  if (!settings.masterVisible) {
    return {
      currentPoseAvailable: true,
      skeletonSegmentCount: 0,
      trailSegmentCount: 0,
    };
  }

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
  const enabledTrails = settings.layers.trails
    ? TRAIL_SOURCE_DEFINITIONS.filter(
        ({ id }) => settings.trailSources[id],
      )
    : [];
  for (const trail of enabledTrails) {
    const appearance = trail.defaultAppearance;
    const segments = buildTrailSegmentsWithResolver(
      samples,
      presentationTimestampMicroseconds,
      {
        source: trail.source,
        durationMicroseconds: appearance.durationMicroseconds,
        maximumGapMicroseconds: TRAIL_MAXIMUM_GAP_MICROSECONDS,
      },
      (sample, source) =>
        resolvePosePointFromGetter(
          (landmarkIndex) => getPreviewLandmark(sample, landmarkIndex),
          source,
        )?.point ?? null,
    );
    trailSegmentCount += segments.length;
    const pointRadii = calculateTrailPointRadii(
      width,
      appearance.widthScale,
    );
    const strokeWidths = calculateTrailStrokeWidths(
      width,
      appearance.widthScale,
    );

    for (const segment of segments) {
      if (segment.length === 1) {
        const point = mapNormalizedPoint(transform, segment[0]);
        const alpha =
          appearance.minimumAlpha +
          segment[0].ageRatio *
            (appearance.maximumAlpha - appearance.minimumAlpha);
        context.beginPath();
        context.arc(
          point.x,
          point.y,
          pointRadii.haloRadius,
          0,
          Math.PI * 2,
        );
        context.fillStyle = `rgba(${appearance.haloColorChannels}, ${alpha * appearance.haloAlphaScale})`;
        context.fill();
        context.beginPath();
        context.arc(
          point.x,
          point.y,
          pointRadii.colorRadius,
          0,
          Math.PI * 2,
        );
        context.fillStyle = `rgba(${appearance.colorChannels}, ${alpha})`;
        context.fill();
        continue;
      }

      context.lineCap = 'round';
      context.lineJoin = 'round';
      for (let index = 1; index < segment.length; index += 1) {
        const start = mapNormalizedPoint(transform, segment[index - 1]);
        const end = mapNormalizedPoint(transform, segment[index]);
        const ageRatio =
          (segment[index - 1].ageRatio + segment[index].ageRatio) / 2;
        const alpha =
          appearance.minimumAlpha +
          ageRatio *
            (appearance.maximumAlpha - appearance.minimumAlpha);
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.lineWidth = strokeWidths.haloWidth;
        context.strokeStyle = `rgba(${appearance.haloColorChannels}, ${alpha * appearance.haloAlphaScale})`;
        context.stroke();
        context.lineWidth = strokeWidths.colorWidth;
        context.strokeStyle = `rgba(${appearance.colorChannels}, ${alpha})`;
        context.stroke();
      }
    }
  }

  const skeleton = settings.layers.skeleton && currentSample
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
    settings.layers.skeleton && currentSample
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

  if (settings.layers.skeleton && previewMode === 'rejected' && currentSample) {
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

  const currentTrailAvailable = enabledTrails.some((trail) =>
    Boolean(
      currentSample &&
        resolvePosePointFromGetter(
          (landmarkIndex) => getPreviewLandmark(currentSample, landmarkIndex),
          trail.source,
        ),
    ),
  );
  const anyLayerRequested =
    settings.layers.skeleton ||
    (settings.layers.trails && enabledTrails.length > 0);

  return {
    currentPoseAvailable:
      !anyLayerRequested || skeleton.length > 0 || currentTrailAvailable,
    skeletonSegmentCount: skeleton.length,
    trailSegmentCount,
  };
}

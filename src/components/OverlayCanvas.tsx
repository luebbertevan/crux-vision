import { useCallback, useEffect, useRef, type RefObject } from 'react';

import { DEFAULT_SAMPLE_RATE, secondsToMicroseconds } from '../analysis/range';
import { nearestByTimestamp } from '../analysis/timestamp';
import { computeContainTransform } from '../overlay/displayTransform';
import type { OverlaySettings } from '../overlay/overlaySettings';
import { renderOverlay } from '../overlay/renderOverlay';
import type {
  PosePreviewMode,
  PoseQualityEvaluation,
} from '../pose/poseQuality';
import type { AnalysisState } from '../state/analysisReducer';
import type { SourceMetadata } from '../types';

export type StageFeedback = 'none' | 'pending' | 'unavailable' | 'outside';

type OverlayCanvasProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  metadata: SourceMetadata;
  analysis: AnalysisState;
  quality: PoseQualityEvaluation;
  previewMode: PosePreviewMode;
  settings: OverlaySettings;
  onFeedbackChange: (feedback: StageFeedback) => void;
};

const POSE_TOLERANCE_MICROSECONDS = Math.round(
  (0.75 * 1_000_000) / DEFAULT_SAMPLE_RATE,
);

export function OverlayCanvas({
  videoRef,
  metadata,
  analysis,
  quality,
  previewMode,
  settings,
  onFeedbackChange,
}: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ metadata, analysis, quality, previewMode, settings });
  const lastFeedbackRef = useRef<StageFeedback>('none');
  const drawRevisionRef = useRef(0);
  stateRef.current = { metadata, analysis, quality, previewMode, settings };

  const publishFeedback = useCallback(
    (feedback: StageFeedback) => {
      if (feedback === lastFeedbackRef.current) return;
      lastFeedbackRef.current = feedback;
      onFeedbackChange(feedback);
    },
    [onFeedbackChange],
  );

  const drawAt = useCallback(
    (mediaTimeSeconds: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const context = canvas.getContext('2d');
      if (!context) return;
      const state = stateRef.current;
      const range = state.analysis.range;
      const publishDrawResult = (
        reason: string,
        result?: {
          skeletonSegmentCount: number;
          trailSegmentCount: number;
        },
      ) => {
        drawRevisionRef.current += 1;
        canvas.dataset.drawRevision = String(drawRevisionRef.current);
        canvas.dataset.drawReason = reason;
        canvas.dataset.skeletonSegmentCount = String(
          result?.skeletonSegmentCount ?? 0,
        );
        canvas.dataset.trailSegmentCount = String(
          result?.trailSegmentCount ?? 0,
        );
      };
      if (!state.settings.masterVisible || !range || state.analysis.phase === 'idle') {
        context.clearRect(0, 0, width, height);
        publishDrawResult(
          state.settings.masterVisible ? 'no-analysis' : 'master-hidden',
        );
        publishFeedback('none');
        return;
      }

      const timestamp = secondsToMicroseconds(mediaTimeSeconds);
      if (timestamp < range.startMicroseconds || timestamp > range.endMicroseconds) {
        context.clearRect(0, 0, width, height);
        publishDrawResult('outside-range');
        publishFeedback('outside');
        return;
      }

      const isRunning =
        state.analysis.phase === 'analyzing' || state.analysis.phase === 'partial';
      const analyzedThrough = state.analysis.analyzedThroughMicroseconds;
      if (
        isRunning &&
        (analyzedThrough === null || timestamp > analyzedThrough + POSE_TOLERANCE_MICROSECONDS)
      ) {
        context.clearRect(0, 0, width, height);
        publishDrawResult('pending');
        publishFeedback('pending');
        return;
      }

      const currentSample = nearestByTimestamp(
        state.quality.samples,
        timestamp,
        POSE_TOLERANCE_MICROSECONDS,
      );
      const transform = computeContainTransform(
        width,
        height,
        state.metadata.displayWidth,
        state.metadata.displayHeight,
      );
      const result = renderOverlay(
        context,
        width,
        height,
        transform,
        state.quality.samples,
        currentSample,
        timestamp,
        state.previewMode,
        state.settings,
      );
      publishDrawResult('rendered', result);
      publishFeedback(result.currentPoseAvailable ? 'none' : 'unavailable');
    },
    [publishFeedback],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let callbackId = 0;
    const onFrame: VideoFrameRequestCallback = (_now, frame) => {
      drawAt(frame.mediaTime);
      callbackId = video.requestVideoFrameCallback(onFrame);
    };
    callbackId = video.requestVideoFrameCallback(onFrame);

    const resizeObserver = new ResizeObserver(() => drawAt(video.currentTime));
    if (canvasRef.current) resizeObserver.observe(canvasRef.current);
    drawAt(video.currentTime);

    return () => {
      video.cancelVideoFrameCallback(callbackId);
      resizeObserver.disconnect();
    };
  }, [drawAt, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) drawAt(video.currentTime);
  }, [
    analysis.samples,
    analysis.phase,
    analysis.range,
    drawAt,
    previewMode,
    quality,
    settings,
    videoRef,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="pose-overlay"
      data-testid="overlay-canvas"
      aria-hidden="true"
    />
  );
}

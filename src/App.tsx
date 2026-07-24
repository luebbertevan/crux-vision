import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';

import { PoseAnalysisController } from './analysis/PoseAnalysisController';
import { createAnalysisDiagnostics } from './analysis/errorDiagnostics';
import {
  analysisTimestamps,
  defaultAnalysisRange,
  microsecondsToSeconds,
  secondsToMicroseconds,
} from './analysis/range';
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  ShieldIcon,
  SparkIcon,
  UploadIcon,
} from './components/Icons';
import { OverlayCanvas, type StageFeedback } from './components/OverlayCanvas';
import { PoseQualityPanel } from './components/PoseQualityPanel';
import { formatTime, RangeSelector } from './components/RangeSelector';
import { useReviewStageSize } from './layout/useReviewStageSize';
import type { BrowserMediaAdapter } from './media/mediaAdapter';
import { PlayerController } from './player/PlayerController';
import { nearestPresentationFrameIndex } from './player/frameNavigation';
import {
  clonePoseQualityPolicy,
  evaluateCalibrationLabels,
  evaluatePoseQuality,
  POSE_QUALITY_PROFILES,
  type CalibrationLabel,
  type CalibrationLabelRecord,
  type PosePolicyTarget,
  type PosePreviewMode,
  type PoseQualityPresetId,
} from './pose/poseQuality';
import { POSE_MODELS } from './pose/modelCatalog';
import {
  analysisReducer,
  initialAnalysisState,
  type AnalysisPhase,
} from './state/analysisReducer';
import type {
  AnalysisRange,
  PoseModelId,
  SourceMetadata,
} from './types';

type SourceSession = {
  id: number;
  url: string;
  posterUrl: string | null;
  metadata: SourceMetadata;
};

const isRunning = (phase: AnalysisPhase) =>
  phase === 'analyzing' || phase === 'partial';

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

function FileButton({
  compact,
  label,
  onFile,
}: {
  compact?: boolean;
  label: string;
  onFile: (file: File) => void;
}) {
  return (
    <label className={compact ? 'file-button file-button-compact' : 'file-button'}>
      <UploadIcon />
      <span>{label}</span>
      <input
        data-testid="video-input"
        type="file"
        accept="video/*,.mov"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onFile(file);
          event.currentTarget.value = '';
        }}
      />
    </label>
  );
}

export function App() {
  const [source, setSource] = useState<SourceSession | null>(null);
  const [range, setRange] = useState<AnalysisRange | null>(null);
  const [analysis, dispatch] = useReducer(analysisReducer, undefined, () =>
    initialAnalysisState(0),
  );
  const [opening, setOpening] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [overlaysVisible, setOverlaysVisible] = useState(true);
  const [stageFeedback, setStageFeedback] = useState<StageFeedback>('none');
  const [qualityPresetId, setQualityPresetId] =
    useState<PoseQualityPresetId>('balanced');
  const [policyTarget, setPolicyTarget] = useState<PosePolicyTarget>('display');
  const [qualityPolicy, setQualityPolicy] = useState(() =>
    clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display),
  );
  const [previewMode, setPreviewMode] = useState<PosePreviewMode>('smoothed');
  const [selectedModel, setSelectedModel] = useState<PoseModelId>('lite');
  const [calibrationLabels, setCalibrationLabels] = useState<
    CalibrationLabelRecord[]
  >([]);

  const adapterRef = useRef<BrowserMediaAdapter | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const posterUrlRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analysisControllerRef = useRef<PoseAnalysisController | null>(null);
  const reviewMainRef = useRef<HTMLDivElement | null>(null);
  const stageSlotRef = useRef<HTMLDivElement | null>(null);
  const transportRef = useRef<HTMLDivElement | null>(null);
  const analysisRef = useRef(analysis);
  const importGenerationRef = useRef(0);
  const sessionSequenceRef = useRef(0);
  const jobSequenceRef = useRef(0);
  const autoplaySessionRef = useRef<number | null>(null);
  analysisRef.current = analysis;

  const player = useMemo(() => new PlayerController(), []);
  const playerSnapshot = useSyncExternalStore(
    player.subscribe,
    player.getSnapshot,
    player.getSnapshot,
  );
  const stageSize = useReviewStageSize({
    enabled: source !== null,
    displayWidth: source?.metadata.displayWidth ?? 1,
    displayHeight: source?.metadata.displayHeight ?? 1,
    layoutKey: sourceError ?? '',
    reviewMainRef,
    stageSlotRef,
    transportRef,
  });

  const attachVideo = useCallback(
    (video: HTMLVideoElement | null) => {
      videoRef.current = video;
      player.attach(video);
    },
    [player],
  );

  const cancelAnalysis = useCallback(() => {
    analysisControllerRef.current?.cancel();
    analysisControllerRef.current = null;
    const current = analysisRef.current;
    if (current.jobId !== null && isRunning(current.phase)) {
      dispatch({
        type: 'cancel',
        sessionId: current.sessionId,
        jobId: current.jobId,
      });
    }
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="overlay-canvas"]');
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const openFile = useCallback(
    async (file: File) => {
      const candidateGeneration = ++importGenerationRef.current;
      cancelAnalysis();
      setOpening(true);
      setSourceError(null);

      let candidate: BrowserMediaAdapter | null = null;
      try {
        const { BrowserMediaAdapter } = await import('./media/mediaAdapter');
        candidate = await BrowserMediaAdapter.open(file);
        const posterBlob = await candidate.createPosterBlob().catch(() => null);
        if (candidateGeneration !== importGenerationRef.current) {
          candidate.dispose();
          return;
        }

        const nextUrl = URL.createObjectURL(file);
        const nextPosterUrl = posterBlob ? URL.createObjectURL(posterBlob) : null;
        const video = videoRef.current;
        video?.pause();
        if (video) {
          video.removeAttribute('src');
          video.load();
        }
        clearCanvas();
        adapterRef.current?.dispose();
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        if (posterUrlRef.current) URL.revokeObjectURL(posterUrlRef.current);

        const sessionId = ++sessionSequenceRef.current;
        adapterRef.current = candidate;
        objectUrlRef.current = nextUrl;
        posterUrlRef.current = nextPosterUrl;
        setSource({
          id: sessionId,
          url: nextUrl,
          posterUrl: nextPosterUrl,
          metadata: candidate.metadata,
        });
        setRange(defaultAnalysisRange(candidate.metadata.durationMicroseconds));
        setStageFeedback('none');
        setOverlaysVisible(true);
        setCalibrationLabels([]);
        autoplaySessionRef.current = null;
        dispatch({ type: 'reset', sessionId });
      } catch (error) {
        candidate?.dispose();
        if (candidateGeneration === importGenerationRef.current) {
          setSourceError(
            error instanceof Error ? error.message : 'The selected video could not be opened.',
          );
        }
      } finally {
        if (candidateGeneration === importGenerationRef.current) setOpening(false);
      }
    },
    [cancelAnalysis, clearCanvas],
  );

  useLayoutEffect(() => {
    const root = document.documentElement;
    const syncVisualViewport = () => {
      const viewport = window.visualViewport;
      const width = viewport?.width ?? root.clientWidth;
      const offsetLeft = viewport?.offsetLeft ?? 0;
      const centerOffset =
        offsetLeft + width / 2 - root.clientWidth / 2;
      root.style.setProperty('--visual-viewport-width', `${width}px`);
      root.style.setProperty('--visual-viewport-left', `${offsetLeft}px`);
      root.style.setProperty('--visual-viewport-center-offset', `${centerOffset}px`);
    };

    syncVisualViewport();
    window.addEventListener('resize', syncVisualViewport);
    window.visualViewport?.addEventListener('resize', syncVisualViewport);
    window.visualViewport?.addEventListener('scroll', syncVisualViewport);

    return () => {
      window.removeEventListener('resize', syncVisualViewport);
      window.visualViewport?.removeEventListener('resize', syncVisualViewport);
      window.visualViewport?.removeEventListener('scroll', syncVisualViewport);
      root.style.removeProperty('--visual-viewport-width');
      root.style.removeProperty('--visual-viewport-left');
      root.style.removeProperty('--visual-viewport-center-offset');
    };
  }, []);

  useEffect(() => {
    const preventPageZoom = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };
    const options: AddEventListenerOptions = { passive: false };
    document.addEventListener('gesturestart', preventPageZoom, options);
    document.addEventListener('gesturechange', preventPageZoom, options);

    return () => {
      document.removeEventListener('gesturestart', preventPageZoom, options);
      document.removeEventListener('gesturechange', preventPageZoom, options);
    };
  }, []);

  useEffect(
    () => () => {
      importGenerationRef.current += 1;
      analysisControllerRef.current?.cancel();
      player.pause();
      const video = videoRef.current;
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
      adapterRef.current?.dispose();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (posterUrlRef.current) URL.revokeObjectURL(posterUrlRef.current);
      player.destroy();
    },
    [player],
  );

  const changeRange = useCallback(
    (nextRange: AnalysisRange) => {
      cancelAnalysis();
      setRange(nextRange);
      setStageFeedback('none');
      if (source) dispatch({ type: 'reset', sessionId: source.id });
    },
    [cancelAnalysis, source],
  );

  const runAnalysis = useCallback(
    (resume: boolean) => {
      const adapter = adapterRef.current;
      if (!adapter || !source || !range || !source.metadata.browserCanDecode) return;
      if (isRunning(analysisRef.current.phase)) return;

      const controller = new PoseAnalysisController();
      analysisControllerRef.current = controller;
      const jobId = ++jobSequenceRef.current;
      const schedule = analysisTimestamps(range);
      const current = analysisRef.current;
      const canResume =
        resume &&
        current.model === selectedModel &&
        current.range?.startMicroseconds === range.startMicroseconds &&
        current.range?.endMicroseconds === range.endMicroseconds;

      dispatch({
        type: 'start',
        sessionId: source.id,
        jobId,
        range,
        total: schedule.length,
        resume: canResume,
        model: selectedModel,
      });

      void controller
        .run({
          adapter,
          range,
          model: selectedModel,
          completedRequestMicroseconds: canResume
            ? current.completedRequestMicroseconds
            : [],
          existingSamples: canResume ? current.samples : [],
          onDelegate: (delegate) =>
            dispatch({ type: 'delegate', sessionId: source.id, jobId, delegate }),
          onAttempt: (attempt) =>
            dispatch({
              type: 'attempt',
              sessionId: source.id,
              jobId,
              ...attempt,
            }),
        })
        .then(() => {
          dispatch({ type: 'complete', sessionId: source.id, jobId });
        })
        .catch((error) => {
          if (isAbortError(error)) return;
          dispatch({
            type: 'fail',
            sessionId: source.id,
            jobId,
            error: error instanceof Error ? error.message : 'Pose analysis failed.',
            errorDetails: createAnalysisDiagnostics(error),
          });
        })
        .finally(() => {
          if (analysisControllerRef.current === controller) {
            analysisControllerRef.current = null;
          }
        });
    },
    [range, selectedModel, source],
  );

  const qualityEvaluation = useMemo(
    () => evaluatePoseQuality(analysis.samples, qualityPolicy),
    [analysis.samples, qualityPolicy],
  );
  const calibrationFrameIndex = useMemo(
    () =>
      nearestPresentationFrameIndex(
        qualityEvaluation.samples,
        secondsToMicroseconds(playerSnapshot.currentTimeSeconds),
        25_000,
      ),
    [playerSnapshot.currentTimeSeconds, qualityEvaluation.samples],
  );
  const currentQualitySample =
    calibrationFrameIndex === null
      ? null
      : qualityEvaluation.samples[calibrationFrameIndex];
  const calibrationLabelMetrics = useMemo(
    () => evaluateCalibrationLabels(calibrationLabels, qualityEvaluation),
    [calibrationLabels, qualityEvaluation],
  );

  const seekToCalibrationFrame = useCallback(
    (frameIndex: number) => {
      const sample = qualityEvaluation.samples[frameIndex];
      if (!sample) return;
      player.pause();
      player.seek(microsecondsToSeconds(sample.timestampMicroseconds));
    },
    [player, qualityEvaluation.samples],
  );

  const changeQualityPreset = useCallback((preset: PoseQualityPresetId) => {
    setQualityPresetId(preset);
    setPolicyTarget('display');
    setQualityPolicy(clonePoseQualityPolicy(POSE_QUALITY_PROFILES[preset].display));
    setPreviewMode('smoothed');
  }, []);

  const changePolicyTarget = useCallback(
    (target: PosePolicyTarget) => {
      setPolicyTarget(target);
      setQualityPolicy(
        clonePoseQualityPolicy(POSE_QUALITY_PROFILES[qualityPresetId][target]),
      );
      setPreviewMode(target === 'display' ? 'smoothed' : 'accepted');
    },
    [qualityPresetId],
  );

  const resetQualityPolicy = useCallback(() => {
    setQualityPolicy(
      clonePoseQualityPolicy(
        POSE_QUALITY_PROFILES[qualityPresetId][policyTarget],
      ),
    );
  }, [policyTarget, qualityPresetId]);

  const updateQualityPolicy = useCallback(
    (policy: typeof qualityPolicy) => {
      setQualityPolicy({
        ...policy,
        id: `${qualityPresetId}-${policyTarget}-custom`,
      });
    },
    [policyTarget, qualityPresetId],
  );

  const changeAnalysisModel = useCallback(
    (model: PoseModelId) => {
      if (model === selectedModel) return;
      cancelAnalysis();
      setSelectedModel(model);
      setCalibrationLabels([]);
      setStageFeedback('none');
      if (source) dispatch({ type: 'reset', sessionId: source.id });
    },
    [cancelAnalysis, selectedModel, source],
  );

  const labelCurrentJoint = useCallback(
    (
      landmarkIndex: number,
      label: CalibrationLabel,
      timestampMicroseconds: number,
    ) => {
      if (!source) return;
      setCalibrationLabels((current) => [
        ...current.filter(
          (entry) =>
            !(
              entry.sessionId === source.id &&
              entry.timestampMicroseconds === timestampMicroseconds &&
              entry.landmarkIndex === landmarkIndex
            ),
        ),
        {
          sessionId: source.id,
          timestampMicroseconds,
          landmarkIndex,
          label,
        },
      ]);
    },
    [source],
  );

  const exportCalibration = useCallback(() => {
    if (!source) return;
    const payload = {
      schemaVersion: 'crux-pose-calibration-v1',
      exportedAt: new Date().toISOString(),
      source: {
        sessionId: source.id,
        metadata: source.metadata,
      },
      range: analysis.range,
      analysis: {
        phase: analysis.phase,
        completedRequests: analysis.completed,
        scheduledRequests: analysis.total,
        completedRequestMicroseconds: analysis.completedRequestMicroseconds,
        storedRawSamples: analysis.samples.length,
        requestsWithoutStoredSample: Math.max(
          0,
          analysis.completed - analysis.samples.length,
        ),
      },
      model: selectedModel,
      preset: qualityPresetId,
      policyTarget,
      previewMode,
      policy: qualityPolicy,
      metrics: qualityEvaluation.metrics,
      labels: calibrationLabels,
      labelMetrics: calibrationLabelMetrics,
      rawSamples: analysis.samples,
      qualitySamples: qualityEvaluation.samples.map((sample) => ({
        requestedTimestampMicroseconds: sample.requestedTimestampMicroseconds,
        timestampMicroseconds: sample.timestampMicroseconds,
        decisions: sample.decisions.map((decision) => ({
          landmarkIndex: decision.landmarkIndex,
          bodyGroup: decision.bodyGroup,
          status: decision.status,
          reasons: decision.reasons,
          threshold: decision.threshold,
          accepted: decision.accepted,
          smoothed: decision.smoothed,
        })),
      })),
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const baseName =
      source.metadata.fileName.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-') ||
      'pose-calibration';
    anchor.href = url;
    anchor.download = `${baseName}-${selectedModel}-${qualityPolicy.version}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [
    analysis.completed,
    analysis.completedRequestMicroseconds,
    analysis.phase,
    analysis.range,
    analysis.samples,
    analysis.total,
    calibrationLabelMetrics,
    calibrationLabels,
    policyTarget,
    previewMode,
    qualityEvaluation,
    qualityPolicy,
    qualityPresetId,
    selectedModel,
    source,
  ]);

  const progress =
    analysis.total > 0 ? Math.min(1, analysis.completed / analysis.total) : 0;
  const playbackDuration = playerSnapshot.durationSeconds || source?.metadata.durationSeconds || 0;
  const playbackPercent =
    playbackDuration > 0
      ? Math.min(100, Math.max(0, (playerSnapshot.currentTimeSeconds / playbackDuration) * 100))
      : 0;
  const sourceDurationMicroseconds = source?.metadata.durationMicroseconds ?? 0;
  const analysisStartPercent =
    range && sourceDurationMicroseconds > 0
      ? (range.startMicroseconds / sourceDurationMicroseconds) * 100
      : 0;
  const analysisEndPercent =
    range && sourceDurationMicroseconds > 0
      ? (range.endMicroseconds / sourceDurationMicroseconds) * 100
      : 0;
  const sourceReady = Boolean(source && range);
  const modelLabel = POSE_MODELS[analysis.model ?? selectedModel].label;

  const analysisStatus = (() => {
    if (!source?.metadata.browserCanDecode) return 'Pose analysis unavailable for this codec';
    if (analysis.phase === 'analyzing') return 'Preparing pose…';
    if (analysis.phase === 'partial') return `Analyzing ${Math.round(progress * 100)}%`;
    if (analysis.phase === 'ready') return 'Analysis ready';
    if (analysis.phase === 'cancelled') return `Analysis stopped at ${Math.round(progress * 100)}%`;
    if (analysis.phase === 'error') return 'Analysis interrupted';
    return 'Ready when you are';
  })();

  const feedbackLabel =
    stageFeedback === 'pending'
      ? 'Analyzing this moment…'
      : stageFeedback === 'unavailable'
        ? 'Pose unavailable here'
        : stageFeedback === 'outside'
          ? 'Outside analysis range'
          : null;

  return (
    <main
      className={`app-shell ${source ? 'has-source' : 'is-empty'}`}
      data-analysis-phase={analysis.phase}
      data-sample-count={analysis.samples.length}
      data-quality-sample-count={qualityEvaluation.samples.length}
      data-quality-policy={qualityPolicy.id}
      data-analysis-model={analysis.model ?? selectedModel}
      data-quality-coverage={qualityEvaluation.metrics.acceptedCoverage}
      data-quality-observed={qualityEvaluation.metrics.structurallyObservedJointSlots}
      data-quality-model-empty={qualityEvaluation.metrics.modelEmptySamples}
      data-quality-confidence-rejects={
        qualityEvaluation.metrics.confidenceRejectedJointSlots
      }
      data-quality-temporal-rejects={
        qualityEvaluation.metrics.temporalRejectedJointSlots
      }
      data-analysis-mean-inference-ms={
        qualityEvaluation.metrics.meanInferenceMilliseconds
      }
      data-analysis-p95-inference-ms={
        qualityEvaluation.metrics.p95InferenceMilliseconds
      }
      data-quality-flicker={qualityEvaluation.metrics.flickerCount}
      data-quality-longest-gap-us={
        qualityEvaluation.metrics.longestGapMicroseconds
      }
      data-quality-mean-reacquisition-us={
        qualityEvaluation.metrics.meanReacquisitionMicroseconds
      }
      data-quality-smoothing-displacement={
        qualityEvaluation.metrics.meanSmoothingDisplacement
      }
      data-quality-group-coverage={JSON.stringify(
        qualityEvaluation.metrics.groupCoverage,
      )}
    >
      <header className="topbar">
        <a className="brand" href="/" aria-label="Crux Vision home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Crux Vision</strong>
            <small>Movement review</small>
          </span>
        </a>

        <div className="topbar-actions">
          <span className="local-status"><ShieldIcon /> Local only</span>
          {source && <FileButton compact label="Replace video" onFile={(file) => void openFile(file)} />}
        </div>
      </header>

      {sourceError && (
        <div className="notice notice-error" role="alert">
          <span>{sourceError}</span>
          <button type="button" aria-label="Dismiss error" onClick={() => setSourceError(null)}>
            <CloseIcon />
          </button>
        </div>
      )}

      {!source ? (
        <section className="empty-workspace">
          <div className="empty-copy">
            <span className="eyebrow"><SparkIcon /> Find the move that matters</span>
            <h1>See your climbing<br />in motion.</h1>
            <p>
              Open a video, isolate the crux, and follow your movement with a live
              skeleton and body-center trails. Nothing leaves this device.
            </p>
            <FileButton
              label={opening ? 'Opening video…' : 'Open a climbing video'}
              onFile={(file) => void openFile(file)}
            />
            <span className="file-note">MOV, MP4, and common iPhone video · up to 20s per analysis</span>
          </div>
          <div className="empty-visual" aria-hidden="true">
            <div className="route-line route-line-left" />
            <div className="route-line route-line-right" />
            <div className="empty-frame">
              <div className="empty-frame-grid" />
              <span className="empty-frame-label">YOUR CLIP</span>
              <span className="empty-frame-time">00:00</span>
              <div className="empty-frame-play"><PlayIcon size={28} /></div>
            </div>
          </div>
        </section>
      ) : (
        <section
          className={`review-workspace ${
            source.metadata.displayHeight > source.metadata.displayWidth
              ? 'is-portrait'
              : 'is-landscape'
          }`}
          data-video-orientation={
            source.metadata.displayHeight > source.metadata.displayWidth
              ? 'portrait'
              : 'landscape'
          }
        >
          <div
            ref={reviewMainRef}
            className="review-main"
            style={
              {
                '--stage-aspect': source.metadata.displayWidth / source.metadata.displayHeight,
                '--stage-width': stageSize ? `${stageSize.width}px` : '100%',
              } as CSSProperties
            }
          >
            <div className="stage-heading">
              <div>
                <span className="eyebrow">Current session</span>
                <h1 title={source.metadata.fileName}>{source.metadata.fileName}</h1>
              </div>
              <span className="source-duration">{formatTime(source.metadata.durationSeconds)}</span>
            </div>

            <div ref={stageSlotRef} className="stage-slot">
              <div
                className="video-frame"
                data-testid="video-stage"
                data-display-width={source.metadata.displayWidth}
                data-display-height={source.metadata.displayHeight}
                data-rotation={source.metadata.rotationDegreesClockwise}
                data-available-width={stageSize?.availableWidth}
                data-available-height={stageSize?.availableHeight}
                style={
                  {
                    aspectRatio: `${source.metadata.displayWidth} / ${source.metadata.displayHeight}`,
                    width: stageSize?.width,
                    height: stageSize?.height,
                  } as CSSProperties
                }
                onClick={() => void player.togglePlayback().catch(() => undefined)}
              >
                <video
                  ref={attachVideo}
                  src={source.url}
                  poster={source.posterUrl ?? undefined}
                  playsInline
                  preload="auto"
                  onCanPlay={(event) => {
                    if (autoplaySessionRef.current === source.id) return;
                    autoplaySessionRef.current = source.id;
                    void event.currentTarget.play().catch(() => undefined);
                  }}
                />
                <OverlayCanvas
                  videoRef={videoRef}
                  metadata={source.metadata}
                  analysis={analysis}
                  quality={qualityEvaluation}
                  previewMode={previewMode}
                  visible={overlaysVisible}
                  onFeedbackChange={setStageFeedback}
                />
                <div className="stage-topline" aria-hidden="true">
                  <span>REVIEW</span>
                  {analysis.phase !== 'idle' && <span className="pose-live-dot">POSE</span>}
                </div>
                {feedbackLabel && <div className="stage-feedback">{feedbackLabel}</div>}
              </div>
            </div>

            <div
              ref={transportRef}
              className="transport"
              aria-label="Video controls"
            >
              <button
                type="button"
                className="play-button"
                aria-label={playerSnapshot.playing ? 'Pause video' : 'Play video'}
                onClick={() => void player.togglePlayback().catch(() => undefined)}
              >
                {playerSnapshot.playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <span className="transport-time">
                {formatTime(playerSnapshot.currentTimeSeconds)}
              </span>
              <label className="sr-only" htmlFor="playback-position">Video position</label>
              <div
                className="playback-timeline"
                style={
                  {
                    '--playback-percent': `${playbackPercent}%`,
                    '--analysis-start': `${analysisStartPercent}%`,
                    '--analysis-end': `${analysisEndPercent}%`,
                  } as CSSProperties
                }
              >
                <span
                  className="playback-analysis-range"
                  data-testid="playback-analysis-range"
                  aria-hidden="true"
                />
                <span className="playback-elapsed" aria-hidden="true" />
                <input
                  id="playback-position"
                  className="playback-slider"
                  type="range"
                  min={0}
                  max={playbackDuration || 1}
                  step={0.01}
                  value={Math.min(playerSnapshot.currentTimeSeconds, playbackDuration || 1)}
                  disabled={!playerSnapshot.ready}
                  onChange={(event) => player.seek(Number(event.currentTarget.value))}
                />
              </div>
              <span className="transport-time transport-duration">
                {formatTime(playbackDuration)}
              </span>
            </div>
          </div>

          <aside className="control-rail">
            {range && (
              <RangeSelector
                range={range}
                durationMicroseconds={source.metadata.durationMicroseconds}
                playheadMicroseconds={secondsToMicroseconds(playerSnapshot.currentTimeSeconds)}
                progress={progress}
                disabled={opening}
                onChange={changeRange}
              />
            )}

            <section className="analysis-section" aria-labelledby="analysis-title">
              <div className="section-heading analysis-heading">
                <div>
                  <span className="section-kicker">On-device pose</span>
                  <h2 id="analysis-title">Movement overlay</h2>
                </div>
                <label className="switch-control">
                  <input
                    type="checkbox"
                    checked={overlaysVisible}
                    onChange={(event) => setOverlaysVisible(event.currentTarget.checked)}
                  />
                  <span aria-hidden="true" />
                  <b>Overlays</b>
                </label>
              </div>

              <div className="analysis-preview" aria-hidden="true">
                <span className="trail-key trail-key-hip"><i /> Hip midpoint</span>
                <span className="trail-key trail-key-shoulder"><i /> Shoulder midpoint</span>
                <span className="trail-key trail-key-pose"><i /> Skeleton</span>
              </div>

              <PoseQualityPanel
                presetId={qualityPresetId}
                policyTarget={policyTarget}
                policy={qualityPolicy}
                previewMode={previewMode}
                evaluation={qualityEvaluation}
                currentSample={currentQualitySample}
                selectedModel={selectedModel}
                labelMetrics={calibrationLabelMetrics}
                labelCount={calibrationLabels.length}
                calibrationFrameIndex={calibrationFrameIndex}
                calibrationFrameCount={qualityEvaluation.samples.length}
                calibrationFrameTimestampMicroseconds={
                  currentQualitySample?.timestampMicroseconds ?? null
                }
                onPresetChange={changeQualityPreset}
                onPolicyTargetChange={changePolicyTarget}
                onPolicyChange={updateQualityPolicy}
                onPreviewModeChange={setPreviewMode}
                onModelChange={changeAnalysisModel}
                onLabel={labelCurrentJoint}
                onClearLabels={() => setCalibrationLabels([])}
                onResetPolicy={resetQualityPolicy}
                onExport={exportCalibration}
                onCalibrationFrameChange={seekToCalibrationFrame}
              />

              <div
                className={`analysis-status analysis-status-${analysis.phase}`}
                aria-live="polite"
                data-testid="analysis-status"
              >
                <span className="status-icon"><SparkIcon /></span>
                <span>
                  <strong>{analysisStatus}</strong>
                  <small>
                    {analysis.delegate
                      ? `${modelLabel} · ${analysis.delegate}`
                      : `${POSE_MODELS[selectedModel].label} · 30 samples/sec`}
                  </small>
                </span>
                {analysis.total > 0 && (
                  <span className="status-percent">{Math.round(progress * 100)}%</span>
                )}
              </div>

              {analysis.total > 0 && (
                <div
                  className="analysis-progress"
                  role="progressbar"
                  aria-label="Analysis progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                  data-testid="analysis-progress"
                >
                  <span style={{ width: `${Math.min(100, progress * 100)}%` }} />
                </div>
              )}

              {analysis.error && (
                <>
                  <p className="analysis-error" role="alert">{analysis.error}</p>
                  {analysis.errorDetails && (
                    <details className="analysis-diagnostics">
                      <summary>Diagnostic details</summary>
                      <pre>{analysis.errorDetails}</pre>
                      <button
                        type="button"
                        className="button-subtle"
                        onClick={() =>
                          void navigator.clipboard?.writeText(analysis.errorDetails ?? '')
                        }
                      >
                        Copy diagnostics
                      </button>
                    </details>
                  )}
                </>
              )}
              {!source.metadata.browserCanDecode && (
                <p className="analysis-error" role="alert">
                  This browser can preview the clip, but cannot decode frames for local analysis.
                </p>
              )}

              <div className="analysis-actions">
                {isRunning(analysis.phase) ? (
                  <button type="button" className="button-secondary" onClick={cancelAnalysis}>
                    Cancel analysis
                  </button>
                ) : analysis.phase === 'cancelled' || analysis.phase === 'error' ? (
                  <>
                    <button
                      type="button"
                      className="button-primary"
                      disabled={!source.metadata.browserCanDecode}
                      onClick={() => runAnalysis(true)}
                    >
                      <SparkIcon /> Resume analysis
                    </button>
                    <button type="button" className="button-subtle" onClick={() => runAnalysis(false)}>
                      Start over
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="button-primary"
                    disabled={!sourceReady || !source.metadata.browserCanDecode}
                    onClick={() => runAnalysis(false)}
                  >
                    <SparkIcon /> {analysis.phase === 'ready' ? 'Analyze again' : 'Analyze range'}
                  </button>
                )}
              </div>
              <p className="privacy-note"><ShieldIcon /> Video and pose stay on this device.</p>
            </section>
          </aside>
        </section>
      )}
    </main>
  );
}

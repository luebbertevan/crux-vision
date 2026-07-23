import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BrowserMediaAdapter } from './media/mediaAdapter';
import { containRect, drawPose, nearestPose } from './pose/drawPose';
import { MediaPipeWorkerClient } from './pose/mediapipeClient';
import { POSE_MODELS } from './pose/modelCatalog';
import type {
  BenchmarkSummary,
  Delegate,
  PoseModelId,
  SourceMetadata,
  TimedPose,
} from './types';

type RunState = 'idle' | 'loading-model' | 'analyzing' | 'complete' | 'error';

const formatNumber = (value: number, digits = 1) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);

const formatBytes = (bytes: number) => `${formatNumber(bytes / 1_048_576)} MB`;

const timestampsForRange = (start: number, end: number, sampleRate: number): number[] => {
  const timestamps: number[] = [];
  const interval = 1 / sampleRate;
  for (let timestamp = start; timestamp <= end + interval / 2; timestamp += interval) {
    timestamps.push(Number(timestamp.toFixed(6)));
  }
  return timestamps;
};

const IMPORTANT_JOINTS: Record<string, number> = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftAnkle: 27,
  rightAnkle: 28,
};

const summarizeJointQuality = (poses: TimedPose[]) =>
  Object.fromEntries(
    Object.entries(IMPORTANT_JOINTS).map(([name, index]) => {
      let accepted = 0;
      let visibilityTotal = 0;
      let largeJumpCandidates = 0;
      let previous: TimedPose['landmarks'][number] | null = null;

      for (const pose of poses) {
        const landmark = pose.landmarks[index];
        const visibility = landmark?.visibility ?? 0;
        visibilityTotal += visibility;
        if (!landmark || visibility < 0.5) {
          previous = null;
          continue;
        }

        accepted += 1;
        if (previous) {
          const displacement = Math.hypot(landmark.x - previous.x, landmark.y - previous.y);
          if (displacement > 0.18) largeJumpCandidates += 1;
        }
        previous = landmark;
      }

      return [
        name,
        {
          acceptedCoverage: poses.length > 0 ? accepted / poses.length : 0,
          meanVisibility: poses.length > 0 ? visibilityTotal / poses.length : 0,
          largeJumpCandidates,
        },
      ];
    }),
  );

export function App() {
  const [metadata, setMetadata] = useState<SourceMetadata | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [model, setModel] = useState<PoseModelId>('lite');
  const [delegate, setDelegate] = useState<Delegate>('GPU');
  const [sampleRate, setSampleRate] = useState(15);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(10);
  const [poses, setPoses] = useState<TimedPose[]>([]);
  const posesRef = useRef<TimedPose[]>([]);
  const [runState, setRunState] = useState<RunState>('idle');
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [browserVideoSize, setBrowserVideoSize] = useState<string>('—');

  const adapterRef = useRef<BrowserMediaAdapter | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const cancelRef = useRef(false);

  const aspectRatio = metadata
    ? `${metadata.displayWidth} / ${metadata.displayHeight}`
    : '16 / 9';

  const currentModelLabel = POSE_MODELS[model].label;
  const isRunning = runState === 'loading-model' || runState === 'analyzing';

  const clearOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const renderOverlay = useCallback(
    (mediaTime: number) => {
      const canvas = overlayRef.current;
      if (!canvas) return;
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const context = canvas.getContext('2d');
      if (!context) return;
      const pose = nearestPose(posesRef.current, mediaTime, 0.75 / sampleRate);
      const video = videoRef.current;
      const contentRect = containRect(
        width,
        height,
        video?.videoWidth ?? metadata?.displayWidth ?? width,
        video?.videoHeight ?? metadata?.displayHeight ?? height,
      );
      drawPose(context, pose?.landmarks ?? [], width, height, 0.5, contentRect);
    },
    [metadata, sampleRate],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let callbackId = 0;
    const onFrame: VideoFrameRequestCallback = (_now, frame) => {
      renderOverlay(frame.mediaTime);
      callbackId = video.requestVideoFrameCallback(onFrame);
    };
    callbackId = video.requestVideoFrameCallback(onFrame);
    return () => video.cancelVideoFrameCallback(callbackId);
  }, [renderOverlay, videoUrl]);

  useEffect(
    () => () => {
      adapterRef.current?.dispose();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    window.__CRUX_SPIKE__ = { metadata, summary };
  }, [metadata, summary]);

  const onFileSelected = async (file: File | undefined) => {
    if (!file) return;
    cancelRef.current = true;
    setError(null);
    setSummary(null);
    setPoses([]);
    posesRef.current = [];
    clearOverlay();
    setRunState('idle');

    adapterRef.current?.dispose();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

    try {
      const adapter = await BrowserMediaAdapter.open(file);
      adapterRef.current = adapter;
      setMetadata(adapter.metadata);
      setRangeStart(0);
      setRangeEnd(Math.min(10, adapter.metadata.durationSeconds));

      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setVideoUrl(objectUrl);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      setRunState('error');
    }
  };

  const runBenchmark = async (engine: 'mediapipe' | 'movenet') => {
    const adapter = adapterRef.current;
    if (!adapter || !metadata) return;

    cancelRef.current = false;
    setError(null);
    setSummary(null);
    setRunState('loading-model');
    setPoses([]);
    posesRef.current = [];
    clearOverlay();

    const timestamps = timestampsForRange(
      Math.max(0, rangeStart),
      Math.min(metadata.durationSeconds, Math.max(rangeStart, rangeEnd)),
      sampleRate,
    );
    setProgress({ completed: 0, total: timestamps.length });

    const worker = engine === 'mediapipe' ? new MediaPipeWorkerClient() : null;
    let moveNet: import('./pose/moveNetClient').MoveNetClient | null = null;
    const wallStartedAt = performance.now();
    let loadMilliseconds = 0;
    let extractionMilliseconds = 0;
    let inferenceMilliseconds = 0;
    let completedSamples = 0;
    let detectedSamples = 0;
    const nextPoses: TimedPose[] = [];

    try {
      if (worker) {
        loadMilliseconds = await worker.initialize(model, delegate);
      } else {
        const { MoveNetClient } = await import('./pose/moveNetClient');
        moveNet = new MoveNetClient();
        loadMilliseconds = await moveNet.initialize();
      }
      setRunState('analyzing');

      let extractionStartedAt = performance.now();
      for await (const wrapped of adapter.framesAt(timestamps)) {
        extractionMilliseconds += performance.now() - extractionStartedAt;
        if (cancelRef.current) break;

        let pose: TimedPose;
        if (worker) {
          const bitmapStartedAt = performance.now();
          const bitmap = await createImageBitmap(wrapped.canvas);
          extractionMilliseconds += performance.now() - bitmapStartedAt;
          pose = await worker.analyze(bitmap, wrapped.timestamp);
        } else {
          pose = await moveNet!.analyze(wrapped.canvas, wrapped.timestamp);
        }
        inferenceMilliseconds += pose.inferenceMilliseconds;
        completedSamples += 1;
        if (pose.landmarks.length > 0) detectedSamples += 1;
        nextPoses.push(pose);
        posesRef.current = nextPoses;

        if (completedSamples % 5 === 0 || completedSamples === timestamps.length) {
          setPoses([...nextPoses]);
          setProgress({ completed: completedSamples, total: timestamps.length });
        }
        extractionStartedAt = performance.now();
      }

      const wallMilliseconds = performance.now() - wallStartedAt;
      const finalSummary: BenchmarkSummary = {
        engine,
        modelLabel: engine === 'mediapipe' ? POSE_MODELS[model].label : 'MoveNet Lightning',
        executionContext: engine === 'mediapipe' ? 'worker' : 'main-thread',
        delegate: engine === 'mediapipe' ? delegate : 'WebGL',
        sampleRate,
        requestedSamples: timestamps.length,
        completedSamples,
        detectedSamples,
        firstDetectedTimestampSeconds:
          nextPoses.find((pose) => pose.landmarks.length > 0)?.sourceTimestampSeconds ?? null,
        lastDetectedTimestampSeconds:
          nextPoses.slice().reverse().find((pose) => pose.landmarks.length > 0)
            ?.sourceTimestampSeconds ?? null,
        loadMilliseconds,
        extractionMilliseconds,
        inferenceMilliseconds,
        wallMilliseconds,
        averageInferenceMilliseconds:
          completedSamples > 0 ? inferenceMilliseconds / completedSamples : 0,
        inferenceFramesPerSecond:
          inferenceMilliseconds > 0 ? (completedSamples * 1_000) / inferenceMilliseconds : 0,
        detectedCoverage: completedSamples > 0 ? detectedSamples / completedSamples : 0,
        jointQuality: summarizeJointQuality(nextPoses),
      };
      setPoses([...nextPoses]);
      setProgress({ completed: completedSamples, total: timestamps.length });
      setSummary(finalSummary);
      setRunState('complete');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      setRunState('error');
    } finally {
      await worker?.dispose().catch(() => undefined);
      moveNet?.dispose();
    }
  };

  const cancelBenchmark = () => {
    cancelRef.current = true;
  };

  const downloadResult = () => {
    if (!summary || !metadata) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      secureContext: window.isSecureContext,
      metadata,
      summary,
    };
    const url = URL.createObjectURL(
      new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `crux-vision-${summary.engine}-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const summaryRows = useMemo(
    () =>
      summary
        ? [
            ['Model', `${summary.modelLabel} · ${summary.delegate}`],
            ['Execution', summary.executionContext],
            ['Model load', `${formatNumber(summary.loadMilliseconds)} ms`],
            ['Samples', `${summary.completedSamples} / ${summary.requestedSamples}`],
            ['Pose coverage', `${formatNumber(summary.detectedCoverage * 100)}%`],
            ['Average inference', `${formatNumber(summary.averageInferenceMilliseconds)} ms`],
            ['Inference throughput', `${formatNumber(summary.inferenceFramesPerSecond)} fps`],
            ['Frame extraction', `${formatNumber(summary.extractionMilliseconds)} ms`],
            ['Total wall time', `${formatNumber(summary.wallMilliseconds)} ms`],
          ]
        : [],
    [summary],
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Crux Vision · R1</p>
          <h1>Media and pose diagnostic</h1>
          <p>
            Local file, display-oriented samples, worker-isolated pose, live Canvas overlay.
          </p>
        </div>
        <span className={`status status-${runState}`}>{runState.replace('-', ' ')}</span>
      </header>

      <section className="import-panel">
        <label className="file-picker">
          <span>Choose a climbing video</span>
          <input
            data-testid="video-input"
            type="file"
            accept="video/*,.mov"
            onChange={(event) => void onFileSelected(event.target.files?.[0])}
          />
        </label>
        <p>The file stays on this device. The diagnostic does not upload it.</p>
      </section>

      {error && <div className="error-card">{error}</div>}

      <div className="workspace-grid">
        <section className="stage-panel">
          <div className="video-stage" style={{ aspectRatio }}>
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={(event) => {
                    const video = event.currentTarget;
                    setBrowserVideoSize(`${video.videoWidth} × ${video.videoHeight}`);
                    renderOverlay(video.currentTime);
                  }}
                  onSeeked={(event) => renderOverlay(event.currentTarget.currentTime)}
                />
                <canvas ref={overlayRef} className="pose-overlay" aria-hidden="true" />
              </>
            ) : (
              <div className="empty-stage">Import a local portrait or landscape video.</div>
            )}
          </div>
        </section>

        <aside className="diagnostic-panel">
          <section>
            <h2>Source contract</h2>
            {metadata ? (
              <dl data-testid="source-metadata" className="metadata-grid">
                <dt>File</dt><dd>{metadata.fileName}</dd>
                <dt>Size</dt><dd>{formatBytes(metadata.fileSizeBytes)}</dd>
                <dt>Codec</dt><dd>{metadata.codec ?? 'unknown'}</dd>
                <dt>Duration</dt><dd>{formatNumber(metadata.durationSeconds, 2)} s</dd>
                <dt>Coded</dt><dd>{metadata.codedWidth} × {metadata.codedHeight}</dd>
                <dt>Rotation</dt><dd data-testid="rotation">{metadata.rotationDegreesClockwise}° clockwise</dd>
                <dt>Displayed</dt><dd data-testid="display-size">{metadata.displayWidth} × {metadata.displayHeight}</dd>
                <dt>Browser reports</dt><dd>{browserVideoSize}</dd>
                <dt>Approx. rate</dt><dd>{metadata.averageFrameRate ? `${formatNumber(metadata.averageFrameRate)} fps` : 'unknown'}</dd>
                <dt>WebCodecs</dt><dd>{metadata.browserCanDecode ? 'decodable' : 'unsupported'}</dd>
              </dl>
            ) : (
              <p className="muted">Waiting for a file.</p>
            )}
          </section>

          <section>
            <h2>Pose benchmark</h2>
            <div className="form-grid">
              <label>
                Model
                <select value={model} onChange={(event) => setModel(event.target.value as PoseModelId)}>
                  {Object.entries(POSE_MODELS).map(([id, value]) => (
                    <option key={id} value={id}>{value.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Delegate
                <select value={delegate} onChange={(event) => setDelegate(event.target.value as Delegate)}>
                  <option value="GPU">GPU</option>
                  <option value="CPU">CPU</option>
                </select>
              </label>
              <label>
                Samples/sec
                <select value={sampleRate} onChange={(event) => setSampleRate(Number(event.target.value))}>
                  <option value="5">5</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                </select>
              </label>
              <label>
                Start (s)
                <input type="number" min="0" step="0.1" value={rangeStart} onChange={(event) => setRangeStart(Number(event.target.value))} />
              </label>
              <label>
                End (s)
                <input type="number" min="0" step="0.1" value={rangeEnd} onChange={(event) => setRangeEnd(Number(event.target.value))} />
              </label>
            </div>

            <div className="button-row">
              <button type="button" disabled={!metadata || isRunning} onClick={() => void runBenchmark('mediapipe')}>
                Run {currentModelLabel}
              </button>
              <button type="button" className="secondary" disabled={!metadata || isRunning} onClick={() => void runBenchmark('movenet')}>
                Run MoveNet baseline
              </button>
              {isRunning && <button type="button" className="secondary" onClick={cancelBenchmark}>Cancel</button>}
            </div>

            {progress.total > 0 && (
              <div className="progress-block">
                <progress value={progress.completed} max={progress.total} />
                <span>{progress.completed} / {progress.total} samples</span>
              </div>
            )}
          </section>

          {summary && (
            <section data-testid="benchmark-summary">
              <h2>Run result</h2>
              <dl className="metadata-grid">
                {summaryRows.map(([label, value]) => (
                  <div className="result-row" key={label}>
                    <dt>{label}</dt><dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <button type="button" className="secondary download-button" onClick={downloadResult}>
                Download diagnostic JSON
              </button>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}

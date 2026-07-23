export type PoseModelId = 'lite' | 'full' | 'heavy';
export type Delegate = 'CPU' | 'GPU';

export type SourceMetadata = {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  durationSeconds: number;
  codec: string | null;
  codedWidth: number;
  codedHeight: number;
  displayWidth: number;
  displayHeight: number;
  rotationDegreesClockwise: 0 | 90 | 180 | 270;
  averageFrameRate: number | null;
  browserCanDecode: boolean;
};

export type PoseLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type TimedPose = {
  timestampMicroseconds: number;
  sourceTimestampSeconds: number;
  landmarks: PoseLandmark[];
  worldLandmarks: PoseLandmark[];
  inferenceMilliseconds: number;
};

export type BenchmarkSummary = {
  engine: 'mediapipe' | 'movenet';
  modelLabel: string;
  executionContext: 'worker' | 'main-thread';
  delegate: Delegate | 'WebGL';
  sampleRate: number;
  requestedSamples: number;
  completedSamples: number;
  detectedSamples: number;
  firstDetectedTimestampSeconds: number | null;
  lastDetectedTimestampSeconds: number | null;
  loadMilliseconds: number;
  extractionMilliseconds: number;
  inferenceMilliseconds: number;
  wallMilliseconds: number;
  averageInferenceMilliseconds: number;
  inferenceFramesPerSecond: number;
  detectedCoverage: number;
  jointQuality: Record<
    string,
    {
      acceptedCoverage: number;
      meanVisibility: number;
      largeJumpCandidates: number;
    }
  >;
};

export type Delegate = 'CPU' | 'GPU';
export type PoseModelId = 'lite' | 'full';

export type SourceMetadata = {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  durationSeconds: number;
  durationMicroseconds: number;
  codec: string | null;
  codedWidth: number;
  codedHeight: number;
  displayWidth: number;
  displayHeight: number;
  rotationDegreesClockwise: 0 | 90 | 180 | 270;
  flipHorizontal: boolean;
  flipVertical: boolean;
  averageFrameRate: number | null;
  browserCanDecode: boolean;
};

export type AnalysisRange = {
  startMicroseconds: number;
  endMicroseconds: number;
};

export type PoseLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
  presence: number | null;
};

export type RawPoseSample = {
  requestedTimestampMicroseconds: number;
  timestampMicroseconds: number;
  model: PoseModelId;
  delegate: Delegate;
  landmarks: PoseLandmark[];
  worldLandmarks: PoseLandmark[];
  inferenceMilliseconds: number;
};

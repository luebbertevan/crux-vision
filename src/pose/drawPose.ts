import type { PoseLandmark, TimedPose } from '../types';

export type ContentRect = {
  x: number;
  y: number;
  width: number;
  height: number;
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

export function nearestPose(
  poses: TimedPose[],
  mediaTimeSeconds: number,
  toleranceSeconds: number,
): TimedPose | null {
  if (poses.length === 0) return null;

  let low = 0;
  let high = poses.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const value = poses[middle].sourceTimestampSeconds;
    if (value < mediaTimeSeconds) low = middle + 1;
    else if (value > mediaTimeSeconds) high = middle - 1;
    else return poses[middle];
  }

  const candidates = [poses[low], poses[high]].filter(Boolean) as TimedPose[];
  const nearest = candidates.reduce((best, candidate) =>
    Math.abs(candidate.sourceTimestampSeconds - mediaTimeSeconds) <
    Math.abs(best.sourceTimestampSeconds - mediaTimeSeconds)
      ? candidate
      : best,
  );

  return Math.abs(nearest.sourceTimestampSeconds - mediaTimeSeconds) <= toleranceSeconds
    ? nearest
    : null;
}

export function containRect(
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
): ContentRect {
  if (contentWidth <= 0 || contentHeight <= 0) {
    return { x: 0, y: 0, width: containerWidth, height: containerHeight };
  }

  const scale = Math.min(containerWidth / contentWidth, containerHeight / contentHeight);
  const width = contentWidth * scale;
  const height = contentHeight * scale;
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}

export function drawPose(
  context: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  width: number,
  height: number,
  visibilityThreshold = 0.5,
  contentRect: ContentRect = { x: 0, y: 0, width, height },
): void {
  context.clearRect(0, 0, width, height);
  if (landmarks.length === 0) return;

  const accepted = (index: number) =>
    landmarks[index] && landmarks[index].visibility >= visibilityThreshold;

  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(2, width / 260);
  context.strokeStyle = 'rgba(178, 255, 102, 0.9)';
  context.shadowColor = 'rgba(0, 0, 0, 0.55)';
  context.shadowBlur = Math.max(2, width / 300);

  for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
    if (!accepted(startIndex) || !accepted(endIndex)) continue;
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];
    context.beginPath();
    context.moveTo(
      contentRect.x + start.x * contentRect.width,
      contentRect.y + start.y * contentRect.height,
    );
    context.lineTo(
      contentRect.x + end.x * contentRect.width,
      contentRect.y + end.y * contentRect.height,
    );
    context.stroke();
  }

  context.shadowBlur = 0;
  const radius = Math.max(2.5, width / 180);
  for (const landmark of landmarks) {
    if (landmark.visibility < visibilityThreshold) continue;
    context.beginPath();
    context.arc(
      contentRect.x + landmark.x * contentRect.width,
      contentRect.y + landmark.y * contentRect.height,
      radius,
      0,
      Math.PI * 2,
    );
    context.fillStyle = '#f5ffd8';
    context.fill();
    context.lineWidth = Math.max(1, width / 500);
    context.strokeStyle = '#17210d';
    context.stroke();
  }
}

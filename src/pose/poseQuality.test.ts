import { describe, expect, it } from 'vitest';

import type { PoseLandmark, RawPoseSample } from '../types';
import {
  clonePoseQualityPolicy,
  evaluateCalibrationLabels,
  evaluatePoseQuality,
  POSE_QUALITY_PROFILES,
  resolveConfidenceThreshold,
} from './poseQuality';
import { PRODUCT_POSE_LANDMARK_INDICES } from './poseView';

const point = (
  x: number,
  visibility = 1,
  presence: number | null = visibility,
): PoseLandmark => ({
  x,
  y: 0.5,
  z: 0,
  visibility,
  presence,
});

const sample = (
  timestampMicroseconds: number,
  wrist: PoseLandmark | null,
): RawPoseSample => {
  const landmarks: PoseLandmark[] = [];
  landmarks[11] = { ...point(0.4), y: 0.3 };
  landmarks[12] = { ...point(0.6), y: 0.3 };
  landmarks[23] = { ...point(0.43), y: 0.6 };
  landmarks[24] = { ...point(0.57), y: 0.6 };
  if (wrist) landmarks[15] = wrist;
  return {
    requestedTimestampMicroseconds: timestampMicroseconds,
    timestampMicroseconds,
    model: 'lite',
    delegate: 'CPU',
    landmarks,
    worldLandmarks: [],
    inferenceMilliseconds: 1,
  };
};

const decisionAt = (
  evaluation: ReturnType<typeof evaluatePoseQuality>,
  sampleIndex: number,
  landmarkIndex: number,
) => evaluation.samples[sampleIndex].decisions[landmarkIndex]!;

const completeSample = (
  timestampMicroseconds: number,
  missingLandmarkIndex: number | null = null,
) => {
  const result = sample(timestampMicroseconds, point(0.4));
  for (const landmarkIndex of PRODUCT_POSE_LANDMARK_INDICES) {
    if (landmarkIndex !== missingLandmarkIndex && !result.landmarks[landmarkIndex]) {
      result.landmarks[landmarkIndex] = point(0.4);
    }
  }
  if (missingLandmarkIndex !== null) {
    delete result.landmarks[missingLandmarkIndex];
  }
  return result;
};

describe('pose-quality policy', () => {
  it('resolves joint, body-group, torso fallback, and global thresholds in order', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.global = { visibility: 0.2, presence: 0.25 };
    policy.bodyGroups = {
      torso: { visibility: 0.4, presence: 0.45 },
      wristsHands: { visibility: 0.6, presence: 0.65 },
    };
    policy.joints = {
      15: { visibility: 0.8, presence: 0.85 },
    };

    expect(resolveConfidenceThreshold(policy, 15)).toEqual({
      visibility: 0.8,
      presence: 0.85,
    });
    expect(resolveConfidenceThreshold(policy, 16)).toEqual({
      visibility: 0.6,
      presence: 0.65,
    });
    expect(resolveConfidenceThreshold(policy, 11)).toEqual({
      visibility: 0.4,
      presence: 0.45,
    });
    expect(resolveConfidenceThreshold(policy, 13)).toEqual({
      visibility: 0.2,
      presence: 0.25,
    });
  });

  it('keeps visibility and presence independently inspectable', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.temporal.enabled = false;
    const evaluation = evaluatePoseQuality(
      [
        sample(0, point(0.2, 0.4, 0.9)),
        sample(33_333, point(0.21, 0.9, 0.4)),
      ],
      policy,
    );

    expect(decisionAt(evaluation, 0, 15).reasons).toContain('visibility');
    expect(decisionAt(evaluation, 0, 15).reasons).not.toContain('presence');
    expect(decisionAt(evaluation, 1, 15).reasons).toContain('presence');
    expect(decisionAt(evaluation, 1, 15).reasons).not.toContain('visibility');
  });

  it('uses acquire/keep hysteresis without bridging a rejected gap', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.temporal.enabled = false;
    policy.smoothing.enabled = false;
    const evaluation = evaluatePoseQuality(
      [
        sample(0, point(0.2, 0.61)),
        sample(33_333, point(0.21, 0.52)),
        sample(66_666, point(0.22, 0.46)),
        sample(99_999, point(0.23, 0.56)),
        sample(133_332, point(0.24, 0.62)),
      ],
      policy,
    );

    expect(
      evaluation.samples.map((entry) =>
        Boolean(entry.decisions[15]!.accepted),
      ),
    ).toEqual([true, true, false, false, true]);
  });

  it('rejects an isolated high-confidence slingshot using timestamps and body scale', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.smoothing.enabled = false;
    const evaluation = evaluatePoseQuality(
      [
        sample(0, point(0.2)),
        sample(33_333, point(0.9)),
        sample(66_666, point(0.21)),
      ],
      policy,
    );

    expect(decisionAt(evaluation, 1, 15).accepted).toBeNull();
    expect(decisionAt(evaluation, 1, 15).reasons).toContain(
      'isolated-jump',
    );
    expect(evaluation.metrics.temporalRejectedJointSlots).toBeGreaterThan(0);
  });

  it('rejects excessive speed even when confidence is high', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.smoothing.enabled = false;
    const evaluation = evaluatePoseQuality(
      [sample(0, point(0.2)), sample(33_333, point(0.9))],
      policy,
    );

    expect(decisionAt(evaluation, 1, 15).reasons).toContain('velocity');
  });

  it('compares distal segment length with the previous parent sample', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.smoothing.enabled = false;
    policy.temporal.maximumSpeedBodyLengthsPerSecond = 1_000;
    policy.temporal.maximumAccelerationBodyLengthsPerSecondSquared = 10_000;
    policy.temporal.maximumSegmentLengthChangeRatio = 0.2;
    const first = sample(0, point(0.4));
    const second = sample(33_333, point(0.7));
    first.landmarks[13] = point(0.3);
    second.landmarks[13] = point(0.3);

    const evaluation = evaluatePoseQuality([first, second], policy);

    expect(decisionAt(evaluation, 1, 15).reasons).toContain(
      'segment-length',
    );
  });

  it('smooths only inside accepted segments and resets exactly at a gap', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.temporal.enabled = false;
    const evaluation = evaluatePoseQuality(
      [
        sample(0, point(0.2)),
        sample(33_333, point(0.4)),
        sample(66_666, null),
        sample(99_999, point(0.8)),
      ],
      policy,
    );

    expect(decisionAt(evaluation, 1, 15).smoothed?.x).not.toBe(0.4);
    expect(decisionAt(evaluation, 1, 15).centered?.x).toBe(0.4);
    expect(decisionAt(evaluation, 2, 15).smoothed).toBeNull();
    expect(decisionAt(evaluation, 2, 15).centered).toBeNull();
    expect(decisionAt(evaluation, 3, 15).smoothed?.x).toBe(0.8);
    expect(decisionAt(evaluation, 3, 15).centered?.x).toBe(0.8);
  });

  it('keeps the Balanced smoother responsive during sustained fast motion', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.temporal.enabled = false;
    const step = 0.01;
    const evaluation = evaluatePoseQuality(
      Array.from({ length: 60 }, (_, index) =>
        sample(index * 33_333, point(0.2 + index * step)),
      ),
      policy,
    );
    const final = evaluation.samples.at(-1)!.decisions[15]!;
    const lagFrames = (final.accepted!.x - final.smoothed!.x) / step;

    expect(lagFrames).toBeLessThan(1);
  });

  it('centers a timestamp-weighted offline window without delaying constant motion', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.temporal.enabled = false;
    const timestamps = [0, 20_000, 65_000, 105_000, 150_000];
    const evaluation = evaluatePoseQuality(
      timestamps.map((timestamp) =>
        sample(timestamp, point(0.2 + timestamp / 1_000_000)),
      ),
      policy,
      { centeredSmoothingRadiusMicroseconds: 60_000 },
    );
    const middle = decisionAt(evaluation, 2, 15);

    expect(middle.centered?.x).toBeCloseTo(middle.accepted!.x, 10);
    expect(middle.smoothed!.x).toBeLessThan(middle.accepted!.x);
    expect(evaluation.centeredSmoothingRadiusMicroseconds).toBe(60_000);
  });

  it('reduces interior jitter with the centered offline window', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.temporal.enabled = false;
    const evaluation = evaluatePoseQuality(
      [0.5, 0.51, 0.49, 0.51, 0.5].map((x, index) =>
        sample(index * 33_333, point(x)),
      ),
      policy,
      { centeredSmoothingRadiusMicroseconds: 66_666 },
    );
    const middle = decisionAt(evaluation, 2, 15);

    expect(Math.abs(middle.centered!.x - 0.5)).toBeLessThan(
      Math.abs(middle.accepted!.x - 0.5),
    );
  });

  it('lets a zero-radius centered preview exactly match accepted raw', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.temporal.enabled = false;
    const evaluation = evaluatePoseQuality(
      [
        sample(0, point(0.2)),
        sample(33_333, point(0.4)),
        sample(66_666, point(0.3)),
      ],
      policy,
      { centeredSmoothingRadiusMicroseconds: 0 },
    );

    for (const entry of evaluation.samples) {
      expect(entry.decisions[15]!.centered).toEqual(
        entry.decisions[15]!.accepted,
      );
    }
  });

  it('still suppresses alternating low-amplitude jitter with responsive smoothing', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.temporal.enabled = false;
    const raw = Array.from({ length: 60 }, (_, index) =>
      sample(
        index * 33_333,
        point(0.5 + (index % 2 === 0 ? -0.004 : 0.004)),
      ),
    );
    const evaluation = evaluatePoseQuality(raw, policy);
    const smoothed = evaluation.samples.map(
      (entry) => entry.decisions[15]!.smoothed!.x,
    );
    let rawAcceleration = 0;
    let smoothedAcceleration = 0;
    for (let index = 2; index < raw.length; index += 1) {
      rawAcceleration += Math.abs(
        raw[index].landmarks[15].x -
          2 * raw[index - 1].landmarks[15].x +
          raw[index - 2].landmarks[15].x,
      );
      smoothedAcceleration += Math.abs(
        smoothed[index] -
          2 * smoothed[index - 1] +
          smoothed[index - 2],
      );
    }

    expect(smoothedAcceleration / rawAcceleration).toBeLessThan(0.25);
  });

  it('counts leading and never-acquired intervals as honest gaps, not reacquisitions', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.temporal.enabled = false;
    const evaluation = evaluatePoseQuality(
      [sample(0, null), sample(33_333, null), sample(66_666, point(0.3))],
      policy,
    );

    expect(evaluation.metrics.longestJointGapMicroseconds).toBe(66_666);
    expect(evaluation.metrics.reacquisitionCount).toBe(0);
  });

  it('limits quality decisions and metrics to product-used landmarks', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.temporal.enabled = false;
    const raw = completeSample(0);
    raw.landmarks[1] = point(0.5, 0, 0);

    const evaluation = evaluatePoseQuality([raw], policy);

    expect(evaluation.samples[0].decisions[1]).toBeNull();
    expect(evaluation.metrics.totalJointSlots).toBe(
      PRODUCT_POSE_LANDMARK_INDICES.length,
    );
    expect(evaluation.metrics.confidenceRejectedJointSlots).toBe(0);
    expect(
      evaluateCalibrationLabels(
        [{
          sessionId: 1,
          timestampMicroseconds: 0,
          landmarkIndex: 1,
          label: 'usable',
        }],
        evaluation,
      ).total,
    ).toBe(0);
  });

  it('identifies the product joint behind the longest gap separately from whole-pose gaps', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.temporal.enabled = false;
    const evaluation = evaluatePoseQuality(
      [
        completeSample(0),
        completeSample(33_333, 15),
        completeSample(66_666, 15),
        completeSample(99_999),
      ],
      policy,
    );

    expect(evaluation.metrics.longestJointGapMicroseconds).toBe(66_666);
    expect(evaluation.metrics.longestJointGapLandmarkIndex).toBe(15);
    expect(evaluation.metrics.longestWholePoseGapMicroseconds).toBe(0);
  });

  it('keeps display and analytics acceptance policies separate', () => {
    const display = clonePoseQualityPolicy(
      POSE_QUALITY_PROFILES.balanced.display,
    );
    const analytics = clonePoseQualityPolicy(
      POSE_QUALITY_PROFILES.balanced.analytics,
    );
    display.temporal.enabled = false;
    analytics.temporal.enabled = false;
    const raw = [sample(0, point(0.2, 0.62, 0.62))];

    expect(evaluatePoseQuality(raw, display).samples[0].decisions[15]!.accepted)
      .not.toBeNull();
    expect(evaluatePoseQuality(raw, analytics).samples[0].decisions[15]!.accepted)
      .toBeNull();
  });

  it('never mutates cached raw samples while recomputing a policy', () => {
    const raw = [sample(0, point(0.2, 0.8, 0.8))];
    const before = JSON.stringify(raw);
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.strict.display);
    evaluatePoseQuality(raw, policy);
    expect(JSON.stringify(raw)).toBe(before);
  });

  it('measures retained usable and false-visible labels against accepted views', () => {
    const policy = clonePoseQualityPolicy(POSE_QUALITY_PROFILES.balanced.display);
    policy.hysteresis.enabled = false;
    policy.temporal.enabled = false;
    const evaluation = evaluatePoseQuality(
      [sample(0, point(0.2, 0.8)), sample(33_333, point(0.3, 0.3))],
      policy,
    );
    const metrics = evaluateCalibrationLabels(
      [
        {
          sessionId: 1,
          timestampMicroseconds: 0,
          landmarkIndex: 15,
          label: 'usable',
        },
        {
          sessionId: 1,
          timestampMicroseconds: 33_333,
          landmarkIndex: 15,
          label: 'wrong',
        },
      ],
      evaluation,
    );

    expect(metrics.retainedUsableRate).toBe(1);
    expect(metrics.falseVisibleRate).toBe(0);
  });
});

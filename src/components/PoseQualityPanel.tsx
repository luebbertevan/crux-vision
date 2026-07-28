import { useMemo, useState } from 'react';

import {
  BODY_GROUP_LABELS,
  BODY_GROUPS,
  POSE_LANDMARK_NAMES,
  POSE_QUALITY_PROFILES,
  type BodyGroup,
  type CalibrationLabel,
  type CalibrationLabelMetrics,
  type PosePolicyTarget,
  type PosePreviewMode,
  type PoseQualityEvaluation,
  type PoseQualityPolicy,
  type PoseQualityPresetId,
  type QualityPoseSample,
} from '../pose/poseQuality';
import { PRODUCT_POSE_LANDMARK_INDICES } from '../pose/poseView';
import { POSE_MODELS } from '../pose/modelCatalog';
import type { PoseModelId } from '../types';

type PoseQualityPanelProps = {
  presetId: PoseQualityPresetId;
  policyTarget: PosePolicyTarget;
  policy: PoseQualityPolicy;
  previewMode: PosePreviewMode;
  centeredSmoothingRadiusMicroseconds: number;
  evaluation: PoseQualityEvaluation;
  currentSample: QualityPoseSample | null;
  selectedModel: PoseModelId;
  labelMetrics: CalibrationLabelMetrics;
  labelCount: number;
  onPresetChange: (preset: PoseQualityPresetId) => void;
  onPolicyTargetChange: (target: PosePolicyTarget) => void;
  onPolicyChange: (
    policy: PoseQualityPolicy,
    changeKey: string,
    coalesce?: boolean,
  ) => void;
  onPreviewModeChange: (mode: PosePreviewMode) => void;
  onCenteredSmoothingRadiusChange: (
    radiusMicroseconds: number,
    coalesce?: boolean,
  ) => void;
  onModelChange: (model: PoseModelId) => void;
  onLabel: (
    landmarkIndex: number,
    label: CalibrationLabel,
    timestampMicroseconds: number,
  ) => void;
  onClearLabels: () => void;
  onResetPolicy: () => void;
  onExport: () => void;
  onWorkspaceToggle: (open: boolean) => void;
};

const percent = (value: number) => `${Math.round(value * 100)}%`;
const milliseconds = (microseconds: number) =>
  `${Math.round(microseconds / 1_000)} ms`;

function ThresholdSlider({
  label,
  value,
  disabled,
  testId,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  testId?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="calibration-slider">
      <span>
        {label}
        <output>{value.toFixed(2)}</output>
      </span>
      <input
        data-testid={testId}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="calibration-number">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          if (
            !Number.isFinite(next) ||
            next < min ||
            (max !== undefined && next > max)
          ) {
            return;
          }
          onChange(next);
        }}
      />
    </label>
  );
}

export function PoseQualityPanel({
  presetId,
  policyTarget,
  policy,
  previewMode,
  centeredSmoothingRadiusMicroseconds,
  evaluation,
  currentSample,
  selectedModel,
  labelMetrics,
  labelCount,
  onPresetChange,
  onPolicyTargetChange,
  onPolicyChange,
  onPreviewModeChange,
  onCenteredSmoothingRadiusChange,
  onModelChange,
  onLabel,
  onClearLabels,
  onResetPolicy,
  onExport,
  onWorkspaceToggle,
}: PoseQualityPanelProps) {
  const [selectedGroup, setSelectedGroup] = useState<BodyGroup>('wristsHands');
  const [selectedJoint, setSelectedJoint] = useState(15);
  const groupThreshold = policy.bodyGroups[selectedGroup] ?? policy.global;
  const groupOverrideEnabled = Boolean(policy.bodyGroups[selectedGroup]);
  const jointThreshold = policy.joints[selectedJoint] ?? groupThreshold;
  const jointOverrideEnabled = Boolean(policy.joints[selectedJoint]);
  const currentDecision = currentSample?.decisions[selectedJoint] ?? null;
  const metrics = evaluation.metrics;
  const longestGapJoint =
    metrics.longestJointGapLandmarkIndex === null
      ? '—'
      : POSE_LANDMARK_NAMES[metrics.longestJointGapLandmarkIndex];

  const rejectionSummary = useMemo(
    () =>
      Object.entries(metrics.rejectionCounts)
        .filter(([, count]) => Boolean(count))
        .sort((first, second) => (second[1] ?? 0) - (first[1] ?? 0))
        .slice(0, 4),
    [metrics.rejectionCounts],
  );

  const updateGroupThreshold = (
    key: 'visibility' | 'presence',
    value: number,
  ) => {
    onPolicyChange(
      {
        ...policy,
        bodyGroups: {
          ...policy.bodyGroups,
          [selectedGroup]: {
            ...groupThreshold,
            [key]: value,
          },
        },
      },
      `group-${selectedGroup}-${key}`,
      true,
    );
  };

  const updateJointThreshold = (
    key: 'visibility' | 'presence',
    value: number,
  ) => {
    onPolicyChange(
      {
        ...policy,
        joints: {
          ...policy.joints,
          [selectedJoint]: {
            ...jointThreshold,
            [key]: value,
          },
        },
      },
      `joint-${selectedJoint}-${key}`,
      true,
    );
  };

  const setGroupOverride = (enabled: boolean) => {
    const bodyGroups = { ...policy.bodyGroups };
    if (enabled) bodyGroups[selectedGroup] = { ...groupThreshold };
    else delete bodyGroups[selectedGroup];
    onPolicyChange(
      { ...policy, bodyGroups },
      `group-${selectedGroup}-override`,
    );
  };

  const setJointOverride = (enabled: boolean) => {
    const joints = { ...policy.joints };
    if (enabled) joints[selectedJoint] = { ...jointThreshold };
    else delete joints[selectedJoint];
    onPolicyChange(
      { ...policy, joints },
      `joint-${selectedJoint}-override`,
    );
  };

  return (
    <section className="quality-section" aria-labelledby="quality-title">
      <div className="quality-preset-row">
        <label htmlFor="pose-quality-preset">
          <span>Pose quality</span>
          <select
            id="pose-quality-preset"
            data-testid="pose-quality-preset"
            value={presetId}
            onChange={(event) =>
              onPresetChange(event.currentTarget.value as PoseQualityPresetId)
            }
          >
            {Object.values(POSE_QUALITY_PROFILES).map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details
        className="calibration-workspace"
        onToggle={(event) => onWorkspaceToggle(event.currentTarget.open)}
      >
        <summary>
          <span>
            <strong id="quality-title">Pose quality calibration</strong>
            <small>Recompute cached raw pose · no inference</small>
          </span>
          <i className="disclosure-arrow" aria-hidden="true" />
        </summary>

        <div className="calibration-body">
          <div className="calibration-grid calibration-top-grid">
            <label>
              <span>Inference model</span>
              <select
                data-testid="calibration-model"
                value={selectedModel}
                onChange={(event) =>
                  onModelChange(event.currentTarget.value as PoseModelId)
                }
              >
                <option value="full">{POSE_MODELS.full.label} · default</option>
                <option value="lite">
                  {POSE_MODELS.lite.label} · faster alternative
                </option>
              </select>
              <small>Changing model clears raw pose and requires analysis.</small>
            </label>
            <label>
              <span>Policy target</span>
              <select
                data-testid="policy-target"
                value={policyTarget}
                onChange={(event) =>
                  onPolicyTargetChange(event.currentTarget.value as PosePolicyTarget)
                }
              >
                <option value="display">Display continuity</option>
                <option value="analytics">Analytics acceptance</option>
              </select>
            </label>
            <label>
              <span>Overlay preview</span>
              <select
                data-testid="pose-preview-mode"
                value={previewMode}
                onChange={(event) =>
                  onPreviewModeChange(event.currentTarget.value as PosePreviewMode)
                }
              >
                <option value="smoothed" disabled={!policy.smoothing.enabled}>
                  One Euro smoothed
                  {policy.smoothing.enabled ? '' : ' · filter disabled'}
                </option>
                <option value="centered">Centered offline · default</option>
                <option value="accepted">Accepted raw</option>
                <option value="rejected">Accepted + rejected</option>
                <option value="raw">Raw model</option>
              </select>
              <small>
                {previewMode === 'centered'
                  ? 'Uses accepted points before and after each timestamp. Judge anticipation as well as lag.'
                  : policy.smoothing.enabled
                    ? 'Accepted raw bypasses One Euro without changing its calibration.'
                    : 'Enable One Euro below to make its smoothed preview available.'}
              </small>
            </label>
          </div>

          <div
            className="calibration-metrics"
            data-testid="quality-metrics"
            data-accepted-coverage={metrics.acceptedCoverage}
          >
            <span>
              <small>Accepted coverage</small>
              <strong>{percent(metrics.acceptedCoverage)}</strong>
            </span>
            <span>
              <small>Confidence rejects</small>
              <strong>{metrics.confidenceRejectedJointSlots}</strong>
            </span>
            <span>
              <small>Temporal rejects</small>
              <strong>{metrics.temporalRejectedJointSlots}</strong>
            </span>
            <span>
              <small>Flicker events</small>
              <strong>{metrics.flickerCount}</strong>
            </span>
            <span>
              <small>Longest product-joint gap</small>
              <strong>{milliseconds(metrics.longestJointGapMicroseconds)}</strong>
              <small>{longestGapJoint}</small>
            </span>
            <span>
              <small>Longest whole-pose gap</small>
              <strong>{milliseconds(metrics.longestWholePoseGapMicroseconds)}</strong>
            </span>
            <span>
              <small>Mean One Euro shift</small>
              <strong>{metrics.meanSmoothingDisplacement.toFixed(4)}</strong>
            </span>
            <span>
              <small>Mean centered shift</small>
              <strong>
                {metrics.meanCenteredSmoothingDisplacement.toFixed(4)}
              </strong>
            </span>
            <span>
              <small>Mean inference</small>
              <strong>{metrics.meanInferenceMilliseconds.toFixed(1)} ms</strong>
            </span>
            <span>
              <small>Mean timestamp error</small>
              <strong>
                {milliseconds(metrics.meanRequestedTimestampErrorMicroseconds)}
              </strong>
            </span>
            <span>
              <small>Model-empty samples</small>
              <strong>{metrics.modelEmptySamples}</strong>
            </span>
          </div>

          <div className="group-coverage" aria-label="Accepted coverage by body group">
            {BODY_GROUPS.filter((group) => group !== 'torso').map((group) => (
              <span key={group}>
                <small>{BODY_GROUP_LABELS[group]}</small>
                <strong>{percent(metrics.groupCoverage[group])}</strong>
              </span>
            ))}
          </div>

          <details className="calibration-fieldset">
            <summary>
              <span>Global confidence</span>
              <i className="disclosure-arrow" aria-hidden="true" />
            </summary>
            <div className="calibration-fieldset-body">
            <ThresholdSlider
              label="Visibility"
              value={policy.global.visibility}
              testId="global-visibility-threshold"
              onChange={(visibility) =>
                onPolicyChange(
                  {
                    ...policy,
                    global: { ...policy.global, visibility },
                  },
                  'global-visibility',
                  true,
                )
              }
            />
            <ThresholdSlider
              label="Presence"
              value={policy.global.presence}
              onChange={(presence) =>
                onPolicyChange(
                  {
                    ...policy,
                    global: { ...policy.global, presence },
                  },
                  'global-presence',
                  true,
                )
              }
            />
            </div>
          </details>

          <details className="calibration-fieldset">
            <summary>
              <span>Body-group override</span>
              <i className="disclosure-arrow" aria-hidden="true" />
            </summary>
            <div className="calibration-fieldset-body">
            <label className="calibration-select">
              <span>Group</span>
              <select
                value={selectedGroup}
                onChange={(event) =>
                  setSelectedGroup(event.currentTarget.value as BodyGroup)
                }
              >
                {BODY_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {BODY_GROUP_LABELS[group]}
                  </option>
                ))}
              </select>
            </label>
            <label className="calibration-toggle">
              <input
                type="checkbox"
                checked={groupOverrideEnabled}
                onChange={(event) =>
                  setGroupOverride(event.currentTarget.checked)
                }
              />
              <span>Enable group override</span>
            </label>
            <ThresholdSlider
              label="Visibility"
              value={groupThreshold.visibility}
              testId="group-visibility-threshold"
              disabled={!groupOverrideEnabled}
              onChange={(value) => updateGroupThreshold('visibility', value)}
            />
            <ThresholdSlider
              label="Presence"
              value={groupThreshold.presence}
              disabled={!groupOverrideEnabled}
              onChange={(value) => updateGroupThreshold('presence', value)}
            />
            </div>
          </details>

          <details className="calibration-fieldset">
            <summary>
              <span>Joint override and inspection</span>
              <i className="disclosure-arrow" aria-hidden="true" />
            </summary>
            <div className="calibration-fieldset-body">
            <label className="calibration-select">
              <span>Joint</span>
              <select
                data-testid="calibration-joint"
                value={selectedJoint}
                onChange={(event) => setSelectedJoint(Number(event.currentTarget.value))}
              >
                {PRODUCT_POSE_LANDMARK_INDICES.map((index) => (
                  <option key={index} value={index}>
                    {index} · {POSE_LANDMARK_NAMES[index]}
                  </option>
                ))}
              </select>
            </label>
            <label className="calibration-toggle">
              <input
                type="checkbox"
                checked={jointOverrideEnabled}
                onChange={(event) => setJointOverride(event.currentTarget.checked)}
              />
              <span>Enable joint override</span>
            </label>
            <ThresholdSlider
              label="Visibility"
              value={jointThreshold.visibility}
              disabled={!jointOverrideEnabled}
              onChange={(value) => updateJointThreshold('visibility', value)}
            />
            <ThresholdSlider
              label="Presence"
              value={jointThreshold.presence}
              disabled={!jointOverrideEnabled}
              onChange={(value) => updateJointThreshold('presence', value)}
            />

            <div className="joint-decision" data-testid="joint-decision">
              <strong>{POSE_LANDMARK_NAMES[selectedJoint]}</strong>
              {currentDecision ? (
                <>
                  <span data-status={currentDecision.status}>
                    {currentDecision.status}
                  </span>
                  <small>
                    vis {currentDecision.raw?.visibility.toFixed(2) ?? '—'} · pres{' '}
                    {currentDecision.raw?.presence?.toFixed(2) ?? '—'} ·{' '}
                    {currentDecision.reasons.join(', ') || 'accepted'}
                  </small>
                </>
              ) : (
                <small>Seek inside analyzed time to inspect this joint.</small>
              )}
            </div>

            <div className="calibration-labels" aria-label="Manual calibration label">
              {(['usable', 'wrong', 'swapped', 'unavailable'] as const).map(
                (label) => (
                  <button
                    key={label}
                    type="button"
                    disabled={!currentSample}
                    onClick={() => {
                      if (currentSample) {
                        onLabel(
                          selectedJoint,
                          label,
                          currentSample.timestampMicroseconds,
                        );
                      }
                    }}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
            </div>
          </details>

          <details className="calibration-fieldset">
            <summary>
              <span>Continuity and plausibility</span>
              <i className="disclosure-arrow" aria-hidden="true" />
            </summary>
            <div className="calibration-fieldset-body">
            <label className="calibration-toggle">
              <input
                type="checkbox"
                checked={policy.hysteresis.enabled}
                onChange={(event) =>
                  onPolicyChange(
                    {
                      ...policy,
                      hysteresis: {
                        ...policy.hysteresis,
                        enabled: event.currentTarget.checked,
                      },
                    },
                    'hysteresis-enabled',
                  )
                }
              />
              <span>Confidence hysteresis</span>
            </label>
            <NumberControl
              label="Acquire delta"
              value={policy.hysteresis.acquireDelta}
              min={0}
              max={1}
              step={0.01}
              disabled={!policy.hysteresis.enabled}
              onChange={(acquireDelta) =>
                onPolicyChange(
                  {
                    ...policy,
                    hysteresis: { ...policy.hysteresis, acquireDelta },
                  },
                  'hysteresis-acquire-delta',
                  true,
                )
              }
            />
            <NumberControl
              label="Keep delta"
              value={policy.hysteresis.keepDelta}
              min={-1}
              max={0}
              step={0.01}
              disabled={!policy.hysteresis.enabled}
              onChange={(keepDelta) =>
                onPolicyChange(
                  {
                    ...policy,
                    hysteresis: { ...policy.hysteresis, keepDelta },
                  },
                  'hysteresis-keep-delta',
                  true,
                )
              }
            />
            <label className="calibration-toggle">
              <input
                type="checkbox"
                checked={policy.temporal.enabled}
                onChange={(event) =>
                  onPolicyChange(
                    {
                      ...policy,
                      temporal: {
                        ...policy.temporal,
                        enabled: event.currentTarget.checked,
                      },
                    },
                    'temporal-enabled',
                  )
                }
              />
              <span>Timestamp-based temporal rejection</span>
            </label>
            <NumberControl
              label="Max body lengths / sec"
              value={policy.temporal.maximumSpeedBodyLengthsPerSecond}
              min={0}
              step={0.1}
              disabled={!policy.temporal.enabled}
              onChange={(maximumSpeedBodyLengthsPerSecond) =>
                onPolicyChange(
                  {
                    ...policy,
                    temporal: {
                      ...policy.temporal,
                      maximumSpeedBodyLengthsPerSecond,
                    },
                  },
                  'temporal-maximum-speed',
                  true,
                )
              }
            />
            <NumberControl
              label="Max acceleration"
              value={policy.temporal.maximumAccelerationBodyLengthsPerSecondSquared}
              min={0}
              step={1}
              disabled={!policy.temporal.enabled}
              onChange={(maximumAccelerationBodyLengthsPerSecondSquared) =>
                onPolicyChange(
                  {
                    ...policy,
                    temporal: {
                      ...policy.temporal,
                      maximumAccelerationBodyLengthsPerSecondSquared,
                    },
                  },
                  'temporal-maximum-acceleration',
                  true,
                )
              }
            />
            <NumberControl
              label="Max segment change"
              value={policy.temporal.maximumSegmentLengthChangeRatio}
              min={0}
              step={0.01}
              disabled={!policy.temporal.enabled}
              onChange={(maximumSegmentLengthChangeRatio) =>
                onPolicyChange(
                  {
                    ...policy,
                    temporal: {
                      ...policy.temporal,
                      maximumSegmentLengthChangeRatio,
                    },
                  },
                  'temporal-maximum-segment-change',
                  true,
                )
              }
            />
            </div>
          </details>

          <details className="calibration-fieldset">
            <summary>
              <span>Segment-local smoothing</span>
              <i className="disclosure-arrow" aria-hidden="true" />
            </summary>
            <div className="calibration-fieldset-body">
            <label className="calibration-toggle">
              <input
                type="checkbox"
                checked={policy.smoothing.enabled}
                onChange={(event) =>
                  onPolicyChange(
                    {
                      ...policy,
                      smoothing: {
                        ...policy.smoothing,
                        enabled: event.currentTarget.checked,
                      },
                    },
                    'smoothing-enabled',
                  )
                }
              />
              <span>One Euro display smoothing</span>
            </label>
            <NumberControl
              label="Minimum cutoff"
              value={policy.smoothing.minimumCutoff}
              min={0}
              step={0.01}
              disabled={!policy.smoothing.enabled}
              onChange={(minimumCutoff) =>
                onPolicyChange(
                  {
                    ...policy,
                    smoothing: { ...policy.smoothing, minimumCutoff },
                  },
                  'smoothing-minimum-cutoff',
                  true,
                )
              }
            />
            <NumberControl
              label="Speed coefficient"
              value={policy.smoothing.beta}
              min={0}
              step={0.1}
              disabled={!policy.smoothing.enabled}
              onChange={(beta) =>
                onPolicyChange(
                  {
                    ...policy,
                    smoothing: { ...policy.smoothing, beta },
                  },
                  'smoothing-speed-coefficient',
                  true,
                )
              }
            />
            <NumberControl
              label="Centered radius (ms)"
              value={centeredSmoothingRadiusMicroseconds / 1_000}
              min={0}
              step={0.001}
              onChange={(radiusMilliseconds) => {
                const radiusMicroseconds = radiusMilliseconds * 1_000;
                if (!Number.isFinite(radiusMicroseconds)) return;
                onCenteredSmoothingRadiusChange(
                  Math.round(radiusMicroseconds),
                  true,
                );
              }}
            />
            <small>
              The default recorded-video display uses this symmetric window.
              It follows presentation time and stops at every rejected or
              oversized gap. Judge it after analysis completes.
            </small>
            </div>
          </details>

          <div className="calibration-evidence">
            <div data-testid="calibration-label-count">
              <small>Manual labels</small>
              <strong>{labelCount}</strong>
            </div>
            <div>
              <small>Retained usable</small>
              <strong>
                {labelMetrics.retainedUsableRate === null
                  ? '—'
                  : percent(labelMetrics.retainedUsableRate)}
              </strong>
            </div>
            <div>
              <small>False visible</small>
              <strong>
                {labelMetrics.falseVisibleRate === null
                  ? '—'
                  : percent(labelMetrics.falseVisibleRate)}
              </strong>
            </div>
          </div>

          {rejectionSummary.length > 0 && (
            <p className="rejection-summary">
              Top rejection reasons:{' '}
              {rejectionSummary
                .map(([reason, count]) => `${reason} ${count}`)
                .join(' · ')}
            </p>
          )}

          <div className="calibration-actions">
            <button type="button" className="button-subtle" onClick={onResetPolicy}>
              Reset preset
            </button>
            <button type="button" className="button-subtle" onClick={onExport}>
              Export calibration JSON
            </button>
            <button
              type="button"
              className="button-subtle"
              disabled={labelCount === 0}
              onClick={onClearLabels}
            >
              Clear labels
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}

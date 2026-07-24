# Pose-quality calibration plan

**Status:** Planned after the R2 phone gate and before R2B  
**Purpose:** Establish a trustworthy first acceptance and smoothing policy for
MediaPipe pose data before pose-derived analysis expands.

## Why this is a gate

R2A preserves raw MediaPipe samples and currently accepts a landmark only when
its coordinates are finite and in bounds and both visibility and presence, when
reported, are at least `0.5`. This already creates honest gaps, but it cannot
reject every bad sample: an occluded, swapped, or rapidly moving joint can be
wrong while still carrying moderate confidence.

The legacy product had the right product instinct—confidence filtering and a
debug view—but its effective overlay used one global `0.5` cutoff. Its intended
body-group thresholds were not applied reliably. R2 will calibrate from the raw,
timestamped data instead of copying those values.

## Product policy

- Raw model output remains immutable and separate from every accepted, smoothed,
  interpolated, or rendered view.
- Display and analytics use explicit policies. Display may favor continuity;
  analytics is stricter and must report accepted or imputed coverage.
- Rejected samples create gaps. Smoothing never turns a rejected sample into an
  accepted one and never crosses a gap.
- Confidence is necessary but not sufficient. Temporal plausibility is needed
  to catch high-confidence slingshots and likely left/right swaps.
- Trustworthy filtering is a core feature, not a premium feature.

## Derived points and custom positions

Crux Vision is not limited to drawing every raw landmark exactly as MediaPipe
names it, but derived geometry must remain inspectable:

- A deterministic midpoint or anchor records its source landmarks and is valid
  only when all required sources are accepted.
- Derived points never replace raw landmarks and never inherit more confidence
  than their weakest required source.
- Display-only geometry, such as a simplified head, may omit distracting raw
  points without discarding them from the raw pose.
- Any calibrated offset must be versioned and reversible. Prefer body-relative
  vectors and scales over fixed screen-pixel or normalized-image offsets, which
  do not generalize across framing and body size.
- A derived point used by analytics needs separate validation and provenance.
  A visually pleasing anchor is not automatically a biomechanical quantity.
- Offsets cannot reconstruct an occluded joint or bridge an otherwise rejected
  interval.

The immediate proof of concept uses only two conservative derived sources: the
accepted hip midpoint and accepted shoulder midpoint. It also renders one head
anchor from the accepted nose and a single neck connection from the shoulder
midpoint. Broader offsets remain part of calibration only if a repeated,
measurable model bias justifies them.

## Acceptance pipeline

The first calibrated policy will apply these stages in order:

1. **Structural validity:** pose exists; coordinates and scores are finite;
   normalized coordinates are in the upright displayed-video space and within
   the allowed bounds.
2. **Confidence threshold:** resolve the cutoff with the precedence
   `joint override > body-group override > global default`. Visibility and
   presence remain independently inspectable.
3. **Hysteresis:** use a stricter threshold to acquire or reacquire a joint and a
   slightly lower threshold to keep an already accepted track. This reduces
   one-frame flicker without bridging gaps.
4. **Temporal plausibility:** evaluate velocity, acceleration, segment-length
   change, and neighbor agreement using presentation timestamps and
   body-relative distances. Implausible samples are rejected with a recorded
   reason.
5. **Segment-local smoothing:** initially evaluate a One Euro filter for the
   live display. It operates only inside an accepted contiguous segment and
   resets at every gap.
6. **Optional short-gap handling:** display interpolation, if adopted, is
   separately marked and bounded. Analytics defaults to no interpolation.

An offline, symmetric smoother may later be used for derivative-based analysis,
but it must remain a derived dataset and cannot alter raw samples.

## Temporary calibration workspace

The calibration workspace is an advanced/developer surface, not the default
new-user settings experience. It recomputes accepted and rendered views from
cached raw poses without rerunning inference.

Controls:

- Global visibility and presence thresholds.
- Body-group thresholds for head, torso, shoulders, elbows, wrists/hands, hips,
  knees, and ankles/feet.
- Optional left/right joint overrides.
- Acquire and keep thresholds for hysteresis.
- Temporal plausibility and smoothing toggles with a small number of tunable
  parameters.
- Display-policy and analytics-policy preview.
- Raw, accepted, and rejected overlays; rejected samples are color-coded by
  reason.
- Reset and JSON export for reproducible calibration runs.

Readouts:

- Current score and acceptance reason for the selected joint.
- Accepted coverage, rejection counts, longest gap, and reacquisition delay by
  joint and body group.
- Whether the visible point is raw, smoothed, or interpolated.
- Requested versus actual presentation timestamps, duplicate-frame suppression,
  raw model-empty samples, and confidence-rejected samples.

## Manual calibration protocol

Use short, representative ranges from the private fixture corpus:

- Portrait and landscape capture.
- Fast reaches and dynos.
- Occluded wrists, ankles, and hips.
- Overhang/body overlap.
- Clean, slower movement as a control.

If alternating pose/unavailable flicker becomes repeatable, rerun the movement
with a one- or two-interval range-start shift and compare actual timestamp
spacing, raw landmark availability, and confidence rejection before changing
display continuity.

For representative moments, label each evaluated joint as usable, visibly
wrong/slingshotting, swapped, or unavailable. Full motion-capture ground truth
is not required for this first pass.

Compare:

1. Raw output.
2. Confidence threshold only.
3. Threshold plus hysteresis.
4. Threshold, hysteresis, and temporal rejection.
5. The accepted track with segment-local smoothing.

Threshold sweeps should start from `0.30` through `0.90` in `0.05` increments,
then narrow around promising ranges. Judge each policy by:

- False-visible rate: bad points or segments shown.
- Retained usable coverage.
- Flicker and reacquisition delay.
- Longest honest gap.
- Visible lag introduced by smoothing.

The visual priority is to remove obviously false geometry without erasing the
movement being reviewed.

## Settings hierarchy after calibration

The ordinary review surface should expose:

- Overlay on/off.
- Pose quality: **Balanced** by default, with **Strict** and **Permissive**
  built-in alternatives.
- Selected trails.

Settings are grouped into Pose quality, Trails, Playback, and View. Pose quality
contains an Advanced disclosure for group and joint overrides, raw/rejected
debug views, smoothing, and coverage. Calibration-only diagnostics can remain
developer-gated after the defaults are established.

Built-in quality presets ship with the calibrated product policy. User-named
custom presets do not require accounts and can first be stored locally. Account
work is only required for cross-device sync, sharing, or organization-managed
presets. Commercial packaging is a later product decision; basic confidence
filtering and honest uncertainty remain available to every user.

## Automated and visual acceptance

- Unit tests cover threshold precedence, independent visibility/presence
  handling, hysteresis, temporal rejection, smoothing reset at gaps, and
  display-versus-analytics policy separation.
- Unit tests cover derived-point provenance and rejection when any required
  source joint is unavailable.
- Browser tests prove that changing calibration controls recomputes cached
  results without rerunning inference and cannot resurrect stale source data.
- Visual tests cover accepted, rejected, unavailable, and reacquired joints on
  portrait and landscape fixtures.
- A versioned calibration report records the chosen Balanced v1 values, the
  derivation of Strict and Permissive, coverage tradeoffs, and unresolved
  failure modes.

## Exit criteria

- Balanced v1 removes the major visible slingshots in the calibration corpus
  while retaining useful movement coverage.
- Strict and Permissive have documented, measurable tradeoffs.
- All rejection and interpolation paths remain inspectable.
- Analytics can require and report a minimum accepted-data coverage rather than
  silently operating on poor input.
- Known model limitations are documented without implying that calibration can
  reconstruct genuinely missing motion.

## Explicit non-goals

- Model retraining or replacing MediaPipe.
- Inventing coordinates for long occlusions.
- Complete pose-derived statistics before the acceptance policy is validated.
- Cloud preset storage, sharing, or monetization.

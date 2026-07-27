# Pose-quality calibration report: Balanced v2

**Status:** Initial defaults selected; broader visual calibration deferred until
after the main overlay feature set

**Policy version:** `balanced-v2.1-product-landmarks-2026-07-24`

**Date:** July 24, 2026

**Scope:** Bounded reference-laptop calibration before R2B

## Decision

Balanced v2 remains the ordinary pose-acceptance policy, with Strict and
Permissive alternatives. Centered offline at `66.667 ms` is now the ordinary
recorded-video display smoother. Display and analytics policies remain separate;
Analytics stays unsmoothed.

A subsequent human lache review confirmed that the default Smoothed view trails
Accepted raw by roughly 70 ms during fast movement. Accepted raw remained
registered to the climber, isolating the problem to smoothing rather than
playback timestamp lookup. A same-cache parameter sweep confirmed that the
original One Euro speed response was too low for normalized climbing motion.
Balanced v2 retains the original low-speed cutoff and raises only the speed
coefficient. The focused human re-smoke still found one visible frame of lag,
which the reviewer considers objectionable. The subsequent centered preview
looked best at its default radius and replaces One Euro as the ordinary display
selection without changing the underlying acceptance policy.

MediaPipe Full is now the product model default. Although the original bounded
comparison did not improve accepted coverage, later human review found a
noticeable pose-quality improvement without a drastic analysis-time increase.
Lite remains the faster alternative. The longer iPhone thermal, battery,
delegate, and model matrix was not run and remains R2D work.

The selectable analysis range cap is now 60 seconds rather than 20 seconds.
This is a product-capability change, not a claim that a sustained 60-second Full
analysis has passed the physical-phone thermal or reload gate.

This gate calibrates a trustworthy first display policy. It is not
motion-capture validation, a biomechanical accuracy claim, or evidence that
filtering can reconstruct genuinely missing or occluded motion.

Subsequent review with selectable joint trails made confidence failures more
legible, especially false limb positions. The reviewer prefers fewer false
visible positions even when stricter filtering creates more missing joint
positions. The next broader calibration pass should therefore challenge the
current defaults in a generally stricter direction, inspect limb behavior
closely, and evaluate **Extra Strict** and **Extra Permissive** endpoints around
the existing preset scale. No threshold, acceptance policy, or product control
changed from this observation; the pass is deferred until the main overlay
feature set provides a better calibration surface.

Use the
[`human calibration guide and findings worksheet`](./pose-quality-human-calibration-guide.md)
for the next visual review pass.
The dated observations and decisions are in
[`pose-quality-human-calibration-findings.md`](./pose-quality-human-calibration-findings.md).

## Implemented contract

Raw `RawPoseSample` values remain immutable. A derived quality pass applies:

1. finite, in-bounds structural checks;
2. separate visibility and presence thresholds with
   `joint > body group > global` precedence;
3. stricter acquisition and lower retention thresholds without bridging gaps;
4. presentation-timestamped, body-scale-aware isolated-jump, velocity,
   acceleration, and distal segment-length checks;
5. a segment-local One Euro display smoother that resets on rejection, missing
   pose, non-monotonic timestamps, or a gap over 50 ms;
6. an independent centered offline display result over the same accepted
   segments.

No interpolation is enabled. Analytics uses stricter confidence and temporal
limits, disables smoothing, and remains a distinct derived dataset.

The ordinary control is a **Pose quality** selector with Balanced, Strict, and
Permissive. The advanced calibration disclosure adds Lite/Full selection,
display/analytics target selection, raw/accepted/rejected/One Euro/centered
preview, global/group/joint controls, hysteresis, temporal and smoothing controls,
reason-coded joint inspection, coverage/gap/lag metrics, manual labels, reset,
JSON export, setting undo/redo, and collapsible setting families. Policy changes
recompute cached samples without rerunning
inference; a model change deliberately clears raw results and requires a new
analysis.

The calibration history holds up to 100 steps and coalesces rapid changes to one
control or transport drag. Standard Mac and Windows/Linux undo/redo shortcuts
work while the workspace is open. Exact-frame seeks are individual history
steps. Model changes and labels remain excluded; importing a source or changing
the model clears history.

The UI prevents a One Euro smoothed preview when the active policy has smoothing
disabled and falls back to Accepted raw if smoothing is turned off. Centered
offline remains independently available. Accepted raw remains an intentional
comparison that bypasses both filters without changing either calibration.

Derived hip and shoulder midpoints retain versioned source provenance and exist
only when both required source joints are accepted. The simplified head remains
a display-only accepted nose anchor.

## Balanced v2 values

### Confidence

| Scope | Visibility | Presence |
|---|---:|---:|
| Global | 0.50 | 0.50 |
| Head | 0.60 | 0.55 |
| Torso fallback | 0.58 | 0.55 |
| Shoulders | 0.55 | 0.50 |
| Elbows | 0.50 | 0.50 |
| Wrists / hands | 0.55 | 0.50 |
| Hips | 0.58 | 0.55 |
| Knees | 0.52 | 0.50 |
| Ankles / feet | 0.55 | 0.50 |

The display policy adds `+0.04` to acquire and `-0.08` to retain an accepted
joint. The analytics policy adds `0.08` to the base visibility/presence
thresholds, then uses `+0.05` acquisition and `-0.04` retention deltas.

### Temporal and smoothing

| Parameter | Balanced display |
|---|---:|
| Maximum speed | 28 body lengths/s |
| Maximum acceleration | 900 body lengths/s² |
| Maximum distal segment-length change | 0.80 |
| Isolated jump | 0.65 body lengths |
| Isolated return ratio | 0.40 |
| One Euro minimum cutoff | 2.0 |
| One Euro beta | 12.0 |
| Derivative cutoff | 1.0 |
| Reset gap | 50 ms |

The analytics policy uses 85% of the display speed limit, 80% of its
acceleration and segment-change limits, and no smoothing.

Strict raises confidence thresholds and lowers temporal limits; its responsive
speed coefficient is 8. Permissive lowers confidence thresholds and raises
temporal limits; its coefficient is 16. Their complete, versioned values live
beside Balanced in `src/pose/poseQuality.ts` and are included by the calibration
JSON export.

## Calibration corpus and evidence

Each range requested 151 samples at 30 samples/second. Coverage below is
accepted slots divided by the 23 scheduled product-used landmarks (nose and
body landmarks 11–32), including honest model-empty and unavailable slots. The
10 unused MediaPipe face-detail landmarks remain raw provenance and do not
affect decisions, controls, labels, smoothing, or metrics. Coverage is not
accuracy against ground truth.
Calibration JSON schema `crux-pose-calibration-v3` preserves all raw landmarks
but emits derived quality decisions only for those 23 product landmarks. It
records both smoother outputs and identifies centered smoothing as an
ordinary display configuration distinct from the acceptance policy.

| Fixture and range | Purpose | Strict | Balanced | Permissive | Balanced confidence / temporal rejects |
|---|---|---:|---:|---:|---:|
| `lache-send.MOV`, 7–12 s | Portrait dynamic reach | 46.0% | 49.7% | 55.7% | 616 / 5 |
| `overhang-orange.MOV`, 7–12 s | Portrait overhang and occlusion | 84.7% | 90.7% | 98.1% | 317 / 6 |
| `landscape-climb.MOV`, 15–20 s | Landscape extended movement | 79.2% | 89.2% | 94.5% | 367 / 9 |

The lache range contains 49 raw model-empty samples; all three policies preserve
those gaps. Balanced recorded 18 short per-joint flicker events across the three
ranges, versus 33 for Strict and nine for Permissive. With Balanced v2.1,
mean smoothing displacement was 0.0088, 0.0038, and 0.0059 normalized image
units for the three ranges.

On the lache range, the longest product-joint gap is 5,005 ms for the right
elbow, while the longest whole-pose gap is 1,635 ms. This explicit attribution
prevents one persistently rejected joint from being mistaken for a pose-wide
data outage.

Visual comparison used raw, reason-colored rejected, accepted, and smoothed
overlays on the three ranges plus additional spot checks of fast and occluded
fixture moments. Early temporal limits rejected plausible fast hands and feet;
raising the body-relative speed/acceleration bounds reduced the lache range to
five temporal rejections after the segment-length regression fix. Increasing
One Euro responsiveness then reduced visible fast-limb lag while retaining
low-speed smoothing and exact gap resets.

### Smoothing responsiveness follow-up

The follow-up reused one Lite analysis of `lache-send.MOV`, 7–12 seconds, and
recomputed every candidate over the same accepted samples. For high-motion
joint steps, the original Balanced settings (`minimum cutoff 2`, `beta 0.7`)
had a median projected lag of 1.73 frames and a 90th-percentile lag of 2.49
frames. Balanced v2 (`minimum cutoff 2`, `beta 12`) reduced those values to
0.80 and 1.24 frames. The candidate retained 45% of the accepted track's
aggregate frame-to-frame acceleration, meaning it still removed about 55% of
that roughness. Exact-frame spot checks on the swing placed v2 visibly closer
to Accepted raw than v1.

A synthetic 30 Hz constant-velocity regression now requires the Balanced
smoother to remain under one frame of steady-state lag. A separate alternating
low-amplitude track requires at least 75% acceleration-noise reduction. These
tests would fail the former `beta 0.7` default. A causal smoother cannot be
perfectly zero-lag; the remaining sub-frame-to-one-frame response still needs
human judgment on the intended display.

### Centered offline display decision

After the focused re-smoke still found one visible frame of One Euro lag, the
workspace added a timestamp-weighted centered moving average with a default
`66.667 ms` radius. For each accepted product-joint segment, it integrates the
piecewise-linear track over equal presentation time before and after the
current sample. The radius shrinks symmetrically at segment boundaries, the
boundary output remains Accepted raw, and no rejected, non-monotonic, or
oversized gap is crossed.

The radius is undoable workspace state rather than part of the Balanced
acceptance policy. `0 ms` exactly matches Accepted raw. A synthetic irregular-
timestamp constant-velocity regression verifies that the centered result does
not inherit causal phase delay, while gap tests verify exact resets. Human
review selected the default `66.667 ms` centered result as the best-looking
option. Future calibration must still watch for pre-motion anticipation.

No repeatable major raw slingshot or left/right swap appeared in the selected
real-corpus moments, so this pass cannot honestly report a measured real-corpus
false-visible reduction. Synthetic timestamped tracks prove that a
high-confidence one-frame slingshot and excessive velocity are rejected.
Manual usable/wrong/swapped/unavailable labels and retained-usable /
false-visible metrics are implemented for future larger-corpus calibration.

## Lite versus Full decision

Both models analyzed `lache-send.MOV` from 7–12 seconds with the Balanced
display policy on the same reference laptop:

| Model | Scheduled samples | Model-empty samples | Accepted coverage | Confidence rejects | Temporal rejects | Mean inference across two short runs |
|---|---:|---:|---:|---:|---:|---:|
| Lite | 151 | 49 | 49.7% | 616 | 5 | 11.9–14.1 ms |
| Full | 151 | 49 | 48.9% | 649 | 0 | 12.2–13.6 ms |

At the time, this single bounded challenger did not justify changing the product
default because Full showed no accepted-coverage gain. The short warm-cache
timings changed order between repeats and are not treated as device-performance
evidence. This was not a complete accuracy or performance comparison; a
repeatable visible-quality gain was the stated condition for reconsideration.

Later human comparison did find a noticeable visible-quality gain from Full
without a drastic analysis-time increase. Because accepted coverage measures
availability rather than positional correctness, that direct visual evidence
supersedes the coverage-only default decision. Full is now the product default;
Lite remains available, and the R2D physical-phone cost validation is still
required.

## Verification and limitations

Automated coverage includes product-landmark scoping, threshold precedence,
independent visibility and presence, hysteresis, synthetic slingshot and
velocity rejection, segment-local smoothing reset, attributed per-joint and
whole-pose gaps, display/analytics separation, immutable raw recomputation,
manual-label metrics, centered constant-motion alignment and jitter reduction,
and derived-point provenance. Browser coverage proves cached-policy
recomputation, model-change invalidation,
source-replacement cleanup, the three-range preset sweep, bounded Lite/Full
comparison, full-domain developer calibration controls, and mobile-width
advanced-control sizing.

The final production build, all 50 unit tests, and all 20 Chrome Playwright
tests passed before publication.

Remaining limitations:

- Coverage measures accepted availability, not landmark correctness.
- No formal motion-capture ground truth or persisted human-labeled corpus was
  created in this bounded gate.
- MediaPipe model-empty samples and true occlusions remain gaps.
- Thresholds are based on a small private climbing corpus and may need revision
  for substantially different framing, bodies, clothing, or lighting.
- Temporal rejection can identify implausibility but cannot reliably identify
  every anatomically plausible left/right swap.
- Analytics still needs metric-specific minimum-coverage requirements when
  pose-derived measurements begin; R2B was not started here.
- A captured `yellow-v0` raw-pose flicker was not a MediaPipe outage. Seventeen
  integer-microsecond requests landed fractionally before their intended source
  frames, so MediaBunny returned a prior frame twice and duplicate suppression
  left renderer-visible holes. A one-microsecond lookup bias restored all 371
  source frames in the exact regression with no interpolation. There is no
  runtime flicker-diagnostics feature.
- The 60-second Full-model range cap has not completed the sustained physical-
  phone thermal, memory, responsiveness, or reload validation reserved for R2D.

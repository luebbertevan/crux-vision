# Pose-quality calibration report: Balanced v1

**Status:** Complete

**Policy version:** `balanced-v1-2026-07-24`

**Date:** July 24, 2026

**Scope:** Bounded reference-laptop calibration before R2B

## Decision

Balanced v1 is the ordinary pose-quality display default. Strict and
Permissive remain built-in alternatives with intentional coverage and
continuity tradeoffs. Display and analytics policies are separate.

MediaPipe Lite remains the product model default. Full was evaluated against
Lite on the same difficult five-second range before any default change and did
not improve accepted coverage. The longer iPhone thermal, battery,
delegate, and model matrix was not run and remains R2D work.

This gate calibrates a trustworthy first display policy. It is not
motion-capture validation, a biomechanical accuracy claim, or evidence that
filtering can reconstruct genuinely missing or occluded motion.

Use the
[`human calibration guide and findings worksheet`](./pose-quality-human-calibration-guide.md)
for the next visual review pass.

## Implemented contract

Raw `RawPoseSample` values remain immutable. A derived quality pass applies:

1. finite, in-bounds structural checks;
2. separate visibility and presence thresholds with
   `joint > body group > global` precedence;
3. stricter acquisition and lower retention thresholds without bridging gaps;
4. presentation-timestamped, body-scale-aware isolated-jump, velocity,
   acceleration, and distal segment-length checks;
5. a segment-local One Euro display smoother that resets on rejection, missing
   pose, non-monotonic timestamps, or a gap over 50 ms.

No interpolation is enabled. Analytics uses stricter confidence and temporal
limits, disables smoothing, and remains a distinct derived dataset.

The ordinary control is a **Pose quality** selector with Balanced, Strict, and
Permissive. The advanced calibration disclosure adds Lite/Full selection,
display/analytics target selection, raw/accepted/rejected/smoothed preview,
global/group/joint controls, hysteresis, temporal and smoothing controls,
reason-coded joint inspection, coverage/gap/lag metrics, manual labels, reset,
and JSON export. Policy changes recompute cached samples without rerunning
inference; a model change deliberately clears raw results and requires a new
analysis.

Derived hip and shoulder midpoints retain versioned source provenance and exist
only when both required source joints are accepted. The simplified head remains
a display-only accepted nose anchor.

## Balanced v1 values

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
| One Euro beta | 0.7 |
| Derivative cutoff | 1.0 |
| Reset gap | 50 ms |

The analytics policy uses 85% of the display speed limit, 80% of its
acceleration and segment-change limits, and no smoothing.

Strict raises confidence thresholds and lowers temporal limits. Permissive
lowers confidence thresholds and raises temporal limits. Their complete,
versioned values live beside Balanced in `src/pose/poseQuality.ts` and are
included by the calibration JSON export.

## Calibration corpus and evidence

Each range requested 151 samples at 30 samples/second. Coverage below is
accepted joint slots divided by all scheduled joint slots, including honest
model-empty and unavailable slots. It is not accuracy against ground truth.

| Fixture and range | Purpose | Strict | Balanced | Permissive | Balanced confidence / temporal rejects |
|---|---|---:|---:|---:|---:|
| `lache-send.MOV`, 7–12 s | Portrait dynamic reach | 52.5% | 55.1% | 59.3% | 616 / 5 |
| `overhang-orange.MOV`, 7–12 s | Portrait overhang and occlusion | 89.3% | 93.5% | 98.7% | 317 / 6 |
| `landscape-climb.MOV`, 15–20 s | Landscape extended movement | 85.5% | 92.5% | 96.2% | 367 / 9 |

The lache range contains 49 raw model-empty samples; all three policies preserve
those gaps. Balanced recorded 18 short per-joint reacquisition events across the
three ranges, versus 33 for Strict and nine for Permissive. Mean smoothing
displacement was 0.0155, 0.0050, and 0.0083 normalized image units for the
three Balanced ranges after responsiveness tuning.

Visual comparison used raw, reason-colored rejected, accepted, and smoothed
overlays on the three ranges plus additional spot checks of fast and occluded
fixture moments. Early temporal limits rejected plausible fast hands and feet;
raising the body-relative speed/acceleration bounds reduced the lache range to
five temporal rejections after the segment-length regression fix. Increasing
One Euro responsiveness then reduced
visible fast-limb lag while retaining low-speed smoothing and exact gap resets.

No repeatable major raw slingshot or left/right swap appeared in the selected
real-corpus moments, so this pass cannot honestly report a measured real-corpus
false-visible reduction. Synthetic timestamped tracks prove that a
high-confidence one-frame slingshot and excessive velocity are rejected.
Manual usable/wrong/swapped/unavailable labels and retained-usable /
false-visible metrics are implemented for future larger-corpus calibration.

## Lite versus Full challenger

Both models analyzed `lache-send.MOV` from 7–12 seconds with the Balanced
display policy on the same reference laptop:

| Model | Scheduled samples | Model-empty samples | Accepted coverage | Confidence rejects | Temporal rejects | Mean inference across two short runs |
|---|---:|---:|---:|---:|---:|---:|
| Lite | 151 | 49 | 55.1% | 616 | 5 | 11.9–14.1 ms |
| Full | 151 | 49 | 54.5% | 649 | 0 | 12.2–13.6 ms |

This single bounded challenger is enough to avoid changing the product default:
Full showed no accepted-coverage gain. The short warm-cache timings changed
order between repeats and are not treated as device-performance evidence. This
is not a complete accuracy or performance comparison. Reconsider Full only
with repeatable visible-quality gains on a larger labeled corpus and then
validate those gains against the R2D physical-phone thermal and responsiveness
costs.

## Verification and limitations

Automated coverage includes threshold precedence, independent visibility and
presence, hysteresis, synthetic slingshot and velocity rejection, segment-local
smoothing reset, honest leading gaps, display/analytics separation, immutable
raw recomputation, manual-label metrics, and derived-point provenance. Browser
coverage proves cached-policy recomputation, model-change invalidation,
source-replacement cleanup, the three-range preset sweep, bounded Lite/Full
comparison, and mobile-width advanced-control sizing.

The final production build, all 35 unit tests, and all 15 Chrome Playwright
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
- The previously reported alternating pose/unavailable behavior did not recur.
  There is no runtime flicker-diagnostics feature; investigate only if a
  repeatable case appears.

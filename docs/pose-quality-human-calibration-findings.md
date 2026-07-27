# Human pose-quality calibration findings

Use this file for concise observations and decisions. Keep exported calibration
JSON alongside the private review records, not in the repository.

## Initial smoke observation — July 24, 2026

**Build:** Production Sites version 10 from commit `1a610a2`

**Clip:** `lache-send.MOV`

**Configuration:** MediaPipe Lite, Balanced display policy, Smoothed preview,
all default values

**Calibration changes made:** None

### Observations

- During the fast lache swing, the armature appears to trail the climber by
  roughly one to six frames. The exact delay is difficult to judge by eye but
  is significant enough to pause broader calibration.
- Comparable lag was not noticed in the previous product overlay.
- The joint inspection selector includes MediaPipe face details such as eyes and
  mouth that are not drawn in the ordinary simplified skeleton. This makes the
  calibration surface noisier than necessary.

### Current hypothesis

The previous default overlay drew accepted raw landmarks. The current display
defaults to segment-local One Euro smoothed landmarks. The smoothing path is
therefore the leading explanation for the newly visible phase delay. This is
not yet proven; timestamp/video synchronization remains the alternative if
Accepted raw also lags.

### Next diagnostic — no parameter changes

1. Analyze the same lache range once with the default Lite/Balanced settings.
2. Replay the swing with **Overlay preview → Accepted raw**.
3. Replay the identical range with **Overlay preview → Smoothed**.
4. Record whether Accepted raw tracks the climber while Smoothed trails.

Do not change thresholds, temporal limits, hysteresis, or smoothing values
before this comparison.

### Decision rule

- If only Smoothed lags, temporarily prefer Accepted raw for ordinary display
  and recalibrate or disable default smoothing before broader policy work.
- If both views lag by the same amount, stop calibration and investigate
  playback timestamp lookup, video-frame presentation timing, and overlay
  rendering synchronization.

## Lag diagnostic result — July 24, 2026

**Result:** Accepted raw does not show the lag. Smoothed does.

The smoothed skeleton looks visually clean and successfully reduces noise, but
it trails the climber during fast movement. The effect appears across the whole
skeleton and is easiest to see during the lache swing. Visual inspection
estimated roughly two frames of delay.

The second estimate—about seven playback-slider arrow presses—does not represent
seven video frames. The current slider step is `0.01` seconds, so seven presses
are approximately 70 ms, or 2.1 frames at 30 fps. The two estimates are
therefore consistent with a roughly two-frame phase delay, although the exact
lag can vary with motion speed.

### Conclusion

- The video/overlay timestamp join is not the leading cause because Accepted
  raw remains registered.
- The causal One Euro smoothing path is the confirmed source of the newly
  visible delay.
- Broader confidence/temporal calibration remains paused until the ordinary
  display path no longer regresses fast-motion alignment.
- No calibration parameter or runtime default was changed as part of this
  diagnostic.

### Recommended product response

1. Restore Accepted raw as the temporary ordinary display default.
2. Retain Smoothed as an advanced comparison view.
3. Evaluate a centered/offline smoother for completed analysis segments. Unlike
   a causal live filter, it may reduce jitter without systematically trailing
   recorded motion, but it must remain gap-bounded and be checked for
   pre-motion anticipation.
4. Add an exact-frame calibration A/B view before choosing the final smoother.
5. Measure estimated smoothing lag in milliseconds/frames in addition to mean
   positional displacement.

## Responsive smoothing investigation — July 24, 2026

**Diagnosis:** No timestamp, sample-index, or renderer alignment defect was
found. The prior One Euro configuration was behaving as implemented, but its
speed coefficient was too small for normalized landmark coordinates. At 30 Hz,
the minimum-cutoff response alone naturally produces about two frames of phase
delay.

The same cached Lite analysis of `lache-send.MOV`, 7–12 seconds, was swept
without rerunning inference. On high-motion joint steps:

| Balanced candidate | Median projected lag | 90th percentile | Acceleration retained |
|---|---:|---:|---:|
| cutoff 2, beta 0.7 | 1.73 frames | 2.49 frames | 31% |
| cutoff 2, beta 12 | 0.80 frames | 1.24 frames | 45% |

The responsive candidate keeps the minimum cutoff at 2 so slow/stationary pose
remains strongly filtered, while the higher beta lets fast motion bypass more
smoothing. Exact-frame spot checks on the swing placed the candidate closer to
Accepted raw. Synthetic regression coverage now checks both under-one-frame
steady fast-motion lag and at least 75% suppression of alternating
low-amplitude acceleration noise.

### Implemented follow-up

- Balanced v2 changes the default speed coefficient from `0.7` to `12`.
- Strict and Permissive use `8` and `16` respectively, preserving their
  stronger-smoothing / greater-responsiveness ordering.
- The advanced Speed coefficient control now spans `0–20`; its previous
  maximum of `1` could not reach the responsive range.
- Smoothed remains the ordinary default for the human re-smoke. Accepted raw
  remains the alignment reference.
- Reserve a centered/offline smoother and calibration A/B mode unless the
  focused re-smoke still finds objectionable lag.

### Focused re-smoke

Replay the same lache swing on the new hosted build, switching only between
Accepted raw and Smoothed. Record whether the remaining difference is
imperceptible, acceptable (about one frame), or still objectionable. Do not
begin broader threshold calibration until this check passes.

## Balanced v2 re-smoke result — July 24, 2026

**Result:** Smoothed still trails Accepted raw by one visible frame. The
reviewer prefers no visible lag, so Balanced v2 has not passed human display
sign-off. Broader confidence and temporal calibration remains paused.

This result is consistent with the measured v2 response. A causal One Euro
filter can reduce delay but cannot guarantee a zero-phase result while retaining
smoothing. No additional smoothing parameter or ordinary preview default was
changed from this observation alone.

### Exact-frame calibration navigation

The main analyzed-frame seeker remains visible in the calibration workspace and
adds:

- direct one-based analyzed-frame entry;
- the exact stored presentation timestamp to six decimal places;
- automatic pause before every frame seek.

Within analyzed coverage, its existing previous/next buttons and press-and-hold
jog use actual stored pose-analysis presentation timestamps. This preserves
correct spacing for variable-frame-rate footage. Outside that coverage, the
same controls are explicitly labeled Estimated and use the source's average
frame rate as a navigation proxy; direct frame-number entry remains exact.

Use these controls to record the exact frame where Accepted raw and Smoothed
first diverge during the lache. If one-frame causal lag remains consistently
objectionable, the next implementation candidate is a gap-bounded
centered/offline display smoother, checked for pre-motion anticipation against
the same exact frames.

### Calibration workspace safeguards

Calibration setting changes now have a bounded 100-step undo/redo history.
Rapid changes to the same slider or number control within 750 ms coalesce into
one step. Buttons remain visible near the top of the workspace, and while that
workspace is open the normal shortcuts are supported:

- `Cmd/Ctrl+Z` undo;
- `Cmd/Ctrl+Shift+Z` redo;
- `Ctrl+Y` redo.

History covers the preset, display/analytics target, preview mode, thresholds,
hysteresis, temporal limits, smoothing values, overrides, preset reset, and
manual seeking while the workspace is open. Exact analyzed-frame steps remain
separate history entries; rapid transport-slider events coalesce.
Inference-model changes are excluded because they clear raw analysis, and manual
labels remain separate evidence. Importing a source or changing the model clears
history.

The Smoothed preview is disabled when the active policy has smoothing disabled.
Turning smoothing off while Smoothed is visible falls back to Accepted raw.
Accepted raw may still be selected while smoothing is enabled because it is the
intentional unfiltered comparison view; it does not change the calibrated filter.

The five advanced setting families are independently collapsible and start
closed so the current calibration task can remain visually focused.

The developer workspace now exposes the complete effective `0–1` confidence,
`0–1` acquire-delta, and `-1–0` keep-delta domains. Finite nonnegative
temporal and smoothing controls no longer have artificial upper limits.
Non-finite or out-of-domain input is ignored, and product preset defaults are
unchanged.

Quality evaluation is now limited to the 23 landmarks the product consumes:
nose plus landmarks 11–32. The 10 unused MediaPipe face-detail landmarks remain
only in immutable raw provenance and are unavailable for overrides or labels.
The former ambiguous longest-gap readout is replaced by an attributed longest
product-joint gap and a separate longest whole-pose gap.

## Centered offline experiment implemented — July 24, 2026

The focused re-smoke met the condition above, so the calibration workspace now
includes **Centered offline · experimental** beside Accepted raw and One Euro
smoothed. It reuses the same accepted cached samples and does not rerun
MediaPipe or change the Balanced product default.

The implementation uses a presentation-timestamp-weighted centered moving
average. For every accepted product-joint segment, it integrates the
piecewise-linear track over equal time before and after the current timestamp.
The window shrinks symmetrically at segment ends, resolves to Accepted raw at
the boundary, and never crosses a rejected sample, repeated/backward timestamp,
or gap over the active smoothing-gap limit. The default radius is `66.667 ms`;
`0 ms` exactly matches Accepted raw. Radius changes participate in calibration
undo/redo.

This removes the inherent past-only phase delay on constant-velocity motion,
but it can reveal future movement shortly before the raw track begins. No
default decision has been made. Record the human comparison here:

| Clip/range + exact frame | Joint/group | Accepted raw | One Euro | Centered 33.333 ms | Centered 66.667 ms | Centered 100 ms | Verdict / anticipation or boundary issue |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

Minimum sign-off:

- inspect motion onset, fastest swing, stopping/landing, and gap reacquisition;
- confirm no cross-gap pull;
- require visibly less trailing without objectionable anticipation;
- repeat the improvement on at least two clips before considering a default
  change.

## Human default selections — July 24, 2026

The reviewer selected these product defaults after direct visual comparison:

- **Display smoother:** Centered offline at the existing `66.667 ms` radius. It
  looked best among Raw, Accepted raw, One Euro, and centered options at their
  default settings.
- **Inference model:** MediaPipe Full. It produced a noticeable pose-quality
  improvement without a drastic analysis-time increase. This visual result
  supersedes the earlier coverage-only comparison, which did not capture the
  quality difference.
- **Maximum selectable range:** 60 seconds, increased from 20 seconds. Focused
  calibration ranges should remain shorter even though ordinary review may use
  the longer cap.

Balanced confidence, hysteresis, temporal limits, the `66.667 ms` centered
radius, 30 requested samples/second, and the separate unsmoothed Analytics
policy remain unchanged.

### Captured raw-pose flicker diagnosis — July 25, 2026

The `yellow-v0` recording, screen capture, and calibration export reproduced the
two-second Raw-model flicker from about 15.3 seconds. The export already
contained the immutable MediaPipe landmarks; no additional model-output feature
was required.

The selected range scheduled 372 requests. Seventeen requests from 15.283333 to
16.883333 seconds had no stored sample at a regular 100 ms cadence, while
the neighboring samples contained valid full-model landmarks. Reproducing the
same range start showed that integer-microsecond request times could fall less
than one microsecond before a rational source-frame presentation timestamp.
MediaBunny consequently returned the preceding frame again, and Crux's duplicate
suppression correctly skipped it before MediaPipe inference.

The media lookup now receives a one-microsecond forward boundary bias, clamped
to the source duration. The exact regression then stored 371 unique samples for
the 371 real source frames in range, and Raw playback from 15.2–17.1 seconds
produced no unavailable frames. This uses the real decoded frames; it does not
hold, interpolate, or fabricate pose coordinates.

Calibration rule: analyze a model/range once, preserve its cached raw samples,
and compare every policy/filter candidate against that same cache. If future
flicker appears, first distinguish a missing stored sample from a stored sample
whose landmark arrays are empty before changing continuity behavior.

## Comparison-tool recommendation

A full pair of synchronized video players is not the first calibration tool to
build. It would duplicate video playback, layout, controls, and synchronization
work planned for R5.

The smaller calibration-specific option is one video/player and two derived
overlay policies evaluated from the same cached raw samples. A desktop-only A/B
mode could provide:

- baseline policy A and candidate policy B;
- instant A/B switching while paused or playing;
- an optional split/wipe overlay on the same presented video frame;
- side-by-side metrics and label outcomes;
- no second decoder, inference job, or synchronization origin.

This gives exact frame identity and isolates policy differences. Consider it
only after the Accepted raw versus Smoothed diagnostic confirms that visual
comparison is the blocker.

## Trail-assisted calibration direction — July 27, 2026

### Observation

Selectable joint trails make confidence and geometry failures substantially
easier to see. False limb positions are more distracting and frustrating than
gaps where an uncertain joint is omitted. The current visual preference is
therefore lower false-visible error at the cost of more missing joint
positions, rather than maximizing accepted coverage.

### Decision

- Do not tune thresholds or change the current defaults now; the existing
  calibration is adequate for continued feature development.
- Defer the next deliberate calibration phase until the main overlay feature
  set provides a richer visual inspection surface.
- In that phase, test a general increase in display-policy strictness and pay
  particular attention to limb acceptance and continuity.
- Evaluate a five-step pose-quality scale: **Extra Strict**, **Strict**,
  **Balanced**, **Permissive**, and **Extra Permissive**.
- Treat these as hypotheses to validate against cached raw samples and labeled
  visual evidence, not as permission to bridge gaps or manufacture positions.

## Continuing findings

### Session

- Date:
- Reviewer:
- Build:
- Clips/ranges:
- Overall verdict:

### Observations

| Clip/time | View/policy | Joint/group | Observation | Expected behavior | Severity |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

### Changes tested

| Single change | Before → after | Clips checked | Improvement | Regression | Keep/revert |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

### Decision

- Selected default:
- Evidence:
- Known limitations:
- Next action:

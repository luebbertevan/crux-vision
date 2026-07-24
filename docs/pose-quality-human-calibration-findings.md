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

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

# iPhone validation guide

The physical-device work is now split between a minimal R2A smoke test and a
more complete R2D evaluation. Use the reference iPhone 15 on iOS 26.5 in Chrome.
Chrome on iOS uses Apple's WebKit engine, so this is evidence for the actual
browser environment—not desktop Chrome with a narrow viewport.

**R2A smoke status:** Complete — passed July 24, 2026 on the reference iPhone
15 in Chrome for iOS. The exact Chrome version was not recorded.

**Post-gate default change:** Later laptop calibration selected MediaPipe Full,
Centered offline smoothing, and a 60-second selectable range. The completed
physical smoke below remains valid evidence for Lite and a short range; it is
not evidence that sustained 60-second Full analysis has passed the phone gate.

## Before testing

- Serve the built app from a trusted HTTPS origin. A local `http://` address is
  not sufficient because browser media APIs can require a secure context.
- Keep the phone off Low Power Mode and record its approximate battery level.
- Use a recent portrait gym video from Photos. The file and pose data stay in
  the active browser session; R2A has no upload or export path.
- Close unusually heavy background apps so the first run is comparable. The
  later sustained run should represent normal gym use.

## R2A smoke test

Before running a model matrix, prove that a portrait clip imports upright, a
visible first frame replaces the empty black player, a short Lite analysis
produces pose, the overlay aligns, interaction remains responsive, and the page
does not crash or reload. Stop and revisit the architecture if this fails.

The first physical run confirmed HTTPS access, portrait import, and playback,
then exposed a WebKit worker mismatch in MediaPipe's generated canvas bridge:
analysis fails with `Can't find variable: document` in the documentless worker.
The captured stack identified MediaPipe's pre-task canvas selection, not its
later WASM canvas bridge: MediaPipe mistakes the `CriOS` user agent for old
Safari, ignores the available `OffscreenCanvas`, and tries
`document.createElement()` in the worker. The current build passes a fresh
explicit `OffscreenCanvas` through MediaPipe's supported `canvas` option for
each GPU/CPU attempt. A failed GPU attempt is terminated before CPU starts in a
fresh worker, avoiding contaminated MediaPipe loader/WebGL state. The build
retains the copyable diagnostics if another failure appears.

The explicit-canvas retry succeeded on the reference phone. Initialization is
noticeably slower than desktop but remains acceptable. The portrait stage is
now edge-to-edge at narrow widths, page-level pinch zoom is disabled, and
secondary controls remain centered with equal safe-area gutters below it. Phone
stage sizing is width-driven and did not change when Chrome's address bar
expanded or collapsed during scrolling. The stage and transport tracked the
live visual viewport width and horizontal offset, while the control cards
retained normal phone dimensions and aligned to the viewport center.

The final smoke run used production Sites version 9 from commit
`0b1abbe6fbdbba9cc4bc702f488586f6a23339e8` and passed:

- a portrait video imported from Photos, appeared upright, and showed its local
  first-frame poster instead of a black player when autoplay was blocked;
- playback, timed frame extraction, MediaPipe Lite initialization, and a short
  analysis completed;
- the skeleton and hip/shoulder midpoint trails registered to the climber while
  seeking through analyzed time;
- play/pause, scrolling, seeking, and secondary controls remained responsive;
- replacing the source cleared the prior overlay and progress;
- the page did not crash or reload, and no unusual heat was reported during the
  short smoke test.

The longer thermal/battery run and Lite/Full delegate matrix were intentionally
not run. Later desktop review reproduced occasional one- or two-second raw-pose
flicker clusters that can change or disappear across fresh analyses. Each run
starts a new stateful MediaPipe `VIDEO` tracker, while renderer nearest-sample
gaps remain a separate possible display effect. No runtime flicker-diagnostics
feature exists.

Chrome for iOS also has a limited built-in console collector. As a fallback,
open `chrome://inspect` in one Chrome tab and leave it open, reproduce the
failure in another tab, then return to `chrome://inspect` and capture the logged
errors. Prefer the on-page report because it deliberately retains the worker
failure and both delegate attempts.

The completed short handoff, retained for reproducibility, was:

1. Open the HTTPS-served production build in Chrome on the iPhone 15.
2. Choose one portrait clip from Photos and confirm it begins playing upright.
3. Pause near a visible climbing move, set a 3–5 second start/end range, and tap
   **Analyze range**. If it fails, stop here and return the diagnostic report
   above.
4. During analysis, play/pause and scroll once. Confirm controls respond and the
   page does not reload.
5. Seek inside analyzed time and confirm the skeleton plus hip- and
   shoulder-midpoint trails register to the climber. A clean **Pose unavailable
   here** moment is acceptable; a stale or jumping skeleton is not.
6. Tap **Replace video**, choose another clip, and confirm the previous overlay
   and progress do not return.

Record pass/fail, Chrome and iOS versions, and only observed orientation,
alignment, responsiveness, crash/reload, or unusual heat issues. The completed
gate did not include the long model/delegate matrix.

## R2D short model matrix

Choose a five-second interval where the full climber is visible. The product
keeps model/delegate selection internal; use a development measurement harness
only if the R2A phone result makes comparison necessary. Compare:

1. MediaPipe Full / GPU
2. MediaPipe Full / CPU
3. MediaPipe Lite / GPU
4. MediaPipe Lite / CPU

After every run:

- scrub through the interval and check whether the skeleton stays aligned;
- note whether scrolling, controls, or video playback become unresponsive;
- record the model/delegate and timings in the R2D findings report;
- note obvious wrist or ankle loss and any lines jumping across the image.

## R2D sustained run

Run Full with the better delegate over 20–30 seconds at the 30 samples/sec
default. If that remains stable, repeat with the selected 60-second range cap.
Record:

- wall time and average inference time;
- whether the browser becomes warm or reloads the page;
- whether playback and scrubbing remain responsive after analysis;
- approximate battery percentage before and after;
- whether importing another video and rerunning releases the previous session.

## Mobile exit decision

The client-only mobile path passes if portrait import, display orientation,
frame extraction, pose inference, and live overlay all work without a browser
crash; the skeleton is registered to the displayed video; and Full processes at
a practical rate on the reference phone. Full is the quality default; Lite is
the lower-cost fallback if sustained latency, heat, or reload behavior is not
acceptable. If neither local path is practical, the fallback decision must be
documented before R2B expands the interaction system.

The minimal R2A client-only mobile gate passed. The remaining sustained and
model-comparison evidence belongs to R2D rather than this completed smoke test.

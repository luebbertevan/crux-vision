# iPhone validation guide

The physical-device work is now split between a minimal R2A smoke test and a
more complete R2D evaluation. Use the reference iPhone 15 on iOS 26.5 in Chrome.
Chrome on iOS uses Apple's WebKit engine, so this is evidence for the actual
browser environment—not desktop Chrome with a narrow viewport.

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
short Lite analysis produces pose, the overlay aligns, interaction remains
responsive, and the page does not crash or reload. Stop and revisit the
architecture if this fails.

The first physical run confirmed HTTPS access, portrait import, and playback,
then exposed a WebKit worker mismatch in MediaPipe's generated canvas bridge:
analysis fails with `Can't find variable: document` in the documentless worker.
Forcing MediaPipe's intended `OffscreenCanvas` branch did not resolve the error,
so do not continue guessing from the short message. The current build preserves
the GPU and CPU failures, full stacks, and relevant worker/page globals in an
on-page report.

For the next diagnostic run:

1. Fully close the existing Crux Vision tab, reopen the HTTPS production URL,
   import a portrait clip, and run a 3–5 second analysis.
2. After the error appears, expand **Diagnostic details**, tap **Copy
   diagnostics**, and paste the complete report into the Codex task. The report
   contains browser/runtime data and error stacks, not video pixels or pose
   samples.
3. If the clipboard button is unavailable, press and hold inside the report to
   select/copy it, or send screenshots covering the complete report.

Chrome for iOS also has a limited built-in console collector. As a fallback,
open `chrome://inspect` in one Chrome tab and leave it open, reproduce the
failure in another tab, then return to `chrome://inspect` and capture the logged
errors. Prefer the on-page report because it deliberately retains the worker
failure and both delegate attempts.

Run this exact short handoff:

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
alignment, responsiveness, crash/reload, or unusual heat issues. Do not run the
long model/delegate matrix at this gate.

## R2D short model matrix

Choose a five-second interval where the full climber is visible. The product
keeps model/delegate selection internal; use a development measurement harness
only if the R2A phone result makes comparison necessary. Compare:

1. MediaPipe Lite / CPU
2. MediaPipe Lite / GPU
3. MediaPipe Full / CPU
4. MediaPipe Full / GPU

After every run:

- scrub through the interval and check whether the skeleton stays aligned;
- note whether scrolling, controls, or video playback become unresponsive;
- record the model/delegate and timings in the R2D findings report;
- note obvious wrist or ankle loss and any lines jumping across the image.

## R2D sustained run

Run Lite with the better delegate over 20–30 seconds at the 30 samples/sec
default. Record:

- wall time and average inference time;
- whether the browser becomes warm or reloads the page;
- whether playback and scrubbing remain responsive after analysis;
- approximate battery percentage before and after;
- whether importing another video and rerunning releases the previous session.

## Mobile exit decision

The client-only mobile path passes if portrait import, display orientation,
frame extraction, pose inference, and live overlay all work without a browser
crash; the skeleton is registered to the displayed video; and Lite processes at
a practical rate on
the reference phone. Full remains a candidate only if its visible quality gain
justifies its latency and thermal cost. If neither local path is practical, the
fallback decision must be documented before R2B expands the interaction system.

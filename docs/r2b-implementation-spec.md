# R2B implementation record: precision review

**Status:** Complete — July 26, 2026

## Outcome

A climber can isolate a move, loop it, slow it down, jog through analyzed
presentation timestamps, and save named moments without opening the calibration
workspace. The controls remain compact beside portrait video and touchable on
phone layouts.

## Delivered interaction

- The existing source timeline remains the coarse scrub.
- The existing Set start and Set end actions remain the In/Out interaction.
- Playback presets are `0.25×`, `0.5×`, and `1×`.
- Loop constrains playback to the selected range without changing that range.
- Previous/next frame is the deliberate fine jog. Within analyzed coverage it
  uses stored pose presentation timestamps. Before analysis and outside that
  coverage it switches to a visibly labeled estimate based on the source's
  average frame rate, falling back to `30 fps` only when that metadata is not
  usable. A normal tap or click moves once; holding for `350 ms` starts a
  five-steps-per-second repeat that stops immediately on release, cancellation,
  or an unavailable direction.
  The same seeker remains in place when calibration opens; its center readout
  becomes an editable analyzed-frame number and shows the exact timestamp.
- Named checkpoints can be added at the playhead, renamed, selected directly,
  removed, and reached with previous/next navigation.
- On hover-and-fine-pointer desktop devices, checkpoint navigation preserves
  active playback. Touch-first devices pause before seeking until that behavior
  has been tested with climbers.
- Each checkpoint appears as a small neutral tick on the main playback timeline;
  the tick at the playhead receives a restrained lime emphasis.
- Checkpoints are source-session state. Replacing the video clears them;
  persistence remains R3 work.

## Timing and media integrity

Loop boundaries are expressed in source presentation seconds derived from the
selected microsecond range. Browsers with `requestVideoFrameCallback` check the
boundary against presented media time; ordinary media events provide the
fallback. Starting playback outside an enabled loop returns to its In point.

Frame jog prefers actual stored analysis-sample timestamps throughout analyzed
coverage, preserving variable-frame-rate spacing there. Outside that coverage,
the estimate advances by the source's average packet-frame rate and is labeled
`Estimated`; it never claims that those proxy positions are analyzed or exact
source-frame timestamps. Crossing into analyzed coverage snaps to the first or
last exact stored timestamp.

## Shortcuts

| Action | Shortcut |
|---|---|
| Play or pause | Space |
| Toggle selected-range loop | L |
| Previous / next analyzed frame | Left / Right arrow |
| `0.25×` / `0.5×` / `1×` | 1 / 2 / 3 |
| Add checkpoint | C |
| Previous / next checkpoint | Shift + Left / Right arrow |

Shortcuts do not intercept text fields, sliders, buttons, selects, links, or
calibration undo/redo. Mobile exposes the same actions through touch targets of
at least 44 CSS pixels.

## Responsive placement

Speed, loop, and frame jog live in the Clip selection card, keeping them next to
In/Out and analysis-range context. Checkpoints live in the Movement overlay card
so the tall desktop portrait layout stays balanced across both side gutters.
On narrow portrait phones both cards follow the video in document order. On
landscape phones and desktop landscape review, the established control rail
remains independently scrollable.

## Verification

- 59 Vitest tests cover exact and estimated timestamp navigation, range behavior, pose quality,
  smoothing, transforms, worker compatibility, history, and state.
- 23 Chrome Playwright tests cover the full analysis loop, calibration,
  playback speeds, loop restart and disable behavior, single-step and
  press-and-hold frame jog, release behavior, desktop and touch-first checkpoint
  playback, checkpoint naming/navigation, source replacement, and responsive
  layout.
- Real portrait and landscape fixtures were visually inspected at `1440×900`,
  `393×852`, and `852×393`.
- The production TypeScript and Vite build passes.

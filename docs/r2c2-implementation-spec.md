# R2C.2 implementation: trail appearance and checkpoint ranges

**Status:** Complete

**Date:** July 27, 2026

## Delivered behavior

An active trail source and a visible trail are now distinct states. The compact
source list gives each active source a directly accessible **Show [source]
trail** checkbox; hiding it preserves its color, timing, ranges, and place in
the list. Removing it returns the source to the add-source picker without
discarding its current-session customization.

A nested **Advanced trail settings** disclosure keeps infrequent controls out
of ordinary review. One compact selector chooses the active trail to edit. Its
editor provides:

- eight compact high-visibility graphite/chalk palette colors and a native
  custom color picker with outside-click commit behavior;
- responsive width from 60–500% of the original responsive stroke rule;
- tail opacity from 5–98%;
- a precise rolling-duration field in 0.05-second steps, from 0.25 seconds up
  to the current analysis-range duration;
- reset for the selected source and reset-all to the R2C defaults.

The contrast halo remains renderer-owned and independent of the selected color.
Appearance, visibility, timing, and disclosure choices are local to the
current source session and are not persisted.

Appearance, visibility, timing, range, and reset edits participate in the
global source-session undo/redo stack. Disclosure and editor selection are
navigation state and do not. Slider changes coalesce by control after 750 ms
idle; the full rule for future settings is in the
[`settings history contract`](./settings-history-contract.md).

## Checkpoint ranges

Each trail can switch from rolling duration to **Checkpoint ranges**. A user
may add multiple ranges, independently show or hide each one, and choose any
existing checkpoint for its start and end. Reversed selections are normalized
chronologically. Deleting a checkpoint removes every trail range that
references it rather than leaving a broken selector.
Checkpoint deletion and dependent range cleanup are one atomic undo step.

Checkpoint trails are fixed paths over cached accepted pose samples; they do
not move with the rolling playhead window. A ring marks the first accepted
point and a solid marker identifies the final accepted point. If either exact
checkpoint timestamp lacks an accepted joint, the marker remains honest by
landing on the first or last accepted sample inside the range.

The fixed-window trail builder shares the rolling builder's continuity rules.
Rejected or missing joints, repeated/backward timestamps, and gaps beyond the
calibrated maximum always end a segment. Ranges never interpolate, hold, or
connect across those gaps.

## Cached redraw and reset boundaries

Every R2C.2 change redraws the canvas at the current media time from the
existing quality-evaluated sample cache. It does not rerun MediaPipe or alter
raw poses, acceptance policies, centered/offline smoothing, analysis ranges,
playback, or checkpoint timestamps. Adding, editing, or removing a checkpoint
also refreshes only the display.

Replacing the video restores the master, layer, source, visibility, appearance,
rolling-duration, and empty-range defaults. No persistence or video zoom/pan
was added.

## Verification

Unit coverage exercises independent selection/visibility, per-source appearance
and color-channel conversion, bounded controls, multiple checkpoint ranges,
checkpoint cleanup, fixed-window endpoint rendering, and gap preservation.
Browser coverage performs real Full-model analysis, changes visibility and
appearance, creates two checkpoints and multiple ranges, and confirms the raw
sample count and ready analysis state do not change.

The real-fixture visual matrix covers approximately 1440×900, 393×852, and
852×393 with portrait and landscape footage. Four simultaneous trails remain
distinguishable on mixed light/dark climbing walls. The advanced phone editor
has no horizontal overflow, keeps its controls at touch size, and does not
resize or cover the video stage. The magenta checkpoint path retained its dark
halo, while the ringed start and solid end remained legible without adding
heavy visual weight.

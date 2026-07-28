# R2C.1 implementation: overlay controls and legible trail defaults

**Status:** Complete

**Date:** July 27, 2026

## Delivered behavior

The Movement overlay card keeps the prominent master **Overlays** switch in its
heading. Turning that switch off clears the canvas immediately but does not
change the user's skeleton, trails, or source selections. Turning it back on
restores the same selection.

A native, keyboard-operable **Overlay settings** disclosure sits below the
heading and is collapsed by default. It separates:

- layer visibility: Skeleton and Trails;
- active trail sources: compact removable rows for only the sources currently
  drawn;
- available trail sources: one grouped **Add trail source** picker for body
  midpoints, arms, and legs.

Skeleton, trails, hip midpoint, and shoulder midpoint start enabled. The four
explicitly sided elbow, wrist, knee, and ankle pairs start available in the
picker. Adding takes one selection; removing takes one clearly named row action.
This keeps the default surface to two source rows even though ten sources are
supported. The disclosure and all overlay choices are local to the current
in-memory source session. A successful source replacement collapses the
disclosure and restores the defaults. No browser or server persistence was
added.

Desktop and phone layouts keep the settings inside the existing control rail.
Opening the disclosure does not resize or cover the stage. Its summary is a
44 px target, and layer rows, active-source rows, remove actions, and the picker
become 44 px targets on phone portrait and landscape layouts. Native
details/summary, checkbox, button, optgroup, and select semantics preserve
keyboard operation and accessible names.

## Renderer and settings contract

`overlaySettings.ts` is the display contract between the UI and Canvas
renderer. It provides stable typed IDs for:

- `hip-midpoint`
- `shoulder-midpoint`
- `left-elbow`
- `right-elbow`
- `left-wrist`
- `right-wrist`
- `left-knee`
- `right-knee`
- `left-ankle`
- `right-ankle`

Each source definition owns its point resolver, label, default visibility, and
high-visibility default appearance. Appearance already has explicit color,
duration, fade endpoints, width scale, and halo values, but R2C.1 exposes only
visibility. R2C.2 can make those existing values editable without moving
hardcoded renderer constants back into UI or drawing code.

The ordinary trail window is now 2,000,000 microseconds. Colored trail strokes
retain responsive canvas-width sizing and apply a 1.25 scale to the prior rule.
A slightly wider, semi-transparent near-black pass is drawn first, followed by
the high-chroma colored pass. Single-point trail fragments receive the same
two-pass treatment.

Layer visibility is enforced independently:

- hiding Skeleton removes connections, accepted landmark dots, and rejected
  preview markers without hiding trails;
- hiding Trails removes every trail without hiding the skeleton;
- removing a source removes only that source and returns it to the add picker;
- hiding the master removes all drawing while leaving every sub-selection
  intact.

## Cached redraw and integrity boundaries

Overlay settings flow only to `OverlayCanvas`. A setting change redraws at the
video element's current media time from the existing quality-evaluated sample
cache. It does not call the analysis controller or change raw pose samples,
Balanced/Strict/Permissive policies, accepted decisions, centered/offline or
causal smoothing, the selected range, playback rate, loop state, checkpoints,
or the playhead.

Every overlay master, layer, source, and visibility edit participates in the
global source-session undo/redo stack. Future overlay settings follow the
[`settings history contract`](./settings-history-contract.md).

Trail segmentation remains timestamp based. Missing or rejected points and
gaps larger than the calibrated maximum end a segment. R2C.1 also makes
repeated and backward timestamps explicit continuity breaks, so a rendered
path cannot cross any of those cases.

## Verification

Focused unit coverage checks the settings/renderer contract, stable source IDs
and colors, independent layers, source selection, the two-second duration,
responsive 125% width scaling, two-pass contrast strokes, master preservation,
and rejected/missing/oversized/repeated/backward gap behavior.

Focused Chrome browser coverage uses real local video and Full-model analysis
to verify that display controls redraw a paused cached result while the raw
sample count and ready analysis phase remain unchanged. It also verifies master
preservation, one-step add/remove behavior, explicit elbow/knee availability,
source-session reset, collapsed defaults, grouped picker labels, 44 px phone
targets, no horizontal overflow, and stable stage dimensions at approximately
1440×900, 393×852, and 852×393.

The explicit visual matrix used `lache-send.MOV` for portrait and
`landscape-climb.MOV` for landscape at the same three viewport classes.
Against bright white/blue walls, black volumes and clothing, and mixed
high-contrast hold fields, the dark under-stroke kept the amber and cyan
defaults edged on light regions while their bright center strokes remained
clear on dark regions. The trails were visibly stronger than the earlier
default without covering limb geometry or competing with the video. A
four-source desktop state with hip, shoulder, left elbow, and right knee kept
the Movement overlay card readable and left the adjacent checkpoint controls
visible.

The final automated gate passed 69 Vitest tests across 13 files and 25 normal
Chrome Playwright tests; the opt-in visual-matrix Playwright case passed
separately. The complete Sites production build and deployment-package
verification also passed.

R2C.2 remains intentionally incomplete. R2C.1 adds no user-editable color,
duration, fade, or width controls, no persistence, and no video zoom or pan.

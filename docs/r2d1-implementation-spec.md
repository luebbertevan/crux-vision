# R2D.1 implementation record: mobile workspace navigation MVP

**Date:** July 28, 2026
**Status:** Implementation and emulated layout validation complete; physical
iPhone review pending

## Outcome

Crux Vision now exposes one compact mobile navigation model without redesigning
the working player. Analyze, Playback, and Overlay divide the existing controls
into task-focused surfaces while the source video, live overlay, and inset
over-video transport remain the same mounted instances.

Desktop retains the complete two-panel workspace. Its landscape transport now
uses the same over-video placement as portrait. R2D.1 otherwise changes only
phone information architecture, phone touch sizing, and the minimum styling
required to make those modes legible.

## Interaction contract

| Mode | Controls |
|---|---|
| Analyze | Analysis range, progress and run/cancel actions, source replacement, edit history, pose-quality preset, and advanced calibration disclosure |
| Playback | Playback speed, selected-range loop, previous/next presentation frame, and checkpoints |
| Overlay | Overlay master, skeleton/trails, trail sources, and appearance |

The mode bar uses text rather than adding uncertain icons. It appears directly
after the stage in narrow portrait layouts and at the top of the existing
right-hand control rail on short landscape phones.

The video and transport never remount when the mode changes. Inactive tool
groups use responsive visibility only; their React components remain mounted.
This preserves:

- current playback time, rate, and loop choice;
- analysis range, progress, and cached pose;
- checkpoints and source-session edit history;
- overlay layers, trail sources, per-trail appearance, and checkpoint ranges;
- pose-quality preset, advanced calibration state, and disclosure choices.

Changing orientation preserves the selected mode and all session state.
Replacing the source returns the mode to Analyze and then follows the existing
source-session reset rules.

## Responsive contract

R2D.1 activates at the established phone surfaces:

- narrow layouts up to `719 px`;
- short landscape layouts up to `950×500 px`.

At `393×852` and the reduced-height `393×740` case, the upright stage remains
full width and the portrait transport remains inset over the stage. The mode bar
follows the stage and becomes sticky only after it reaches the safe-area top
during normal scrolling.

At `852×393`, a portrait source fills the screen height in the left review
column without a reserved bottom strip. Its compact transport remains entirely
inside the narrow stage and omits both time readouts so seeking receives the
remaining width. Its branding scales down with the player, and a
vertical sticky mode rail sits between the video and independently scrolling
settings. A landscape source instead keeps the transport inset over the video,
starts the stage at the top screen edge, and scales to the largest size that
keeps the entire player visible at once. Below it, a vertical sticky mode rail
sits to the left of a settings column that remains centered under the video.
Every mobile source
orientation hides the separate top bar and places a mark-and-name brand lockup
inside the video's top-left corner. The lockup has no glass backing and omits
both the REVIEW label and Movement review subtitle. Landing and desktop-header
branding uses a muted Movement review subtitle with a subtle lime glow. This preserves
`object-fit: contain` without adding crop, zoom, or pan.

Active ordinary controls are at least `44×44 px` in both orientations. R2D.1
also corrects inherited small landscape range/action targets and replaces the
eight tiny advanced trail-color swatches with two rows of touch-sized choices.
The persistent transport is a tighter rounded pill everywhere. Play/pause keeps
button semantics and an accessible name, but its visual treatment is a bare
icon rather than a filled standard button; the mobile hit area remains
`44×44 px`. The matching right-aligned audio button reports and toggles the
actual media mute state. Source replacement restores muted playback so every
new clip begins consistently and can autoplay on mobile. The transport's
visible pill is fixed at `36 px` across desktop and phone layouts. On phone, the
play and mute controls retain transparent `44×44 px` hit areas around that
thinner visual shell.

## State and architecture boundaries

Mobile navigation is transient interface state. It is not written to the edit
history or persisted outside the current page session. No playback, media,
pose, filtering, smoothing, rendering, or display-transform contract changed.

R2D.1 does not add:

- video zoom or pan;
- pose-quality recalibration or new quality defaults;
- analysis-density or model/device tuning;
- a draggable sheet, viewport-fixed transport, hamburger menu, or new routing;
- session persistence, comparison, or additional media handling.

## Verification

Automated coverage verifies:

- Analyze is the default and source replacement returns to it;
- exactly the assigned phone tool group is visible for each mode;
- transport and stage remain visible in every mode;
- playback rate, checkpoints, trail visibility, open disclosures, and selected
  mode survive mode and orientation changes;
- portrait and landscape phone viewports work with both portrait and landscape
  source fixtures without horizontal overflow;
- every source and viewport combination keeps the transport inside the stage,
  and landscape media uses the largest complete-player fit on a short landscape
  phone with tools below;
- short-landscape navigation is vertical and remains visible while portrait
  settings scroll independently or the landscape-source settings page scrolls;
- the short-landscape portrait transport hides both time readouts and devotes
  the recovered space to its seek track;
- mobile Set start / Set end controls use the shared inline desktop treatment
  while retaining 44 px touch targets;
- mobile review hides the separate top bar, displays the mark and name inside
  the stage without a glass backing or subtitle, and does not render the REVIEW
  label;
- the visible transport pill stays `36 px` high across desktop and phone
  layouts while the phone interaction container stays at most `48 px`, with
  icon-only controls and mobile target sizing preserved;
- new sources start muted, the right-edge control toggles the media element,
  and source replacement restores the default;
- active ordinary phone targets meet the `44×44 px` minimum;
- the desktop mode bar stays hidden and the existing panels remain visible;
- advanced calibration remains reachable at the bottom of Analyze while
  frame navigation and checkpoints remain together in Playback;
- video and canvas alignment remains covered by the existing responsive
  regression suite.

The visual matrix covers `393×852` and `852×393` with both source orientations
in Analyze, Playback, and Overlay. The existing responsive suite retains the
`393×740` dynamic-browser-chrome case.

The final automated gate passes 81 Vitest tests and 33 standard Playwright
browser tests; one separate real-fixture visual-review test remains opt-in and
was skipped. The production build also passes.

The remaining acceptance step is a short physical iPhone 15 review of the
private deployment. Sustained analysis, thermal/battery behavior, the 60-second
cap, model/delegate measurements, and gym-session findings remain R2D.2 and
R2D.3 work.

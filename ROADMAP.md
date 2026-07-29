# Crux Vision roadmap

This is the editable source of truth for delivery order and milestone status.
The broader product rationale and technical research remain in
[`docs/rebuild-report.md`](./docs/rebuild-report.md).

## Working method

- Deliver small, testable vertical slices rather than completing isolated
  infrastructure layers.
- Keep one Codex task per roadmap milestone unless a bounded investigation
  needs its own task.
- End each milestone with a documented decision, passing relevant checks, and a
  committed Git checkpoint.
- Preserve product and technical invariants in `AGENTS.md`; do not depend on
  chat history for architectural continuity.
- Treat the roadmap as editable. Feedback can change a later slice without
  silently changing the current milestone's success criteria.

## R0 — Rebuild foundation

**Status:** Complete

**Outcome:** The legacy implementation is separated from the clean rebuild, and
the product contract, risks, and technical direction are documented.

## R1 — Pose and media risk spike

**Status:** Desktop spike complete; formal phone benchmark intentionally deferred

The diagnostic proved on the reference laptop that:

- MediaBunny can read difficult iPhone rotation metadata and extract
  display-oriented timed samples;
- MediaPipe can run progressively in a module worker;
- normalized pose data can be synchronized to ordinary video playback;
- the overlay can share the video's orientation and `object-fit` rectangle;
- MediaPipe Lite is the provisional model, with Full retained as a challenger;
- MoveNet is useful as a comparison baseline but not the current product path.

The user has chosen to preserve momentum rather than complete an extensive
phone benchmark against the diagnostic UI. Mobile feasibility is therefore an
explicitly accepted open risk, not an assumed success. See
[`docs/r1-spike-report.md`](./docs/r1-spike-report.md).

## R2 — First useful product: player, skeleton, and trails

R2 is split into feedback-ready slices. Its product contract is in
[`docs/r2-product-spec.md`](./docs/r2-product-spec.md).

### R2A — Product shell and first analysis loop

**Status:** Complete, including R2A.1 stage sizing and the minimal physical
iPhone gate

**Outcome:** A climber can import a local video, play it immediately, select a
short climbing range, see pose arrive progressively, and review a synchronized
skeleton plus an initial joint trail.

Build:

- the real responsive product shell, replacing the diagnostic-first interface;
- local import and immediate source playback;
- reliable portrait and landscape display using the R1 media contract;
- a simple range selection flow;
- progressive MediaPipe Lite analysis in the worker;
- live skeleton and one trail using the reusable overlay-layer structure;
- minimal analysis progress and “pose unavailable” feedback.

**Exit:** The loop works on real climbing footage on the reference laptop.

R2A delivered the real graphite/chalk product shell, local blob playback,
accessible 0.5–60 second range selection, progressive MediaPipe Full analysis
at 30 requested samples/second in the module worker, a presentation-timestamped
live skeleton, 1.5-second hip- and shoulder-midpoint trails, confidence-aware
gaps, cancel/resume, and stale-safe source replacement. Direct wrist sources
remain in the joint-agnostic trail contract. MediaPipe tries GPU first and falls
back once to CPU; model/delegate controls are not exposed as product UI.

The laptop exit is verified by 23 focused Vitest tests, eleven Chrome Playwright
tests against real portrait/landscape fixtures, a production build, and visual
inspection at 1440×900, 393×852, and 852×393. The R1 MediaBunny/MediaPipe
contracts and evidence remain; MoveNet, TensorFlow, and diagnostic-only UI and
benchmark scripts have been removed. See
[`docs/r2a-implementation-spec.md`](./docs/r2a-implementation-spec.md) for the
implementation record.

### R2A.1 — Single-video review scale

**Status:** Complete; physical phone gate passed

**Timing:** Before the R2 phone gate

**Outcome:** The imported video—not surrounding chrome—is unmistakably the
focus on desktop and mobile, including portrait footage.

Build:

- let a single video use nearly all available viewport height and width after
  essential header and transport controls;
- size the stage from the video's upright display aspect ratio and the remaining
  viewport, rather than allowing the desktop information rail to constrain it;
- on narrow phones, prefer a full-width stage and move secondary information
  below it instead of shrinking the video;
- preserve contain behavior, shared video/overlay transforms, and the approved
  visual language;
- make hip and shoulder midpoints the proof-of-concept trail defaults while
  retaining direct wrist and other joint sources in the joint-agnostic trail
  contract;
- replace detailed face landmarks with one accepted head anchor and a
  shoulder-midpoint-to-head connection;
- keep multi-video comparison and its substantially different layout problem
  out of scope.

**Exit:** At 1440×900, portrait footage uses nearly all available review height
without cropping, overlap, or an awkward small island. At 393×852, the stage
uses the available width and essential transport remains reachable. Landscape
footage remains large and balanced at both viewports.

R2A.1 sizes desktop stages by fitting the upright display dimensions into the
review column's measured width and the viewport height remaining below the
actual stage top after non-overlaid transport and safe-area padding are
reserved. Narrow
phone stages are width-driven so changing iOS browser chrome cannot resize the
video during scroll; secondary controls continue below when necessary. At wide
desktop widths, a portrait stage is centered in the full review surface while
the 330 px control rail occupies otherwise unused side space; landscape keeps a
flexible main column beside the rail. At narrow widths, the rail follows the
stage and transport in document order. Desktop portrait review uses an unboxed
190–230 px side brand lockup instead of a top bar. Its horizontal
icon-and-wordmark lockup matches the landscape header without secondary
utilities. Range selection and the primary analysis actions lead the card,
followed by playback review, source-session
Edit history, and Review marks now live in divided sections of the
**Clip & analysis** card. Set start/end sit beside their values, and Analyze
range and Replace video share one row. At laptop widths of 1100 px and above,
the Clip & analysis and On-device pose cards and their complete contents render
at 125% scale as 380 px-wide surfaces; narrower desktop and mobile layouts retain their
established sizing. For wide portrait review, Clip & analysis uses the open
space beneath an enlarged brand lockup at the left of the player, while
On-device pose occupies the matching right gutter. Both cards share a top edge
and remain centered between the player and their respective viewport edges.
Their responsive scale increases from 137.5% at laptop widths to 165% at
1600 px, 187% at full HD, and 206.25% on ultrawide displays. The paired row has
a viewport-based minimum top offset, so added content grows downward instead
of pushing either card above the branding. The
filename sits above the right card, right-aligned to it at approximately the
brand subtitle's type size. Review filenames use the larger legibility treatment
across layouts, while source-review branding scales visually by 1.5× on wide
screens without participating in control-card positioning. At compact desktop
widths the stage aligns to the right of its review column so the wider brand
does not reduce portrait video height. A translucent transport overlays the
bottom of every desktop stage, allowing the video to begin at the 8 px shell
gutter without reserving a second transport row. Desktop landscape retains the
compact horizontal top bar. At the reference viewports, the
portrait stage is approximately 496×882 px at 1440×900 and remains
393×698.5 px at 393×852; desktop landscape is approximately 1072×603 px. The
852×393 layout keeps portrait media beside its control rail. A landscape
source instead starts at the top edge and uses the largest contain-fit that
keeps the complete player and transport visible inside the screen, with
selected tools following below the stage. Phone branding lives in a compact
dark-backed lockup at the top-left of the video; the separate mobile top bar
and REVIEW label are removed, and the Movement review subtitle uses lime for
contrast. The side brand lockup remains desktop-only. Phone review uses the
translucent, inset over-video transport for both source and phone orientations while
retaining 44 px touch targets. Across desktop and phone layouts, play/pause is
an icon-only control inside a slimmer pill transport instead of a filled
standard button. A matching right-aligned audio control reflects the current
mute state, and every newly opened source starts muted.
Video and canvas still share identical bounds and `object-fit: contain`.

### R2 phone gate — Minimal physical-device smoke test

**Timing:** Immediately after R2A.1, before advanced controls

**Status:** Complete — passed on the physical iPhone 15 in Chrome/iOS WebKit

On the iPhone 15 using Chrome/iOS WebKit, prove only that:

- a portrait video can be imported from Photos and appears upright;
- timed frame extraction and MediaPipe initialization work;
- pose results appear and the skeleton is registered to the displayed video;
- playback and basic page interaction remain responsive;
- a short analysis does not crash or reload the page.

This is intentionally smaller than the original R1 benchmark plan. If it fails,
decide the compatibility or pose-data-only server fallback before expanding R2.
The longer thermal, battery, and model/delegate matrix moves to R2D.

The copyable phone diagnostic mapped both delegate failures to MediaPipe's
pre-task canvas selection. Its user-agent check mistakes Chrome iOS (`CriOS`)
for pre-17 Safari, ignores the available `OffscreenCanvas`, and calls
`document.createElement()` inside the documentless worker. The worker now
passes a fresh explicit `OffscreenCanvas` through MediaPipe's supported
`canvas` option for each initialization attempt, bypassing that faulty
user-agent branch without adding a fake DOM. If GPU initialization fails, the
single CPU fallback now starts in a fresh worker so MediaPipe's failed
worker-global loader/WebGL state cannot contaminate it.

The user passed the final smoke test on July 24, 2026, using the production
phone build from commit `0b1abbe` on the reference iPhone 15 running iOS 26.5
in Chrome for iOS (exact Chrome version not recorded). A portrait video imported
from Photos, appeared upright with a decoded local poster, played, and completed
a short Lite analysis. Timed extraction and MediaPipe initialization produced
pose; the skeleton and hip/shoulder midpoint trails remained registered to the
climber. Play/pause, seeking, and page scrolling stayed responsive, replacing
the video cleared the previous analysis, and the page did not crash or reload.
The stage and transport remained edge-to-edge, secondary controls remained
readable and centered, and page-level pinch zoom stayed disabled. No unusual
heat was reported during this short smoke test.

The longer thermal/battery and delegate/model matrix was not run and remains in
R2D. No compatibility fallback is required by this gate. The previously
observed alternating pose/unavailable flicker was later reproduced and fixed as
a fractional source-timestamp lookup boundary in the calibration gate; no
runtime flicker-diagnostics feature was added.

### R2 pose-quality calibration gate

**Status:** Initial gate complete; broader visual calibration deferred until
after the main overlay feature set

**Timing:** After the phone gate and before R2B

**Outcome:** Crux Vision has evidence-based pose acceptance and smoothing
defaults before expanding pose-derived analysis.

Build:

- add a temporary advanced calibration workspace over cached raw poses;
- tune global, body-group, and optional per-joint confidence thresholds with
  explicit precedence;
- evaluate confidence hysteresis, timestamp-based temporal plausibility, and
  smoothing that resets at honest gaps;
- if range-start-sensitive alternating pose/unavailable flicker recurs often
  enough to matter, separate timestamp gaps from model/confidence gaps before
  changing display continuity;
- preview raw, accepted, rejected, causal One Euro, and default centered
  samples without rerunning inference;
- measure usable coverage, false-visible samples, flicker, gap duration, and
  smoothing lag on representative climbing ranges;
- publish Balanced v2 plus documented Strict and Permissive alternatives.

**Exit:** The selected policy materially reduces visible slingshots and false
limb geometry without hiding most useful movement. Display and analytics
policies remain separate and coverage-aware, the automated acceptance suite
passes, and remaining MediaPipe limitations are documented.

Balanced v2 now applies structural validation, confidence precedence, separate
visibility/presence checks, acquisition/retention hysteresis, timestamp- and
body-scale-aware temporal rejection, and gap-resetting segment-local One Euro
smoothing over immutable cached raw samples. Strict and Permissive alternatives
have measurable coverage/continuity tradeoffs. The ordinary surface exposes the
three presets; model, policy target, thresholds, joint overrides, debug views,
metrics, labels, and JSON export remain under **Pose quality calibration**.

The bounded laptop corpus covered dynamic portrait movement, portrait
overhang/occlusion, and extended landscape movement. Balanced accepted 49.7%,
90.7%, and 89.2% of the 23 scheduled product-joint slots in those ranges
respectively.
The difficult lache range included 49 model-empty samples out of 151; filtering
does not conceal or reconstruct them. Visual review found no repeatable major
raw slingshot in the selected moments, while synthetic high-confidence
slingshots are rejected and the tuned temporal limits retain plausible fast
limbs. This is a first display-policy calibration, not motion-capture accuracy
validation.

A bounded Full-model challenger on the difficult range accepted 48.9% versus
Lite's 49.7%. Repeated short warm-cache laptop timing changed order and was not
treated as device-performance evidence. That availability-only comparison
initially kept Lite, but later human review found Full noticeably improved pose
quality without drastically increasing analysis time. Full is now the product
default and Lite remains the faster alternative.
The phone thermal/battery and delegate/model matrix remains R2D work and was not
run. The previously reported pose/unavailable alternation did not recur in the
initial bounded pass; later review reproduced intermittent raw-pose flicker, as
documented below.

See the
[`calibration plan`](./docs/pose-quality-calibration-plan.md) and
[`Balanced v2 report`](./docs/pose-quality-calibration-report.md).

Post-implementation human review of `lache-send.MOV` confirmed that the
Smoothed view trails Accepted raw by roughly 70 ms during fast movement.
Accepted raw does not show the lag, isolating the regression to the causal One
Euro smoothing path rather than the playback timestamp join. A same-cache lache
sweep then showed that the original speed coefficient was too low: Balanced v2
reduced median projected high-motion lag from 1.73 to 0.80 frames and the 90th
percentile from 2.49 to 1.24 while still removing about 55% of aggregate
frame-to-frame acceleration noise. The tuned causal smoother then entered a
focused human re-smoke, with a same-frame A/B tool or gap-bounded
centered/offline smoother reserved for an objectionable remaining response.

The focused v2 re-smoke still found one frame of visible Smoothed-versus-Accepted
raw lag, and the reviewer prefers no lag. Calibration now includes
previous/next analyzed-frame controls, direct analyzed-frame entry, and the
exact stored presentation timestamp. These controls pause and seek by actual
pose-sample presentation time rather than nominal FPS, so variable-frame-rate
spacing remains honest. They do not claim access to source frames that were not
analyzed. Calibration reuses the ordinary analyzed-frame seeker, making its
center readout editable instead of replacing it with a second navigator.
Outside analyzed coverage, the same seeker is labeled Estimated and uses the
source's average frame rate only as a navigation proxy. Use the exact-frame
evidence to evaluate a gap-bounded
centered/offline smoother before resuming broader calibration; do not begin the
rest of R2B in this gate.

That candidate is now implemented as **Centered offline · default**. It
uses a presentation-timestamp-weighted symmetric moving average over each
accepted product-joint segment, shrinks evenly to Accepted raw at segment
boundaries, and never crosses a rejected, repeated/backward, or oversized gap.
The default radius is `66.667 ms`, `0 ms` equals Accepted raw, and radius edits
participate in session-wide undo/redo. It is intentionally separate from the
Balanced acceptance policy. Human review found it the best-looking default
among the available views; ongoing calibration must still compare fast
alignment, stationary jitter, motion onset, stopping/landing, and reacquisition
boundaries.

The selectable analysis cap is now 60 seconds rather than 20. This does not
replace the R2D sustained physical-phone validation for Full-model heat, memory,
responsiveness, or reload risk.

A captured `yellow-v0` case isolated the reported raw-pose flicker upstream of
MediaPipe. Integer-microsecond schedule times could fall fractionally before a
real source-frame presentation timestamp; MediaBunny then returned the previous
frame again, duplicate suppression left a hole, and the renderer honestly
reported pose unavailable. A one-microsecond lookup bias now recovers the
intended real frame. The exact regression covered all 371 source frames and
played without unavailable intervals; no pose holding or interpolation was
added. Calibration-setting comparisons still reuse one cached raw run.

Undo/redo now lives in the global header rather than the calibration workspace.
Its bounded session stack covers clip range, playback choices, checkpoints,
overlay/trail configuration, pose-quality policy, inference-model choice, and
manual calibration labels. Continuous slider, number, and name edits coalesce
after a 750 ms idle boundary; navigation and analysis commands remain outside
history. Source replacement clears the stack. Global, group, joint, continuity,
and smoothing setting families remain independently collapsible so one
calibration task can stay in focus. The inclusion rules for future settings are
in the [`settings history contract`](docs/settings-history-contract.md).

Developer calibration controls expose full effective confidence/hysteresis
domains and remove artificial maxima from finite nonnegative temporal and
smoothing inputs. Product preset defaults remain unchanged.

Quality decisions, settings, labels, smoothing, rejection counts, coverage, and
gap metrics now use only the 23 landmarks consumed by the product overlay.
Unused MediaPipe face-detail landmarks remain in immutable raw provenance only.
Gap diagnostics separately name the longest-lost product joint and report the
longest interval with no accepted product joint.

Later trail review made joint-confidence failures easier to see, especially on
limbs. The current preference is to bias future display calibration toward
fewer false visible joint positions, accepting more honest missing positions as
the tradeoff. A later calibration phase should test a generally stricter
ordinary policy, with particular attention to limb geometry, and expand the
product preset scale to **Extra Strict**, **Strict**, **Balanced**,
**Permissive**, and **Extra Permissive**. This is recorded direction, not a
runtime-default change: the existing calibration is adequate while the main
overlay feature set is built, and detailed threshold work is intentionally
deferred.

### R2B — Precision review controls

**Status:** Complete

**Outcome:** The user can reach and repeatedly inspect a fast climbing movement.

Build:

- custom play/pause and tap-stage control;
- speed presets;
- coarse scrub plus a deliberate fine/jog interaction;
- previous/next frame stepping by presentation timestamp where possible;
- In/Out range and range looping;
- named checkpoints with previous/next navigation;
- keyboard controls on desktop and touch-sized equivalents on mobile.

R2B adds a compact precision-review strip beside the existing In/Out controls:
`0.25×`, `0.5×`, and `1×` playback, selected-range looping, and previous/next
frame jog. The jog follows exact analyzed presentation timestamps where they
exist and switches to a visibly labeled source-rate estimate before analysis or
outside analyzed coverage. A tap or click moves one step; holding either frame
button begins a rapid jog at ten steps per second and stops on release or
pointer cancellation. The loop is checked against presented video frames when
the browser exposes them, with media events as a fallback. It never changes the
selected analysis range or pose timestamps.

Named, editable checkpoints are stored in the current in-memory source session,
ordered by presentation time, and cleared on source replacement. They support
direct selection plus previous/next navigation, with subtle location ticks on
the main playback timeline. Checkpoint navigation preserves active playback on
hover-and-fine-pointer desktop devices but pauses before seeking on touch-first
devices until that behavior is tested. Persistent checkpoints remain R3 work.
Desktop shortcuts cover play/pause, looping, speed, frame jog, checkpoint
creation, and checkpoint navigation; the same actions have touch-sized controls
on phone layouts.

The precision controls were visually checked with real portrait and landscape
fixtures at `1440×900`, `393×852`, and `852×393`. The complete verification
gate passes 59 unit tests and 23 Chrome browser tests. See
[`docs/r2b-implementation-spec.md`](./docs/r2b-implementation-spec.md).

### R2C — Visual inspection tools

**Status:** Complete; R2D next

**Outcome:** Trails and pose layers reveal movement without forcing one fixed
visualization.

R2C is split into two reviewable slices. Neither slice reruns pose inference
when display-only settings change, and neither changes the calibrated
acceptance or smoothing defaults.

#### R2C.1 — Overlay controls and legible trail defaults

**Status:** Complete

**Outcome:** A climber can quickly choose which pose layers and body paths help
with the current move, and the default trails remain readable over varied
footage.

Build:

- replace the single overlay switch with independent master overlay, skeleton,
  and trails controls while preserving one obvious way to hide everything;
- let the user add hip midpoint, shoulder midpoint, left/right wrist, elbow,
  knee, and ankle trails without code changes or a permanently long checklist;
- retain hip and shoulder midpoints as the initial enabled sources;
- increase the ordinary trail duration from 1.5 to 2 seconds and increase the
  ordinary stroke width by roughly 25%, subject to visual review rather than a
  fixed pixel assumption;
- add a subtle contrast halo or equivalent two-tone treatment so a bright trail
  remains distinguishable over both light and dark video regions;
- place the controls in a compact **Overlay settings** disclosure within the
  existing Movement overlay card, open by default and usable with keyboard
  and touch;
- keep pose-unavailable behavior confidence-aware and gap-honest rather than
  joining trails across missing or rejected samples;
- carry Strict, Balanced, and Permissive into the expanded surface without
  changing Balanced or the selected centered/offline smoothing default.

**Exit:** On real portrait and landscape clips, the stronger default trails are
easy to distinguish without overwhelming the climber. Master, skeleton, trails,
and each supported source can be changed independently on desktop and phone,
and all changes update the cached overlay immediately without reanalysis.

R2C.1 keeps the master **Overlays** switch prominent while adding an initially
open, touch-sized **Overlay settings** disclosure with separately grouped layer
and trail-source controls. Skeleton, trails, hip midpoint, and shoulder midpoint
remain enabled by default. Active sources appear as compact removable rows; a
grouped **Add trail source** picker exposes left/right elbows, wrists, knees,
and ankles without showing a ten-item checklist during ordinary review. The
renderer consumes stable typed source definitions and appearance defaults,
uses a two-second history, scales the colored stroke to 125% of the prior
responsive rule, and draws a restrained dark contrast pass beneath every
colored trail. Settings redraw cached quality samples immediately, remain
independent of analysis and playback state, reset with source replacement, and
are not persisted. Repeated/backward timestamps join rejected, missing, and
oversized-gap samples as explicit trail continuity breaks. See
[`docs/r2c1-implementation-spec.md`](./docs/r2c1-implementation-spec.md).

#### R2C.2 — Per-trail appearance editor

**Status:** Complete

**Outcome:** A user can distinguish several simultaneous trails and tune their
visual persistence without cluttering ordinary review.

Build:

- give every enabled trail a compact row with its name, side, live color swatch,
  visibility state, and an expandable editor;
- support per-trail duration, fade, and width controls with bounded,
  understandable presets and direct values where precision is useful;
- provide a small curated palette of high-chroma trail colors selected for the
  graphite/chalk UI and common climbing footage, plus an advanced native color
  picker for custom colors;
- preserve the contrast halo independently of the chosen color so white,
  yellow, dark, and custom colors do not rely on color alone for visibility;
- include reset for one trail and reset-all to the R2C defaults;
- keep the editor tucked into the existing Overlay settings disclosure, using
  progressive disclosure rather than a permanently dense panel;
- make display-setting changes live, local to the current source session, and
  independent of raw pose data, filtering, smoothing, and analysis;
- verify accessible names, focus behavior, touch targets, responsive overflow,
  and overlay alignment/timestamps with portrait and landscape fixtures.

**Exit:** At least four simultaneous trails can be identified and edited on
large screens and mobile without obscuring the video or destabilizing the
Movement overlay card. Preset and custom colors, duration, fade, and width
remain legible and resettable across representative light, dark, and mixed
video backgrounds.

R2C.2 separates an active trail source from its visibility: every active row
has an immediate named checkbox, while removal only changes which sources are
in the active list. A nested **Advanced trail settings** disclosure edits one
active source from a compact selector. It exposes a curated high-visibility
palette plus native custom color, responsive width, tail opacity, rolling
duration, and per-source/reset-all actions. Each source can instead use any
number of independently visible checkpoint ranges. A range selects existing
start and end checkpoints, draws the full cached path between their timestamps,
and marks its first and last accepted points without crossing rejected,
missing, repeated/backward, or oversized gaps. Source replacement resets all
R2C.2 state; deleting a checkpoint removes ranges that reference it. See
[`docs/r2c2-implementation-spec.md`](./docs/r2c2-implementation-spec.md).

Dedicated video zoom/pan remains deferred until gym testing establishes a clear
need and the shared video/overlay transform can remain exact. The completed
body-group/joint overrides, rejected-sample inspection, smoothing, and coverage
detail remain under Pose quality → Advanced. The versioned derived-point
contract should expand only for later validated, body-relative visual or
analytic anchors.

### R2D — Mobile refinement and feedback release

**Status:** In progress; R2D.1 implementation complete, physical iPhone review
pending

**Outcome:** The complete R2 loop is comfortable enough to test during an
ordinary gym session.

#### R2D.1 — Mobile workspace navigation MVP

**Outcome:** The working single-video interface gains a compact phone
information architecture without redesigning the player or freezing a final
mobile interaction model before gym feedback.

Build and validate:

- expose **Analyze**, **Playback**, and **Overlay** through one compact mobile
  mode bar immediately after the stage in portrait and at the top of the
  existing control rail in landscape;
- keep the existing video and transport mounted across all three modes, with
  one inset over-video transport rather than duplicated controls or a
  viewport-fixed dock;
- place range, analysis, history, pose quality, and calibration in Analyze;
  playback speed, range looping, presentation-frame navigation, and
  checkpoints in Playback; and overlay and trail controls in Overlay;
- keep every tool component mounted while its mode is inactive so local
  disclosures, edit history, range, checkpoints, playback choices, overlay
  choices, and pose-quality state survive mode and orientation changes;
- reset only the selected mode to Analyze when the source is replaced, while
  retaining the existing source-session reset contract for analysis state;
- reduce mobile vertical whitespace and control padding enough to keep the
  video and current task in view without weakening safe-area handling,
  readable type, 44 px touch targets, or clear separation between controls;
- retain short text labels for the three modes because icons would be
  ambiguous, with visible selected states and accessible button names;
- keep the common review-to-overlay-settings path to one deliberate mode
  change and avoid draggable sheets, deep nesting, or a second global menu in
  this MVP;
- validate portrait and landscape phone viewports against both portrait and
  landscape video fixtures, including safe areas, touch behavior, responsive
  overflow, and unchanged video/canvas registration;
- place a short landscape phone's landscape source at the largest uncropped
  size that keeps the complete player inside the screen, with selected tools
  below the stage, while retaining the compact side-by-side layout for portrait
  sources;
- remove the REVIEW stage label and mobile top bar, place a high-contrast brand
  lockup inside the video on every phone layout, and render its Movement review
  subtitle in lime;
- reduce transport obstruction with a rounded pill, tighter spacing, and an
  icon-only play/pause control while preserving its accessible name and the
  mobile `44×44 px` hit target;
- add a matching right-aligned mute control, default each newly opened video to
  muted playback, and preserve the chosen audio state while reviewing that
  source;
- leave desktop panel layout and behavior unchanged apart from making the
  landscape transport use the same over-video placement.

**Exit:** At `393×852`, `393×740`, and `852×393`, the stage and transport remain
usable, the three modes expose only their assigned controls, active targets are
at least `44×44 px`, and switching modes or orientation does not lose session
state. Both source orientations remain aligned without horizontal overflow.
The privately deployed build is ready for the physical iPhone review.

R2D.1 is implemented as a mobile-only visibility and navigation layer over the
existing stateful components. The transport remains inset within the stage
rather than fixed to the viewport; a fixed dock, draggable sheet, hamburger
menu, or other navigation layer requires gym evidence. Dedicated video zoom/pan
and pose-quality recalibration remain out of scope. See
[`docs/r2d1-implementation-spec.md`](./docs/r2d1-implementation-spec.md).

#### R2D.2 — Sustained physical-device validation

Build and validate:

- audit the mobile information architecture and interaction density against
  Instagram's video-editing flow and a small set of phone-native video editors,
  then validate the resulting Crux-specific hierarchy with real gym tasks
  rather than copying another product's visual treatment;
- sustained 20–30 second phone analysis, responsiveness, heat, battery, and
  browser-reload observations;
- validate the selected 60-second range cap for phone memory, thermal behavior,
  cancellation, and reload risk;
- Full CPU/GPU measurements plus Lite fallback measurements where they affect
  sustained responsiveness or power;
- an advanced analysis-density setting informed by the phone measurements,
  with 30 samples/second as the ordinary default and lower/higher options only
  where source frame rate and device performance make them meaningful.

#### R2D.3 — Gym feedback release

- run the primary import → isolate move → analyze → review → inspect trails
  workflow during an ordinary gym session;
- decide from observed friction whether a fixed transport, compact global menu,
  sheet treatment, or further spacing pass is warranted;
- record a short findings report and make only the refinements supported by
  that session.

The R2D navigation model should remain portable across web and a possible later
native app: its Analyze, Playback, Overlay, pose-quality, and advanced
settings terminology does not depend on browser-specific layout.

**R2 feedback question:** Can a climber import a phone clip at the gym, reach the
interesting move quickly, and learn something from the skeleton or trails in
one session?

## R3 — Confidence-aware analysis workspace and local presets

- Curated, inspectable overlay presets organized by review goal and climbing
  context, plus user-named local variants containing pose-quality, trail, and
  view choices.
- Per-range or per-joint overrides for specialist review.
- Coverage timeline and quality summaries.
- Raw and filtered pose cache with local session reload.
- Multiple named ranges and checkpoints.
- Confidence-aware ghost poses from checkpoints, consistent time intervals, or
  selected-range start/midpoint/end.
- Current limb angles and a small pose-quality/coverage readout.
- Adaptive phone analysis settings informed by R2 measurements.

**Feedback question:** Do confidence controls remove distracting pose failures
without hiding useful hand/foot motion, and can a normal user understand why a
joint or metric is missing?

## R4 — Ranges and trustworthy analytics

- Multiple named analysis ranges.
- Angle charts and distributions.
- Movement/stillness, limb bouts, vertical progress, path length, and
  smoothness.
- Valid/imputed coverage for every metric.
- JSON/session export.
- Raw-versus-filtered signal comparison in a developer view.

**Feedback question:** Which measurements change how the user reviews an
attempt, and which are merely interesting?

## R5 — Two-video comparison

Deliver in this order:

1. Side-by-side players with independent controls.
2. Shared play/pause/seek/speed and visible synchronization origins.
3. Frame nudge, shared loop, and drift tests.
4. Opacity superposition for matched cameras.
5. Skeleton A on B and aligned angle/time-series differences.
6. User-assisted wall/hold alignment.

**Feedback question:** Is synchronization fast enough to set up repeatedly, and
which comparison view exposes differences best?

## R6 — Climbing signals lab

- Manual hold map and editable contact timeline.
- Experimental **Contact base** overlay: a jitter-aware projected hull through
  candidate or confirmed hand/foot contacts, with honest unknown states and no
  automatic stability or risk claim.
- Static–dynamic index.
- Straight-arm exposure.
- Contact sequence and move segmentation.
- Grip-readjustment and foot-slip candidates.
- Phase-normalized comparison.
- Metric-by-metric validation notes and user confirmation.

Do not combine these into one technique score. Keep every component inspectable.
The early product, detection, UI, terminology, calibration, and validation
decisions for Contact base are recorded in
[`docs/future-contact-base-overlay-notes.md`](docs/future-contact-base-overlay-notes.md).
The broader, non-binding movement-overlay inventory and pose-aware delivery
recommendation are consolidated in
[`docs/future-movement-overlay-report.md`](docs/future-movement-overlay-report.md).

## R7 — Persistence, capture, and sharing

Only after the local loop proves valuable:

- durable project/session library;
- optional video capture flow;
- shareable review package or cloud project;
- export snapshots, reports, clips, or a rendered presentation;
- optional cross-device sync and sharing for user-created settings presets;
- accounts, object storage, and a worker queue if actually required.

Commercial packaging of preset libraries, sync, and organization-managed
profiles is a later product decision. Core confidence filtering and honest
uncertainty are not paywalled. The non-binding research behind possible future
commercialization is recorded in
[`docs/future-commercialization-notes.md`](docs/future-commercialization-notes.md);
it does not add work to the current roadmap.

## Later, contingent work

- Automatic hold segmentation with manual correction.
- Domain-specific pose evaluation or fine-tuning.
- User-edited pose keyframes with draggable joint/armature correction, bounded
  interpolation, reversible edits, and explicit manual/interpolated provenance.
- Optional AI-assisted correction on user-flagged individual frames, only after
  labeled evaluation shows an advantage over MediaPipe and with user
  confirmation plus explicit privacy/compute terms.
- More than two simultaneous videos.
- A native mobile app or capture companion is a likely long-term path to the
  most seamless gym experience. Revisit it after the mobile-web workflow proves
  which capture, media-library, navigation, precision-control, performance, and
  background-processing requirements genuinely benefit from native platform
  integration; do not maintain two product surfaces before that evidence.
- Sensor fusion with IMU, depth, or force/contact data.
- LLM summaries limited to validated structured observations.

The non-binding pose-correction concepts and required trust boundaries are in
[`docs/future-pose-correction-notes.md`](docs/future-pose-correction-notes.md).

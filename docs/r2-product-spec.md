# R2 product spec: first useful Crux Vision

**Status:** R2A, the pose-quality calibration gate, R2B, and R2C complete;
R2D.1 implemented with physical iPhone review pending

**Purpose:** Establish enough product and technical direction to start a fast
feedback loop without freezing the interface before it has been used.

## Product outcome

A climber at the gym can open a phone video, reach a short movement of interest,
and learn something from a synchronized skeleton or joint trail without waiting
for a rendered copy of the video.

R2 is successful only when the player and visual analysis work together. A
polished generic player without pose is not an R2 release, and pose processing
without a useful review interaction is not an R2 release.

## Primary use case

1. Import a local portrait climbing video.
2. Begin watching immediately.
3. Mark or adjust the climbing range.
4. See analysis fill in progressively.
5. Scrub or loop the crux at a useful speed.
6. Toggle the skeleton and inspect selected joint trails.
7. Add a checkpoint and return to it quickly.

Desktop remains the efficient development and debugging surface. The iPhone 15
on iOS 26.5 in Chrome is the reference gym surface and must be tested after the
first complete analysis loop, not after every R2 feature is finished.

## Experience principles

- **Video first:** importing never waits for pose analysis before playback.
- **The video owns the review surface:** for one source, portrait and landscape
  footage should consume nearly all usable space after essential transport.
  Secondary information yields before the video does.
- **The interesting move is central:** range, scrub, loop, speed, and checkpoint
  interactions should make a short movement quick to revisit.
- **Analysis stays optional:** overlays can be hidden instantly and never alter
  the source video.
- **Progress is visible but quiet:** analysis should not take over the screen.
- **Uncertainty is honest:** missing or rejected pose disappears cleanly rather
  than creating a confident-looking slingshot.
- **Mobile is not compressed desktop:** phone UI may expose Review, Inspect, and
  Timeline as modes or sheets rather than keeping every panel visible.

## Scope by slice

The authoritative slice order and exit gates are in [`../ROADMAP.md`](../ROADMAP.md).

### R2A — First analysis loop

Create the real product shell, immediate local playback, a simple selected
range, progressive worker pose, a live skeleton, and an initial trail. The
initial trail may default to one useful joint, but its data and renderer must be
joint-agnostic so R2C does not repeat the legacy hardcoding.

After first review, hip and shoulder midpoints replace wrists as the
proof-of-concept defaults. Wrist trails remain supported sources. Detailed face
points are hidden in ordinary review; the skeleton uses one accepted head anchor
and a single connection from the accepted shoulder midpoint.

Perform the minimal physical-iPhone gate immediately after the R2A.1 sizing
correction.

### R2A.1 — Single-video review scale

Correct the stage sizing after the first product review so portrait and
landscape footage use the available viewport naturally while preserving the
approved shell and shared overlay transform. Multi-video comparison remains a
separate layout problem.

### Pose-quality calibration gate

Implemented after the phone check and before R2B. Balanced v2 now combines
confidence acceptance, hysteresis, temporal rejection, and segment-local
smoothing over immutable cached raw samples. Strict and Permissive alternatives
expose documented coverage/continuity tradeoffs, while detailed policy controls
and reason-coded debug views remain under the advanced disclosure. A focused
human re-smoke still found one visible frame of lag, so the gate now includes
exact analyzed-presentation-frame navigation plus a gap-bounded Centered
offline result with one undoable radius control. Human review selected centered
at `66.667 ms` as the recorded-video display default; calibration must continue
checking pre-motion anticipation. Calibration policy edits participate in the
same global undo/redo history as clip, checkpoint, overlay, and trail settings;
manual seeks remain navigation rather than edits. Advanced setting families are
independently collapsible, One Euro smoothed preview is unavailable when its
filter is disabled, and developer-only controls expose full safe diagnostic
ranges without changing product defaults. Quality decisions and calibration
operate only on the 23
landmarks used by the product; unused face details remain raw provenance.
Per-joint gap attribution and a separate whole-pose gap prevent one persistently
missing joint from being described as a pose-wide outage. See the
[`calibration plan`](./pose-quality-calibration-plan.md) and
[`calibration report`](./pose-quality-calibration-report.md).

### R2B — Precision review

Complete. The ordinary review surface now combines the existing coarse timeline
and In/Out controls with `0.25×`, `0.5×`, and `1×` speed presets, selected-range
looping, single-step and ten-frames-per-second press-and-hold
analyzed-presentation-frame jog, and editable in-memory checkpoints. Every
action has a touch-sized control; desktop shortcuts provide the same fast path.
Checkpoints deliberately reset with source replacement until local session
persistence arrives in R3.

### R2C.1 — Overlay controls and legible trail defaults

Add independent master, skeleton, and trail controls; make hip, shoulder,
elbow, wrist, knee, and ankle trails selectable; and strengthen the ordinary
trail default with a two-second duration, a modestly larger stroke, and a
contrast treatment that survives light and dark footage. Keep the compact
Overlay settings disclosure open initially and collapsible during ordinary
review.

Complete. The master remains outside the disclosure and preserves
all layer/source choices while hidden. The disclosure groups skeleton/trails
separately from a compact active-source list and grouped add-source picker.
Ten stable sources cover midpoints plus explicit left/right elbows, wrists,
knees, and ankles; source replacement restores the R2C.1 defaults. Rendering
changes are live views of cached presentation-timestamped pose samples; they do
not rerun inference or alter quality, smoothing, ranges, or playback. The
implementation record is in
[`r2c1-implementation-spec.md`](./r2c1-implementation-spec.md).

### R2C.2 — Per-trail appearance editor

Add progressively disclosed per-trail duration, fade, width, and color
settings. Offer a curated high-chroma palette for quick choices and an advanced
native color picker for custom colors, while preserving a contrast halo
independently of the chosen color. Display-only changes update cached overlays
without rerunning pose inference. Dedicated video zoom/pan remains deferred
until gym feedback establishes a need.

Complete. Active trail selection and visibility are separate: each active row
has an immediate checkbox, and advanced editing remains behind a nested
disclosure with a compact source selector. A source can use a bounded rolling
duration or multiple independently visible ranges between existing
checkpoints. Checkpoint ranges draw stable start/end markers and preserve the
same honest continuity gaps as rolling trails. All appearance and timing state
remains local to the current source session. The implementation record is in
[`r2c2-implementation-spec.md`](./r2c2-implementation-spec.md).

### R2D — Mobile refinement

Resolve the phone layout through real use, complete touch and safe-area work,
run sustained-device measurements, and conduct the first gym feedback session.

#### R2D.1 — Mobile workspace navigation MVP

R2D.1 adds one mobile-only **Analyze / Playback / Overlay** mode bar without
changing the desktop workspace or player architecture. Analyze owns the range,
analysis action and progress, edit history, and the existing pose-quality and
calibration surfaces. Playback owns speed, loop, frame navigation, and
checkpoints. Overlay owns overlay visibility and trail selection/appearance.

The single stage and inset over-video transport stay mounted across modes.
Tool components also stay mounted and are hidden only by the mobile layout, so
playback, range, checkpoints, history, trail choices, pose-quality settings,
and open disclosures survive mode and orientation changes. Replacing the
source returns the mode to Analyze while retaining the established
source-session reset.

The mode bar appears below the stage on narrow portrait phones and at the top
of the existing control rail on short landscape phones. It uses explicit text,
selected states, accessible names, and `44×44 px` minimum active targets.
When a short landscape phone displays a landscape source, the stage starts at
the top edge and uses the largest contain-fit that keeps the complete player
and transport inside the viewport; selected tools follow below it. Portrait
sources keep the compact side-by-side stage and rail. Every mobile stage owns a
compact mark-and-name lockup in its top-left corner instead of a separate top
bar. It has no glass backing and omits both the REVIEW label and Movement review
subtitle so it stays legible without covering more footage. The landing and
desktop-header Movement review subtitle uses neutral muted text with a subtle
lime glow. Desktop continues to show all panels with no mode bar, and both desktop
source orientations use the same inset transport placement. The shared
transport is a slim rounded pill with transparent, icon-only play/pause
presentation. Its mobile button keeps a `44×44 px` hit target even though the
visible icon no longer appears inside a filled button. A matching icon-only mute
control sits at the far right. New sources start muted for predictable mobile
autoplay; the user can unmute for the remainder of that source session. The
visible pill remains 36 px thick at every viewport size. Mobile play and mute
hit areas extend transparently to `44×44 px` without making the transport look
taller.

This is intentionally an MVP navigation layer, not a bottom-sheet system or
interface rewrite. The transport remains inset within the stage rather than
fixed to the viewport. A draggable sheet, fixed dock, hamburger/global menu, or
additional chrome should be added only if physical-phone and gym testing show
that the current one-tap mode changes are insufficient. Dedicated zoom/pan,
analysis-density changes, model/device tuning, and pose-quality recalibration
remain outside R2D.1.

## Technical baseline from R1

R2 starts with these decisions unless new evidence overturns them:

- React, TypeScript, and Vite for the client.
- The browser video element is the playback engine.
- MediaBunny owns source metadata and offline timed-sample extraction.
- MediaPipe Pose Landmarker Full is the human-selected product default because
  it visibly improved pose quality without a drastic analysis-time increase.
  Lite remains the faster alternative. The phone thermal/model matrix is still
  deferred to R2D.
- Pose inference runs in a module worker and returns timed data only.
- Canvas 2D renders live overlay layers.
- Pose samples use presentation timestamps, not frame indexes.
- Image-space pose is normalized in upright displayed-video coordinates.
- Video and overlays share one fit/crop/zoom/pan transform.
- The source video is never re-encoded merely to add overlays.
- MoveNet remains diagnostic and is not loaded by the product path.

The R1 diagnostic UI is evidence and tooling, not the visual foundation for the
product. Reuse the tested adapters and contracts, not the diagnostic layout.

## Required product capabilities

### Media and session

- Import local common iPhone video without uploading it.
- Show the source immediately and preserve its display orientation.
- Keep one in-memory analysis session; durable session persistence remains later
  work.
- Allow replacing the source without stale pose or object URLs remaining.

### Playback and navigation

- Play/pause from an obvious control and by tapping the stage where appropriate.
- Offer a focused `0.25×`, `0.5×`, and `1×` speed set for ordinary review.
  Reconsider wider rates only after gym feedback establishes a use for them.
- Provide coarse timeline seeking and a separate fine movement mechanism.
- Step to adjacent presented frames where the media APIs provide reliable
  timestamps. Before analysis or outside analyzed coverage, keep the control
  available with a clearly labeled source-rate estimate.
- Mark In/Out, loop that range, and create named checkpoints with subtle
  location ticks on the main timeline.
- Preserve active playback when navigating to a checkpoint on desktop-style
  pointers; pause before checkpoint seeks on touch-first devices until tested.
- Support accurate backward stepping or jog; do not promise smooth negative-rate
  playback.

### Pose and overlays

- Analyze only a selected range and publish samples progressively.
- Keep raw model results separate from rendered/accepted views.
- Draw the skeleton against the currently presented timestamp.
- Draw trails from timed accepted joint samples, not frame numbers.
- Allow a trail source to be a raw joint or an explicitly defined derived point.
  A midpoint is accepted only when both source joints are accepted.
- Make wrist, elbow, knee, ankle, hip, and shoulder selection convenient by
  R2C.
- Hide invalid segments instead of joining across long or low-confidence gaps.
- Resolve confidence policy with `joint > body group > global` precedence.
- Use timestamp-based temporal plausibility to detect high-confidence
  slingshots that a cutoff alone cannot catch.
- Smooth only within accepted contiguous segments and reset at gaps.
- Keep display and analytics acceptance policies separate and report usable
  coverage for analytics.
- Treat offsets or custom anchors as versioned derived views with provenance;
  never overwrite or relabel raw MediaPipe landmarks.
- Toggle all overlays, skeleton, and trails independently.

### Mobile interaction

- Respect device safe areas and portrait orientation.
- Keep primary transport usable with one hand and without tiny hit targets.
- Keep the video large enough to inspect while making the timeline reachable.
- Prefer a full-width single-video stage and move secondary information below it
  when necessary.
- Avoid simultaneous dense desktop panels; use explicit Review, Inspect, and
  Timeline states or an equivalent interaction discovered during implementation.
- Preserve analysis state when moving between those views.

## Architecture boundaries

Implementation names can change, but responsibilities must remain separable:

- a media adapter for metadata and timed upright samples;
- a player controller for time, playback, rate, range, and checkpoints;
- a pose adapter that publishes progressive timestamped samples;
- a display transform shared by video interaction and every overlay layer;
- independent skeleton and trail renderers;
- session state that does not store the source and derived analysis as one
  opaque object.

R2 should remain compatible with a future second `PlayerController`, but it
must not implement synchronized comparison yet.

## Settings hierarchy

The ordinary review surface exposes only the overlay master control, a
Balanced/Strict/Permissive pose-quality choice, and selected trails. Settings
are grouped into Pose quality, Trails, Playback, and View. Group and joint
thresholds, raw/rejected overlays, smoothing, and coverage diagnostics live
under Pose quality → Advanced.

One bounded history stack serves the whole source session. Settings and durable
review edits are undoable by default; transient navigation, commands, system
state, and non-restorable source replacement are excluded. Continuous controls
coalesce by control after 750 ms idle. Every future setting must declare and
test its history behavior according to the
[`settings and edit-history contract`](./settings-history-contract.md).

Analysis density is also an advanced setting rather than a normal review
control. The ordinary default is 30 requested samples/second. Later measured
choices may offer a lower-power 15 samples/second mode and a source-rate
precision mode, capped by actual unique presentation frames and validated on
the reference phone.

The user-selected analysis range may span 0.5–60 seconds. The 60-second cap is
available now; sustained Full-model phone behavior at that cap remains an R2D
validation item.

Built-in calibrated quality choices are core product behavior. User-named
presets may first be local; accounts are needed only for later sync, sharing, or
organization-managed profiles.

## Acceptance criteria

R2 is complete when:

- a real iPhone portrait clip imports and plays immediately on laptop and phone;
- video, extracted samples, skeleton, and trails remain upright and aligned;
- portrait and landscape clips use nearly all appropriate single-video review
  space on desktop and narrow phone viewports;
- analysis appears progressively over a user-selected range;
- the UI stays usable while inference runs;
- the user can slow, scrub, frame-step, loop, and return to checkpoints;
- dedicated video zoom/pan remains deferred until gym feedback establishes a
  need and its shared video/overlay transform can be validated;
- wrist, elbow, knee, ankle, hip, and shoulder trails can be selected without
  code changes;
- low-confidence gaps do not create prominent false connections;
- bad-but-confident samples can be rejected by a documented temporal policy,
  and smoothing cannot cross a rejected gap;
- essential desktop keyboard and phone touch paths work;
- relevant unit and Playwright tests pass;
- one gym-session test answers the R2 feedback question in the roadmap.

## Explicit non-goals

- Two-video comparison or synchronization.
- Accounts, cloud storage, sharing, or collaboration.
- Baked overlay-video generation.
- Long-term session persistence.
- Statistical or climbing-specific technique scores.
- Grip adjustment, hold detection, force, power, efficiency, fatigue, or injury
  claims.
- A final visual design system or exhaustive component library.
- Integrating or further researching ClimbingCap or AscendMotion.

## Decisions intentionally left for feedback

- Whether physical-phone use warrants replacing the R2D.1 mode bar with a
  fixed transport, draggable sheet, or additional global menu.
- Whether more timeline detail should remain always visible or expand on
  demand; the R2D.1 coarse transport stays present while the Timeline tools are
  mode-selected.
- How much pose progress detail normal users should see.
- Whether R2D phone evidence requires a lower-power Lite or reduced-density
  option for sustained analysis; Full remains the quality default meanwhile.
- Whether later labeled ground-truth work should revise Balanced v2's calibrated
  joint/group thresholds, hysteresis, or smoothing.
- The future layout and interaction model for comparing multiple videos.
- Commercial packaging for synced or shared preset libraries.

These choices should be made against a running interface and real climbing
footage rather than settled through a longer speculative specification.

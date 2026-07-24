# R2 product spec: first useful Crux Vision

**Status:** R2A and the pose-quality calibration gate complete; R2B next

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
exact analyzed-presentation-frame navigation and the zero-lag display decision
remains open. Calibration policy edits support standard undo/redo shortcuts,
and advanced setting families are independently collapsible. See the
[`calibration plan`](./pose-quality-calibration-plan.md) and
[`calibration report`](./pose-quality-calibration-report.md).

### R2B — Precision review

Add the transport interactions required to inspect a fast move: speed, coarse
and fine scrub, frame step, loop, and named checkpoints. Prefer a small number
of understandable touch interactions over reproducing desktop controls at phone
scale.

### R2C — Visual inspection

Generalize trails to useful joint choices, add overlay controls and missing-pose
behavior, and add zoom/pan through one shared display transform.

### R2D — Mobile refinement

Resolve the phone layout through real use, complete touch and safe-area work,
run sustained-device measurements, and conduct the first gym feedback session.

## Technical baseline from R1

R2 starts with these decisions unless new evidence overturns them:

- React, TypeScript, and Vite for the client.
- The browser video element is the playback engine.
- MediaBunny owns source metadata and offline timed-sample extraction.
- MediaPipe Pose Landmarker Lite is the calibrated product default. Full remains
  an advanced challenger and did not improve the bounded difficult-range result.
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
- Offer useful speed presets, initially 0.1×, 0.25×, 0.5×, 0.75×, 1×, 1.5×,
  and 2× where the browser supports them.
- Provide coarse timeline seeking and a separate fine movement mechanism.
- Step to adjacent presented frames where the media APIs provide reliable
  timestamps.
- Mark In/Out, loop that range, and create named checkpoints.
- Support accurate backward stepping or jog; do not promise smooth negative-rate
  playback.

### Pose and overlays

- Analyze only a selected range and publish samples progressively.
- Keep raw model results separate from rendered/accepted views.
- Draw the skeleton against the currently presented timestamp.
- Draw trails from timed accepted joint samples, not frame numbers.
- Allow a trail source to be a raw joint or an explicitly defined derived point.
  A midpoint is accepted only when both source joints are accepted.
- Make wrist, ankle, hip, and shoulder selection convenient by R2C.
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

Analysis density is also an advanced setting rather than a normal review
control. The ordinary default is 30 requested samples/second. Later measured
choices may offer a lower-power 15 samples/second mode and a source-rate
precision mode, capped by actual unique presentation frames and validated on
the reference phone.

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
- the user can slow, scrub, frame-step, loop, zoom, and return to checkpoints;
- wrist, ankle, hip, and shoulder trails can be selected without code changes;
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

- Exact navigation and placement of Review, Inspect, and Timeline on the phone.
- Whether the timeline is always visible or expands on demand.
- Whether checkpoints appear directly on the main timeline or in a secondary
  lane.
- How much pose progress detail normal users should see.
- Whether later corpus or R2D phone evidence gives Full enough visible quality
  improvement to justify broader exposure; the bounded calibration did not.
- Whether later labeled ground-truth work should revise Balanced v2's calibrated
  joint/group thresholds, hysteresis, or smoothing.
- The future layout and interaction model for comparing multiple videos.
- Commercial packaging for synced or shared preset libraries.

These choices should be made against a running interface and real climbing
footage rather than settled through a longer speculative specification.

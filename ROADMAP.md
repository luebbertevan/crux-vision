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

**Status:** Complete on the reference laptop; physical iPhone gate is next

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
accessible 0.5–20 second range selection, progressive MediaPipe Lite analysis
at 15 requested samples/second in the module worker, a presentation-timestamped
live skeleton, two-second left/right wrist trails, confidence-aware gaps,
cancel/resume, and stale-safe source replacement. MediaPipe tries GPU first and
falls back once to CPU; model/delegate controls are not exposed as product UI.

The laptop exit is verified by 16 focused Vitest tests, eight Chrome Playwright
tests against real portrait/landscape fixtures, a production build, and visual
inspection at 1440×900, 393×852, and 852×393. The R1 MediaBunny/MediaPipe
contracts and evidence remain; MoveNet, TensorFlow, and diagnostic-only UI and
benchmark scripts have been removed. See
[`docs/r2a-implementation-spec.md`](./docs/r2a-implementation-spec.md) for the
implementation record.

### R2 phone gate — Minimal physical-device smoke test

**Timing:** Immediately after R2A, before advanced controls or visual polish

**Status:** Ready for user-assisted test; not yet run

On the iPhone 15 using Chrome/iOS WebKit, prove only that:

- a portrait video can be imported from Photos and appears upright;
- timed frame extraction and MediaPipe initialization work;
- pose results appear and the skeleton is registered to the displayed video;
- playback and basic page interaction remain responsive;
- a short analysis does not crash or reload the page.

This is intentionally smaller than the original R1 benchmark plan. If it fails,
decide the compatibility or pose-data-only server fallback before expanding R2.
The longer thermal, battery, and model/delegate matrix moves to R2D.

### R2B — Precision review controls

**Outcome:** The user can reach and repeatedly inspect a fast climbing movement.

Build:

- custom play/pause and tap-stage control;
- speed presets;
- coarse scrub plus a deliberate fine/jog interaction;
- previous/next frame stepping by presentation timestamp where possible;
- In/Out range and range looping;
- named checkpoints with previous/next navigation;
- keyboard controls on desktop and touch-sized equivalents on mobile.

### R2C — Visual inspection tools

**Outcome:** Trails and pose layers reveal movement without forcing one fixed
visualization.

Build:

- selectable wrist, ankle, hip, and shoulder trails;
- useful trail duration/fade controls with sensible defaults;
- master overlay, skeleton, and trail toggles;
- compact confidence-aware pose-unavailable behavior rather than slingshots;
- zoom, pan, fit, and reset using the same video/overlay transform;
- overlay alignment and timestamp tests for portrait and landscape fixtures.

### R2D — Mobile refinement and feedback release

**Outcome:** The complete R2 loop is comfortable enough to test during an
ordinary gym session.

Build and validate:

- the phone Review/Inspect/Timeline interaction model;
- responsive layout, safe areas, touch behavior, and distraction-free review;
- sustained 20–30 second phone analysis, responsiveness, heat, battery, and
  browser-reload observations;
- Lite CPU/GPU and Full challenger measurements only if they affect the choice;
- a real gym-session feedback pass and a short findings report.

**R2 feedback question:** Can a climber import a phone clip at the gym, reach the
interesting move quickly, and learn something from the skeleton or trails in
one session?

## R3 — Confidence-aware analysis workspace

- Per-joint quality presets and an advanced threshold inspector.
- Rejected-joint debug view and coverage timeline.
- Raw and filtered pose cache with local session reload.
- Multiple named ranges and checkpoints.
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
- Static–dynamic index.
- Straight-arm exposure.
- Contact sequence and move segmentation.
- Grip-readjustment and foot-slip candidates.
- Phase-normalized comparison.
- Metric-by-metric validation notes and user confirmation.

Do not combine these into one technique score. Keep every component inspectable.

## R7 — Persistence, capture, and sharing

Only after the local loop proves valuable:

- durable project/session library;
- optional video capture flow;
- shareable review package or cloud project;
- export snapshots, reports, clips, or a rendered presentation;
- accounts, object storage, and a worker queue if actually required.

## Later, contingent work

- Automatic hold segmentation with manual correction.
- Domain-specific pose evaluation or fine-tuning.
- More than two simultaneous videos.
- A native mobile app or capture companion if mobile web fails a demonstrated
  product requirement.
- Sensor fusion with IMU, depth, or force/contact data.
- LLM summaries limited to validated structured observations.

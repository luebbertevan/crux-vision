# R2A implementation spec: first analysis loop

**Status:** R2A and R2A.1 complete; minimal physical iPhone gate and subsequent
pose-quality calibration gate passed

**Branch/base:** `codex/r2a1-video-stage-scale` from R2A commit `2178bd9`

**Outcome:** A climber can open a local clip, watch it immediately, mark a
short range, start local analysis, and review progressively arriving,
timestamp-synchronized skeleton and body-center trails in a polished desktop or
phone shell.

This slice preserves R1's media, orientation, timestamp, normalized-coordinate,
and module-worker contracts. It replaces the diagnostic product surface rather
than restyling it.

## Demo flow

1. Open the empty Crux Vision shell and choose **Open video**.
2. Select a local portrait or landscape clip. Local container inspection
   validates the candidate and decodes its first upright frame into a local
   poster, then the source appears as a `blob:` URL with `playsInline`;
   playback is attempted as soon as it is playable and never waits for
   pose/model work. If autoplay is refused, the poster remains visible and the
   prominent play control remains ready.
3. Watch or coarsely seek to the move. Use **Set start** and **Set end** at the
   current time, or adjust the two accessible range handles. The default is
   `0..min(duration, 10 seconds)` with a 0.5-second minimum range and a
   60-second analysis limit.
4. Press **Analyze range**. MediaPipe Full loads in the existing module-worker
   path and display-oriented samples are processed in ascending presentation
   time at 30 requested samples/second.
5. Continue playing or seeking while results arrive one sample at a time. A
   quiet progress line fills on the selected range; Cancel remains available.
6. Within analyzed time, a live skeleton follows the presented media timestamp.
   Hip- and shoulder-midpoint trails show the preceding 1.5 seconds by default.
7. If pose is missing or rejected at the presented moment, geometry disappears
   cleanly and a compact **Pose unavailable here** message appears. It is not an
   error and never bridges the gap.
8. Cancel preserves already published samples and offers **Resume analysis**.
   **Replace video** safely swaps the source and removes all results and
   resources belonging to the old source.

R2A includes play/pause by button or stage tap and one coarse seek control. It
does not pretend to deliver R2B's precision transport.

## Product states

Session state and the contextual pose state are separate so a missing pose does
not turn a healthy session into an error.

| State | Presentation and allowed action |
|---|---|
| Empty | Branded stage with one **Open video** action, local-only reassurance, and no disabled analysis controls. |
| Opening | The current source, if any, stays visible under a small **Opening video…** state while the candidate is inspected. |
| Imported | Upright video, minimal transport, default range, file name/duration, **Replace**, and enabled **Analyze range**. |
| Range selection | Start/end handles and time labels update together; current-time **Set start/end** buttons remain keyboard/touch accessible. Editing cancels an active job before changing its contract. |
| Analyzing | Model/frame work has begun but no sample has published; show **Preparing pose…**, indeterminate progress, and Cancel without blocking playback. |
| Partially analyzed | At least one but not all requested timestamps has published; draw only available time, show determinate range progress, and label future time **Analyzing this moment…** rather than unavailable. |
| Ready | All requested timestamps were attempted; keep overlays live and reduce status to a small **Analysis ready** indicator. |
| Unavailable pose | Contextual stage state only: the current time is within the completed analysis frontier but has no drawable accepted geometry within timestamp tolerance. Show no stale overlay and the compact message. |
| Cancelled | Stop extraction/inference, retain partial raw results, label the filled extent, and offer **Resume analysis** or a new range. |
| Error | Import errors are actionable and do not destroy a previously valid source. Analysis errors retain partial data and offer Retry; unsupported local media is explained without upload or silent conversion. |

Seeking outside the selected range shows no overlay and a quiet **Outside
analysis range** label only while overlays are enabled. No-pose, outside-range,
pending-analysis, and application-error messages must remain distinct.

## Layout and visual direction

### Desktop (1024 px and wider)

- A compact top bar contains the Crux Vision mark, current file, local-only
  status, and Open/Replace action.
- The current filename is a quiet, single-line item in that top bar. There is no
  separate stage heading or redundant duration above the video.
- The video stage is the dominant surface. Its exact dimensions fit the upright
  source aspect ratio into the measured review width and the viewport height
  remaining below its actual top after transport and bottom safe padding are
  reserved.
- At 1200 px and wider, portrait media is centered in the full review surface
  and the 330 px control rail uses free space at the right instead of shifting
  or constraining the video. Landscape media keeps a flexible main column
  beside the rail.
- Minimal transport sits directly below the stage: a compact 36 px desktop
  play/pause control, current/duration, and coarse seek.
- A 310–330 px right rail contains, in order, selected range, Analyze/Cancel,
  quiet progress, and one master **Overlays** switch. The rail is a review aid,
  not a metadata/benchmark dashboard.
- At shorter desktop heights, the rail may scroll independently; stage and
  transport stay visible.

### iPhone/narrow (below 720 px)

- Safe-area-aware compact header, then the widest possible stage.
- Portrait media takes the full content width whenever width is the limiting
  dimension; secondary range and analysis cards continue below transport.
- Transport is a one-row dock immediately below the stage with 44 px minimum
  targets. Range controls follow in one compact card; Analyze is a full-width
  primary action.
- Analysis status occupies one line and never pushes the stage offscreen.
- No permanent side rail, dense inspector, hover dependency, or tiny two-column
  form. The DOM order remains stage, transport, range, analysis.
- Portrait is the primary composition. Landscape uses a shorter header and a
  two-column stage/range arrangement only when height permits.

Baseline visual proposal: graphite/near-black surfaces, warm chalk-white text,
muted stone borders, lime for active analysis/skeleton, amber for the left
wrist, and cyan for the right wrist. Use system fonts, restrained radii, inline
SVG icons, and motion only for state transitions/progress. Avoid the R1 neon
diagnostic-card look, gratuitous gradients, and climbing-themed decoration that
competes with the footage.

## Component and state ownership

```text
AppShell
├─ TopBar / VideoImport
└─ ReviewWorkspace (session reducer)
   ├─ VideoStage (video element + PlayerController)
   │  ├─ OverlayCanvas (skeleton/trail layer renderers)
   │  └─ StageFeedback (pending/unavailable/outside-range)
   ├─ TransportBar (throttled player snapshot)
   ├─ RangeSelector (draft/committed AnalysisRange)
   └─ AnalysisPanel (PoseAnalysisController status/actions)
```

- `ReviewWorkspace` owns the source/session identity, committed range, overlay
  visibility, analysis phase, raw sample store, progress, and recoverable error.
- `PlayerController` owns the video element, play/pause/seek, and presented
  timestamp. High-frequency time never goes through whole-app React state;
  controls receive a throttled snapshot while the overlay reads
  `requestVideoFrameCallback().mediaTime` directly.
- `PoseAnalysisController` owns one job token, abort signal, frame iterator,
  MediaPipe worker client, requested timestamps, and progressive publication.
- `BrowserMediaAdapter` continues to own metadata and display-oriented timed
  extraction behind a narrow interface.
- Pure modules own range normalization/timestamp generation, nearest-timestamp
  lookup, display transforms, landmark acceptance, skeleton segments, and trail
  segmentation. Canvas renderers receive prepared view data and never decide
  session state.
- Raw model samples are immutable and separate from accepted render views.
  Confidence changes later can recompute views without inference.

Names may change during implementation, but these ownership boundaries may not.

## Media and session lifecycle

Each committed source receives an opaque `sessionId`; each analysis attempt
receives a `jobId`. Every async result must still match both before publication.

Import/replace is a two-phase swap:

1. Increment the candidate generation and cancel the active analysis job.
2. Open and inspect the candidate adapter without discarding the current valid
   source.
3. If opening fails, dispose the candidate and leave the previous source
   usable with a recoverable message.
4. If it succeeds and is still current, pause the old video; clear its overlay
   and pose stores; detach `src`, call `load()`, dispose its media input/frame
   iterator, and revoke its object URL exactly once.
5. Commit the new adapter/metadata, create one new object URL, set the default
   range, and load/attempt playback. Late callbacks from the old session are
   ignored by identity.

On cancel, replacement, error, or unmount: abort iteration, return/close the
active frame stream, close any untransferred `ImageBitmap`, terminate the job's
worker (rejecting pending requests with `AbortError`), and remove video-frame
callbacks and resize observers. Unmount also pauses/detaches the video, disposes
the adapter, and revokes the current object URL. No decoded full-video buffer or
rendered overlay video is retained.

The selected file never leaves the browser. Product code adds no upload, account,
cloud, analytics, or persistence request. MediaPipe runtime/model asset requests
are application dependencies, not video transfer.

## Range and progressive analysis contract

- Internal time is integer microseconds. UI seconds are converted only at the
  boundary; frame index is never an identity or join key.
- `normalizeRange(inUs, outUs, durationUs)` clamps to the source, enforces
  `in < out`, a 500,000 µs minimum, and a 60,000,000 µs maximum. Handle
  crossing clamps the active handle instead of silently swapping meanings.
- A committed analysis schedule is monotonically increasing at 30 requested
  samples/second and includes the range endpoints when possible. The adapter's
  actual returned presentation timestamp is authoritative and is what the
  worker/result stores.
- The current ordinary path uses MediaPipe Pose Landmarker Full. Try the GPU
  delegate first and retry initialization once on CPU; this is an internal
  compatibility fallback. Lite remains the faster advanced alternative. Heavy
  and MoveNet remain absent from the product path.
- Process at most one decoded transferable frame per worker request. Publish a
  raw result immediately after every completed inference; throttle React progress
  presentation to at most 10 Hz without batching overlay availability.
- Analysis proceeds from range start to end, so `analyzedThroughUs` can
  distinguish pending future time from completed no-pose time.
- Cancel terminates the current worker promptly between samples, prevents any
  later publication, and keeps completed samples. Resume creates a new worker
  and processes only remaining scheduled timestamps for the unchanged source,
  range, model, and sample-rate contract.
- A new committed range starts a new analysis result set. It may reuse shared
  pure utilities but does not merge mismatched job output.

## Pose, skeleton, and trail contracts

`RawPoseSample` contains the actual presentation timestamp, model/delegate
identity, all returned normalized upright image landmarks (`x`, `y`, `z`,
`visibility`, and `presence` when supplied), world landmarks, and inference
timing. Empty detection is stored as an empty raw sample, not omitted.

The R2A accepted view marks a landmark drawable only when coordinates are
finite, normalized `x/y` are in bounds, visibility is at least 0.5, and presence
is at least 0.5 when present. These are named initial rendering thresholds, not
destructive filtering or a claim of calibrated climbing accuracy.

### Timestamp lookup

- Samples stay ordered by actual presentation timestamp.
- The overlay chooses the nearest sample by binary search with a maximum
  distance of 0.75 analysis intervals (25 ms at 30 Hz).
- Ties prefer the earlier sample. Beyond tolerance, return no sample; never hold
  the last pose through a gap.

### Display transform

- Video is the source and uses `object-fit: contain` in R2A. The adapter exposes
  coded dimensions, display dimensions, rotation, and explicit flip fields;
  mirroring is never inferred from camera or dimensions.
- MediaBunny extraction supplies upright, display-oriented pixels. Stored image
  landmarks are normalized in that displayed space.
- One `DisplayTransform` computes the contained content rectangle from stage
  size and displayed media size. Both skeleton and trail map
  `(x, y)` through `contentX + x * contentWidth` and
  `contentY + y * contentHeight`.
- A `ResizeObserver` updates the canvas backing store; device pixel ratio is
  capped at 2 for memory/fill-rate. CSS stage bounds and canvas bounds are
  identical. Zoom/crop/pan are not added until R2C.

### Skeleton renderer

- A pure segment builder receives one accepted view and the MediaPipe connection
  list. A segment exists only when both endpoints are accepted in that same raw
  sample.
- Rejected joints and their dependent segments are absent—never extrapolated,
  connected to a previous sample, or drawn with false certainty.
- The renderer clears every presented frame and draws only prepared segments and
  points through the shared transform.

### Trail renderer

- The renderer is source-agnostic: configuration supplies direct landmark or
  derived-point definitions and styles. Hip midpoint (23/24) and shoulder
  midpoint (11/12) are the current defaults; both wrists remain supported direct
  sources.
- For presentation time `t` inside the selected range, each trail uses accepted
  samples in `[max(range.in, t - 2,350,000 µs), t]`, with older points fading
  and the current end emphasized. Seeking recomputes from timestamped data; no
  screen-space animation history is retained.
- Segmentation is per source. A low-confidence/missing required landmark ends
  the current polyline. A new segment also starts when adjacent raw timestamps
  differ by more than 1.5 requested intervals (50 ms at 30 Hz). Single
  accepted points may render as dots; no interpolation is added.
- Progressive holes, cancellations, and true pose loss therefore create clean
  gaps. Hip and shoulder midpoint sources never share a continuity decision.

## Responsive, accessibility, and performance requirements

- Support 320 px width upward; visual acceptance sizes are 1440×900 desktop and
  393×852 iPhone portrait, plus a 852×393 landscape sanity check.
- Respect all safe-area insets, dynamic viewport height, portrait/landscape
  changes, and `prefers-reduced-motion`. Do not force device orientation.
- Use semantic buttons/labels, visible focus, logical DOM/tab order, text plus
  color for state, WCAG AA contrast, and 44×44 px minimum touch targets.
  Range handles expose names, values, min/max, keyboard arrows, and current
  start/end text. Status updates use a polite live region; errors use alert.
- Stage tap is an additional play/pause path, not the only path. Overlay canvas
  is ignored by assistive technology. Import works from a real labeled file
  input without drag-and-drop.
- Immediate playback is independent of analysis initialization. Inference and
  model loading never run on the main thread. UI input and playback must remain
  responsive throughout an up-to-60-second reference-laptop analysis.
- Keep one frame in flight, close transferable resources promptly, cap canvas
  DPR, resize only when bounds change, and avoid per-frame React/DOM work.
- First pose becomes drawable as soon as the first inference returns; there is
  no wait for a batch or full range. Progress announcements are throttled.
- No source pixels are copied into application state, no full decoded clip is
  buffered, and no TensorFlow/MoveNet chunk exists in the production build.

## Acceptance tests

### Unit (Vitest)

- Range defaults, clamp/min/max rules, handle crossing, endpoint schedule, and
  microsecond conversion.
- Nearest-pose binary lookup, earlier tie, tolerance boundary, variable timestamp
  spacing, and no stale hold across a gap.
- Per-joint trail windowing, fade inputs, segmentation on missing/low-confidence
  samples, large timestamp gaps, and independent left/right continuity.
- Landmark acceptance and skeleton segment removal when either endpoint fails.
- Contain/display transform for portrait-in-landscape, landscape-in-portrait,
  resize/DPR, normalized corners/center, and rotation-derived display sizes.
- Session/job reducer ignores stale source, progress, cancellation, and worker
  result events.

### Browser (Playwright)

- Portrait 90° and landscape 180° fixtures import upright, use a local `blob:`
  source, expose the expected display size, and become playable before analysis.
- MediaPipe Full initializes in the module worker and publishes a first sample
  before the full short range completes.
- Progress increases monotonically; skeleton/trail canvas updates at matched
  presentation timestamps rather than result index.
- Cancel stops progress and preserves partial results; Resume finishes without
  duplicates.
- Replacing a source during model load, extraction, and partial analysis leaves
  only the new source/range/poses visible. No late old-session event changes UI.
- Missing-confidence samples produce separate trail segments and absent skeleton
  limbs; current-time no-pose feedback appears without a stale overlay.
- Deterministic pose fixtures verify normalized corners/landmarks align with the
  same contained video rectangle in portrait and landscape.
- No video upload request occurs. Initial import failure and analysis failure are
  recoverable.

### Visual review

- Capture empty, imported, partially analyzed, ready, unavailable-pose,
  cancelled, and error states at 1440×900 and 393×852; inspect overflow, hierarchy,
  contrast, focus, touch sizing, safe areas, and long file names.
- Inspect real portrait and landscape footage at desktop and narrow sizes with
  skeleton, both trails, letterboxing, seeking, and orientation changes.
- Run the production build, Vitest, and full Playwright suite before completion.
  The physical iPhone gate is explicitly performed only after the user provides
  the phone interaction.

## R1 transition cleanup

Preserve and adapt:

- `BrowserMediaAdapter`, MediaPipe module worker/client/protocol, model pin,
  timestamp utilities, normalized upright coordinate contract, contained display
  transform, and valuable unit/browser tests;
- `docs/r1-spike-report.md`, benchmark JSON/image evidence, rebuild report,
  roadmap history, and iPhone test guide.

Remove once the R2A flow supersedes them:

- MoveNet client and all TensorFlow dependencies/chunks;
- diagnostic benchmark controls, summary/download state and global test hook;
- the desktop benchmark script/package command and R1-only benchmark browser
  test;
- diagnostic copy/styles and R1 page title.

The fixture manifest now lives at `tests/fixtures/fixture-manifest.json`; R1
evidence now lives at `docs/r1-results`, with references updated. The README now
describes R2 product development, tests, fixtures, privacy, and the phone gate.
Git history remains the runnable R1 checkpoint.

## Explicit deferrals

- **R2B:** speed presets, fine/jog review, adjacent-frame stepping, loop,
  checkpoints, advanced keyboard shortcuts, and complete custom transport.
- **R2C:** user-selectable joints, trail duration/fade controls under advanced
  Trails settings, independent skeleton/trail toggles, confidence presets/debug
  inspector, and advanced missing-pose visualization. Page-level pinch zoom is
  disabled in the phone review shell; dedicated video zoom/pan is not planned
  without later user evidence because it must preserve the exact video/overlay
  transform. The ordinary review default remains 1.5 seconds. R2A still builds
  independent renderer contracts and one master overlay toggle so these are
  additive.
- **R2D:** final Review/Inspect/Timeline phone navigation, bottom sheets, PWA/offline
  work, sustained 20–30 second phone/delegate/thermal/battery measurements,
  validation of the selected 60-second range cap, advanced analysis-density
  choices around the 30 samples/second default, and gym-session refinement.
- **Later:** persistence, export, accounts/cloud, uploads, baked overlay video,
  comparison, analytics, climbing-specific scoring, hold/contact detection, and
  any ClimbingCap/AscendMotion or MoveNet/TensorFlow work.

## Review decisions

The user approved the proposed **dark movement studio** visual voice
(graphite/chalk with restrained lime, amber, and cyan) and the **stage-first,
quiet-instrument** density with range and progress visibly adjacent to the
video.

## Implementation record

- The approved dark movement-studio shell is implemented with a stage-first
  desktop rail and a stacked, safe-area-aware phone layout. System fonts and
  inline SVG keep the shell self-contained.
- MediaBunny is dynamically loaded only when a file is chosen, reducing the
  initial production JavaScript from roughly 556 kB to 219 kB before gzip; its
  separate media chunk loads during local import.
- The ordinary product path uses MediaPipe Full at 30 requested
  samples/second. It tries GPU first and retries CPU once. Raw samples include
  actual integer presentation timestamps, model/delegate identity, visibility,
  and presence. Lite remains a faster alternative. The initial bounded
  availability comparison did not favor Full, but later human review found a
  noticeable visible-quality improvement without a drastic time increase.
- The three current acceptance fixtures are approximately 29.97 fps, so the
  30-sample default analyzes essentially every unique source frame. In a warm
  five-second `lache-send.MOV` laptop measurement, 15 samples/second analyzed
  76 unique frames in 1.17 seconds, 30 analyzed 151 in 1.76 seconds, and 60
  requested no more than the same 151 unique frames while taking 1.89 seconds.
  This supports 30 as the current quality/performance middle ground; later
  advanced choices remain capped by source frame rate and phone evidence.
- The determinate analysis percentage and its compact progress bar use the same
  clamped completion fraction. The bar updates directly rather than restarting
  a transition on every quickly published sample, and exposes semantic progress
  values for assistive technology.
- The primary playback scrubber includes a non-interactive amber band for the
  selected analysis range. The normal elapsed-playback line, thumb, seeking,
  keyboard behavior, and touch target remain available above that visual.
- Skeleton segments require accepted endpoints in the same sample. Detailed
  face landmarks are hidden; one accepted nose anchor connects to the accepted
  shoulder midpoint. Hip and shoulder midpoint trails use independent
  1.5-second timestamp windows and split on any rejected required source or gap
  over 50 ms. The archived legacy implementation used a two-second window but
  faded old dots nearly to transparent; the current shorter default accounts
  for the rebuild's more visible 0.38-to-0.98 alpha treatment. Trail strokes use
  a minimum four-canvas-pixel width/radius.
- Cancellation terminates the worker, aborts frame iteration, closes an
  untransferred bitmap, and preserves completed attempts for Resume. Source and
  job identities reject late results; source replacement tests cover active
  inference.
- The adapter's explicit flip fields are currently `false` because MediaBunny
  1.51 exposes rotation but not independent reflection. No mirroring is inferred;
  a real mirrored fixture remains part of the broader orientation matrix.
- R1 evidence and reports are preserved. MoveNet/TensorFlow, benchmark UI,
  diagnostic globals/downloads, benchmark scripts, and their dependencies are
  absent from the product build.

### R2A.1 sizing completion

- Fixed `70dvh`/`72dvh` stage caps were removed. A layout-only sizing hook
  measures the review width, the stage's document position, the current visual
  viewport, transport height and margin, and computed bottom safe padding. It
  applies `min(available width / display width, available height / display
  height)` to desktop upright display dimensions. Below 720 px, sizing is
  deliberately width-only so iOS browser-bar changes cannot shrink the player
  during scroll; controls may continue below the initial viewport.
- At 1440×900, the later compact desktop refinement renders the portrait
  fixture at approximately 438.5×780 px, centered on the overall review surface
  with the rail clear at the right. The landscape fixture renders at
  approximately 1072×603 px in the flexible main column. The filename moved to
  the top bar, desktop shell gutters are 10 px, and the desktop transport is a
  46 px dock with a 36 px play button.
- At 393×852, the portrait fixture uses the full 393 px viewport width and is
  698.5 px tall. The separate stage heading is omitted at every width, and the
  stage plus transport are edge-to-edge while the header and secondary controls
  retain safe-area padding. At 852×393, portrait and landscape
  fixtures reserve 206 px of stage height and keep a full-column transport dock
  with 44 px targets inside the viewport without horizontal overflow.
- Source errors remain in desktop height measurement. On narrow portrait
  screens the stage stays full-width and basic transport remains immediately
  below it, reachable by normal vertical scrolling. Long file names remain
  single-line and ellipsized in the desktop top bar. Analysis cards
  remain below the stage and independently scrollable in the landscape-phone
  rail.
- The viewport meta lock, `touch-action`, and iOS gesture-event guard disable
  page-level pinch scaling. On narrow phones, only the review main follows
  `visualViewport.width` and `visualViewport.offsetLeft`, keeping the stage and
  transport edge-to-edge without scaling the rest of the application. The
  control rail retains normal phone dimensions and shifts its centerline by the
  visual viewport's center offset, capped within its outer gutter.
- The stage retains the upright source aspect ratio and `object-fit: contain`.
  Video and overlay canvas remain absolute siblings with identical CSS bounds;
  the existing contained-content transform, DPR cap, timestamp lookup, raw pose
  data, and renderer contracts are unchanged.

### Verification completed

- `npm test`: 7 files, 23 tests passed.
- `npm run build`: passed; product shell, lazy media adapter, and module worker
  emitted successfully with no large-chunk warning.
- `npm run test:e2e`: 11 tests passed in desktop Chrome against real fixtures,
  including preservation of copyable GPU/CPU worker initialization diagnostics.
- Visual inspection passed at 1440×900 desktop, 393×852 iPhone portrait, and
  852×393 iPhone landscape for both portrait and landscape imports. Empty,
  imported, long-filename, retained-source error, ready, unavailable-pose,
  cancellation, replacement, and overlay-alignment behavior were exercised by
  visual or browser acceptance paths.
- The physical iPhone 15 / Chrome-iOS gate passed on July 24, 2026. HTTPS
  access, upright portrait import, local-poster display, playback, timed
  extraction, MediaPipe initialization, short analysis, overlay alignment,
  responsive interaction, source replacement, and no-crash/no-reload behavior
  all passed. Initialization is noticeably slower than desktop but remains
  acceptable. The diagnostic retry mapped
  `Can't find variable: document` to MediaPipe's canvas selection, which treats
  `CriOS` as old Safari and ignores the worker's available `OffscreenCanvas`.
  The worker now passes a fresh explicit canvas through MediaPipe's supported
  `canvas` option for every GPU/CPU initialization attempt. CPU fallback starts
  in a fresh worker after any GPU initialization failure so MediaPipe's
  worker-global loader/WebGL state is not reused.

### Physical phone gate completion

The user completed the handoff against production Sites version 9, built from
commit `0b1abbe6fbdbba9cc4bc702f488586f6a23339e8`, on the reference iPhone 15
running iOS 26.5 in Chrome for iOS; the exact Chrome version was not recorded.
The portrait clip imported from Photos and appeared upright, with the locally
decoded first-frame poster preventing a black player when autoplay was blocked.
Playback, a 3–5 second Lite analysis, seeking through analyzed time, and
replacement all passed. The skeleton and hip/shoulder midpoint trails remained
aligned to the displayed climber. Play/pause, scrolling, and the secondary
controls remained responsive; the page did not crash or reload, and no unusual
heat was reported during the short run.

The narrow layout also passed its intended physical behavior: the stage and
transport remained edge-to-edge, secondary controls retained normal readable
dimensions and stayed centered, and page-level pinch zoom remained disabled.
The longer thermal, battery, sustained-analysis, and Lite/Full delegate matrix
was intentionally not run; it remains R2D work.

Later calibration review captured a repeatable raw-pose flicker. Integer-
microsecond lookup times could fall fractionally before rational source-frame
timestamps, causing MediaBunny to return a prior frame twice. A one-microsecond
lookup bias fixed the exact regression without pose interpolation. Setting
comparisons still reuse one cached raw run.

## First product-review follow-ups

The first review approved the visual design and confirmed that the shell reads
as the product rather than the R1 diagnostic. It also exposed two important
follow-ups:

1. The single-video stage was too conservative, especially for portrait
   footage. R2A.1 now lets the video use the measured available review space
   without changing the approved visual language or solving the separate
   multi-video layout problem.
2. The current `0.5` visibility/presence acceptance rule creates honest gaps but
   does not catch every wrong, swapped, or slingshotting landmark. Pose-quality
   calibration is now an explicit gate after the physical phone check and
   before R2B.

The first overlay-semantic follow-up is implemented: hip and shoulder midpoints
are now the default trails, while the generic trail source still supports
wrists and other direct joints. A midpoint is missing whenever either source
joint is rejected. Face detail is hidden; one accepted head anchor connects to
the derived shoulder midpoint.

The quality layer now shares that same product-landmark contract: nose plus
landmarks 11–32, for 23 scheduled product joints. The other 10 MediaPipe face
details remain preserved only in immutable raw samples and are excluded from
policy decisions, overrides, labels, smoothing, rejection counts, coverage, and
gap metrics. Longest gap is split into an attributed product-joint interval and
a separate whole-pose interval.

The calibration implementation is complete. Balanced v2 is the ordinary
default, with Strict and Permissive alternatives; its focused human re-smoke
still found one objectionable frame of lag, so the zero-lag display decision
remains open before broader calibration resumes.
Global, body-group, and joint overrides
recompute derived views over immutable cached raw samples; acquisition/retention
hysteresis, timestamp-based temporal rejection, and segment-local smoothing are
inspectable under **Pose quality calibration**. Display and analytics policies
remain separate, and the advanced workspace includes reason-coded previews,
coverage/gap/lag metrics, manual labels, and JSON export. See the
[`calibration plan`](./pose-quality-calibration-plan.md) and
[`calibration report`](./pose-quality-calibration-report.md).

After the v2 re-smoke still showed one objectionable frame of causal smoothing
lag, the calibration workspace added exact analyzed-frame navigation. It pauses
playback, steps previous/next, accepts direct one-based frame entry, and displays
the stored presentation timestamp. Frame numbering is only a calibration
address over timestamped pose samples; timestamps remain the identity and
source frames above the analysis density are not implied.

Calibration changes have a bounded 100-step undo/redo history. Rapid changes to
the same control or transport drag coalesce, exact analyzed-frame seeks remain
individual steps, visible Undo/Redo buttons expose state, and the standard Mac
and Windows/Linux shortcuts work while the calibration workspace is open.
Inference-model changes and manual labels are excluded; source import or model
change clears history. The five advanced setting families are native independent
disclosures and start collapsed.

One Euro smoothed preview is unavailable when the active policy has smoothing
disabled. Turning smoothing off while it is selected falls back to Accepted raw.
Accepted raw remains selectable with smoothing enabled so it can serve as the
unfiltered comparison without altering filter calibration.

The calibration workspace exposes **Centered offline · default** as a separate
future-aware display result. It computes a presentation-timestamp-weighted
moving average over equal past and future time within each accepted
product-joint segment. Its default `66.667 ms` radius is undoable, `0 ms`
matches Accepted raw, the window shrinks evenly to raw at segment boundaries,
and it never crosses a rejected, non-monotonic, or oversized gap. It remains
available when One Euro is disabled because it is not part of the active
display/analytics acceptance policy. Human review selected centered over the
causal One Euro path at their default settings; continued calibration must
still check pre-motion anticipation.

The captured `yellow-v0` raw-pose flicker occurred before MediaPipe inference.
For 17 requests, a fractional source presentation timestamp landed just above
the rounded integer-microsecond lookup, MediaBunny returned the preceding frame
again, and duplicate suppression left a renderer-visible hole. The lookup now
uses a one-microsecond boundary bias. The exact selected range subsequently
covered all 371 real source frames and played without unavailable intervals;
raw and analytics data remain uninterpolated.

Developer calibration exposes the full effective confidence and hysteresis
domains. Nonnegative temporal and smoothing diagnostics have no artificial
upper limits, while numeric input rejects non-finite and out-of-domain values.
These wider diagnostic ranges do not change the product preset defaults.

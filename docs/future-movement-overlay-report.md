# Future movement-overlay report

**Status:** Consolidated product research; not current R2 acceptance scope

**Purpose:** Collect Crux Vision's existing movement-visualization ideas in one
place, add pose-aware design and implementation direction, and prioritize the
overlays most likely to remain useful when landmark quality is uneven.

The detailed contact-geometry concept remains in
[`future-contact-base-overlay-notes.md`](./future-contact-base-overlay-notes.md).
This report is the canonical inventory and prioritization for future movement
overlays; older reports remain useful as historical and technical context.

## Executive recommendation

The best next overlay family is **projected motion**:

1. a velocity arrow and optional speed readout for one selected point;
2. speed-encoded trails, especially variable trail width;
3. a relative-motion mode that measures wrists from shoulders and ankles from
   hips; and
4. comparison summaries for hip and shoulder midpoint speed.

Start with hip and shoulder midpoints because they are the most reliable
movement anchors. Add elbows and knees next. Treat wrists and ankles as
high-value, intermittent signals: use them when accepted, derive them relative
to a stronger proximal anchor when useful, and show no vector or measurement
when the evidence is inadequate.

The next most promising non-velocity layers are:

- **Checkpoint displacement and ghost poses**, which reveal change over a
  longer interval and therefore amplify jitter less than instantaneous
  derivatives.
- **Torso frame**, using shoulder and hip axes to show body translation, lean,
  compression, and a projected rotation proxy from reliable landmarks.
- **Dwell/path heatmaps and motion envelopes**, which aggregate many samples
  and can extract a robust pattern from imperfect distal tracks.
- **Angle arcs and movement-state emphasis**, with explicit dependent-joint
  coverage.

Package these layers as transparent, editable presets. Lead with presets for a
review goal—such as Hip drive, Leg swing, Position sequence, or Compare
attempts—then test climbing-context recipes such as Dynamic/coordination,
Slab/precision, and Overhang/occlusion. A preset should be a visible collection
of settings, not an automatic claim about the climb or climber.

Do not begin with acceleration arrows, jerk effects, impact flashes, force,
power, balance, or risk. Acceleration and jerk magnify pose noise; the remaining
terms require measurements that ordinary monocular video does not provide.

## The pose-aware opportunity

Crux Vision should not treat every landmark as equally accurate or equally
valuable.

### Reliable structure

Shoulders, hips, and their midpoints are the best foundation for:

- whole-body translation;
- torso direction and orientation proxies;
- body-normalized scale;
- phase timing;
- comparison alignment; and
- stable reference frames for weaker joints.

These signals may be less visually dramatic than a swinging foot, but they are
more suitable for quantitative comparison.

### Valuable but intermittent endpoints

Wrists and ankles often contain the most climbing-specific information:

- reach direction and catch timing;
- leg swing and flagging direction;
- foot release, placement, or slip candidates;
- contact sequence; and
- the difference between two beta choices.

They are also more likely to be occluded, blurred, swapped, rejected, or
temporally noisy. A good overlay should not hide that weakness, but it should
not discard the useful intervals either.

### Use strong joints to interpret weak joints

For distal movement, offer both:

- **Projected motion:** endpoint movement in the upright image.
- **Limb-relative motion:** endpoint movement after subtracting its proximal
  anchor—wrist relative to shoulder, ankle relative to hip.

If the torso and leg travel together, absolute ankle velocity may be high while
hip-relative ankle velocity is low. If the leg swings beneath a relatively
steady hip, relative velocity isolates that action. This pairing is more useful
than asking one noisy endpoint track to explain both whole-body travel and limb
articulation.

Relative motion does not repair a bad wrist or ankle. Both source points still
need valid coverage.

## Measurement and integrity contract

### Use projected, not physical, terminology

Without wall-plane calibration and a known physical scale, report:

- **Projected speed**
- **Projected direction**
- **Body-normalized speed**
- **Relative limb speed**
- **Projected displacement**

Do not report meters per second. A suitable default unit for comparison is
**body lengths per second**, using a versioned torso-scale definition. An
optional image-space unit can support debugging, but pixels per second should
not be the main product metric.

Before computing distance, map normalized landmark coordinates into an
aspect-correct upright-image coordinate plane. Ten percent of a portrait
video's width is not the same image distance as ten percent of its height.
Normalize only after x and y share one geometric scale.

### Derive motion from time windows, not adjacent frames

Raw frame-to-frame differences will turn pose jitter into false speed. For every
supported point:

1. begin with accepted samples and their real presentation timestamps;
2. stay within one uninterrupted accepted segment;
3. fit position over a centered time window using timestamp-weighted local
   linear regression or another calibrated robust derivative;
4. require minimum sample count, time span, and accepted coverage;
5. reset at rejected, missing, non-monotonic, or oversized gaps;
6. compute velocity in aspect-correct image coordinates;
7. divide by a robust torso scale for body-normalized speed; and
8. retain the policy, derivative-window, point-resolver, and scale versions.

A centered offline derivative is appropriate for recorded-video review because
it avoids the phase lag of a past-only filter. It must remain separate from a
future live-capture mode, which would require a causal estimator.

Window duration should be calibrated by signal class rather than assumed to be
one universal number. Torso midpoints may tolerate a shorter window. Distal
joints may need a longer robust window, but excessive width will erase short
releases and catches.

### Keep visual scale separate from the number

An arrow cannot grow without limit. Use a documented nonlinear or capped visual
mapping:

- direction comes from the estimated velocity;
- arrow length represents speed up to a visible cap;
- a saturated arrow has a visible cap marker;
- numeric speed retains the uncapped accepted estimate; and
- direction disappears below a calibrated speed floor, where jitter dominates.

Auto-scaling may help inspect one clip, but a two-attempt comparison must use the
same fixed visual scale for both attempts. Otherwise identical arrows can
represent different speeds.

### Do not call the result precise before measuring repeatability

Pose-derived speed can distinguish attempts only when the difference is larger
than the system's error floor for that point, camera setup, policy, and motion
type.

Calibration should estimate:

- apparent speed during labeled still intervals;
- repeatability across repeated analysis of the same cached raw poses;
- agreement with manually tracked reference points on selected clips;
- sensitivity to derivative-window changes;
- peak-timing error;
- endpoint-specific coverage; and
- differences produced by changed framing or camera motion.

Comparison UI should prefer **similar within measurement noise** over a small,
overconfident delta. When a difference clears a validated threshold, show the
delta, coverage, and measurement policy together.

Use robust summaries:

- median speed during a marked phase;
- upper-percentile speed rather than the single maximum;
- time of the upper-percentile speed or peak band;
- duration above a calibrated threshold; and
- coverage and longest gap.

A single-frame maximum is especially vulnerable to the exact error the pose
filter is designed to reject.

## Prioritized overlay catalog

### Priority 1 — projected motion vectors

**Visual:** Draw an arrow from the current selected point in its estimated
direction of travel. Arrow length represents projected speed; an optional label
shows body-normalized speed.

**Default sources:** Hip midpoint or shoulder midpoint. Let the user select one
additional joint rather than drawing ten simultaneous arrows.

**Modes:**

- **Absolute:** motion in the upright video.
- **Proximal-relative:** wrist from shoulder or ankle from hip.
- **Torso-relative:** selected point after subtracting a torso-center track.

**Why it fits the data:** Midpoint motion averages two reliable proximal
landmarks. Distal arrows remain useful during accepted intervals, while
relative modes remove movement shared with the body.

**Main failure modes:** Direction flicker at low speed, exaggerated velocity
from residual jitter, visual saturation during fast moves, and false comparison
under different camera motion.

**Guardrails:** Minimum direction speed, robust derivative window, arrow-length
cap, honest gaps, coverage readout, and no arrow when the derivative is
unavailable.

### Priority 1 — speed-encoded trails

**Visual:** Let trail width increase with projected speed. Optionally use
brightness or a sparse pulse marker at high-speed moments.

Variable width is the strongest first treatment because it preserves the
existing trail's source color and contrast halo. It also lets the viewer read
path and speed together without adding another overlay layer.

Use:

- a stable minimum width so slow movement remains visible;
- a capped maximum width so a noisy point cannot cover the climber;
- temporal easing of width only, without joining position gaps;
- a small legend or thin/thick example; and
- the same speed-to-width mapping for compared attempts.

Do not encode speed simultaneously through width, opacity, hue, animation, and
particle count. One primary channel plus a numeric inspection option is easier
to interpret and less visually noisy.

**Data fit:** High for hip and shoulder midpoint trails, medium for accepted
elbows/knees, and conditional for wrists/ankles.

**Implementation boundary:** Speed encoding changes trail appearance from cached
derived motion. It must not alter raw pose, acceptance, or the underlying trail
path, and it must not rerun MediaPipe.

### Priority 1 — checkpoint displacement vectors

**Visual:** At a named checkpoint, draw a ghost point or pose. At the current
time, draw a line or arrow from the checkpoint position to the current
position.

This answers **how far and in what direction did the body or limb move from the
setup?** It is not velocity because the time interval is user-selected and can
be long.

**Why it fits the data:** A larger time baseline makes the result less sensitive
to single-frame jitter. Named checkpoints and exact seeking already exist.

Useful variants:

- hip midpoint from setup to catch;
- shoulder midpoint from initiation to high point;
- wrist or ankle from release to placement;
- body-scale-normalized displacement label; and
- A/B displacement arrows from equivalent checkpoints.

Both endpoint samples must be valid. Do not bridge an unavailable checkpoint
with a nearby value unless the user explicitly chooses a tolerated lookup
window and the UI identifies that substitution.

### Priority 1 — ghost poses and onion skin

**Working layer name:** **Ghost poses**. Use **Time echoes** and **Checkpoint
ghosts** for its two primary modes.

**Visual:** Draw accepted skeleton snapshots at reduced opacity behind the
current skeleton. A checkpoint ghost remains anchored to its recorded body
position while the current climber moves away from it. Time echoes linger
briefly behind the current pose at consistent elapsed-time intervals.

**Why it fits the data:** It reuses positions rather than differentiating them,
so it is more robust than velocity and acceleration. Missing joints can remain
missing in each ghost without corrupting the current pose.

Support four explicit sources:

- **Time echoes:** past poses at intervals such as 0.25, 0.5, or 1 second.
- **Checkpoints:** one or more named checkpoint poses.
- **Selected range:** poses at In, temporal midpoint, and Out.
- **Comparison:** attempt A at the synchronized timestamp or phase behind
  attempt B.

The selected-range midpoint is only halfway through elapsed range time; it is
not automatically the semantic middle of a move. Named setup, initiation,
high-point, catch, and settle checkpoints are more meaningful when the user has
created them.

Recommended defaults:

- Time echoes: three past poses at 0.5-second spacing.
- Checkpoints: selected checkpoints only, with at most three visible initially.
- Selected range: In and Out by default; midpoint is optional.
- Comparison: one other-attempt ghost at a time.

Fade by age or sequence: the current skeleton stays strongest, the nearest
ghost is clearly visible, and older ghosts recede. Use one neutral ghost color
plus opacity and outline differences rather than a rainbow that competes with
trail-source colors. Comparison ghosts should instead use the established A/B
colors. Keep an optional compact timestamp or checkpoint label outside the
climber's body.

Intervals must use presentation time, not frame count. Resolve each requested
time to an eligible analyzed sample within a documented tolerance. If no
accepted pose is close enough, omit that ghost and identify it as unavailable;
do not interpolate a complete skeleton or hold the previous pose.

Each ghost is confidence-aware independently. A missing wrist in the start
ghost does not remove the current wrist, and it is not silently borrowed from a
nearby time.

Too many ghosts become an animation smear. Cap ordinary review at three to five
and provide a one-click clear/reset. Camera movement can also make a fixed ghost
look like body movement relative to the wall, so comparison and longer-range
ghosts are strongest with a fixed camera or later wall alignment.

### Priority 1 — torso frame

**Visual:** Draw:

- shoulder axis;
- hip axis;
- shoulder-to-hip center line;
- optional translucent torso quadrilateral; and
- compact projected lean or axis-angle labels.

This can show hip drive, shoulder/hip separation, body compression, and changes
in projected torso orientation.

**Why it fits the data:** It is built from the landmark groups that generally
have the best coverage. It also creates the reference frame for torso-relative
limb motion.

Call rotation and lean **projected proxies**. Camera perspective, wall angle,
and out-of-plane twisting can change the apparent axes without a matching
physical rotation.

### Priority 2 — movement-state emphasis

**Visual:** Use a restrained ring, glow, or segment emphasis to identify which
body groups are clearly moving, still, or unknown.

This can reveal movement sequence without requiring users to follow several
arrows:

- muted ring: below the motion threshold;
- emphasized ring: movement bout active;
- absent or interrupted ring: unknown;
- short onset pulse: movement bout began; and
- short settle pulse: movement bout ended.

The product language should be **moving**, **still**, and **unknown**. Still
does not mean resting, supporting weight, or in contact.

Motion-bout hysteresis is required so the state does not flicker around one
speed threshold. Limb-relative speed is often the better endpoint input.

### Priority 2 — dwell heatmap and path-density map

These are two different overlays and should not share one ambiguous label.

**Dwell heatmap:** Accumulate accepted time near each location. It answers
**where did this point remain?**

**Path-density map:** Accumulate accepted path passages or distance contribution.
It answers **where did this point travel repeatedly?**

Weight by real elapsed time rather than sample count so variable sampling does
not create artificial hot spots. Gaps contribute nothing. Show valid coverage
for the selected point and range.

Good initial sources:

- hip midpoint for body positioning;
- shoulder midpoint for upper-body positioning;
- one wrist or ankle for repeated adjustment patterns; and
- a torso-center proxy.

Heatmaps are useful for imperfect distal data because aggregation can reveal a
repeatable region, but outlier rejection is essential. A false accepted
slingshot must not stretch the heatmap or color scale for the whole range.

### Priority 2 — robust movement envelope

**Visual:** Show a translucent region containing the accepted movement of one
point over a selected range.

Variants:

- absolute endpoint envelope in the wall/image frame;
- wrist envelope relative to its shoulder;
- ankle envelope relative to its hip;
- hip or shoulder path corridor; and
- overlapping A/B envelopes.

Use a robust occupancy contour, trimmed hull, or percentile region rather than
a raw convex hull, which is determined by its most extreme outlier. Report
coverage and do not fill across long temporal gaps merely because two points
lie on the same boundary.

Relative envelopes can show how a leg swing or reach differs even when the
whole body took a different path.

### Priority 2 — joint-angle arcs

**Visual:** Draw an arc at a selected elbow, shoulder, hip, or knee with an
optional current projected angle.

Angles can be easier to compare than endpoint coordinates, but every angle
depends on three accepted points. The displayed angle must disappear if any
input is unavailable.

Recommended order:

1. torso axes and shoulder/hip relationships;
2. knee and elbow angles during selected phases;
3. shoulder and hip joint angles, whose interpretation is more sensitive to
   2D projection; and
4. angle histories or A/B deltas in the timeline rather than many simultaneous
   labels over video.

Call them **projected joint angles**. They are not full 3D anatomical angles.

### Priority 2 — projected body center

Separate two concepts:

- **Torso center:** a simple, high-coverage midpoint derived from shoulder and
  hip centers.
- **Projected body-center estimate:** a versioned anthropometric approximation
  using available segment centers and weights.

Torso center is the better first overlay because it is simple and stable.
Projected body center may later provide a useful path and velocity, but its
coverage and model assumptions must be shown.

Do not call either one **center of balance**. Balance requires contact, wall
geometry, forces, and friction.

### Priority 3 — movement phase and coordination

Use motion bouts, torso speed, and confirmed contact events to propose:

- setup;
- initiation;
- travel;
- catch/contact; and
- settle.

Phase is better presented as a timeline band with a subtle current-phase label
than as a large video effect. Every proposed boundary should be editable.

Useful comparison outputs include:

- which limb initiated first;
- hip-to-hand or hip-to-foot onset delay;
- time from release to catch;
- duration of a high-motion phase; and
- whether the torso led or followed the limb.

Pose-only phases are suggestions, not ground truth. Contact-aware phases should
wait for the editable contact timeline.

### Priority 3 — contact base and center relation

The Contact base concept uses likely or confirmed hand/foot contacts to draw a
projected hull, line, or point. Its detailed detection, UI, terminology, and
calibration plan are in
[`future-contact-base-overlay-notes.md`](./future-contact-base-overlay-notes.md).

An optional line from torso center or projected body center to the contact hull
may help geometric inspection later. It must be called a **projected geometric
relation**, not balance, stability, or force distribution.

### Priority 3 — hold and reach overlays

After holds can be mapped or corrected:

- distance and direction to the next selected hold;
- robust reach envelope;
- current limb-extension ratio;
- hold-to-hold contact sequence;
- grip-readjustment candidates; and
- foot-slip candidates with a visible recovery path.

These features are route-specific and potentially valuable, but automatic hold
segmentation should not be a prerequisite. Manual hold regions and editable
contact events are the trustworthy starting point.

## Comparison-specific overlays

R5 should reuse the same motion-signal contract rather than invent separate
comparison math.

### Difference skeleton

Draw attempt A and attempt B at aligned timestamps or phases, then add short
vectors between equivalent accepted points.

Requirements:

- visible synchronization origin;
- matched camera or user-assisted wall alignment;
- identical pose and motion policies;
- no delta where either point is unavailable; and
- a clear A/B color and layer order.

### Path corridor comparison

Show hip, shoulder, or selected limb paths as separate translucent corridors.
This is often more robust and legible than point-by-point skeleton differences.

Useful summaries:

- body-normalized lateral/vertical path difference;
- path timing difference;
- overlap percentage with coverage; and
- displacement at named phase boundaries.

### Velocity comparison

For one selected source, show:

- A and B projected velocity arrows with the same visual scale;
- current speed delta;
- median or upper-percentile phase speed;
- timing of the high-speed band;
- coverage for both attempts; and
- **similar within measurement noise** when appropriate.

Hip and shoulder midpoint velocity should be validated before wrist or ankle
peak-speed comparisons.

### Phase-normalized comparison

Mapping each attempt to zero–100 percent of a user-confirmed movement can reveal
sequence differences when total duration changes. Always retain real elapsed
time beside phase position; otherwise a normalized display can conceal that one
attempt was materially faster.

## Combined visual treatments

The following combinations have a clear semantic purpose:

### Swing view

- hip-to-ankle segment;
- hip-relative ankle velocity arrow;
- speed-encoded ankle trail; and
- optional movement envelope over the selected swing.

This separates whole-body movement from leg swing while preserving the
high-value foot path.

### Hip-drive view

- hip and shoulder midpoint trails;
- torso frame;
- hip and shoulder velocity arrows; and
- checkpoint displacement from setup to catch.

This is the best initial quantitative view because every component favors the
more reliable torso landmarks.

### Reach view

- shoulder-to-wrist segment;
- shoulder-relative wrist vector;
- speed-encoded wrist trail;
- projected elbow angle; and
- next-hold direction only when the hold is mapped.

### Beta-difference view

- A/B ghost poses at matched checkpoints;
- difference vectors for selected reliable points;
- path corridors; and
- one speed-delta readout.

### Contact-transition view

- Contact base shape;
- moving/still/unknown limb emphasis;
- projected torso-center path; and
- editable contact-state timeline.

Each view should be a preset or a small coordinated group, not a command to turn
on every available layer. Overlay combinations need a deliberate drawing order
and clutter budget.

## Overlay preset system

Presets solve two different problems:

1. **Review goal:** what the climber wants to inspect.
2. **Climbing context:** what kind of movement and pose-quality failure the clip
   is likely to contain.

Keep those concepts distinct even when the UI presents both in one preset
gallery. Review-goal presets should ship first because they make fewer
assumptions and map directly to a question.

### Review-goal presets

| Preset | Primary settings | Question it supports |
|---|---|---|
| **Hip drive** | Hip/shoulder trails, torso frame, midpoint vectors, setup/catch ghosts | How did the torso initiate and travel? |
| **Leg swing** | Hip-relative ankle vector, speed-width ankle trail, movement envelope, time echoes | How fast and in what direction did the leg swing? |
| **Reach and catch** | Shoulder-relative wrist vector, wrist trail, elbow angle, release/catch ghosts | How did the hand approach the catch? |
| **Position sequence** | Checkpoint ghosts or In/midpoint/Out ghosts, torso frame, minimal live skeleton | How did body position change through the move? |
| **Foot sequence** | Knee/ankle trails, movement-state emphasis, checkpoint ghosts, contact timeline when available | When and where did each foot move? |
| **Compare attempts** | A/B ghost, difference vectors, path corridors, fixed motion scale | Where do the two attempts differ? |
| **Contact transition** | Contact base, torso-center path, limb states, editable contact timeline | How was the contact geometry released and rebuilt? |

### Climbing-context presets

These are working hypotheses to test, not settled definitions:

| Preset | Suggested emphasis | Pose/signal profile | Important caution |
|---|---|---|---|
| **Dynamic / coordination** | Speed-width trails, hip/shoulder and selected limb vectors, short time echoes, movement onset | Responsive derivative window; Balanced quality unless calibration supports another choice | Fast valid limbs must not be rejected merely for moving quickly. |
| **Static positions** | Checkpoint ghosts, torso frame, projected angles, dwell map | Slow-precision motion profile; Strict may reduce jitter if coverage remains adequate | Stillness is not effort, power, rest, or contact. |
| **Slab / precision** | Knee/ankle paths, torso center, subtle movement states, Contact base when confirmed | Slow-speed sensitivity with strong jitter floor; compare Balanced and Strict | Do not label the result balance or stability. Strict may hide the exact foot signal of interest. |
| **Overhang / occlusion** | Torso-first paths and frame, checkpoint ghosts, contact timeline; distal overlays only when accepted | Occlusion-conservative profile; Strict is a useful candidate | Higher cutoffs reduce false limbs but create more unknown intervals. Never freeze or reconstruct an occluded limb. |
| **Flow / endurance** | Hip/shoulder paths, time echoes, dwell/path heatmap, phase timeline | Stable medium window and long-range summaries | Low motion is not recovery, and path economy is not metabolic efficiency. |

“Power” can remain a climber's description of a style, but the product preset
should be named **Static positions** or **Position and angles** unless it
actually measures power—which pose alone does not.

### Preset behavior

Every preset should:

- list the layers, sources, appearance, motion mode, and pose-quality choice it
  will change before or as it is applied;
- use only data and layers already available in the current product version;
- update cached display and derived signals without rerunning MediaPipe;
- never change the pose model or start a new analysis silently;
- show a short tradeoff when it selects Strict, Balanced, or Permissive;
- apply as one undoable action;
- become **Modified** when the user changes a constituent setting;
- allow **Reset preset** without resetting the source, range, or checkpoints;
- report **Partially available** when required joints or layers lack coverage,
  rather than silently substituting a different signal;
- remain versioned so a saved preset does not silently change meaning; and
- preserve raw pose and user annotations.

If an Overhang/occlusion preset changes quality to Strict, say explicitly:
**Fewer false limb positions · more gaps likely**. Occlusion does not imply that
lower confidence thresholds will recover the hidden joint, and stricter
thresholds do not improve the model output—they only change acceptance.

Do not automatically classify a clip as slab, dynamic, static, or overhang in
the first version. Let the user choose a recipe. Later, Crux may suggest a
preset, but the suggestion must remain editable and should be evaluated against
whether it helps review, not whether an opaque style classifier is “correct.”

R3's user-named local settings presets should extend the same contract. A user
can start with a curated recipe, adjust it, and save the modified combination
under a new name.

## Ideas to defer or reject

### Acceleration arrows and impact flashes

Acceleration differentiates an already estimated derivative and is much more
sensitive to residual jitter, timestamp spacing, and filter choice. Keep
acceleration in developer calibration until it demonstrates repeatable event
detection. Do not map it to dramatic impact flashes merely because the visual
is compelling.

### Jerk as an ordinary overlay

Jerk may support a carefully validated segment metric, but it is a poor
frame-by-frame visual signal from monocular pose. It should not drive particles,
camera shake, or quality judgments.

### Force, power, effort, and strength

Pose supplies kinematics, not hold forces, muscle force, or energy expenditure.
A fast hip or foot is not a force measurement. These terms should not appear in
ordinary overlay labels.

### Stability, balance, safety, and risk colors

Contact count, projected base area, torso position, or low motion can be useful
review cues. None of them alone validates physical stability, safety, or injury
risk. Avoid green/red good/bad semantics unless a future measurement model and
validation justify them.

### Unbounded particles and animation

Particle bursts, persistent glows, and animated trail textures can obscure the
source video and imply more temporal precision than exists. Use motion to encode
one declared quantity, and keep the video readable when several layers are
enabled.

## UI and interaction direction

Keep **Overlay settings** as the common home for layers, but do not turn it into
a permanent checklist of every experiment.

Suggested hierarchy:

- **Layers:** Skeleton, Trails, Motion vector, Torso frame, Ghost pose, Heatmap,
  Contact base
- **Preset:** Review goal / Climbing context / Saved
- **Selected source:** one point or derived point shared by vector, heatmap, and
  measurement readout
- **Motion mode:** Absolute / Proximal-relative / Torso-relative
- **Trail encoding:** Constant / Speed width
- **Ghost source:** Time echoes / Checkpoints / Selected range / Comparison
- **Measurement:** Arrow only / Arrow + current speed

The ordinary surface should expose:

- the active preset and **Modified** state;
- a layer toggle;
- one selected source;
- a suitable automatic visual scale; and
- a compact current readout.

Advanced controls can expose:

- fixed arrow scale;
- derivative window or named responsiveness preset;
- minimum speed for direction;
- relative reference;
- visual cap;
- heatmap mode; and
- ghost spacing, count, direction, and fade;
- debug coverage/evidence.

On mobile, default to one selected vector and one or two trails. Detailed
measurements, coverage, and comparison summaries belong in the Inspect sheet.
Timeline-derived phases and contact states belong in the Timeline sheet.

Every unavailable measurement needs a short explanation such as:

- **Wrist speed unavailable · low pose coverage**
- **Direction hidden · movement below reliable threshold**
- **Comparison inconclusive · difference within measurement noise**
- **Outside analyzed range**

## Implementation direction

### Derived motion cache

Add a versioned derived-motion layer between quality-evaluated poses and
renderers:

```ts
type MotionReference = 'absolute' | 'proximal-relative' | 'torso-relative';

interface MotionSignalSample {
  timestampMicroseconds: number;
  sourceId: string;
  reference: MotionReference;
  position: { x: number; y: number };
  velocity: { x: number; y: number } | null;
  speedBodyLengthsPerSecond: number | null;
  windowCoverage: number;
  bodyScale: number | null;
  policyVersion: string;
}
```

The production type should also retain the source point's existing provenance,
aspect-correction version, derivative-window configuration, gap reason, and
reference-point provenance.

Enabling a motion layer may compute or retrieve this derived cache from existing
accepted pose data. It must not rerun inference. Appearance-only changes such as
arrow color or width scale should redraw the current cached result immediately.

### Point-source reuse

Extend the versioned point-source contract already used by trails instead of
creating vector-only landmark IDs. Hip midpoint, shoulder midpoint, elbows,
wrists, knees, and ankles should resolve identically across trails, vectors,
heatmaps, and numeric measurements.

Add derived torso center, projected body center, or composite hand/foot points
only with explicit version and source provenance.

### Ghost-pose cache and selection

Ghost poses reuse the existing quality-evaluated pose cache; they do not need a
new inference or motion-derivative pass.

A versioned settings contract should retain:

```ts
interface GhostPoseSettings {
  enabled: boolean;
  source: 'time-echoes' | 'checkpoints' | 'selected-range' | 'comparison';
  spacingMicroseconds: number;
  count: number;
  direction: 'past' | 'future' | 'both';
  checkpointIds: string[];
  showLabels: boolean;
  fade: 'age' | 'sequence' | 'constant';
}
```

Checkpoint and selected-range requests should store their intended presentation
timestamps. Rendering resolves the current quality view at those timestamps so
a quality-policy change updates ghosts consistently without rewriting the
checkpoint itself.

### Preset contract

Treat a preset as versioned settings data rather than custom rendering code:

```ts
interface OverlayPreset {
  id: string;
  version: string;
  label: string;
  category: 'review-goal' | 'climbing-context' | 'user';
  description: string;
  poseQualityPreset?: 'strict' | 'balanced' | 'permissive';
  overlaySettings: OverlaySettings;
  ghostSettings?: GhostPoseSettings;
  motionSettings?: MotionSettings;
}
```

Applying a preset should flow through the same settings actions as manual
edits, coalesce into one history step, and expose the resulting values in the
ordinary controls. Unsupported future layers should not be silently ignored;
the UI should identify that the recipe requires a feature not yet available.

### Rendering

Keep high-frequency drawing in Canvas and out of React state. The overlay
renderer should receive the current timestamp plus cached pose and motion
signals, then:

1. select the nearest eligible timestamp under the existing join contract;
2. apply the same video fit/crop/zoom transform;
3. draw low-area layers such as heatmap or Contact base first;
4. draw trails and ghost poses;
5. draw the current skeleton and torso frame;
6. draw arrows, current markers, and small labels last; and
7. omit any layer whose evidence is unavailable.

### Tests

The motion foundation needs deterministic tests for:

- constant velocity at regular and variable timestamps;
- aspect-ratio-correct distance in portrait and landscape sources;
- body-scale normalization;
- rigid shared motion cancelling in proximal-relative mode;
- distal motion remaining after proximal subtraction;
- direction suppression below the reliable speed floor;
- no derivative across rejected, missing, repeated, backward, or oversized
  gaps;
- stable upper-percentile summaries in the presence of one rejected outlier;
- identical fixed visual scale across A/B comparison; and
- cached redraw without pose reanalysis.

Ghost and preset tests should cover:

- time echoes selected by elapsed timestamp under variable frame rate;
- past/future/both direction and ordinary count caps;
- checkpoint and In/midpoint/Out timestamp selection;
- omission rather than interpolation when a ghost pose is unavailable;
- independent missing joints in current and ghost skeletons;
- deterministic age/sequence opacity;
- one-step preset apply, modify, undo, and reset;
- visible Strict/Balanced/Permissive tradeoffs;
- no model change, inference run, source replacement, or checkpoint mutation;
  and
- graceful handling of presets containing unavailable future layers.

Visual tests should cover slow torso travel, fast limb swing, stillness with
ordinary jitter, occlusion, a pose slingshot, portrait/landscape transforms, and
four-layer clutter on desktop and phone. Include three time echoes, three
checkpoint ghosts, and an Overhang/occlusion preset with honest distal gaps.

## Calibration sequence

1. **Synthetic signal tests:** establish mathematical correctness with known
   timestamped trajectories, gaps, noise, and aspect ratios.
2. **Static-video floor:** measure apparent speed for hips, shoulders, elbows,
   knees, wrists, and ankles when a reviewer labels them still.
3. **Manual track comparison:** label selected hip, shoulder, wrist, and ankle
   points through a few slow and fast movements.
4. **Window sweep:** compare derivative stability, peak attenuation, event
   timing, and coverage across candidate windows.
5. **Visual review:** judge arrow flicker, trail-width readability, clutter,
   ghost-pose spacing/fade, preset usefulness, and whether relative motion
   matches what the climber sees.
6. **Attempt comparison:** use the same move and camera to determine which hip
   or shoulder speed differences are repeatable enough to report.
7. **Distal challenge:** test lache, flag, foot swap, occlusion, and fast catch
   examples before enabling wrist/ankle numerical comparisons by default.
8. **Physical-phone gate:** measure derived-cache and Canvas cost with multiple
   live layers during sustained review.
9. **Preset study:** ask climbers to start from a review question, choose a
   curated preset, and record whether it reduced setup time or merely hid the
   controls they needed.

Publish the derivative policy and a minimum-detectable-difference rule before
describing small A/B speed differences as meaningful.

## Recommended delivery order

### Wave 1 — reliable motion foundation

- versioned aspect-correct motion signals;
- hip and shoulder midpoint vectors;
- one selected source and current projected-speed readout;
- speed-encoded trail width;
- checkpoint displacement; and
- checkpoint and selected-range ghost poses;
- coverage plus unavailable states.

### Wave 2 — pose-aware limb motion

- elbows and knees;
- wrist/ankle absolute motion;
- shoulder-relative wrist and hip-relative ankle modes;
- movement-state emphasis; and
- distal calibration report.

### Wave 3 — structural and aggregate views

- torso frame;
- time-echo ghost poses;
- dwell/path heatmaps;
- robust movement envelopes;
- projected joint angles; and
- torso center, followed by a separately named body-center estimate.

### Wave 4 — comparison

- difference skeleton;
- matched path corridors;
- speed and timing deltas with repeatability thresholds;
- phase-normalized view retaining real time; and
- A/B ghost poses and comparison presets.

### Wave 5 — climbing-specific signals

- editable movement phases;
- Contact base;
- mapped-hold reach and contact views;
- foot-slip and grip-readjustment candidates; and
- user-confirmed beta graph.

Build the preset settings contract alongside Wave 1, ship the first
review-goal recipes as their required layers become available, and add
climbing-context presets only after clip-based review. Do not wait until Wave 5
and then create a separate preset system.

## Consolidated provenance

This report incorporates and resolves the following earlier plans:

- `docs/rebuild-report.md`: velocity arrows, angle arcs, ghost poses, heatmaps,
  quality overlays, projected body center, torso axes, contact events,
  straight-arm shading, phase bands, hold graphs, and difference skeletons.
- `ROADMAP.md` R3–R6: current angles, coverage-aware analytics, synchronized
  comparison, Contact base, movement segmentation, and climbing signals.
- `docs/r2-product-spec.md` and `docs/r2c1-implementation-spec.md`: independent
  live Canvas layers, cached redraw, derived point provenance, and selectable
  midpoint/elbow/wrist/knee/ankle trails.
- `docs/pose-quality-calibration-report.md`: separate display and analytics
  policies, honest gaps, body-relative temporal checks, current smoothing
  behavior, and the observed weakness of distal landmarks.
- `docs/future-contact-base-overlay-notes.md`: candidate/confirmed contact
  terminology, jitter-aware detection, projected contact geometry, manual
  correction, and comparison direction.

New direction introduced here includes proximal-relative limb motion,
speed-encoded trail rules, checkpoint displacement, robust motion envelopes,
measurement-repeatability thresholds, aspect-correct derivative geometry, and
the recommended wave sequence. The preset and Ghost poses additions define
review-goal versus climbing-context recipes, pose-quality tradeoffs,
time/checkpoint/range/comparison ghost sources, and a shared versioned settings
contract.

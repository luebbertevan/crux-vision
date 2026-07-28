# Future contact-base overlay

**Status:** Early product concept; experimental R6 candidate, not current R2
scope

This is the Contact base deep dive. The canonical inventory and prioritization
across all proposed movement overlays is
[`future-movement-overlay-report.md`](./future-movement-overlay-report.md).

## Product hypothesis

A climber's four limb endpoints create a changing base from which movement is
organized. Showing the geometry formed by likely hand and foot contacts may make
it easier to see:

- when a four-contact position becomes a three-contact position before a move;
- how much the apparent base narrows or shifts as a limb is released;
- brief two-contact or one-contact phases during dynamic movement;
- where the climber rebuilds a broader base after a catch; and
- how two beta choices use different contact sequences around the same crux.

The proposed overlay draws a quiet, semi-transparent shape through the current
contact points. Four contacts usually produce a quadrilateral, three contacts a
triangle, two contacts a line, and one contact a point. Those are projected
image-space geometries, not measurements of force balance.

This feature should help a climber locate and compare transitions worth
reviewing. It must not label a move safe, risky, efficient, balanced, or
unbalanced from monocular pose alone.

## Recommended terminology

### User-facing name

Use **Contact base** as the working feature name and **Base shape** for the
individual overlay layer.

These names are short and understandable without making the stronger
biomechanical claim implied by “base of support.” If later validation includes
wall calibration, confirmed holds, and a defensible physical model, a more
specific term can be reconsidered.

### State language

Use:

- **4 candidate contacts · quadrilateral**
- **3 candidate contacts · triangle**
- **2 candidate contacts · line**
- **1 candidate contact · point**
- **No reliable contact base**

The contact count and geometric result must remain separate. Four active
contacts do not always create a four-vertex shape: one point can fall inside the
triangle made by the other three, two points can nearly coincide, or the
geometry can be degenerate. In those cases, say, for example,
**4 candidate contacts · triangular hull**.

Do not automatically translate two contacts into **unstable** or four contacts
into **stable**. A two-contact position may be intentional and controlled, while
a four-contact position may still be strenuous or insecure.

### Evidence language

- **Contact candidate:** a wrist or foot endpoint remained sufficiently still
  to be consistent with wall contact.
- **Confirmed contact:** a contact the user has accepted or assigned to a hold.
- **Moving limb:** the endpoint has clear motion evidence.
- **Unknown:** pose coverage or motion evidence is insufficient to decide.
- **Projected contact hull:** the convex hull of usable candidate or confirmed
  points in the upright video image.

“Not moving” and “in contact” must not be synonyms in the data model. A
motionless limb can be hovering, pose can freeze under occlusion, and a real
contact can slide or pivot.

## Proposed presentation

### Video overlay

Render the base behind the skeleton and trails:

- place a small ring at each candidate endpoint;
- draw confirmed contacts with a solid ring and automatic candidates with a
  dashed ring;
- fill a three- or four-vertex hull with a low-opacity neutral or cool tint;
- retain a subtle outline so the shape survives both bright and dark footage;
- render two contacts as a visible line or narrow band;
- render one contact as a single halo;
- omit the shape when evidence is unknown instead of holding the last reliable
  base indefinitely; and
- keep rejected or missing limbs visibly distinct from moving limbs.

The shape should use stabilized contact locations rather than redrawing every
small pose wobble. When a contact is acquired, its displayed anchor can settle
to the robust center of the detection window and remain there until release.
This prevents the polygon from shimmering even though the source landmarks
continue to move by a few pixels.

Contact transitions may use a short crossfade for legibility, but the data must
retain the exact attach/detach timestamps. Do not morph a released point across
the wall or interpolate through an evidence gap.

Avoid traffic-light semantics in the first version. A green quadrilateral and
red line would imply a validated good/bad judgment that the model has not
earned. Contact confidence can instead be expressed through opacity, line
style, and a compact confidence label.

### Timeline companion

The overlay becomes more useful when paired with a small contact-state strip:

- one row for left hand, right hand, left foot, and right foot;
- candidate, confirmed, moving, and unknown intervals;
- attach and detach events;
- a derived contact-count band; and
- markers where hull dimensionality changes.

Selecting a transition should seek to that moment. This provides a fast way to
find the release, travel, catch, and settle phases around a crux without turning
the result into an automatic difficulty score.

### Comparison

In R5/R6 comparison, show each attempt's contact-state strip and let users align
on a confirmed release or catch. Side-by-side base shapes can then reveal beta
differences such as:

- releasing a hand from a three-contact versus four-contact setup;
- using a different foot to preserve a triangular base;
- spending longer in a two-contact phase; or
- rebuilding the next base sooner.

Any language about one beta being easier, safer, or more efficient should remain
a user interpretation unless later validation supports the claim.

## UI concept

Add **Base shape · Experimental** as an independent layer under **Overlay
settings** only after the contact model is available. Keep the ordinary control
to an on/off choice and place detail in progressive disclosure.

Suggested details:

- **Contact source:** Automatic candidates / Confirmed only / Mixed
- **Show:** Shape / Contact points / State label / Timeline
- **Contact sensitivity:** Strict / Balanced / Permissive
- **Shape appearance:** opacity and outline visibility
- **Correct contacts:** opens the editable contact timeline

Do not expose velocity thresholds, jitter radii, or dwell milliseconds in the
ordinary inspector. Those belong in a calibration workspace with a preview and
resettable presets.

On the video, a compact readout could say **3 candidate contacts · triangle**.
Tapping it should explain that contacts are estimated from endpoint stillness
and may be wrong. On mobile, contact correction should live in the Inspect or
Timeline sheet rather than cover the video with permanent controls.

## Detection model

### Inputs

The first prototype can use the accepted left/right wrist and ankle tracks
already present in the product. This is deliberately a concept test, not the
final contact definition.

A later endpoint resolver should evaluate:

- wrist plus hand landmarks for a more representative hand contact point;
- ankle, heel, and foot-index landmarks for a more representative foot point;
- pose acceptance and presence/visibility for every contributing landmark;
- timestamp spacing and honest gaps; and
- a robust body-scale estimate so thresholds are not raw pixels.

The hand/foot resolver must be versioned and preserve its source-landmark
provenance. A wrist is not the exact hand-to-hold contact location, and an ankle
is not the exact shoe-to-hold contact location.

### Jitter-aware contact candidates

Run contact inference as a derived, timestamped analysis over immutable pose
results. Do not modify pose acceptance or reuse the display trail as evidence.

For each limb endpoint:

1. Gather a rolling window of accepted samples with sufficient coverage.
2. Compute a robust window center and jitter estimate, such as median position
   and median absolute deviation.
3. Normalize displacement and speed by a robust torso/body scale and actual
   elapsed presentation time.
4. Enter the candidate state only after both speed and total excursion remain
   below adaptive thresholds for a minimum dwell.
5. Lock the displayed contact anchor to the robust window center.
6. Exit only after a larger displacement or speed threshold persists for a
   shorter release dwell.
7. Return **unknown**, not moving, across long pose gaps or inadequate endpoint
   coverage.

The separate entry and exit thresholds provide hysteresis. The adaptive jitter
floor should tolerate ordinary pose wobble without letting a slowly traveling
hand become a permanent contact. Thresholds need upper bounds so a noisy model
cannot redefine large movement as jitter.

A useful feature vector for calibration includes:

- median and upper-percentile endpoint speed;
- maximum excursion from the robust window center;
- jitter magnitude;
- accepted-data coverage;
- duration below the acquisition threshold;
- distance from the locked anchor after acquisition; and
- agreement among wrist/hand or ankle/foot landmarks.

Centered/offline smoothing may stabilize the displayed shape during review, but
automatic contact evidence should be derived independently and retain its exact
policy version. Excessive smoothing can turn real motion into apparent
stillness.

### Camera motion

Image-space stillness assumes a mostly fixed camera. Panning, zooming, digital
stabilization, and camera shake can make a true wall contact move or make a
moving limb appear stationary relative to the frame.

The prototype should:

- state that it expects a fixed or nearly fixed camera;
- surface low-confidence/unknown intervals when global motion is detected;
- avoid silently compensating from the climber's torso, which moves relative to
  the wall; and
- retain a future path for wall-feature or user-marked-hold stabilization.

Confirmed hold regions are the strongest later reference: a limb associated
with a stationary, mapped hold can remain a confirmed contact even when its
pose endpoint jitters within the hold region.

## Derived geometry

At every pose timestamp:

1. Select usable contacts according to the chosen source mode.
2. Deduplicate nearly coincident projected points.
3. Compute their image-space convex hull.
4. Record both active contact count and hull vertex count.
5. Classify the geometry as polygon, line, point, degenerate, or unavailable.
6. Measure projected area, span, centroid, and orientation only when coverage
   and calibration requirements are met.

The convex hull is preferable to connecting limbs in a fixed anatomical order;
a fixed order can self-intersect as hands and feet cross. Hull area should be
normalized by body scale squared and called **projected base area**, never
physical support area.

Potential derived events include:

- contact acquired or released;
- four-to-three, three-to-two, and reverse transitions;
- large projected-area contraction or expansion;
- base-centroid shift; and
- time spent in each contact-count/hull state.

These are descriptive events. A future crux finder may use them as review
candidates alongside movement speed, pauses, and user checkpoints, but should
not rank risk from base geometry alone.

## Data contract direction

Keep automatic evidence, user confirmation, and geometry separate:

```ts
type ContactState = 'candidate' | 'confirmed' | 'moving' | 'unknown';

interface ContactInterval {
  limb: 'left-hand' | 'right-hand' | 'left-foot' | 'right-foot';
  startTimestampMicroseconds: number;
  endTimestampMicroseconds: number;
  state: ContactState;
  anchor: { x: number; y: number } | null;
  source: 'automatic' | 'user';
  confidence: number | null;
  evidence: {
    coverage: number;
    normalizedSpeed: number | null;
    normalizedExcursion: number | null;
    jitter: number | null;
  };
  endpointResolverVersion: string;
  contactPolicyVersion: string;
}

interface ContactBaseSample {
  timestampMicroseconds: number;
  activeContactCount: number;
  hullVertexCount: number;
  geometry: 'polygon' | 'line' | 'point' | 'degenerate' | 'unavailable';
  hull: Array<{ x: number; y: number }>;
  projectedAreaBodyNormalized: number | null;
  coverage: number;
}
```

Manual edits must be reversible and must never overwrite automatic intervals.
Changing display opacity or visibility must redraw cached geometry without
rerunning pose or contact inference. Changing a contact policy may recompute
derived contacts from the cached accepted/raw pose sequence without rerunning
MediaPipe.

## Validation and calibration plan

Build a small labeled corpus before presenting contact counts as reliable:

- quiet four-contact positions with ordinary pose jitter;
- deliberate three-contact reaches;
- controlled two-contact positions;
- dynamic cuts and catches;
- hand bumps, foot swaps, and grip readjustments;
- foot smears or pivots where contact moves;
- occluded hands and feet;
- camera shake, panning, and stabilization; and
- model failures that freeze or jump an endpoint.

For every limb, label approximate attach/detach intervals and unknown periods.
Measure:

- candidate precision and recall;
- attach/detach timing error;
- false contact caused by hovering or frozen pose;
- false release caused by jitter or occlusion;
- agreement of contact-count transitions;
- coverage and longest unknown gap; and
- correction effort per analyzed move.

Human review should also judge polygon shimmer, transition readability, video
occlusion, and whether the overlay actually helps identify or explain a crux.
Compare shape-only, point-only, and timeline-only presentations before assuming
all three should be enabled together.

## Workshop decisions still open

- Is **Contact base** the clearest name, or does **Base shape** better match how
  climbers naturally describe the idea?
- Should the first prototype use direct wrists/ankles for speed, or wait for
  composite hand/foot endpoints?
- How long must a point dwell before acquisition, and how quickly should a
  release register?
- Should uncertain candidates appear in the hull at reduced opacity or remain
  as unconnected rings?
- Does a line read clearly enough over video, or should two contacts use a
  narrow translucent band?
- When is camera-motion compensation necessary, and can user-marked holds
  provide the reference?
- How much manual correction will climbers tolerate for a more trustworthy
  contact timeline?
- Does projected area add insight beyond count and shape, or imply too much?
- Which transition patterns are genuinely useful for comparing beta?
- Should estimated center of mass be a separate optional layer, with explicit
  geometric-only language, rather than part of Contact base?

## Recommended delivery sequence

1. **Offline visualization prototype:** manually label contact intervals on a
   few clips and test the shape, point, and timeline presentations.
2. **Pose-only candidate detector:** use cached wrist/ankle tracks, adaptive
   jitter handling, hysteresis, confidence, and unknown states.
3. **Calibration workspace:** tune on labeled climbing examples and publish
   versioned Strict, Balanced, and Permissive contact policies.
4. **Editable contact timeline:** let users correct attach/detach events and
   associate confirmed contacts with mapped holds.
5. **Product overlay:** add Contact base as an experimental cached layer with
   mobile-friendly inspection.
6. **Comparison study:** test whether aligned base transitions reveal useful
   beta differences and whether users can identify crux moments faster.

Do not begin with automatic difficulty, exertion, stability, or risk scoring.
The first success criterion is narrower: climbers understand the changing
contact geometry, can spot when it is wrong, and find it useful during review.

# Future pose-correction concepts

**Status:** Contingent product research; not current R2 scope

These concepts could help correct sparse, low-confidence, or visibly wrong pose
data after the automatic acceptance pipeline is trusted. They must never
overwrite raw MediaPipe output or disguise guessed coordinates as observed
measurements.

## Manual armature correction and keyframes

A user could pause on a difficult frame and drag one joint or a linked armature
group onto the visible or inferred body position. Corrected keyframes could
anchor a bounded interpolation between them.

Potential workflow:

1. Flag a wrong or unavailable joint.
2. Drag the joint, limb, or body group to the intended location.
3. Choose whether the correction is visually observed or inferred through
   occlusion.
4. Add another correction keyframe after the failure interval.
5. Preview bounded interpolation and accept, adjust, or remove it.

Required data contract:

- immutable raw pose remains available;
- every correction records user, timestamp, joint, previous value, corrected
  value, and coordinate-space version;
- manual and interpolated points have explicit provenance;
- interpolation never silently crosses an unbounded interval or source change;
- analytics reports separate raw, accepted, manual-corrected, and interpolated
  coverage;
- deleting corrections restores the deterministic automatic result.

This is analogous to lightweight animation/keyframing over source footage. It
could be a premium workflow convenience, but truthful automatic filtering and
basic uncertainty handling remain core product behavior.

## AI-assisted single-frame correction

When a user flags a difficult frame, an optional image model could inspect that
frame and suggest corrected joint positions or identify which automatic points
look inconsistent. The user would review and confirm the suggestion before it
becomes a correction keyframe.

This is a hypothesis, not an assumption that a general image model is more
accurate than MediaPipe. It needs a labeled evaluation on occlusion, crossed
limbs, unusual climbing positions, and motion blur.

Required safeguards:

- operate only on user-selected frames or a tightly bounded neighborhood;
- show suggestions rather than silently changing pose;
- record model/version and suggestion provenance;
- require explicit confirmation for inferred occluded joints;
- retain the original frame pose and make the correction reversible;
- distinguish AI-suggested, user-confirmed, and interpolated data in visuals
  and analytics;
- obtain explicit consent before any frame leaves the device;
- document retention, deletion, compute cost, and privacy if server inference
  is used.

Single-frame assistance may be more economically and technically plausible than
running an expensive image model over an entire video. It could become a
premium feature if evaluation proves a repeatable accuracy advantage and users
value the correction workflow.

## Validation before product work

- Build a small set of user-flagged failure frames with human-confirmed joints.
- Compare MediaPipe Lite, MediaPipe Full, manual correction, and candidate image
  models against those labels.
- Measure correction time, user agreement, residual error, and whether bounded
  interpolation improves playback without false confidence.
- Do not use corrected or interpolated tracks for metrics until their
  provenance and coverage rules are explicit.

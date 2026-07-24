# Human pose-quality calibration guide

Use this worksheet to decide whether Balanced v1 should remain the default or
be revised. The goal is not maximum coverage. The goal is to show trustworthy
motion, hide obviously wrong geometry, and avoid visible smoothing lag.

## Recommended investment

Spend one focused 45–60 minute session now. Human review is valuable because
coverage and confidence scores cannot tell whether a hand or foot looks right.
Do not freely tweak every control. Label the baseline first, change one setting
family at a time, and keep a change only when it improves more than one clip
without creating a new problem.

Use MediaPipe Lite and the Display policy for this pass. Do not evaluate Full or
change the Analytics policy unless the Display policy is already satisfactory.

## Controls in plain language

### Starting choices

| Control | Meaning | Recommendation |
|---|---|---|
| Pose quality | Strict rejects more, Balanced is the proposed default, and Permissive retains more uncertain points. | Start with Balanced. Compare the other presets only after labeling Balanced. |
| Inference model | Lite or Full generates the raw pose. Changing it clears the raw cache and requires analysis again. | Keep Lite. Full did not improve the bounded comparison. |
| Policy target | Display favors a stable, useful overlay. Analytics is stricter and unsmoothed for future measurements. | Calibrate Display first. Leave Analytics unchanged for now. |
| Overlay preview | Raw model shows everything; Accepted raw shows retained points before smoothing; Rejected adds rejected points; Smoothed shows the final display. | Compare all four views at the same moment. |

In the Rejected preview, amber points failed confidence checks and pink points
failed motion-plausibility checks.

### Confidence controls

MediaPipe confidence is a clue, not proof that a point is correct.

| Control | What increasing it does | Use it when |
|---|---|---|
| Visibility | Requires the model to be more confident that the joint is visibly located. More points disappear. | Occluded or crossed limbs produce bad points. |
| Presence | Requires more confidence that the joint is present in the frame. More points disappear. | A joint near/outside the frame is being invented. |
| Global confidence | Changes the fallback for every joint. | Only when the same problem affects most body groups. |
| Body-group override | Changes one group such as wrists/hands or ankles/feet. | Preferred first adjustment for a repeated group-specific problem. |
| Joint override | Changes one exact left/right landmark. | Only for a repeated single-joint bias across several clips. |

Threshold precedence is `joint override > body-group override > global`.
Increase or decrease confidence in `0.05` steps.

### Continuity and plausibility

| Control | What increasing it does | Practical interpretation |
|---|---|---|
| Confidence hysteresis | Turns separate acquire/keep rules on. | Usually leave enabled. It prevents a marginal joint from blinking every frame. |
| Acquire delta | Makes a missing joint harder to acquire or reacquire. | Raise slightly if weak points appear for one frame; lower if good joints return too slowly. |
| Keep delta | Values are negative. A more-negative value makes an already accepted joint easier to retain. | Make slightly more negative to reduce confidence flicker; move toward zero if marginal joints linger. |
| Max body lengths/sec | Allows faster joint movement before velocity rejection. | Raise if a correct dyno/reach is rejected; lower if impossible teleports survive. |
| Max acceleration | Allows sharper changes in joint velocity. | Raise if correct explosive motion is rejected; lower if one-frame direction changes survive. |
| Max segment change | Allows more change in a limb segment's apparent length. | Raise for valid perspective changes; lower when an arm or leg visibly stretches or collapses. |

Adjust temporal limits by roughly 10–15% per iteration. Lower limits reject more;
higher limits retain more.

### Smoothing

Smoothing never fills a rejected gap. Compare Accepted raw with Smoothed.

| Control | What increasing it does | Use it when |
|---|---|---|
| Minimum cutoff | Makes slow movement more responsive and less smoothed. | Raise by about `0.2` if the whole skeleton feels delayed; lower if slow/still pose jitters. |
| Speed coefficient | Makes the filter follow fast movement more quickly. | Raise by about `0.1` if hands/feet lag during fast moves; lower if fast motion remains too nervous. |

Do not judge smoothing from a paused frame alone. Play or scrub through the move.

## Measurements in plain language

| Measurement | Meaning | How to use it |
|---|---|---|
| Accepted coverage | Accepted joint slots divided by every scheduled joint slot, including model-empty moments. | Context only. Higher can mean more useful motion or more bad points. |
| Group coverage | Accepted coverage for each body group. | Find groups being removed much more than others. |
| Confidence rejects | Joint slots removed by visibility or presence. | Expect this to rise when confidence thresholds rise. |
| Temporal rejects | Joint slots removed for isolated jumps, velocity, acceleration, or segment-length change. | Inspect visually; a small count can be useful, but every rejected valid fast limb matters. |
| Flicker events | Short per-joint loss followed by reacquisition. | Lower is generally better, but this is not the previously reported whole-pose flicker diagnostic. |
| Longest gap | Longest time any joint remained unavailable. | Use with the selected joint and group coverage; one permanently hidden joint can dominate it. |
| Mean smoothing shift | Average normalized distance between accepted raw and smoothed points. | Compare iterations. A larger value usually means more smoothing/lag, not necessarily worse output. |
| Mean inference | Model computation time per stored sample. | Performance information, not a calibration target. |
| Mean timestamp error | Difference between requested and actual video presentation time. | Timing-health information, not a confidence-setting target. |
| Model-empty samples | Frames where MediaPipe returned no pose at all. | Filters cannot repair these; treat them as honest gaps. |
| Current joint status | Accepted, rejected, or missing, plus visibility, presence, and rejection reasons at the playhead. | Use this to understand one questionable point. |
| Retained usable | Fraction of your `usable` labels that the policy keeps. | Primary protection against over-filtering. |
| False visible | Fraction of `wrong`, `swapped`, or `unavailable` labels that the policy still shows. | Primary protection against confident-looking bad geometry. |

## Straightforward calibration session

### 1. Choose three ranges

Use one five-second range from each category:

1. Clean/slower movement as a control.
2. Fast reach, dyno, or foot cut.
3. Occlusion, crossed limbs, or overhang.

Include portrait and landscape footage if possible.

### 2. Record the untouched baseline

For each range:

1. Select Lite, Display, and Balanced.
2. Analyze once.
3. Compare Raw model, Accepted raw, Rejected, and Smoothed.
4. At four useful moments, inspect both wrists and both ankles.
5. Label each inspected joint `usable`, `wrong`, `swapped`, or `unavailable`.
6. Export the calibration JSON **before replacing the video**. Labels are
   session-only and source replacement clears them.

This produces about 48 labels across three clips.

### 3. Tune confidence first

- If a wrong point is accepted and its visibility/presence is low, raise that
  body group's threshold by `0.05`.
- If a usable point is rejected for visibility/presence, lower that body
  group's threshold by `0.05`.
- Prefer a group change over global or single-joint changes.
- Recheck all three cached ranges before keeping the change.

### 4. Tune temporal limits second

- If a correct fast point is pink/rejected, raise the relevant speed,
  acceleration, or segment-change limit by 10–15%.
- If an obvious high-confidence teleport or stretching limb survives, lower the
  relevant limit by 10–15%.
- Change only one temporal control per iteration.

### 5. Tune smoothing third

- If Smoothed trails Accepted raw during fast movement, first raise Speed
  coefficient by `0.1`.
- If slow/still pose jitters, lower Minimum cutoff by `0.2`.
- If the whole skeleton feels delayed, raise Minimum cutoff by `0.2`.
- Keep the smallest change that is visibly helpful.

### 6. Touch hysteresis only if needed

- For repeated one-frame confidence blinking, make Keep delta `0.02` more
  negative.
- If good joints reacquire too slowly, lower Acquire delta by `0.01–0.02`.
- Revert if weak joints begin lingering.

### 7. Decide

Use these provisional acceptance targets:

- Retained usable: at least 90%.
- False visible: at most 5%, ideally 0% for obvious wrong/swapped geometry.
- No repeated visible hand/foot lag in Smoothed.
- No change justified by only one isolated frame.
- A new default should improve at least two ranges without clearly harming the
  third.

If no change meets that bar, keep Balanced v1 and document the remaining model
limitation instead of overfitting the filters.

## Findings worksheet

### Session

- Reviewer:
- Date:
- Device/browser:
- Build/commit:
- Overall verdict: keep Balanced v1 / revise / needs more evidence

### Baseline ranges

| Clip | Range | Why selected | Usable labels | Wrong | Swapped | Unavailable | Retained usable | False visible | Main visual issue |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
|  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |

### Questionable moments

| Clip/time | Joint | Raw observation | Accepted/rejected reason | Smoothed observation | Human label | Expected behavior |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |

### Change log

Record one changed value per row.

| Iteration | Single change | Before → after | Coverage | Retained usable | False visible | Visual result across clips | Keep/revert |
|---|---|---|---:|---:|---:|---|---|
| Baseline | Balanced v1 unchanged | — |  |  |  |  | Keep |
|  |  |  |  |  |  |  |  |

### Final recommendation

- Selected preset/values:
- Evidence that improved:
- Regressions checked:
- Known failures that remain:
- Should Lite remain the default:
- Should Analytics be calibrated next:
- Exported JSON filenames:

# Human pose-quality calibration guide

Use this worksheet to decide whether Balanced v2 should remain the default or
be revised. The goal is not maximum coverage. The goal is to show trustworthy
motion, hide obviously wrong geometry, and avoid visible smoothing lag.

Record live observations in
[`pose-quality-human-calibration-findings.md`](./pose-quality-human-calibration-findings.md).

**Current display decision:** Human review selected Centered offline at its
default `66.667 ms` radius as the best-looking option. It is now the display
default. The next broader comparison with Accepted raw and One Euro is deferred
until the main overlay feature set is available; retain exact analyzed frames
for checking anticipation and boundary artifacts then.

## Recommended investment

Do not schedule another focused calibration session yet. The current result is
adequate for feature work, and selectable trails are making failures easier to
judge. Reuse this protocol after the main overlay feature set is present.
Human review remains necessary because coverage and confidence scores cannot
tell whether a hand or foot looks right. When the pass resumes, label the
baseline first, change one setting family at a time, and keep a change only when
it improves more than one clip without creating a new problem.

Begin that pass with the explicit preference that false visible joint positions
are more distracting than honest missing positions, especially for limbs.
Test a generally stricter policy before relaxing individual groups, and include
candidate **Extra Strict** and **Extra Permissive** presets alongside the
current Strict, Balanced, and Permissive choices.

Use MediaPipe Full and the Display policy for this pass. Full is now the product
default after human comparison found noticeably better pose quality without a
large analysis-time increase. Keep Lite only as a faster comparison. Do not
change the Analytics policy unless the Display policy is already satisfactory.

The selectable range can now be up to 60 seconds, but calibration comparisons
should still use focused five-second sections. Analyze each model/range once
and compare settings over that cached raw result. Re-running inference creates
a fresh MediaPipe video session, so separate analyses are not a controlled
settings comparison. The captured range-start-sensitive raw flicker was fixed
in source-frame lookup and did not require display interpolation.

## Controls in plain language

### Starting choices

| Control | Meaning | Recommendation |
|---|---|---|
| Pose quality | Strict rejects more, Balanced is the proposed default, and Permissive retains more uncertain points. | Start with Balanced. Compare the other presets only after labeling Balanced. |
| Inference model | Full or Lite generates the raw pose. Changing it clears the raw cache and requires analysis again. | Start with Full. It is the human-selected quality default; Lite remains the faster alternative. |
| Policy target | Display favors a stable, useful overlay. Analytics is stricter and unsmoothed for future measurements. | Calibrate Display first. Leave Analytics unchanged for now. |
| Overlay preview | Raw model shows everything; Accepted raw shows retained points before smoothing; Rejected adds rejected points; One Euro smoothed is causal; Centered offline is the future-aware display default. | Compare Accepted raw, One Euro smoothed, and Centered offline at the same exact frames. |
| Frame seeker | The ordinary previous/next seeker remains visible in calibration; its center readout becomes an editable analyzed-sample number and shows the exact presentation timestamp. Outside analyzed coverage it is labeled Estimated and steps by the source's average frame rate. | Use exact mode for repeatable same-frame smoothing checks. Estimated mode is a navigation proxy, not an analyzed or guaranteed source frame. |
| Global undo / redo | Reverts or reapplies the last user-authored edit in the source session, including calibration settings, model choice, and labels. Slider/number edits coalesce after 750 ms idle. Frame and timeline seeking are navigation and are not included. | Use the global header buttons or `Cmd/Ctrl+Z`; redo with `Cmd/Ctrl+Shift+Z` or `Ctrl+Y`. |

The advanced setting families—Global confidence, Body-group override, Joint
override and inspection, Continuity and plausibility, and Segment-local
smoothing—are independently collapsible. Keep only the family currently being
tested open.

The One Euro smoothed preview is unavailable whenever One Euro display
smoothing is off. Centered offline remains available because it is independent
of the causal One Euro policy. Accepted raw deliberately bypasses both filters.

In the Rejected preview, amber points failed confidence checks and pink points
failed motion-plausibility checks.

### Confidence controls

MediaPipe confidence is a clue, not proof that a point is correct.
Calibration covers the 23 landmarks Crux Vision actually draws or uses for
derived trails: the nose plus shoulders through feet. The 10 additional
MediaPipe eye, ear, and mouth landmarks remain in raw provenance only and do not
affect controls or metrics.

| Control | What increasing it does | Use it when |
|---|---|---|
| Visibility | Requires the model to be more confident that the joint is visibly located. More points disappear. | Occluded or crossed limbs produce bad points. |
| Presence | Requires more confidence that the joint is present in the frame. More points disappear. | A joint near/outside the frame is being invented. |
| Global confidence | Changes the fallback for every joint. | Only when the same problem affects most body groups. |
| Body-group override | Changes one group such as wrists/hands or ankles/feet. | Preferred first adjustment for a repeated group-specific problem. |
| Joint override | Changes one exact left/right landmark. | Only for a repeated single-joint bias across several clips. |

Threshold precedence is `joint override > body-group override > global`.
The developer controls expose the full `0–1` confidence domain in `0.01` steps.
Use `0` and `1` as diagnostic extremes, not likely product defaults.

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

Acquire delta exposes its full effective `0–1` range and Keep delta exposes
`-1–0`; confidence math clamps at the valid `0–1` boundary. The nonnegative
speed, acceleration, and segment-change controls have no artificial upper limit.
Only finite values are accepted.

### Smoothing

Neither smoother fills a rejected gap.

| Control | What increasing it does | Use it when |
|---|---|---|
| Minimum cutoff | Makes slow movement more responsive and less smoothed. | Raise by about `0.2` if the whole skeleton feels delayed; lower if slow/still pose jitters. |
| Speed coefficient | Makes the filter follow fast movement more quickly. | Raise by about `2` if hands/feet lag during fast moves; lower if fast motion remains too nervous. Balanced v2 starts at `12`. |
| Centered radius (ms) | Widens the symmetric time window, usually removing more jitter but increasing the chance of visible pre-motion anticipation. | Keep the selected default `66.667 ms` unless multi-clip evidence justifies a change. `0` exactly matches Accepted raw. |

Do not judge smoothing from a paused frame alone. Play or scrub through the move.
Minimum cutoff and Speed coefficient accept any finite nonnegative value. Very
large values approach the raw signal rather than producing proportionally more
useful responsiveness.

Centered offline is a timestamp-weighted moving average over accepted points
before and after the current presentation time. It integrates the
piecewise-linear track over a symmetric window, shrinks that window evenly near
segment boundaries, and becomes Accepted raw at the boundary itself. It never
crosses a rejected point, non-monotonic timestamp, or oversized smoothing gap.
It can remove causal trailing, but it can make a joint begin moving slightly
before the raw track; that anticipation is the main failure to inspect.

## Measurements in plain language

| Measurement | Meaning | How to use it |
|---|---|---|
| Accepted coverage | Accepted product-joint slots divided by all 23 scheduled product-joint slots, including model-empty moments. | Context only. Higher can mean more useful motion or more bad points. |
| Group coverage | Accepted coverage for each body group. | Find groups being removed much more than others. |
| Confidence rejects | Joint slots removed by visibility or presence. | Expect this to rise when confidence thresholds rise. |
| Temporal rejects | Joint slots removed for isolated jumps, velocity, acceleration, or segment-length change. | Inspect visually; a small count can be useful, but every rejected valid fast limb matters. |
| Flicker events | Short per-joint loss followed by reacquisition. | Lower is generally better, but this is not the previously reported whole-pose flicker diagnostic. |
| Longest product-joint gap | Longest rejected interval for one used joint, with the responsible joint named. | Shows persistent loss of a specific useful joint; it does not mean the whole pose vanished. |
| Longest whole-pose gap | Longest interval with no accepted product joint. | Use this to distinguish a true pose-wide outage from one missing limb. |
| Mean One Euro shift | Average normalized distance between Accepted raw and One Euro smoothed points. | Compare iterations. A larger value usually means more smoothing/lag, not necessarily worse output. |
| Mean centered shift | Average normalized distance between Accepted raw and Centered offline points. | Compare radius choices; it measures coordinate change, not whether timing looks better. |
| Mean inference | Model computation time per stored sample. | Performance information, not a calibration target. |
| Mean timestamp error | Difference between requested and actual video presentation time. | Timing-health information, not a confidence-setting target. |
| Model-empty samples | Frames where MediaPipe returned no pose at all. | Filters cannot repair these; treat them as honest gaps. |
| Current joint status | Accepted, rejected, or missing, plus visibility, presence, and rejection reasons at the playhead. | Use this to understand one questionable point. |
| Retained usable | Fraction of your `usable` labels that the policy keeps. | Primary protection against over-filtering. |
| False visible | Fraction of `wrong`, `swapped`, or `unavailable` labels that the policy still shows. | Primary protection against confident-looking bad geometry. |

## Short glossary

- **One Euro:** An adaptive smoothing filter. It smooths small/slow jitter but
  tries to follow fast motion more closely. It can still introduce visible
  delay when its responsiveness is too low.
- **Centered offline:** A non-causal filter for recorded footage that uses
  accepted points on both sides of the current timestamp. It can avoid
  systematic trailing but may anticipate motion.
- **Non-monotonic:** A timestamp that repeats or moves backward instead of
  strictly advancing. Smoothing resets rather than connecting across it.
- **Distal segment:** A limb section farther from the torso, such as
  elbow-to-wrist or knee-to-ankle.
- **Derivative cutoff:** An internal One Euro value controlling how much the
  estimated movement speed itself is smoothed. Balanced fixes it at `1.0`; it
  is not currently a UI control.
- **Reacquisition event:** A joint becomes accepted again after an unavailable
  or rejected gap. A very short loss/reacquisition can look like blinking.
- **Corpus:** The collection of representative videos and ranges used for
  calibration.
- **Provenance:** A record of where a point came from. For example, a hip
  midpoint records that it was derived from the accepted left and right hips
  using a named algorithm version.
- **Accepted availability:** The fraction of joint/time slots retained by a
  policy. It measures available data, not whether those points are correct.

## Straightforward calibration session

### 1. Choose three ranges

Use one five-second range from each category:

1. Clean/slower movement as a control.
2. Fast reach, dyno, or foot cut.
3. Occlusion, crossed limbs, or overhang.

Include portrait and landscape footage if possible.

### 2. Record the untouched baseline

For each range:

1. Select Full, Display, and Balanced.
2. Analyze once.
3. Compare Raw model, Accepted raw, Rejected, One Euro smoothed, and Centered
   offline.
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

- If One Euro smoothed trails Accepted raw during fast movement, first raise Speed
  coefficient by `2`.
- If slow/still pose jitters, lower Minimum cutoff by `0.2`.
- If the whole skeleton feels delayed, raise Minimum cutoff by `0.2`.
- Keep the smallest change that is visibly helpful.

Before changing One Euro broadly, run this centered comparison:

1. At the same exact analyzed frames, inspect motion onset, fastest motion,
   stopping/landing, and the first frame after a rejected gap.
2. Compare Accepted raw, One Euro smoothed, and Centered offline at the default
   `66.667 ms` radius.
3. If needed, test only `33.333 ms` and `100 ms`; change no other setting.
4. Reject a radius if it shows pre-motion anticipation, stop/landing overshoot,
   or any pull across a gap.
5. Prefer Centered offline only if it removes visible trailing while retaining
   useful jitter reduction on at least two clips.

### 6. Touch hysteresis only if needed

- For repeated one-frame confidence blinking, make Keep delta `0.02` more
  negative.
- If good joints reacquire too slowly, lower Acquire delta by `0.01–0.02`.
- Revert if weak joints begin lingering.

### 7. Decide

Use these provisional acceptance targets:

- Retained usable: at least 90%.
- False visible: at most 5%, ideally 0% for obvious wrong/swapped geometry.
- No repeated visible hand/foot lag in the selected display smoother.
- No visible pre-motion anticipation if Centered offline is selected.
- No change justified by only one isolated frame.
- A new default should improve at least two ranges without clearly harming the
  third.

If no change meets that bar, keep Balanced v2 and document the remaining model
limitation instead of overfitting the filters.

## Findings worksheet

### Session

- Reviewer:
- Date:
- Device/browser:
- Build/commit:
- Overall verdict: keep Balanced v2 / revise / needs more evidence

### Baseline ranges

| Clip | Range | Why selected | Usable labels | Wrong | Swapped | Unavailable | Retained usable | False visible | Main visual issue |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
|  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |

### Questionable moments

| Clip/time | Joint | Accepted raw | One Euro smoothed | Centered offline + radius | Human verdict / failure |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

### Change log

Record one changed value per row.

| Iteration | Single change | Before → after | Coverage | Retained usable | False visible | Visual result across clips | Keep/revert |
|---|---|---|---:|---:|---:|---|---|
| Baseline | Balanced v2 unchanged | — |  |  |  |  | Keep |
|  |  |  |  |  |  |  |  |

### Final recommendation

- Selected preset/values:
- Evidence that improved:
- Regressions checked:
- Known failures that remain:
- Should Full remain the default:
- Should Analytics be calibrated next:
- Exported JSON filenames:

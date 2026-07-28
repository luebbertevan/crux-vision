# Settings and edit-history contract

**Status:** Active product and implementation contract

Crux Vision exposes one session-wide **Undo / Redo** control in the global
header. History is not owned by Pose quality calibration or by any other menu.
The same stack is available through `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, and
`Ctrl+Y`. Native text-field undo keeps priority while a text or number editor
has focus; the visible global controls remain available.

## What participates

History covers user-authored settings and durable in-session review edits:

| Surface | Undoable changes |
|---|---|
| Clip selection | Analysis start/end, playback speed, selected-range loop |
| Checkpoints | Add, rename, remove; removing and restoring a checkpoint also removes/restores dependent trail ranges atomically |
| Movement overlay | Overlay master; skeleton/trail layers; trail source add/remove and visibility; color, width, tail opacity, duration, timing mode, checkpoint-range endpoints/visibility/add/remove; per-source and all-trail resets |
| Pose quality | Preset, display/analytics target, preview, global/group/joint thresholds and overrides, hysteresis, temporal plausibility, One Euro settings, centered radius, and preset reset |
| Calibration evidence | Inference-model choice and manual label set/replace/clear |

Changing the analysis range or inference model still cancels and clears
incompatible pose analysis. Undo restores the previous setting (and, for a
model edit, its manual labels), but it does not pretend to resurrect discarded
inference results; analysis must be run again.

## What does not participate

Transient navigation and commands do not enter edit history:

- play/pause, timeline scrubbing, frame stepping, exact-frame entry, and
  checkpoint navigation;
- opening or closing disclosures and choosing which trail/group/joint editor is
  currently in view;
- analyze, resume, start over, cancel, export, copy diagnostics, and dismiss
  error;
- analysis progress, pose feedback, and other system-produced state.

Importing or replacing a video begins a new source session and clears both undo
and redo. Source replacement itself is not undoable because browser file access,
object URLs, decoded media state, and inference caches cannot be restored as one
honest local edit.

## Step boundaries

The stack is bounded to 100 entries. A new edit after undo clears redo.

- Discrete actions are always separate steps, even when repeated quickly.
- Continuous controls opt into coalescing with a stable per-control key.
  Consecutive events from the same slider, numeric field, or checkpoint-name
  edit remain one step while less than 750 ms apart. After 750 ms idle, the
  next edit starts another step.
- Coalescing retains the value from before the first event, so one undo returns
  a dragged slider to its pre-drag value rather than visiting every sampled
  position.
- One user action that changes related state must use one atomic snapshot.
  Checkpoint deletion plus dependent trail-range cleanup is the current example.

## Requirement for future settings

Every new user-facing setting or durable in-session edit must prescribe its
undo/redo behavior as part of the feature—not as follow-up polish:

1. Include it in the shared session history by default.
2. Give the edit a stable key and a concise user-facing label.
3. Declare whether it is discrete or continuous; continuous controls must
   define an intentional coalescing boundary.
4. Snapshot all coupled state atomically and clone nested mutable data.
5. If it is excluded, document the concrete reason using the navigation,
   command, system-state, or non-restorable session-boundary categories above.
6. Test undo, redo, redo invalidation, coalescing where applicable, and source
   replacement behavior.

Feature documentation and acceptance criteria must link back to this contract
when adding settings.

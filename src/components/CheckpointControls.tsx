import { formatTime } from './RangeSelector';
import {
  CheckpointIcon,
  CloseIcon,
  NextFrameIcon,
  PreviousFrameIcon,
} from './Icons';

export type ReviewCheckpoint = {
  id: number;
  name: string;
  timestampMicroseconds: number;
};

type CheckpointControlsProps = {
  checkpoints: readonly ReviewCheckpoint[];
  currentCheckpointIndex: number | null;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onAdd: () => void;
  onSelect: (index: number) => void;
  onRename: (id: number, name: string) => void;
  onRemove: (id: number) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function CheckpointControls({
  checkpoints,
  currentCheckpointIndex,
  canGoPrevious,
  canGoNext,
  onAdd,
  onSelect,
  onRename,
  onRemove,
  onPrevious,
  onNext,
}: CheckpointControlsProps) {
  return (
    <section
      className="checkpoint-panel"
      aria-labelledby="checkpoint-title"
      data-testid="checkpoint-controls"
      data-checkpoint-count={checkpoints.length}
      data-current-checkpoint-index={currentCheckpointIndex ?? ''}
    >
      <div className="checkpoint-heading">
        <div>
          <span className="section-kicker">Review marks</span>
          <h3 id="checkpoint-title">Checkpoints</h3>
        </div>
        <button
          type="button"
          className="checkpoint-add"
          title="Add checkpoint at playhead (C)"
          onClick={onAdd}
        >
          <CheckpointIcon size={16} />
          Add
        </button>
      </div>

      {checkpoints.length === 0 ? (
        <p className="checkpoint-empty">
          Mark a move, then return to it in one tap.
        </p>
      ) : (
        <>
          <div
            className="checkpoint-navigation"
            role="group"
            aria-label="Checkpoint navigation"
          >
            <button
              type="button"
              aria-label="Previous checkpoint"
              title="Previous checkpoint (Shift + Left arrow)"
              disabled={!canGoPrevious}
              onClick={onPrevious}
            >
              <PreviousFrameIcon size={17} />
              <span>Previous</span>
            </button>
            <output aria-live="polite">
              {currentCheckpointIndex === null
                ? `${checkpoints.length} saved`
                : `${currentCheckpointIndex + 1} / ${checkpoints.length}`}
            </output>
            <button
              type="button"
              aria-label="Next checkpoint"
              title="Next checkpoint (Shift + Right arrow)"
              disabled={!canGoNext}
              onClick={onNext}
            >
              <span>Next</span>
              <NextFrameIcon size={17} />
            </button>
          </div>

          <div className="checkpoint-list">
            {checkpoints.map((checkpoint, index) => (
              <div
                key={checkpoint.id}
                className={
                  index === currentCheckpointIndex
                    ? 'checkpoint-row is-current'
                    : 'checkpoint-row'
                }
              >
                <button
                  type="button"
                  className="checkpoint-time"
                  aria-label={`Go to ${checkpoint.name || `Checkpoint ${index + 1}`}`}
                  onClick={() => onSelect(index)}
                >
                  {formatTime(checkpoint.timestampMicroseconds / 1_000_000)}
                </button>
                <label>
                  <span className="sr-only">{`Checkpoint ${index + 1} name`}</span>
                  <input
                    aria-label={`Checkpoint ${index + 1} name`}
                    value={checkpoint.name}
                    maxLength={48}
                    onChange={(event) =>
                      onRename(checkpoint.id, event.currentTarget.value)
                    }
                    onBlur={(event) => {
                      if (!event.currentTarget.value.trim()) {
                        onRename(checkpoint.id, `Checkpoint ${index + 1}`);
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="checkpoint-remove"
                  aria-label={`Remove ${checkpoint.name || `Checkpoint ${index + 1}`}`}
                  onClick={() => onRemove(checkpoint.id)}
                >
                  <CloseIcon size={15} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <span className="checkpoint-shortcut">C add · Shift + ← → navigate</span>
    </section>
  );
}

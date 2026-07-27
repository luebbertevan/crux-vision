import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import {
  LoopIcon,
  NextFrameIcon,
  PreviousFrameIcon,
} from './Icons';

export const REVIEW_PLAYBACK_RATES = [0.25, 0.5, 1] as const;
export const FRAME_HOLD_DELAY_MILLISECONDS = 350;
export const FRAME_HOLD_INTERVAL_MILLISECONDS = 100;

type PrecisionReviewControlsProps = {
  playbackRate: number;
  loopEnabled: boolean;
  analyzedFrameCount: number;
  currentFrameIndex: number | null;
  canStepPrevious: boolean;
  canStepNext: boolean;
  frameStepMode: 'analyzed' | 'estimated';
  previousFrameStepMode: 'analyzed' | 'estimated';
  nextFrameStepMode: 'analyzed' | 'estimated';
  estimatedFrameRate: number;
  exactFrameEditing?: boolean;
  currentFrameTimestampMicroseconds?: number | null;
  onPlaybackRateChange: (rate: number) => void;
  onLoopToggle: () => void;
  onPreviousFrame: () => void;
  onNextFrame: () => void;
  onExactFrameChange?: (frameIndex: number) => void;
};

const speedLabel = (rate: number) =>
  rate === 0.25 ? '¼×' : rate === 0.5 ? '½×' : '1×';

function useFrameHold(
  onStep: () => void,
  disabled: boolean,
) {
  const onStepRef = useRef(onStep);
  const holdTimeoutRef = useRef<number | null>(null);
  const repeatIntervalRef = useRef<number | null>(null);
  const repeatResetRef = useRef<number | null>(null);
  const repeatedRef = useRef(false);
  const [repeating, setRepeating] = useState(false);
  onStepRef.current = onStep;

  const clearTimers = useCallback(() => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (repeatIntervalRef.current !== null) {
      window.clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
    if (repeatResetRef.current !== null) {
      window.clearTimeout(repeatResetRef.current);
      repeatResetRef.current = null;
    }
    setRepeating(false);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (disabled) {
      clearTimers();
      repeatedRef.current = false;
    }
  }, [clearTimers, disabled]);

  const start = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (
        disabled ||
        (event.pointerType === 'mouse' && event.button !== 0)
      ) {
        return;
      }
      clearTimers();
      repeatedRef.current = false;
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic and already-cancelled pointers may not be capturable.
      }
      holdTimeoutRef.current = window.setTimeout(() => {
        repeatedRef.current = true;
        setRepeating(true);
        onStepRef.current();
        repeatIntervalRef.current = window.setInterval(
          () => onStepRef.current(),
          FRAME_HOLD_INTERVAL_MILLISECONDS,
        );
      }, FRAME_HOLD_DELAY_MILLISECONDS);
    },
    [clearTimers, disabled],
  );

  const stopAfterPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      try {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        }
      } catch {
        // The browser may have released capture while cancelling a gesture.
      }
      clearTimers();
      repeatResetRef.current = window.setTimeout(() => {
        repeatedRef.current = false;
        repeatResetRef.current = null;
      }, 0);
    },
    [clearTimers],
  );

  const cancel = useCallback(() => {
    clearTimers();
    repeatedRef.current = false;
  }, [clearTimers]);

  const click = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (repeatedRef.current) {
        event.preventDefault();
        event.stopPropagation();
        repeatedRef.current = false;
        return;
      }
      onStepRef.current();
    },
    [],
  );

  return {
    repeating,
    handlers: {
      onClick: click,
      onPointerDown: start,
      onPointerUp: stopAfterPointerUp,
      onPointerCancel: cancel,
      onLostPointerCapture: clearTimers,
      onPointerLeave: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.pointerType === 'mouse' && event.buttons !== 0) cancel();
      },
    },
  };
}

export function PrecisionReviewControls({
  playbackRate,
  loopEnabled,
  analyzedFrameCount,
  currentFrameIndex,
  canStepPrevious,
  canStepNext,
  frameStepMode,
  previousFrameStepMode,
  nextFrameStepMode,
  estimatedFrameRate,
  exactFrameEditing = false,
  currentFrameTimestampMicroseconds = null,
  onPlaybackRateChange,
  onLoopToggle,
  onPreviousFrame,
  onNextFrame,
  onExactFrameChange,
}: PrecisionReviewControlsProps) {
  const previousHold = useFrameHold(onPreviousFrame, !canStepPrevious);
  const nextHold = useFrameHold(onNextFrame, !canStepNext);
  const [exactFrameDraft, setExactFrameDraft] = useState('');
  const estimatedFrameRateLabel = estimatedFrameRate
    .toFixed(2)
    .replace(/\.?0+$/, '');

  useEffect(() => {
    if (!exactFrameEditing) return;
    setExactFrameDraft(
      currentFrameIndex === null ? '' : String(currentFrameIndex + 1),
    );
  }, [currentFrameIndex, exactFrameEditing]);

  const commitExactFrame = (event?: FormEvent) => {
    event?.preventDefault();
    if (!onExactFrameChange || analyzedFrameCount === 0) return;
    if (exactFrameDraft.trim() === '') {
      setExactFrameDraft(
        currentFrameIndex === null ? '' : String(currentFrameIndex + 1),
      );
      return;
    }
    const requestedFrame = Math.round(Number(exactFrameDraft));
    if (!Number.isFinite(requestedFrame)) {
      setExactFrameDraft(
        currentFrameIndex === null ? '' : String(currentFrameIndex + 1),
      );
      return;
    }
    const frameIndex = Math.min(
      analyzedFrameCount - 1,
      Math.max(0, requestedFrame - 1),
    );
    setExactFrameDraft(String(frameIndex + 1));
    onExactFrameChange(frameIndex);
  };

  const frameReadout =
    frameStepMode === 'estimated'
      ? 'Estimated'
      : currentFrameIndex === null
        ? `${analyzedFrameCount} ready`
        : `${currentFrameIndex + 1} / ${analyzedFrameCount}`;
  const frameReadoutDetail =
    frameStepMode === 'estimated'
      ? `≈ ${estimatedFrameRateLabel} fps proxy`
      : 'Hold · 5/sec';

  return (
    <div
      className="precision-review"
      data-testid="precision-review-controls"
      data-frame-count={analyzedFrameCount}
      data-current-frame-index={currentFrameIndex ?? ''}
      data-frame-step-mode={frameStepMode}
      data-estimated-frame-rate={estimatedFrameRate}
    >
      <div className="precision-speed-row">
        <span className="precision-label">Speed</span>
        <div className="speed-presets" role="group" aria-label="Playback speed">
          {REVIEW_PLAYBACK_RATES.map((rate, index) => (
            <button
              key={rate}
              type="button"
              aria-label={`Play at ${rate}× speed`}
              aria-pressed={playbackRate === rate}
              title={`Playback speed ${rate}× (${index + 1})`}
              onClick={() => onPlaybackRateChange(rate)}
            >
              {speedLabel(rate)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="loop-button"
          aria-label="Loop analysis range"
          aria-pressed={loopEnabled}
          title="Loop analysis range (L)"
          onClick={onLoopToggle}
        >
          <LoopIcon size={16} />
          <span>Loop</span>
        </button>
      </div>

      <div className="frame-step-row" role="group" aria-label="Frame navigation">
        <button
          type="button"
          className={previousHold.repeating ? 'is-repeating' : undefined}
          aria-label={`Previous ${previousFrameStepMode} frame`}
          title={`Previous ${previousFrameStepMode} frame · Hold for rapid jog (Left arrow)`}
          disabled={!canStepPrevious}
          data-hold-repeating={previousHold.repeating ? 'true' : 'false'}
          {...previousHold.handlers}
        >
          <PreviousFrameIcon />
          <span>Previous</span>
        </button>
        {exactFrameEditing ? (
          <form
            className="frame-step-readout frame-step-editor"
            data-testid="calibration-frame-navigator"
            data-frame-index={currentFrameIndex ?? ''}
            data-frame-timestamp-microseconds={
              currentFrameTimestampMicroseconds ?? ''
            }
            onSubmit={commitExactFrame}
          >
            <label>
              <span className="sr-only">Exact analyzed frame</span>
              <input
                aria-label="Exact analyzed frame"
                type="number"
                min={1}
                max={Math.max(1, analyzedFrameCount)}
                step={1}
                inputMode="numeric"
                value={exactFrameDraft}
                disabled={analyzedFrameCount === 0}
                onChange={(event) =>
                  setExactFrameDraft(event.currentTarget.value)
                }
                onBlur={() => commitExactFrame()}
              />
              <span className="frame-step-count">/ {analyzedFrameCount}</span>
            </label>
            <small data-testid="calibration-frame-time">
              {currentFrameTimestampMicroseconds === null
                ? `Estimated · ≈ ${estimatedFrameRateLabel} fps`
                : `${(currentFrameTimestampMicroseconds / 1_000_000).toFixed(6)} s`}
            </small>
          </form>
        ) : (
          <output className="frame-step-readout" aria-live="polite">
            <strong>{frameReadout}</strong>
            <small>{frameReadoutDetail}</small>
          </output>
        )}
        <button
          type="button"
          className={nextHold.repeating ? 'is-repeating' : undefined}
          aria-label={`Next ${nextFrameStepMode} frame`}
          title={`Next ${nextFrameStepMode} frame · Hold for rapid jog (Right arrow)`}
          disabled={!canStepNext}
          data-hold-repeating={nextHold.repeating ? 'true' : 'false'}
          {...nextHold.handlers}
        >
          <span>Next</span>
          <NextFrameIcon />
        </button>
      </div>
      <span className="shortcut-hint">
        Space play · L loop · ← → frames · 1–3 speed
      </span>
    </div>
  );
}

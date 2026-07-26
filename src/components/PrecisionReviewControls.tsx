import {
  LoopIcon,
  NextFrameIcon,
  PreviousFrameIcon,
} from './Icons';

export const REVIEW_PLAYBACK_RATES = [0.25, 0.5, 1] as const;

type PrecisionReviewControlsProps = {
  playbackRate: number;
  loopEnabled: boolean;
  analyzedFrameCount: number;
  currentFrameIndex: number | null;
  canStepPrevious: boolean;
  canStepNext: boolean;
  showFrameNavigation?: boolean;
  onPlaybackRateChange: (rate: number) => void;
  onLoopToggle: () => void;
  onPreviousFrame: () => void;
  onNextFrame: () => void;
};

const speedLabel = (rate: number) =>
  rate === 0.25 ? '¼×' : rate === 0.5 ? '½×' : '1×';

export function PrecisionReviewControls({
  playbackRate,
  loopEnabled,
  analyzedFrameCount,
  currentFrameIndex,
  canStepPrevious,
  canStepNext,
  showFrameNavigation = true,
  onPlaybackRateChange,
  onLoopToggle,
  onPreviousFrame,
  onNextFrame,
}: PrecisionReviewControlsProps) {
  const frameReadout =
    currentFrameIndex === null
      ? analyzedFrameCount > 0
        ? `${analyzedFrameCount} ready`
        : 'Analyze first'
      : `${currentFrameIndex + 1} / ${analyzedFrameCount}`;

  return (
    <div
      className="precision-review"
      data-testid="precision-review-controls"
      data-frame-count={analyzedFrameCount}
      data-current-frame-index={currentFrameIndex ?? ''}
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

      {showFrameNavigation && (
        <div className="frame-step-row" role="group" aria-label="Analyzed frame navigation">
          <button
            type="button"
            aria-label="Previous analyzed frame"
            title="Previous analyzed frame (Left arrow)"
            disabled={!canStepPrevious}
            onClick={onPreviousFrame}
          >
            <PreviousFrameIcon />
            <span>Previous</span>
          </button>
          <output className="frame-step-readout" aria-live="polite">
            <strong>{frameReadout}</strong>
            <small>Analyzed frames</small>
          </output>
          <button
            type="button"
            aria-label="Next analyzed frame"
            title="Next analyzed frame (Right arrow)"
            disabled={!canStepNext}
            onClick={onNextFrame}
          >
            <span>Next</span>
            <NextFrameIcon />
          </button>
        </div>
      )}
      <span className="shortcut-hint">
        {showFrameNavigation
          ? 'Space play · L loop · ← → frames · 1–3 speed'
          : 'Space play · L loop · 1–3 speed'}
      </span>
    </div>
  );
}

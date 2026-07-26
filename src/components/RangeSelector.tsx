import type { CSSProperties, ReactNode } from 'react';

import {
  microsecondsToSeconds,
  normalizeRange,
  setRangeFromPlayhead,
} from '../analysis/range';
import type { AnalysisRange } from '../types';

type RangeSelectorProps = {
  range: AnalysisRange;
  durationMicroseconds: number;
  playheadMicroseconds: number;
  progress: number;
  disabled?: boolean;
  children?: ReactNode;
  onChange: (range: AnalysisRange) => void;
};

export const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00.0';
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe - minutes * 60;
  return `${minutes}:${remainder.toFixed(1).padStart(4, '0')}`;
};

export function RangeSelector({
  range,
  durationMicroseconds,
  playheadMicroseconds,
  progress,
  disabled = false,
  children,
  onChange,
}: RangeSelectorProps) {
  const duration = Math.max(1, durationMicroseconds);
  const startPercent = (range.startMicroseconds / duration) * 100;
  const endPercent = (range.endMicroseconds / duration) * 100;
  const analyzedPercent = startPercent + (endPercent - startPercent) * progress;
  const trackStyle = {
    '--range-start': `${startPercent}%`,
    '--range-end': `${endPercent}%`,
    '--range-progress': `${analyzedPercent}%`,
  } as CSSProperties;

  const updateEdge = (edge: 'start' | 'end', value: number) => {
    onChange(
      normalizeRange(
        {
          ...range,
          [edge === 'start' ? 'startMicroseconds' : 'endMicroseconds']: value,
        },
        durationMicroseconds,
        edge,
      ),
    );
  };

  return (
    <section className="range-section" aria-labelledby="range-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Clip selection</span>
          <h2 id="range-title">Analysis range</h2>
        </div>
        <span className="range-duration">
          {(microsecondsToSeconds(range.endMicroseconds - range.startMicroseconds)).toFixed(1)}s
        </span>
      </div>

      <div className="range-readout" aria-live="polite">
        <span><small>START</small>{formatTime(microsecondsToSeconds(range.startMicroseconds))}</span>
        <span className="range-arrow" aria-hidden="true">→</span>
        <span><small>END</small>{formatTime(microsecondsToSeconds(range.endMicroseconds))}</span>
      </div>

      <div className="range-track-wrap" style={trackStyle}>
        <div className="range-track-visual" aria-hidden="true">
          <span className="range-selected" />
          <span className="range-analyzed" />
        </div>
        <input
          className="range-handle range-handle-start"
          aria-label="Analysis start"
          type="range"
          min={0}
          max={durationMicroseconds}
          step={50_000}
          value={range.startMicroseconds}
          disabled={disabled}
          onChange={(event) => updateEdge('start', Number(event.currentTarget.value))}
        />
        <input
          className="range-handle range-handle-end"
          aria-label="Analysis end"
          type="range"
          min={0}
          max={durationMicroseconds}
          step={50_000}
          value={range.endMicroseconds}
          disabled={disabled}
          onChange={(event) => updateEdge('end', Number(event.currentTarget.value))}
        />
      </div>

      <div className="range-actions">
        <button
          type="button"
          className="button-subtle"
          disabled={disabled}
          onClick={() =>
            onChange(
              setRangeFromPlayhead(
                range,
                'start',
                playheadMicroseconds,
                durationMicroseconds,
              ),
            )
          }
        >
          Set start
        </button>
        <button
          type="button"
          className="button-subtle"
          disabled={disabled}
          onClick={() =>
            onChange(
              setRangeFromPlayhead(
                range,
                'end',
                playheadMicroseconds,
                durationMicroseconds,
              ),
            )
          }
        >
          Set end
        </button>
      </div>

      {children}
    </section>
  );
}

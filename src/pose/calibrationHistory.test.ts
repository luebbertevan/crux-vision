import { describe, expect, it } from 'vitest';

import { CalibrationHistory } from './calibrationHistory';

describe('calibration setting history', () => {
  it('undoes and redoes the last setting change', () => {
    const history = new CalibrationHistory<number>();
    history.record(2, 'minimum-cutoff', 0);

    expect(history.undo(3)).toBe(2);
    expect(history.canRedo).toBe(true);
    expect(history.redo(2)).toBe(3);
  });

  it('coalesces rapid changes to the same control into one undo step', () => {
    const history = new CalibrationHistory<number>(100, 750);
    history.record(2, 'minimum-cutoff', 0);
    history.record(2.1, 'minimum-cutoff', 500);

    expect(history.undo(2.2)).toBe(2);
    expect(history.canUndo).toBe(false);
  });

  it('keeps different settings as separate undo steps and clears redo on edit', () => {
    const history = new CalibrationHistory<string>();
    history.record('initial', 'cutoff', 0);
    history.record('cutoff changed', 'beta', 100);

    expect(history.undo('both changed')).toBe('cutoff changed');
    expect(history.undo('cutoff changed')).toBe('initial');
    expect(history.redo('initial')).toBe('cutoff changed');
    history.record('cutoff changed', 'visibility', 1_000);
    expect(history.canRedo).toBe(false);
  });
});


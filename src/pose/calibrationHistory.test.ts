import { describe, expect, it } from 'vitest';

import { CalibrationHistory } from './calibrationHistory';

describe('calibration setting history', () => {
  it('undoes and redoes the last setting change', () => {
    const history = new CalibrationHistory<number>();
    history.record(2, 'minimum-cutoff', 0);

    expect(history.undo(() => 3)).toBe(2);
    expect(history.canRedo).toBe(true);
    expect(history.redo(() => 2)).toBe(3);
  });

  it('coalesces rapid changes to the same control into one undo step', () => {
    const history = new CalibrationHistory<number>(100, 750);
    history.record(2, 'minimum-cutoff', 0);
    history.record(2.1, 'minimum-cutoff', 500);

    expect(history.undo(() => 2.2)).toBe(2);
    expect(history.canUndo).toBe(false);
  });

  it('keeps different settings as separate undo steps and clears redo on edit', () => {
    const history = new CalibrationHistory<string>();
    history.record('initial', 'cutoff', 0);
    history.record('cutoff changed', 'beta', 100);

    expect(history.undo(() => 'both changed')).toBe('cutoff changed');
    expect(history.undo(() => 'cutoff changed')).toBe('initial');
    expect(history.redo(() => 'initial')).toBe('cutoff changed');
    history.record('cutoff changed', 'visibility', 1_000);
    expect(history.canRedo).toBe(false);
  });

  it('captures the current value for the kind of change being restored', () => {
    type Change =
      | { kind: 'setting'; value: number }
      | { kind: 'frame'; value: number };
    const history = new CalibrationHistory<Change>();
    history.record({ kind: 'setting', value: 2 }, 'cutoff', 0);
    history.record({ kind: 'frame', value: 9 }, 'frame-1', 1_000);

    expect(
      history.undo((change) =>
        change.kind === 'frame'
          ? { kind: 'frame', value: 10 }
          : { kind: 'setting', value: 3 },
      ),
    ).toEqual({ kind: 'frame', value: 9 });
    expect(
      history.redo((change) =>
        change.kind === 'frame'
          ? { kind: 'frame', value: 9 }
          : { kind: 'setting', value: 3 },
      ),
    ).toEqual({ kind: 'frame', value: 10 });
  });

  it('clears undo and redo entries', () => {
    const history = new CalibrationHistory<number>();
    history.record(1, 'setting', 0);
    history.undo(() => 2);
    history.clear();

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { EditHistory } from './editHistory';

describe('session edit history', () => {
  it('undoes and redoes the last edit with a user-facing label', () => {
    const history = new EditHistory<number>();
    history.record(
      2,
      { key: 'minimum-cutoff', label: 'Minimum cutoff' },
      0,
    );

    expect(history.undoLabel).toBe('Minimum cutoff');
    expect(history.undo(() => 3)).toBe(2);
    expect(history.redoLabel).toBe('Minimum cutoff');
    expect(history.redo(() => 2)).toBe(3);
  });

  it('coalesces continuous changes to the same control within the idle interval', () => {
    const history = new EditHistory<number>(100, 750);
    const change = {
      key: 'trail-width',
      label: 'Trail width',
      coalesce: true,
    };
    history.record(1, change, 0);
    history.record(1.1, change, 500);
    history.record(1.2, change, 1_200);

    expect(history.undo(() => 1.3)).toBe(1);
    expect(history.canUndo).toBe(false);
  });

  it('starts another step after a continuous control is idle', () => {
    const history = new EditHistory<number>(100, 750);
    const change = {
      key: 'analysis-start',
      label: 'Analysis start',
      coalesce: true,
    };
    history.record(1, change, 0);
    history.record(2, change, 751);

    expect(history.undo(() => 3)).toBe(2);
    expect(history.undo(() => 2)).toBe(1);
  });

  it('keeps rapid discrete actions as separate undo steps', () => {
    const history = new EditHistory<string>();
    const change = { key: 'overlay-master', label: 'Overlays' };
    history.record('visible', change, 0);
    history.record('hidden', change, 1);

    expect(history.undo(() => 'visible')).toBe('hidden');
    expect(history.undo(() => 'hidden')).toBe('visible');
  });

  it('keeps different edits separate and clears redo on a new edit', () => {
    const history = new EditHistory<string>();
    history.record('initial', { key: 'cutoff', label: 'Cutoff' }, 0);
    history.record(
      'cutoff changed',
      { key: 'beta', label: 'Responsiveness' },
      100,
    );

    expect(history.undo(() => 'both changed')).toBe('cutoff changed');
    expect(history.undo(() => 'cutoff changed')).toBe('initial');
    expect(history.redo(() => 'initial')).toBe('cutoff changed');
    history.record(
      'cutoff changed',
      { key: 'visibility', label: 'Visibility' },
      1_000,
    );
    expect(history.canRedo).toBe(false);
  });

  it('captures the current value for the kind of edit being restored', () => {
    type Change =
      | { kind: 'setting'; value: number }
      | { kind: 'annotation'; value: number };
    const history = new EditHistory<Change>();
    history.record(
      { kind: 'setting', value: 2 },
      { key: 'cutoff', label: 'Cutoff' },
      0,
    );
    history.record(
      { kind: 'annotation', value: 9 },
      { key: 'checkpoint', label: 'Add checkpoint' },
      1_000,
    );

    expect(
      history.undo((change) =>
        change.kind === 'annotation'
          ? { kind: 'annotation', value: 10 }
          : { kind: 'setting', value: 3 },
      ),
    ).toEqual({ kind: 'annotation', value: 9 });
    expect(
      history.redo((change) =>
        change.kind === 'annotation'
          ? { kind: 'annotation', value: 9 }
          : { kind: 'setting', value: 3 },
      ),
    ).toEqual({ kind: 'annotation', value: 10 });
  });

  it('clears undo and redo entries', () => {
    const history = new EditHistory<number>();
    history.record(1, { key: 'setting', label: 'Setting' }, 0);
    history.undo(() => 2);
    history.clear();

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undoLabel).toBeNull();
    expect(history.redoLabel).toBeNull();
  });
});

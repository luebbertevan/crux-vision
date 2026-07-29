export type EditHistoryChange = {
  key: string;
  label: string;
  coalesce?: boolean;
};

type HistoryEntry<T> = {
  value: T;
  change: EditHistoryChange;
  changedAt: number;
};

export class EditHistory<T> {
  private readonly past: HistoryEntry<T>[] = [];
  private readonly future: HistoryEntry<T>[] = [];

  constructor(
    private readonly maximumEntries = 100,
    private readonly coalesceMilliseconds = 750,
  ) {}

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  get undoLabel(): string | null {
    return this.past.at(-1)?.change.label ?? null;
  }

  get redoLabel(): string | null {
    return this.future.at(-1)?.change.label ?? null;
  }

  clear(): void {
    this.past.length = 0;
    this.future.length = 0;
  }

  record(
    valueBeforeChange: T,
    change: EditHistoryChange,
    changedAt: number,
  ): void {
    const previous = this.past.at(-1);
    if (
      change.coalesce &&
      previous?.change.coalesce &&
      previous.change.key === change.key &&
      changedAt - previous.changedAt <= this.coalesceMilliseconds
    ) {
      previous.changedAt = changedAt;
      previous.change = change;
    } else {
      this.past.push({ value: valueBeforeChange, change, changedAt });
      if (this.past.length > this.maximumEntries) this.past.shift();
    }
    this.future.length = 0;
  }

  undo(currentValueFor: (valueBeingRestored: T) => T): T | null {
    const entry = this.past.pop();
    if (!entry) return null;
    this.future.push({
      ...entry,
      value: currentValueFor(entry.value),
    });
    return entry.value;
  }

  redo(currentValueFor: (valueBeingRestored: T) => T): T | null {
    const entry = this.future.pop();
    if (!entry) return null;
    this.past.push({
      ...entry,
      value: currentValueFor(entry.value),
      changedAt: Number.NEGATIVE_INFINITY,
    });
    return entry.value;
  }
}

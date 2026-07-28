import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import {
  addTrailCheckpointRange,
  removeTrailCheckpointRange,
  resetAllTrailSettings,
  resetTrailSourceSettings,
  TRAIL_COLOR_PALETTE,
  TRAIL_SOURCE_DEFINITIONS,
  updateTrailCheckpointRange,
  withOverlayLayerVisibility,
  withTrailAppearance,
  withTrailSourceSelection,
  withTrailTimingMode,
  withTrailVisibility,
  type OverlaySettings,
  type TrailCheckpoint,
  type TrailSourceGroup,
  type TrailSourceId,
} from '../overlay/overlaySettings';
import type { EditHistoryChange } from '../state/editHistory';
import { formatTime } from './RangeSelector';

type OverlaySettingsPanelProps = {
  settings: OverlaySettings;
  checkpoints: readonly TrailCheckpoint[];
  analysisRangeDurationMicroseconds: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChange: (
    updater: (current: OverlaySettings) => OverlaySettings,
    change: EditHistoryChange,
  ) => void;
};

const trailSourcePickerOrder: readonly TrailSourceId[] = [
  'left-wrist',
  'right-wrist',
  'left-elbow',
  'right-elbow',
  'left-ankle',
  'right-ankle',
  'left-knee',
  'right-knee',
  'hip-midpoint',
  'shoulder-midpoint',
];

const sourceGroups: readonly TrailSourceGroup[] = [
  'Body midpoints',
  'Arms',
  'Legs',
];

export function OverlaySettingsPanel({
  settings,
  checkpoints,
  analysisRangeDurationMicroseconds,
  open,
  onOpenChange,
  onSettingsChange,
}: OverlaySettingsPanelProps) {
  const selectedSources = TRAIL_SOURCE_DEFINITIONS.filter(
    ({ id }) => settings.trailSources[id],
  );
  const availableSources = trailSourcePickerOrder
    .map((sourceId) =>
      TRAIL_SOURCE_DEFINITIONS.find(({ id }) => id === sourceId),
    )
    .filter(
      (definition): definition is (typeof TRAIL_SOURCE_DEFINITIONS)[number] =>
        definition !== undefined && !settings.trailSources[definition.id],
    );
  const [editorSourceId, setEditorSourceId] = useState<TrailSourceId>(
    selectedSources[0]?.id ?? 'hip-midpoint',
  );
  useEffect(() => {
    if (!settings.trailSources[editorSourceId] && selectedSources[0]) {
      setEditorSourceId(selectedSources[0].id);
    }
  }, [editorSourceId, selectedSources, settings.trailSources]);

  const visibleSourceCount = selectedSources.filter(
    ({ id }) => settings.trailVisibility[id],
  ).length;
  const editorDefinition = selectedSources.find(
    ({ id }) => id === editorSourceId,
  );

  return (
    <details
      className="overlay-settings"
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
      data-testid="overlay-settings"
    >
      <summary>
        <span>
          <b>Overlay settings</b>
          <small>
            {visibleSourceCount} of {selectedSources.length} trails visible
          </small>
        </span>
        <i className="disclosure-arrow" aria-hidden="true" />
      </summary>

      <div className="overlay-settings-body">
        <fieldset className="overlay-settings-group">
          <legend>Layer visibility</legend>
          <LayerToggle
            label="Skeleton"
            className="is-skeleton"
            checked={settings.layers.skeleton}
            onChange={(visible) =>
              onSettingsChange(
                (current) =>
                  withOverlayLayerVisibility(current, 'skeleton', visible),
                { key: 'overlay-skeleton', label: 'Skeleton visibility' },
              )
            }
          />
          <LayerToggle
            label="Trails"
            className="is-trails"
            checked={settings.layers.trails}
            onChange={(visible) =>
              onSettingsChange(
                (current) =>
                  withOverlayLayerVisibility(current, 'trails', visible),
                { key: 'overlay-trails', label: 'Trail layer visibility' },
              )
            }
          />
        </fieldset>

        <fieldset className="overlay-settings-group trail-source-settings">
          <legend>Trail sources</legend>
          <div className="trail-source-list" data-testid="active-trail-sources">
            {selectedSources.length === 0 && (
              <p className="trail-source-empty">No trail sources added.</p>
            )}
            {selectedSources.map((definition) => {
              const visible = settings.trailVisibility[definition.id];
              return (
                <div
                  className={`trail-source-row${visible ? '' : ' is-hidden'}`}
                  data-testid={`active-trail-source-${definition.id}`}
                  key={definition.id}
                >
                  <label className="trail-source-visibility">
                    <input
                      type="checkbox"
                      checked={visible}
                      aria-label={`Show ${definition.label} trail`}
                      onChange={(event) => {
                        const visible = event.currentTarget.checked;
                        onSettingsChange(
                          (current) =>
                            withTrailVisibility(
                              current,
                              definition.id,
                              visible,
                            ),
                          {
                            key: `trail-${definition.id}-visibility`,
                            label: `${definition.label} visibility`,
                          },
                        );
                      }}
                    />
                    <span className="overlay-checkbox" aria-hidden="true" />
                    <span className="overlay-option-label">
                      <i
                        className="overlay-option-swatch"
                        aria-hidden="true"
                        style={
                          {
                            '--trail-source-color':
                              settings.trailAppearance[definition.id].color,
                          } as CSSProperties
                        }
                      />
                      {definition.label}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="trail-source-remove"
                    aria-label={`Remove ${definition.label} trail`}
                    onClick={() =>
                      onSettingsChange(
                        (current) =>
                          withTrailSourceSelection(
                            current,
                            definition.id,
                            false,
                          ),
                        {
                          key: `trail-${definition.id}-source`,
                          label: `Remove ${definition.label}`,
                        },
                      )
                    }
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              );
            })}
          </div>

          <label className="trail-source-picker-label">
            <span className="sr-only">Add trail source</span>
            <select
              className="trail-source-picker"
              aria-label="Add trail source"
              value=""
              disabled={availableSources.length === 0}
              onChange={(event) => {
                const sourceId = event.currentTarget.value as TrailSourceId;
                if (!sourceId) return;
                const definition = TRAIL_SOURCE_DEFINITIONS.find(
                  ({ id }) => id === sourceId,
                );
                onSettingsChange(
                  (current) =>
                    withTrailSourceSelection(current, sourceId, true),
                  {
                    key: `trail-${sourceId}-source`,
                    label: `Add ${definition?.label ?? 'trail source'}`,
                  },
                );
                setEditorSourceId(sourceId);
              }}
            >
              <option value="" disabled>
                {availableSources.length === 0
                  ? 'All sources added'
                  : 'Add trail source…'}
              </option>
              {sourceGroups.map((group) => {
                const definitions = availableSources.filter(
                  (definition) => definition.group === group,
                );
                return definitions.length > 0 ? (
                  <optgroup label={group} key={group}>
                    {definitions.map((definition) => (
                      <option value={definition.id} key={definition.id}>
                        {definition.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
            <i aria-hidden="true" />
          </label>

          <details
            className="trail-advanced-settings"
            data-testid="trail-advanced-settings"
          >
            <summary>
              <span>
                <b>Advanced trail settings</b>
                <small>Color, timing, fade, and width</small>
              </span>
              <i className="disclosure-arrow" aria-hidden="true" />
            </summary>
            <div className="trail-editor">
              {selectedSources.length === 0 ? (
                <p className="trail-source-empty">
                  Add a trail source to customize it.
                </p>
              ) : (
                <>
                  <label className="trail-editor-source">
                    <span>Edit trail source</span>
                    <select
                      aria-label="Edit trail source"
                      value={editorSourceId}
                      onChange={(event) =>
                        setEditorSourceId(
                          event.currentTarget.value as TrailSourceId,
                        )
                      }
                    >
                      {selectedSources.map((definition) => (
                        <option value={definition.id} key={definition.id}>
                          {definition.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {editorDefinition && (
                    <TrailEditor
                      sourceId={editorDefinition.id}
                      settings={settings}
                      checkpoints={checkpoints}
                      analysisRangeDurationMicroseconds={
                        analysisRangeDurationMicroseconds
                      }
                      onSettingsChange={onSettingsChange}
                    />
                  )}
                  <button
                    type="button"
                    className="trail-reset-all"
                    onClick={() =>
                      onSettingsChange(
                        (current) => resetAllTrailSettings(current),
                        {
                          key: 'trail-reset-all',
                          label: 'Reset all trails',
                        },
                      )
                    }
                  >
                    Reset all trails
                  </button>
                </>
              )}
            </div>
          </details>
        </fieldset>
      </div>
    </details>
  );
}

function LayerToggle({
  label,
  className,
  checked,
  onChange,
}: {
  label: string;
  className: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="overlay-option">
      <span className="overlay-option-label">
        <i
          className={`overlay-option-swatch ${className}`}
          aria-hidden="true"
        />
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className="overlay-checkbox" aria-hidden="true" />
    </label>
  );
}

function TrailEditor({
  sourceId,
  settings,
  checkpoints,
  analysisRangeDurationMicroseconds,
  onSettingsChange,
}: {
  sourceId: TrailSourceId;
  settings: OverlaySettings;
  checkpoints: readonly TrailCheckpoint[];
  analysisRangeDurationMicroseconds: number;
  onSettingsChange: OverlaySettingsPanelProps['onSettingsChange'];
}) {
  const definition = TRAIL_SOURCE_DEFINITIONS.find(({ id }) => id === sourceId)!;
  const appearance = settings.trailAppearance[sourceId];
  const usesCheckpoints =
    settings.trailTimingMode[sourceId] === 'checkpoint-ranges';
  const ranges = settings.trailCheckpointRanges[sourceId];
  const maximumRollingDurationSeconds = Math.max(
    0.25,
    analysisRangeDurationMicroseconds / 1_000_000,
  );
  const committedRollingDurationSeconds =
    appearance.durationMicroseconds / 1_000_000;
  const formatDurationSeconds = (seconds: number) =>
    String(Math.round(seconds * 100) / 100);
  const [durationDraft, setDurationDraft] = useState(
    formatDurationSeconds(committedRollingDurationSeconds),
  );
  const [customColorDraft, setCustomColorDraft] = useState(appearance.color);
  const [customColorActive, setCustomColorActive] = useState(false);
  const customColorRootRef = useRef<HTMLDivElement>(null);
  const customColorInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setCustomColorDraft(appearance.color);
    setCustomColorActive(false);
  }, [appearance.color, sourceId]);
  useEffect(() => {
    setDurationDraft(
      formatDurationSeconds(committedRollingDurationSeconds),
    );
  }, [committedRollingDurationSeconds, sourceId]);
  useEffect(() => {
    if (!customColorActive) return;
    const commitOutside = (event: PointerEvent) => {
      if (customColorRootRef.current?.contains(event.target as Node)) return;
      onSettingsChange(
        (current) =>
          withTrailAppearance(current, sourceId, {
            color: customColorDraft,
          }),
        {
          key: `trail-${sourceId}-color`,
          label: `${definition.label} color`,
        },
      );
      setCustomColorActive(false);
      customColorInputRef.current?.blur();
    };
    document.addEventListener('pointerdown', commitOutside);
    return () => document.removeEventListener('pointerdown', commitOutside);
  }, [
    customColorActive,
    customColorDraft,
    definition.label,
    onSettingsChange,
    sourceId,
  ]);
  const applyCustomColor = () => {
    onSettingsChange(
      (current) =>
        withTrailAppearance(current, sourceId, { color: customColorDraft }),
      {
        key: `trail-${sourceId}-color`,
        label: `${definition.label} color`,
      },
    );
    setCustomColorActive(false);
    customColorInputRef.current?.blur();
  };
  const commitDurationDraft = () => {
    const trimmedDraft = durationDraft.trim();
    const parsedSeconds = Number(trimmedDraft);
    if (trimmedDraft === '' || !Number.isFinite(parsedSeconds)) {
      setDurationDraft(
        formatDurationSeconds(committedRollingDurationSeconds),
      );
      return;
    }
    const durationSeconds = Math.min(
      maximumRollingDurationSeconds,
      Math.max(0.25, parsedSeconds),
    );
    setDurationDraft(formatDurationSeconds(durationSeconds));
    onSettingsChange(
      (current) =>
        withTrailAppearance(current, sourceId, {
          durationMicroseconds: durationSeconds * 1_000_000,
        }),
      {
        key: `trail-${sourceId}-duration`,
        label: `${definition.label} duration`,
      },
    );
  };
  const addRange = () => {
    if (checkpoints.length < 2) return;
    const start = checkpoints.at(-2)!;
    const end = checkpoints.at(-1)!;
    onSettingsChange(
      (current) =>
        addTrailCheckpointRange(current, sourceId, start.id, end.id),
      {
        key: `trail-${sourceId}-range-add`,
        label: `Add ${definition.label} range`,
      },
    );
  };

  return (
    <div
      className="trail-editor-fields"
      data-testid={`trail-editor-${sourceId}`}
    >
      <div className="trail-editor-heading">
        <span
          className="trail-editor-live-swatch"
          aria-hidden="true"
          style={
            {
              '--trail-source-color': appearance.color,
            } as CSSProperties
          }
        />
        <div>
          <b>{definition.label}</b>
          <small>{usesCheckpoints ? 'Checkpoint ranges' : 'Rolling trail'}</small>
        </div>
      </div>

      <fieldset className="trail-color-field">
        <legend>Trail color</legend>
        <div className="trail-color-palette">
          {TRAIL_COLOR_PALETTE.map((option) => (
            <button
              type="button"
              key={option.color}
              className={appearance.color === option.color ? 'is-selected' : ''}
              aria-label={`Set ${definition.label} trail color to ${option.name}`}
              aria-pressed={appearance.color === option.color}
              style={
                {
                  '--trail-source-color': option.color,
                } as CSSProperties
              }
              onClick={() =>
                onSettingsChange(
                  (current) =>
                    withTrailAppearance(current, sourceId, {
                      color: option.color,
                    }),
                  {
                    key: `trail-${sourceId}-color`,
                    label: `${definition.label} color`,
                  },
                )
              }
            />
          ))}
        </div>
        <div className="trail-custom-color" ref={customColorRootRef}>
          <span>Custom</span>
          <input
            ref={customColorInputRef}
            type="color"
            aria-label={`Custom color for ${definition.label} trail`}
            value={customColorDraft}
            onFocus={() => setCustomColorActive(true)}
            onClick={() => setCustomColorActive(true)}
            onChange={(event) => {
              const color = event.currentTarget.value as `#${string}`;
              setCustomColorDraft(color);
              setCustomColorActive(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyCustomColor();
              }
              if (event.key === 'Escape') {
                setCustomColorDraft(appearance.color);
                setCustomColorActive(false);
                event.currentTarget.blur();
              }
            }}
          />
          <output>{customColorDraft.toUpperCase()}</output>
        </div>
      </fieldset>

      <label className="trail-control">
        <span>
          Width
          <output>{Math.round(appearance.widthScale * 100)}%</output>
        </span>
        <input
          type="range"
          min="0.6"
          max="5"
          step="0.05"
          value={appearance.widthScale}
          aria-label={`${definition.label} trail width`}
          onChange={(event) => {
            const widthScale = event.currentTarget.valueAsNumber;
            onSettingsChange(
              (current) =>
                withTrailAppearance(current, sourceId, {
                  widthScale,
                }),
              {
                key: `trail-${sourceId}-width`,
                label: `${definition.label} width`,
                coalesce: true,
              },
            );
          }}
        />
      </label>

      <label className="trail-control">
        <span>
          Tail opacity
          <output>{Math.round(appearance.minimumAlpha * 100)}%</output>
        </span>
        <input
          type="range"
          min="0.05"
          max="0.98"
          step="0.01"
          value={appearance.minimumAlpha}
          aria-label={`${definition.label} trail tail opacity`}
          onChange={(event) => {
            const minimumAlpha = event.currentTarget.valueAsNumber;
            onSettingsChange(
              (current) =>
                withTrailAppearance(current, sourceId, {
                  minimumAlpha,
                }),
              {
                key: `trail-${sourceId}-opacity`,
                label: `${definition.label} tail opacity`,
                coalesce: true,
              },
            );
          }}
        />
      </label>

      <label className="trail-mode-toggle">
        <span>
          <b>Checkpoint ranges</b>
          <small>Pin trails between saved moments</small>
        </span>
        <input
          type="checkbox"
          checked={usesCheckpoints}
          aria-label={`Use checkpoint ranges for ${definition.label} trail`}
          onChange={(event) => {
            const checked = event.currentTarget.checked;
            onSettingsChange(
              (current) =>
                withTrailTimingMode(
                  current,
                  sourceId,
                  checked ? 'checkpoint-ranges' : 'rolling',
                ),
              {
                key: `trail-${sourceId}-timing`,
                label: `${definition.label} timing mode`,
              },
            );
          }}
        />
        <span className="overlay-checkbox" aria-hidden="true" />
      </label>

      {usesCheckpoints ? (
        <div className="trail-checkpoint-editor">
          {checkpoints.length < 2 ? (
            <p>
              Add at least two checkpoints, then return here to define a trail
              range.
            </p>
          ) : (
            <button
              type="button"
              className="trail-range-add"
              aria-label={`Add checkpoint range for ${definition.label} trail`}
              onClick={addRange}
            >
              + Add checkpoint range
            </button>
          )}
          {ranges.map((range, index) => (
            <div className="trail-range-row" key={range.id}>
              <label className="trail-range-visibility">
                <input
                  type="checkbox"
                  checked={range.visible}
                    aria-label={`Show ${definition.label} trail range ${index + 1}`}
                    onChange={(event) => {
                      const visible = event.currentTarget.checked;
                      onSettingsChange(
                        (current) =>
                          updateTrailCheckpointRange(
                            current,
                            sourceId,
                            range.id,
                            { visible },
                          ),
                        {
                          key: `trail-${sourceId}-range-${range.id}-visibility`,
                          label: `${definition.label} range ${index + 1} visibility`,
                        },
                      );
                    }}
                />
                <span className="overlay-checkbox" aria-hidden="true" />
                Range {index + 1}
              </label>
              <div className="trail-range-endpoints">
                <label>
                  <span>Start</span>
                  <select
                    aria-label={`${definition.label} trail range ${index + 1} start`}
                    value={range.startCheckpointId}
                    onChange={(event) => {
                      const startCheckpointId = Number(
                        event.currentTarget.value,
                      );
                      onSettingsChange(
                        (current) =>
                          updateTrailCheckpointRange(
                            current,
                            sourceId,
                            range.id,
                            { startCheckpointId },
                          ),
                        {
                          key: `trail-${sourceId}-range-${range.id}-start`,
                          label: `${definition.label} range ${index + 1} start`,
                        },
                      );
                    }}
                  >
                    {checkpoints.map((checkpoint) => (
                      <CheckpointOption
                        checkpoint={checkpoint}
                        key={checkpoint.id}
                      />
                    ))}
                  </select>
                </label>
                <label>
                  <span>End</span>
                  <select
                    aria-label={`${definition.label} trail range ${index + 1} end`}
                    value={range.endCheckpointId}
                    onChange={(event) => {
                      const endCheckpointId = Number(
                        event.currentTarget.value,
                      );
                      onSettingsChange(
                        (current) =>
                          updateTrailCheckpointRange(
                            current,
                            sourceId,
                            range.id,
                            { endCheckpointId },
                          ),
                        {
                          key: `trail-${sourceId}-range-${range.id}-end`,
                          label: `${definition.label} range ${index + 1} end`,
                        },
                      );
                    }}
                  >
                    {checkpoints.map((checkpoint) => (
                      <CheckpointOption
                        checkpoint={checkpoint}
                        key={checkpoint.id}
                      />
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                className="trail-range-remove"
                aria-label={`Remove ${definition.label} trail range ${index + 1}`}
                onClick={() =>
                  onSettingsChange(
                    (current) =>
                      removeTrailCheckpointRange(
                        current,
                        sourceId,
                        range.id,
                      ),
                    {
                      key: `trail-${sourceId}-range-${range.id}-remove`,
                      label: `Remove ${definition.label} range ${index + 1}`,
                    },
                  )
                }
              >
                Remove range
              </button>
            </div>
          ))}
        </div>
      ) : (
        <label className="trail-control trail-duration-control">
          <span>
            Rolling duration
            <small>
              Analysis range max {maximumRollingDurationSeconds.toFixed(2)} s
            </small>
          </span>
          <span className="trail-duration-input">
            <input
              type="number"
              inputMode="decimal"
              min="0.25"
              max={maximumRollingDurationSeconds}
              step="0.05"
              value={durationDraft}
              aria-label={`${definition.label} trail duration in seconds`}
              onChange={(event) => setDurationDraft(event.currentTarget.value)}
              onBlur={commitDurationDraft}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
            />
            <span aria-hidden="true">seconds</span>
          </span>
        </label>
      )}

      <button
        type="button"
        className="trail-reset-one"
        onClick={() =>
          onSettingsChange(
            (current) => resetTrailSourceSettings(current, sourceId),
            {
              key: `trail-${sourceId}-reset`,
              label: `Reset ${definition.label}`,
            },
          )
        }
      >
        Reset {definition.label}
      </button>
    </div>
  );
}

function CheckpointOption({
  checkpoint,
}: {
  checkpoint: TrailCheckpoint;
}) {
  return (
    <option value={checkpoint.id}>
      {checkpoint.name} ·{' '}
      {formatTime(checkpoint.timestampMicroseconds / 1_000_000)}
    </option>
  );
}

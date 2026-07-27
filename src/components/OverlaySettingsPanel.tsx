import type { CSSProperties } from 'react';

import {
  TRAIL_SOURCE_DEFINITIONS,
  type OverlaySettings,
  type OverlayLayerId,
  type TrailSourceGroup,
  type TrailSourceId,
} from '../overlay/overlaySettings';

type OverlaySettingsPanelProps = {
  settings: OverlaySettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLayerChange: (layerId: OverlayLayerId, visible: boolean) => void;
  onTrailSourceChange: (sourceId: TrailSourceId, visible: boolean) => void;
};

export function OverlaySettingsPanel({
  settings,
  open,
  onOpenChange,
  onLayerChange,
  onTrailSourceChange,
}: OverlaySettingsPanelProps) {
  const selectedSources = TRAIL_SOURCE_DEFINITIONS.filter(
    ({ id }) => settings.trailSources[id],
  );
  const availableSources = TRAIL_SOURCE_DEFINITIONS.filter(
    ({ id }) => !settings.trailSources[id],
  );
  const sourceGroups: readonly TrailSourceGroup[] = [
    'Body midpoints',
    'Arms',
    'Legs',
  ];

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
          <small>{selectedSources.length} trail sources</small>
        </span>
        <i aria-hidden="true" />
      </summary>

      <div className="overlay-settings-body">
        <fieldset className="overlay-settings-group">
          <legend>Layer visibility</legend>
          <label className="overlay-option">
            <span className="overlay-option-label">
              <i className="overlay-option-swatch is-skeleton" aria-hidden="true" />
              Skeleton
            </span>
            <input
              type="checkbox"
              checked={settings.layers.skeleton}
              onChange={(event) =>
                onLayerChange('skeleton', event.currentTarget.checked)
              }
            />
            <span className="overlay-checkbox" aria-hidden="true" />
          </label>
          <label className="overlay-option">
            <span className="overlay-option-label">
              <i className="overlay-option-swatch is-trails" aria-hidden="true" />
              Trails
            </span>
            <input
              type="checkbox"
              checked={settings.layers.trails}
              onChange={(event) =>
                onLayerChange('trails', event.currentTarget.checked)
              }
            />
            <span className="overlay-checkbox" aria-hidden="true" />
          </label>
        </fieldset>

        <fieldset className="overlay-settings-group trail-source-settings">
          <legend>Active trail sources</legend>
          <div className="trail-source-list" data-testid="active-trail-sources">
            {selectedSources.length === 0 && (
              <p className="trail-source-empty">No trail sources selected.</p>
            )}
            {selectedSources.map((definition) => (
              <div
                className="trail-source-row"
                data-testid={`active-trail-source-${definition.id}`}
                key={definition.id}
              >
                <span className="overlay-option-label">
                  <i
                    className="overlay-option-swatch"
                    aria-hidden="true"
                    style={
                      {
                        '--trail-source-color':
                          definition.defaultAppearance.color,
                      } as CSSProperties
                    }
                  />
                  {definition.label}
                </span>
                <button
                  type="button"
                  className="trail-source-remove"
                  aria-label={`Remove ${definition.label} trail`}
                  onClick={() => onTrailSourceChange(definition.id, false)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            ))}
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
                if (sourceId) onTrailSourceChange(sourceId, true);
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
        </fieldset>
      </div>
    </details>
  );
}

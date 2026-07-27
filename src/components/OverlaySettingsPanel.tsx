import type { CSSProperties } from 'react';

import {
  TRAIL_SOURCE_DEFINITIONS,
  type OverlaySettings,
  type OverlayLayerId,
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
  const selectedSourceCount = TRAIL_SOURCE_DEFINITIONS.filter(
    ({ id }) => settings.trailSources[id],
  ).length;

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
          <small>{selectedSourceCount} trail sources</small>
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

        <fieldset className="overlay-settings-group">
          <legend>Trail sources</legend>
          {TRAIL_SOURCE_DEFINITIONS.map((definition) => (
            <label className="overlay-option" key={definition.id}>
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
              <input
                type="checkbox"
                checked={settings.trailSources[definition.id]}
                onChange={(event) =>
                  onTrailSourceChange(
                    definition.id,
                    event.currentTarget.checked,
                  )
                }
              />
              <span className="overlay-checkbox" aria-hidden="true" />
            </label>
          ))}
        </fieldset>
      </div>
    </details>
  );
}

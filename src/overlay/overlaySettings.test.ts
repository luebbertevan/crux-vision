import { describe, expect, it } from 'vitest';

import {
  calculateTrailStrokeWidths,
  createDefaultOverlaySettings,
  TRAIL_DURATION_MICROSECONDS,
  TRAIL_SOURCE_DEFINITIONS,
  TRAIL_SOURCE_IDS,
  withOverlayLayerVisibility,
  withOverlayMasterVisibility,
  withTrailSourceVisibility,
} from './overlaySettings';

describe('overlay settings contract', () => {
  it('gives every supported source a stable ID, typed definition, and visible default color', () => {
    expect(TRAIL_SOURCE_DEFINITIONS.map(({ id }) => id)).toEqual(
      TRAIL_SOURCE_IDS,
    );
    expect(new Set(TRAIL_SOURCE_IDS).size).toBe(TRAIL_SOURCE_IDS.length);
    for (const definition of TRAIL_SOURCE_DEFINITIONS) {
      expect(definition.label.length).toBeGreaterThan(0);
      expect(definition.defaultAppearance.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('defaults the master, skeleton, trails, hip, and shoulder on independently', () => {
    const settings = createDefaultOverlaySettings();
    expect(settings.masterVisible).toBe(true);
    expect(settings.layers).toEqual({ skeleton: true, trails: true });
    expect(settings.trailSources).toEqual({
      'hip-midpoint': true,
      'shoulder-midpoint': true,
      'left-wrist': false,
      'right-wrist': false,
      'left-ankle': false,
      'right-ankle': false,
    });
  });

  it('preserves layer and source selections when the master is hidden and restored', () => {
    const defaults = createDefaultOverlaySettings();
    const configured = withTrailSourceVisibility(
      withOverlayLayerVisibility(defaults, 'skeleton', false),
      'left-wrist',
      true,
    );
    const hidden = withOverlayMasterVisibility(configured, false);
    const restored = withOverlayMasterVisibility(hidden, true);

    expect(restored.layers.skeleton).toBe(false);
    expect(restored.layers.trails).toBe(true);
    expect(restored.trailSources['left-wrist']).toBe(true);
    expect(defaults.layers.skeleton).toBe(true);
    expect(defaults.trailSources['left-wrist']).toBe(false);
  });

  it('uses a two-second trail and a responsive stroke 25% above the prior default', () => {
    expect(TRAIL_DURATION_MICROSECONDS).toBe(2_000_000);

    const narrow = calculateTrailStrokeWidths(360);
    const wide = calculateTrailStrokeWidths(1440);
    expect(narrow.colorWidth).toBeCloseTo(Math.max(4, 360 / 180) * 1.25);
    expect(wide.colorWidth).toBeCloseTo(Math.max(4, 1440 / 180) * 1.25);
    expect(wide.colorWidth).toBeGreaterThan(narrow.colorWidth);
    expect(narrow.haloWidth).toBeGreaterThan(narrow.colorWidth);
    expect(wide.haloWidth).toBeGreaterThan(wide.colorWidth);
  });
});

import { describe, expect, it } from 'vitest';

import {
  activeTrailCheckpointWindow,
  addTrailCheckpointRange,
  calculateTrailStrokeWidths,
  cloneOverlaySettings,
  createDefaultOverlaySettings,
  resetTrailSourceSettings,
  TRAIL_DURATION_MICROSECONDS,
  TRAIL_SOURCE_DEFINITIONS,
  TRAIL_SOURCE_IDS,
  trailCheckpointWindow,
  updateTrailCheckpointRange,
  withoutTrailCheckpoint,
  withOverlayLayerVisibility,
  withOverlayMasterVisibility,
  withTrailAppearance,
  withTrailSourceSelection,
  withTrailTimingMode,
  withTrailVisibility,
} from './overlaySettings';

describe('overlay settings contract', () => {
  it('clones nested settings for isolated edit-history snapshots', () => {
    const settings = addTrailCheckpointRange(
      createDefaultOverlaySettings(),
      'hip-midpoint',
      1,
      2,
    );
    const cloned = cloneOverlaySettings(settings);

    cloned.layers.skeleton = false;
    cloned.trailAppearance['hip-midpoint'].widthScale = 2;
    cloned.trailCheckpointRanges['hip-midpoint'][0]!.visible = false;

    expect(settings.layers.skeleton).toBe(true);
    expect(settings.trailAppearance['hip-midpoint'].widthScale).toBe(1.25);
    expect(
      settings.trailCheckpointRanges['hip-midpoint'][0]!.visible,
    ).toBe(true);
  });

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
      'left-elbow': false,
      'right-elbow': false,
      'left-wrist': false,
      'right-wrist': false,
      'left-knee': false,
      'right-knee': false,
      'left-ankle': false,
      'right-ankle': false,
    });
    expect(Object.values(settings.trailVisibility).every(Boolean)).toBe(true);
    expect(settings.trailAppearance['hip-midpoint']).toEqual(
      TRAIL_SOURCE_DEFINITIONS[0].defaultAppearance,
    );
    expect(settings.trailTimingMode['hip-midpoint']).toBe('rolling');
    expect(settings.trailCheckpointRanges['hip-midpoint']).toEqual([]);
  });

  it('maps elbow and knee source IDs to the matching MediaPipe landmarks', () => {
    const directLandmarks = Object.fromEntries(
      TRAIL_SOURCE_DEFINITIONS.flatMap((definition) =>
        definition.source.kind === 'landmark'
          ? [[definition.id, definition.source.landmarkIndex]]
          : [],
      ),
    );
    expect(directLandmarks).toMatchObject({
      'left-elbow': 13,
      'right-elbow': 14,
      'left-knee': 25,
      'right-knee': 26,
    });
  });

  it('preserves layer and source selections when the master is hidden and restored', () => {
    const defaults = createDefaultOverlaySettings();
    const configured = withTrailSourceSelection(
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

  it('keeps source selection separate from its convenient visibility toggle', () => {
    let settings = withTrailSourceSelection(
      createDefaultOverlaySettings(),
      'left-ankle',
      true,
    );
    settings = withTrailVisibility(settings, 'left-ankle', false);

    expect(settings.trailSources['left-ankle']).toBe(true);
    expect(settings.trailVisibility['left-ankle']).toBe(false);
    expect(settings.trailAppearance['left-ankle'].color).toBe('#d7ff66');

    settings = withTrailVisibility(settings, 'left-ankle', true);
    expect(settings.trailSources['left-ankle']).toBe(true);
    expect(settings.trailVisibility['left-ankle']).toBe(true);
  });

  it('owns editable per-source appearance without changing the stable defaults', () => {
    const defaults = createDefaultOverlaySettings();
    const changed = withTrailAppearance(defaults, 'left-ankle', {
      color: '#123456',
      durationMicroseconds: 4_000_000,
      minimumAlpha: 0.2,
      widthScale: 1.8,
    });

    expect(changed.trailAppearance['left-ankle']).toMatchObject({
      color: '#123456',
      colorChannels: '18, 52, 86',
      durationMicroseconds: 4_000_000,
      minimumAlpha: 0.2,
      widthScale: 1.8,
    });
    expect(defaults.trailAppearance['left-ankle']).toEqual(
      TRAIL_SOURCE_DEFINITIONS.find(({ id }) => id === 'left-ankle')!
        .defaultAppearance,
    );
  });

  it('allows analysis-range trail durations and caps width at 500%', () => {
    const changed = withTrailAppearance(
      createDefaultOverlaySettings(),
      'left-ankle',
      {
        durationMicroseconds: 45_000_000,
        widthScale: 8,
      },
    );

    expect(changed.trailAppearance['left-ankle']).toMatchObject({
      durationMicroseconds: 45_000_000,
      widthScale: 5,
    });
  });

  it('supports multiple visible checkpoint ranges and removes broken references', () => {
    let settings = withTrailTimingMode(
      createDefaultOverlaySettings(),
      'hip-midpoint',
      'checkpoint-ranges',
    );
    settings = addTrailCheckpointRange(settings, 'hip-midpoint', 1, 2);
    settings = addTrailCheckpointRange(settings, 'hip-midpoint', 3, 4);
    settings = updateTrailCheckpointRange(settings, 'hip-midpoint', 2, {
      visible: false,
    });
    expect(settings.trailCheckpointRanges['hip-midpoint']).toEqual([
      {
        id: 1,
        visible: true,
        startCheckpointId: 1,
        endCheckpointId: 2,
      },
      {
        id: 2,
        visible: false,
        startCheckpointId: 3,
        endCheckpointId: 4,
      },
    ]);
    expect(
      trailCheckpointWindow(
        settings.trailCheckpointRanges['hip-midpoint'][0],
        [
          { id: 1, name: 'End', timestampMicroseconds: 3_000_000 },
          { id: 2, name: 'Start', timestampMicroseconds: 1_000_000 },
        ],
      ),
    ).toEqual({
      startMicroseconds: 1_000_000,
      endMicroseconds: 3_000_000,
    });

    settings = withoutTrailCheckpoint(settings, 2);
    expect(settings.trailCheckpointRanges['hip-midpoint']).toHaveLength(1);
    expect(settings.trailCheckpointRanges['hip-midpoint'][0].id).toBe(2);

    settings = resetTrailSourceSettings(settings, 'hip-midpoint');
    expect(settings.trailTimingMode['hip-midpoint']).toBe('rolling');
    expect(settings.trailCheckpointRanges['hip-midpoint']).toEqual([]);
  });

  it('activates checkpoint trails only during their range and never includes future time', () => {
    const range = {
      id: 1,
      visible: true,
      startCheckpointId: 1,
      endCheckpointId: 2,
    };
    const checkpoints = [
      { id: 1, name: 'Start', timestampMicroseconds: 3_000_000 },
      { id: 2, name: 'End', timestampMicroseconds: 5_000_000 },
    ];

    expect(
      activeTrailCheckpointWindow(range, checkpoints, 2_999_999),
    ).toBeNull();
    expect(
      activeTrailCheckpointWindow(range, checkpoints, 4_000_000),
    ).toEqual({
      startMicroseconds: 3_000_000,
      endMicroseconds: 4_000_000,
    });
    expect(
      activeTrailCheckpointWindow(range, checkpoints, 5_000_001),
    ).toBeNull();
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

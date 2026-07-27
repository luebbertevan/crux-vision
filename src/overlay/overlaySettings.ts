import { DEFAULT_SAMPLE_RATE, SECOND_MICROSECONDS } from '../analysis/range';
import type { PosePointSource } from '../pose/poseView';

export const TRAIL_SOURCE_IDS = [
  'hip-midpoint',
  'shoulder-midpoint',
  'left-wrist',
  'right-wrist',
  'left-ankle',
  'right-ankle',
] as const;

export type TrailSourceId = (typeof TRAIL_SOURCE_IDS)[number];
export type OverlayLayerId = 'skeleton' | 'trails';

export type TrailAppearanceConfig = {
  color: `#${string}`;
  colorChannels: `${number}, ${number}, ${number}`;
  durationMicroseconds: number;
  minimumAlpha: number;
  maximumAlpha: number;
  widthScale: number;
  haloColorChannels: `${number}, ${number}, ${number}`;
  haloAlphaScale: number;
};

export type TrailSourceDefinition = {
  id: TrailSourceId;
  label: string;
  source: PosePointSource;
  defaultEnabled: boolean;
  defaultAppearance: TrailAppearanceConfig;
};

export type OverlaySettings = {
  masterVisible: boolean;
  layers: Record<OverlayLayerId, boolean>;
  trailSources: Record<TrailSourceId, boolean>;
};

export const TRAIL_DURATION_MICROSECONDS = 2 * SECOND_MICROSECONDS;
export const TRAIL_MAXIMUM_GAP_MICROSECONDS = Math.round(
  (1.5 * SECOND_MICROSECONDS) / DEFAULT_SAMPLE_RATE,
);

const DEFAULT_TRAIL_APPEARANCE = {
  durationMicroseconds: TRAIL_DURATION_MICROSECONDS,
  minimumAlpha: 0.38,
  maximumAlpha: 0.98,
  widthScale: 1.25,
  haloColorChannels: '7, 10, 8',
  haloAlphaScale: 0.72,
} as const;

export const TRAIL_SOURCE_DEFINITIONS = [
  {
    id: 'hip-midpoint',
    label: 'Hip midpoint',
    source: {
      kind: 'midpoint',
      firstLandmarkIndex: 23,
      secondLandmarkIndex: 24,
    },
    defaultEnabled: true,
    defaultAppearance: {
      ...DEFAULT_TRAIL_APPEARANCE,
      color: '#ffb24d',
      colorChannels: '255, 178, 77',
    },
  },
  {
    id: 'shoulder-midpoint',
    label: 'Shoulder midpoint',
    source: {
      kind: 'midpoint',
      firstLandmarkIndex: 11,
      secondLandmarkIndex: 12,
    },
    defaultEnabled: true,
    defaultAppearance: {
      ...DEFAULT_TRAIL_APPEARANCE,
      color: '#55dcf2',
      colorChannels: '85, 220, 242',
    },
  },
  {
    id: 'left-wrist',
    label: 'Left wrist',
    source: { kind: 'landmark', landmarkIndex: 15 },
    defaultEnabled: false,
    defaultAppearance: {
      ...DEFAULT_TRAIL_APPEARANCE,
      color: '#ff62b0',
      colorChannels: '255, 98, 176',
    },
  },
  {
    id: 'right-wrist',
    label: 'Right wrist',
    source: { kind: 'landmark', landmarkIndex: 16 },
    defaultEnabled: false,
    defaultAppearance: {
      ...DEFAULT_TRAIL_APPEARANCE,
      color: '#b69cff',
      colorChannels: '182, 156, 255',
    },
  },
  {
    id: 'left-ankle',
    label: 'Left ankle',
    source: { kind: 'landmark', landmarkIndex: 27 },
    defaultEnabled: false,
    defaultAppearance: {
      ...DEFAULT_TRAIL_APPEARANCE,
      color: '#d7ff66',
      colorChannels: '215, 255, 102',
    },
  },
  {
    id: 'right-ankle',
    label: 'Right ankle',
    source: { kind: 'landmark', landmarkIndex: 28 },
    defaultEnabled: false,
    defaultAppearance: {
      ...DEFAULT_TRAIL_APPEARANCE,
      color: '#ff7a59',
      colorChannels: '255, 122, 89',
    },
  },
] as const satisfies readonly TrailSourceDefinition[];

export function createDefaultOverlaySettings(): OverlaySettings {
  return {
    masterVisible: true,
    layers: {
      skeleton: true,
      trails: true,
    },
    trailSources: Object.fromEntries(
      TRAIL_SOURCE_DEFINITIONS.map((definition) => [
        definition.id,
        definition.defaultEnabled,
      ]),
    ) as Record<TrailSourceId, boolean>,
  };
}

export function withOverlayMasterVisibility(
  settings: OverlaySettings,
  masterVisible: boolean,
): OverlaySettings {
  return {
    ...settings,
    masterVisible,
  };
}

export function withOverlayLayerVisibility(
  settings: OverlaySettings,
  layerId: OverlayLayerId,
  visible: boolean,
): OverlaySettings {
  return {
    ...settings,
    layers: {
      ...settings.layers,
      [layerId]: visible,
    },
  };
}

export function withTrailSourceVisibility(
  settings: OverlaySettings,
  sourceId: TrailSourceId,
  visible: boolean,
): OverlaySettings {
  return {
    ...settings,
    trailSources: {
      ...settings.trailSources,
      [sourceId]: visible,
    },
  };
}

export function calculateTrailStrokeWidths(
  canvasWidth: number,
  widthScale = DEFAULT_TRAIL_APPEARANCE.widthScale,
): { colorWidth: number; haloWidth: number } {
  const previousResponsiveWidth = Math.max(4, canvasWidth / 180);
  const colorWidth = previousResponsiveWidth * widthScale;
  return {
    colorWidth,
    haloWidth: colorWidth + Math.max(2, canvasWidth / 420),
  };
}

export function calculateTrailPointRadii(
  canvasWidth: number,
  widthScale = DEFAULT_TRAIL_APPEARANCE.widthScale,
): { colorRadius: number; haloRadius: number } {
  const colorRadius = Math.max(4, canvasWidth / 190) * widthScale;
  return {
    colorRadius,
    haloRadius: colorRadius + Math.max(1, canvasWidth / 840),
  };
}

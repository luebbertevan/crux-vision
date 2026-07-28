import { DEFAULT_SAMPLE_RATE, SECOND_MICROSECONDS } from '../analysis/range';
import type { PosePointSource } from '../pose/poseView';

export const TRAIL_SOURCE_IDS = [
  'hip-midpoint',
  'shoulder-midpoint',
  'left-elbow',
  'right-elbow',
  'left-wrist',
  'right-wrist',
  'left-knee',
  'right-knee',
  'left-ankle',
  'right-ankle',
] as const;

export type TrailSourceId = (typeof TRAIL_SOURCE_IDS)[number];
export type OverlayLayerId = 'skeleton' | 'trails';
export type TrailSourceGroup = 'Body midpoints' | 'Arms' | 'Legs';
export type TrailTimingMode = 'rolling' | 'checkpoint-ranges';

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

export type TrailCheckpointRange = {
  id: number;
  visible: boolean;
  startCheckpointId: number;
  endCheckpointId: number;
};

export type TrailCheckpoint = {
  id: number;
  name: string;
  timestampMicroseconds: number;
};

export type TrailSourceDefinition = {
  id: TrailSourceId;
  label: string;
  group: TrailSourceGroup;
  source: PosePointSource;
  defaultEnabled: boolean;
  defaultAppearance: TrailAppearanceConfig;
};

export type OverlaySettings = {
  masterVisible: boolean;
  layers: Record<OverlayLayerId, boolean>;
  trailSources: Record<TrailSourceId, boolean>;
  trailVisibility: Record<TrailSourceId, boolean>;
  trailAppearance: Record<TrailSourceId, TrailAppearanceConfig>;
  trailTimingMode: Record<TrailSourceId, TrailTimingMode>;
  trailCheckpointRanges: Record<TrailSourceId, TrailCheckpointRange[]>;
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

export const TRAIL_COLOR_PALETTE = [
  { name: 'Amber', color: '#ffb24d' },
  { name: 'Cyan', color: '#55dcf2' },
  { name: 'Lime', color: '#d7ff66' },
  { name: 'Magenta', color: '#ff62b0' },
  { name: 'Violet', color: '#b69cff' },
  { name: 'Blue', color: '#4da3ff' },
  { name: 'Coral', color: '#ff7a59' },
  { name: 'Chalk', color: '#f6f1df' },
] as const satisfies readonly {
  name: string;
  color: `#${string}`;
}[];

export const TRAIL_SOURCE_DEFINITIONS = [
  {
    id: 'hip-midpoint',
    label: 'Hip midpoint',
    group: 'Body midpoints',
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
    group: 'Body midpoints',
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
    id: 'left-elbow',
    label: 'Left elbow',
    group: 'Arms',
    source: { kind: 'landmark', landmarkIndex: 13 },
    defaultEnabled: false,
    defaultAppearance: {
      ...DEFAULT_TRAIL_APPEARANCE,
      color: '#00f0b5',
      colorChannels: '0, 240, 181',
    },
  },
  {
    id: 'right-elbow',
    label: 'Right elbow',
    group: 'Arms',
    source: { kind: 'landmark', landmarkIndex: 14 },
    defaultEnabled: false,
    defaultAppearance: {
      ...DEFAULT_TRAIL_APPEARANCE,
      color: '#ffd43b',
      colorChannels: '255, 212, 59',
    },
  },
  {
    id: 'left-wrist',
    label: 'Left wrist',
    group: 'Arms',
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
    group: 'Arms',
    source: { kind: 'landmark', landmarkIndex: 16 },
    defaultEnabled: false,
    defaultAppearance: {
      ...DEFAULT_TRAIL_APPEARANCE,
      color: '#b69cff',
      colorChannels: '182, 156, 255',
    },
  },
  {
    id: 'left-knee',
    label: 'Left knee',
    group: 'Legs',
    source: { kind: 'landmark', landmarkIndex: 25 },
    defaultEnabled: false,
    defaultAppearance: {
      ...DEFAULT_TRAIL_APPEARANCE,
      color: '#4da3ff',
      colorChannels: '77, 163, 255',
    },
  },
  {
    id: 'right-knee',
    label: 'Right knee',
    group: 'Legs',
    source: { kind: 'landmark', landmarkIndex: 26 },
    defaultEnabled: false,
    defaultAppearance: {
      ...DEFAULT_TRAIL_APPEARANCE,
      color: '#ff8de1',
      colorChannels: '255, 141, 225',
    },
  },
  {
    id: 'left-ankle',
    label: 'Left ankle',
    group: 'Legs',
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
    group: 'Legs',
    source: { kind: 'landmark', landmarkIndex: 28 },
    defaultEnabled: false,
    defaultAppearance: {
      ...DEFAULT_TRAIL_APPEARANCE,
      color: '#ff7a59',
      colorChannels: '255, 122, 89',
    },
  },
] as const satisfies readonly TrailSourceDefinition[];

function cloneAppearance(
  appearance: TrailAppearanceConfig,
): TrailAppearanceConfig {
  return { ...appearance };
}

function buildDefaultTrailSettings() {
  return {
    trailSources: Object.fromEntries(
      TRAIL_SOURCE_DEFINITIONS.map(({ id, defaultEnabled }) => [
        id,
        defaultEnabled,
      ]),
    ) as Record<TrailSourceId, boolean>,
    trailVisibility: Object.fromEntries(
      TRAIL_SOURCE_DEFINITIONS.map(({ id }) => [id, true]),
    ) as Record<TrailSourceId, boolean>,
    trailAppearance: Object.fromEntries(
      TRAIL_SOURCE_DEFINITIONS.map(({ id, defaultAppearance }) => [
        id,
        cloneAppearance(defaultAppearance),
      ]),
    ) as Record<TrailSourceId, TrailAppearanceConfig>,
    trailTimingMode: Object.fromEntries(
      TRAIL_SOURCE_DEFINITIONS.map(({ id }) => [id, 'rolling' as const]),
    ) as Record<TrailSourceId, TrailTimingMode>,
    trailCheckpointRanges: Object.fromEntries(
      TRAIL_SOURCE_DEFINITIONS.map(({ id }) => [
        id,
        [] as TrailCheckpointRange[],
      ]),
    ) as Record<TrailSourceId, TrailCheckpointRange[]>,
  };
}

export function createDefaultOverlaySettings(): OverlaySettings {
  return {
    masterVisible: true,
    layers: {
      skeleton: true,
      trails: true,
    },
    ...buildDefaultTrailSettings(),
  };
}

export function cloneOverlaySettings(
  settings: OverlaySettings,
): OverlaySettings {
  return {
    ...settings,
    layers: { ...settings.layers },
    trailSources: { ...settings.trailSources },
    trailVisibility: { ...settings.trailVisibility },
    trailAppearance: Object.fromEntries(
      TRAIL_SOURCE_IDS.map((sourceId) => [
        sourceId,
        { ...settings.trailAppearance[sourceId] },
      ]),
    ) as Record<TrailSourceId, TrailAppearanceConfig>,
    trailTimingMode: { ...settings.trailTimingMode },
    trailCheckpointRanges: Object.fromEntries(
      TRAIL_SOURCE_IDS.map((sourceId) => [
        sourceId,
        settings.trailCheckpointRanges[sourceId].map((range) => ({
          ...range,
        })),
      ]),
    ) as Record<TrailSourceId, TrailCheckpointRange[]>,
  };
}

export function withOverlayMasterVisibility(
  settings: OverlaySettings,
  masterVisible: boolean,
): OverlaySettings {
  return { ...settings, masterVisible };
}

export function withOverlayLayerVisibility(
  settings: OverlaySettings,
  layerId: OverlayLayerId,
  visible: boolean,
): OverlaySettings {
  return {
    ...settings,
    layers: { ...settings.layers, [layerId]: visible },
  };
}

export function withTrailSourceSelection(
  settings: OverlaySettings,
  sourceId: TrailSourceId,
  selected: boolean,
): OverlaySettings {
  return {
    ...settings,
    trailSources: { ...settings.trailSources, [sourceId]: selected },
  };
}

export function withTrailVisibility(
  settings: OverlaySettings,
  sourceId: TrailSourceId,
  visible: boolean,
): OverlaySettings {
  return {
    ...settings,
    trailVisibility: { ...settings.trailVisibility, [sourceId]: visible },
  };
}

function hexColorChannels(
  color: `#${string}`,
): `${number}, ${number}, ${number}` {
  const normalized = /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1) : 'ffffff';
  return `${Number.parseInt(normalized.slice(0, 2), 16)}, ${Number.parseInt(
    normalized.slice(2, 4),
    16,
  )}, ${Number.parseInt(normalized.slice(4, 6), 16)}`;
}

export function withTrailAppearance(
  settings: OverlaySettings,
  sourceId: TrailSourceId,
  update: Partial<
    Pick<
      TrailAppearanceConfig,
      'color' | 'durationMicroseconds' | 'minimumAlpha' | 'widthScale'
    >
  >,
): OverlaySettings {
  const current = settings.trailAppearance[sourceId];
  const color = update.color ?? current.color;
  return {
    ...settings,
    trailAppearance: {
      ...settings.trailAppearance,
      [sourceId]: {
        ...current,
        ...update,
        color,
        colorChannels: hexColorChannels(color),
        durationMicroseconds: Math.max(
          250_000,
          update.durationMicroseconds ?? current.durationMicroseconds,
        ),
        minimumAlpha: Math.max(
          0.05,
          Math.min(
            current.maximumAlpha,
            update.minimumAlpha ?? current.minimumAlpha,
          ),
        ),
        widthScale: Math.max(
          0.6,
          Math.min(5, update.widthScale ?? current.widthScale),
        ),
      },
    },
  };
}

export function withTrailTimingMode(
  settings: OverlaySettings,
  sourceId: TrailSourceId,
  mode: TrailTimingMode,
): OverlaySettings {
  return {
    ...settings,
    trailTimingMode: { ...settings.trailTimingMode, [sourceId]: mode },
  };
}

export function addTrailCheckpointRange(
  settings: OverlaySettings,
  sourceId: TrailSourceId,
  startCheckpointId: number,
  endCheckpointId: number,
): OverlaySettings {
  const ranges = settings.trailCheckpointRanges[sourceId];
  const id =
    ranges.reduce((maximum, range) => Math.max(maximum, range.id), 0) + 1;
  return {
    ...settings,
    trailCheckpointRanges: {
      ...settings.trailCheckpointRanges,
      [sourceId]: [
        ...ranges,
        {
          id,
          visible: true,
          startCheckpointId,
          endCheckpointId,
        },
      ],
    },
  };
}

export function updateTrailCheckpointRange(
  settings: OverlaySettings,
  sourceId: TrailSourceId,
  rangeId: number,
  update: Partial<Omit<TrailCheckpointRange, 'id'>>,
): OverlaySettings {
  return {
    ...settings,
    trailCheckpointRanges: {
      ...settings.trailCheckpointRanges,
      [sourceId]: settings.trailCheckpointRanges[sourceId].map((range) =>
        range.id === rangeId ? { ...range, ...update } : range,
      ),
    },
  };
}

export function removeTrailCheckpointRange(
  settings: OverlaySettings,
  sourceId: TrailSourceId,
  rangeId: number,
): OverlaySettings {
  return {
    ...settings,
    trailCheckpointRanges: {
      ...settings.trailCheckpointRanges,
      [sourceId]: settings.trailCheckpointRanges[sourceId].filter(
        (range) => range.id !== rangeId,
      ),
    },
  };
}

export function withoutTrailCheckpoint(
  settings: OverlaySettings,
  checkpointId: number,
): OverlaySettings {
  return {
    ...settings,
    trailCheckpointRanges: Object.fromEntries(
      TRAIL_SOURCE_IDS.map((sourceId) => [
        sourceId,
        settings.trailCheckpointRanges[sourceId].filter(
          (range) =>
            range.startCheckpointId !== checkpointId &&
            range.endCheckpointId !== checkpointId,
        ),
      ]),
    ) as Record<TrailSourceId, TrailCheckpointRange[]>,
  };
}

export function resetTrailSourceSettings(
  settings: OverlaySettings,
  sourceId: TrailSourceId,
): OverlaySettings {
  const definition = TRAIL_SOURCE_DEFINITIONS.find(({ id }) => id === sourceId);
  if (!definition) return settings;
  return {
    ...settings,
    trailVisibility: { ...settings.trailVisibility, [sourceId]: true },
    trailAppearance: {
      ...settings.trailAppearance,
      [sourceId]: cloneAppearance(definition.defaultAppearance),
    },
    trailTimingMode: {
      ...settings.trailTimingMode,
      [sourceId]: 'rolling',
    },
    trailCheckpointRanges: {
      ...settings.trailCheckpointRanges,
      [sourceId]: [],
    },
  };
}

export function resetAllTrailSettings(
  settings: OverlaySettings,
): OverlaySettings {
  return { ...settings, ...buildDefaultTrailSettings() };
}

export function trailCheckpointWindow(
  range: TrailCheckpointRange,
  checkpoints: readonly TrailCheckpoint[],
): { startMicroseconds: number; endMicroseconds: number } | null {
  const start = checkpoints.find(({ id }) => id === range.startCheckpointId);
  const end = checkpoints.find(({ id }) => id === range.endCheckpointId);
  if (!start || !end) return null;
  return {
    startMicroseconds: Math.min(
      start.timestampMicroseconds,
      end.timestampMicroseconds,
    ),
    endMicroseconds: Math.max(
      start.timestampMicroseconds,
      end.timestampMicroseconds,
    ),
  };
}

export function activeTrailCheckpointWindow(
  range: TrailCheckpointRange,
  checkpoints: readonly TrailCheckpoint[],
  presentationTimestampMicroseconds: number,
): { startMicroseconds: number; endMicroseconds: number } | null {
  const window = trailCheckpointWindow(range, checkpoints);
  if (
    !window ||
    presentationTimestampMicroseconds < window.startMicroseconds ||
    presentationTimestampMicroseconds > window.endMicroseconds
  ) {
    return null;
  }
  return {
    startMicroseconds: window.startMicroseconds,
    endMicroseconds: presentationTimestampMicroseconds,
  };
}

export function calculateTrailStrokeWidths(
  canvasWidth: number,
  widthScale: number = DEFAULT_TRAIL_APPEARANCE.widthScale,
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
  widthScale: number = DEFAULT_TRAIL_APPEARANCE.widthScale,
): { colorRadius: number; haloRadius: number } {
  const colorRadius = Math.max(4, canvasWidth / 190) * widthScale;
  return {
    colorRadius,
    haloRadius: colorRadius + Math.max(1, canvasWidth / 840),
  };
}

type IconProps = { size?: number; className?: string };

const baseProps = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
});

export function PlayIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)} fill="currentColor" stroke="none">
      <path d="M7.5 4.8 19 12 7.5 19.2V4.8Z" />
    </svg>
  );
}

export function PauseIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)} fill="currentColor" stroke="none">
      <path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z" />
    </svg>
  );
}

export function VolumeIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M5 9.5h3.5L13 6v12l-4.5-3.5H5v-5Z" />
      <path d="M16 9a4.5 4.5 0 0 1 0 6" />
      <path d="M18.5 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}

export function MutedIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M5 9.5h3.5L13 6v12l-4.5-3.5H5v-5Z" />
      <path d="m16.5 10 4 4m0-4-4 4" />
    </svg>
  );
}

export function UploadIcon({ size = 19, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
      <path d="M5 14.5V20h14v-5.5" />
    </svg>
  );
}

export function SparkIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="m12 2 1.35 5.15L18.5 8.5l-5.15 1.35L12 15l-1.35-5.15L5.5 8.5l5.15-1.35L12 2Z" />
      <path d="m18.5 14 .65 2.35L21.5 17l-2.35.65L18.5 20l-.65-2.35L15.5 17l2.35-.65L18.5 14Z" />
    </svg>
  );
}

export function ShieldIcon({ size = 17, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M12 3 5.5 5.5v5.7c0 4 2.65 7.7 6.5 9.3 3.85-1.6 6.5-5.3 6.5-9.3V5.5L12 3Z" />
      <path d="m9.2 11.8 1.8 1.8 3.9-4" />
    </svg>
  );
}

export function CloseIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function PreviousFrameIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M6.5 5v14" />
      <path d="m17.5 6-8 6 8 6V6Z" />
    </svg>
  );
}

export function NextFrameIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M17.5 5v14" />
      <path d="m6.5 6 8 6-8 6V6Z" />
    </svg>
  );
}

export function LoopIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M17.5 7.5H8a4 4 0 0 0-4 4" />
      <path d="m14.5 4.5 3 3-3 3" />
      <path d="M6.5 16.5H16a4 4 0 0 0 4-4" />
      <path d="m9.5 19.5-3-3 3-3" />
    </svg>
  );
}

export function CheckpointIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M6.5 21V4" />
      <path d="M6.5 5h10l-2.2 3 2.2 3h-10" />
    </svg>
  );
}

export function UndoIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="m9 7-4 4 4 4" />
      <path d="M5 11h8.5a5.5 5.5 0 0 1 5.5 5.5" />
    </svg>
  );
}

export function RedoIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="m15 7 4 4-4 4" />
      <path d="M19 11h-8.5A5.5 5.5 0 0 0 5 16.5" />
    </svg>
  );
}

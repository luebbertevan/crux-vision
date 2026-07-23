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

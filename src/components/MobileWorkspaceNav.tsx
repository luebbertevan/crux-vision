export type MobileWorkspaceMode = 'review' | 'timeline' | 'inspect';

const MOBILE_WORKSPACE_MODES: readonly {
  id: MobileWorkspaceMode;
  label: string;
}[] = [
  { id: 'review', label: 'Review' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'inspect', label: 'Inspect' },
];

type MobileWorkspaceNavProps = {
  mode: MobileWorkspaceMode;
  onChange: (mode: MobileWorkspaceMode) => void;
};

export function MobileWorkspaceNav({
  mode,
  onChange,
}: MobileWorkspaceNavProps) {
  return (
    <nav
      className="mobile-workspace-nav"
      aria-label="Review workspace"
      data-testid="mobile-workspace-nav"
    >
      {MOBILE_WORKSPACE_MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={`Show ${item.label} tools`}
          aria-pressed={mode === item.id}
          data-workspace-mode={item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

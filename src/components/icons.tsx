import type { ReactElement } from 'react';

import { TOKENS } from '../design-system/tokens.js';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

type IconShellProps = IconProps & {
  children: ReactElement | ReactElement[];
};

function IconShell({
  children,
  size = 24,
  color = TOKENS.colors.neon,
  strokeWidth = 2,
}: IconShellProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </IconShell>
  );
}

export function AlertCircleIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <path d="M12 17h.01" />
    </IconShell>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </IconShell>
  );
}

export function ClipboardCheckIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </IconShell>
  );
}

export function DatabaseIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </IconShell>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </IconShell>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h6" />
    </IconShell>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </IconShell>
  );
}

export function SignalIcon(props: IconProps) {
  return (
    <IconShell {...props}>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </IconShell>
  );
}

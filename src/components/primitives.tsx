import type { CSSProperties, ReactNode } from 'react';

import { TOKENS } from '../design-system/tokens.js';
import type { CanonicalInfographic, CanonicalSection } from '../schema/canonical.js';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClipboardCheckIcon,
  RefreshIcon,
  ShieldCheckIcon,
  SignalIcon,
} from './icons.js';

type Tone = 'neutral' | 'neon' | 'success' | 'warning' | 'danger';
type Metric = CanonicalInfographic['hero']['metrics'][number];
type ChecklistItem = Extract<CanonicalSection, { kind: 'checklist' }>['items'][number];

export function toneColor(tone: Tone | undefined): string {
  switch (tone) {
    case 'success': return TOKENS.colors.success;
    case 'warning': return TOKENS.colors.warning;
    case 'danger': return TOKENS.colors.danger;
    case 'neutral': return TOKENS.colors.textMuted;
    case 'neon':
    default: return TOKENS.colors.neon;
  }
}

export function PosterShell({
  children,
  width = 1600,
  height = 1120,
  padding = TOKENS.spacing.xxl,
}: {
  children: ReactNode;
  width?: number;
  height?: number;
  padding?: number;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width,
      height,
      boxSizing: 'border-box',
      overflow: 'hidden',
      padding,
      gap: TOKENS.spacing.md,
      color: TOKENS.colors.text,
      backgroundColor: TOKENS.colors.background,
      borderTop: `6px solid ${TOKENS.colors.neon}`,
      fontFamily: TOKENS.fontFamily,
    }}>
      {children}
    </div>
  );
}

export function GlassCard({
  children,
  style,
  accent = false,
  region,
}: {
  children: ReactNode;
  style?: CSSProperties;
  accent?: boolean;
  region?: string;
}) {
  return (
    <div data-region={region} style={{
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      backgroundColor: TOKENS.colors.surface,
      border: `1px solid ${accent ? TOKENS.colors.neonMuted : TOKENS.colors.border}`,
      borderRadius: TOKENS.radius.lg,
      padding: TOKENS.spacing.lg,
      ...style,
    }}>
      {children}
    </div>
  );
}

export function IconBadge({
  children,
  tone = 'neon',
  size = 46,
}: {
  children: ReactNode;
  tone?: Tone;
  size?: number;
}) {
  const color = toneColor(tone);
  return (
    <div style={{
      display: 'flex',
      width: size,
      height: size,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: TOKENS.radius.md,
      backgroundColor: TOKENS.colors.surfaceMuted,
      border: `1px solid ${color}`,
      color,
    }}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  index,
  compact = false,
}: {
  title: string;
  description?: string;
  index?: string;
  compact?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 5 : TOKENS.spacing.xs }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: TOKENS.spacing.sm }}>
        <div style={{ width: 28, height: 3, backgroundColor: TOKENS.colors.neon, borderRadius: TOKENS.radius.pill }} />
        {index ? <span style={{ fontSize: 12, color: TOKENS.colors.neon, fontWeight: 700, letterSpacing: 1.5 }}>{index}</span> : null}
        <span style={{
          fontSize: compact ? 18 : TOKENS.type.sectionTitle,
          fontWeight: 700,
          letterSpacing: 0.3,
          color: TOKENS.colors.text,
        }}>
          {title}
        </span>
      </div>
      {description ? (
        <span style={{
          paddingLeft: 40,
          fontSize: compact ? 12 : 14,
          lineHeight: TOKENS.type.lineHeightBody,
          color: TOKENS.colors.textMuted,
        }}>
          {description}
        </span>
      ) : null}
    </div>
  );
}

export function MetricTile({ metric, compact = false }: { metric: Metric; compact?: boolean }) {
  const color = toneColor(metric.tone);
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minWidth: 0,
      minHeight: compact ? 92 : 116,
      justifyContent: 'space-between',
      padding: compact ? 14 : TOKENS.spacing.md,
      gap: compact ? 6 : TOKENS.spacing.xs,
      boxSizing: 'border-box',
      backgroundColor: TOKENS.colors.surfaceElevated,
      border: `1px solid ${TOKENS.colors.border}`,
      borderTop: `3px solid ${color}`,
      borderRadius: TOKENS.radius.md,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: TOKENS.spacing.sm }}>
        <span style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: TOKENS.colors.textMuted, letterSpacing: 0.8 }}>
          {metric.label.toUpperCase()}
        </span>
        <SignalIcon size={compact ? 17 : 20} color={color} />
      </div>
      <span style={{ fontSize: compact ? 28 : TOKENS.type.metric, fontWeight: 700, lineHeight: 1, color }}>
        {metric.value}
      </span>
      {metric.detail ? <span style={{ fontSize: compact ? 11 : 13, color: TOKENS.colors.textMuted }}>{metric.detail}</span> : null}
    </div>
  );
}

function statusTone(status: ChecklistItem['status']): Tone {
  if (status === 'failed') return 'danger';
  if (status === 'warning') return 'warning';
  if (status === 'passed') return 'success';
  return 'neutral';
}

export function ChecklistRow({ item, compact = false }: { item: ChecklistItem; compact?: boolean }) {
  const tone = item.tone ?? statusTone(item.status);
  const color = toneColor(tone);
  const StatusIcon = item.status === 'failed' || item.status === 'warning' ? AlertCircleIcon : CheckCircleIcon;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: TOKENS.spacing.md,
      minHeight: compact ? 30 : 38,
      padding: compact ? '5px 9px' : '8px 12px',
      boxSizing: 'border-box',
      borderRadius: TOKENS.radius.sm,
      backgroundColor: TOKENS.colors.surfaceElevated,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
        <span style={{ fontSize: compact ? 11 : 13, color: TOKENS.colors.text }}>{item.label}</span>
        {item.detail ? <span style={{ fontSize: 10, color: TOKENS.colors.textMuted }}>{item.detail}</span> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color, fontWeight: 700 }}>{item.status.toUpperCase()}</span>
        <StatusIcon size={compact ? 14 : 17} color={color} />
      </div>
    </div>
  );
}

export function FooterFacts({
  facts,
  disclaimer,
  compact = false,
}: {
  facts: CanonicalInfographic['footer']['facts'];
  disclaimer?: string;
  compact?: boolean;
}) {
  return (
    <GlassCard region="footer" style={{ padding: compact ? '13px 20px' : '16px 24px', gap: compact ? 8 : 12, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: TOKENS.spacing.md }}>
        {facts.map((fact, index) => (
          <div key={`${fact.label}-${index}`} style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minWidth: 0,
            gap: 4,
            paddingLeft: index === 0 ? 0 : TOKENS.spacing.md,
            borderLeft: index === 0 ? 'none' : `1px solid ${TOKENS.colors.border}`,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: TOKENS.colors.textMuted, letterSpacing: 1.2 }}>
              {fact.label.toUpperCase()}
            </span>
            <span style={{ fontSize: compact ? 13 : 16, fontWeight: 700, color: toneColor(fact.tone) }}>
              {fact.value}
            </span>
          </div>
        ))}
      </div>
      {disclaimer ? (
        <span style={{ fontSize: 9, color: TOKENS.colors.textMuted, textAlign: 'center', paddingTop: 6, borderTop: `1px solid ${TOKENS.colors.border}` }}>
          {disclaimer}
        </span>
      ) : null}
    </GlassCard>
  );
}

function BulletRows({ items, compact }: { items: string[]; compact: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : TOKENS.spacing.xs }}>
      {items.map((item, index) => (
        <div key={`${item}-${index}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: TOKENS.spacing.sm,
          padding: compact ? '6px 9px' : '8px 11px',
          borderRadius: TOKENS.radius.sm,
          backgroundColor: TOKENS.colors.surfaceElevated,
        }}>
          <div style={{ width: 7, height: 7, flexShrink: 0, borderRadius: TOKENS.radius.pill, backgroundColor: TOKENS.colors.neon }} />
          <span style={{ fontSize: compact ? 11 : 13, lineHeight: 1.3, color: TOKENS.colors.text }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

export function SectionContent({ section, compact = false }: { section: CanonicalSection; compact?: boolean }) {
  if (section.kind === 'metric-grid') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: TOKENS.spacing.sm }}>
        {section.metrics.map((metric, index) => (
          <div key={`${metric.label}-${index}`} style={{ display: 'flex', width: section.metrics.length > 2 ? '48%' : '100%', flexGrow: 1 }}>
            <MetricTile metric={metric} compact={compact} />
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === 'checklist') {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 5 : TOKENS.spacing.xs }}>{section.items.map((item, index) => <ChecklistRow key={`${item.label}-${index}`} item={item} compact={compact} />)}</div>;
  }

  if (section.kind === 'bullet-list') return <BulletRows items={section.items} compact={compact} />;

  if (section.kind === 'callout') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: TOKENS.spacing.md, padding: TOKENS.spacing.md, backgroundColor: TOKENS.colors.surfaceElevated, borderRadius: TOKENS.radius.md, borderLeft: `4px solid ${toneColor(section.tone)}` }}>
        <ShieldCheckIcon size={28} color={toneColor(section.tone)} />
        <span style={{ fontSize: compact ? 12 : 15, lineHeight: TOKENS.type.lineHeightBody, color: TOKENS.colors.text }}>{section.body}</span>
      </div>
    );
  }

  if (section.kind === 'process-steps') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: TOKENS.spacing.sm }}>
        {section.steps.map((step, index) => (
          <div key={`${step.label}-${index}`} style={{ display: 'flex', width: section.steps.length > 3 ? '30%' : '100%', flexGrow: 1, gap: 10, padding: compact ? 10 : 13, boxSizing: 'border-box', backgroundColor: TOKENS.colors.surfaceElevated, borderRadius: TOKENS.radius.md }}>
            <IconBadge size={compact ? 32 : 38} tone={step.tone}><ClipboardCheckIcon size={compact ? 17 : 20} color={toneColor(step.tone)} /></IconBadge>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: TOKENS.colors.neon }}>{String(index + 1).padStart(2, '0')}</span>
              <span style={{ fontSize: compact ? 11 : 13, fontWeight: 700, color: TOKENS.colors.text }}>{step.label}</span>
              {step.description ? <span style={{ fontSize: compact ? 9 : 11, lineHeight: 1.3, color: TOKENS.colors.textMuted }}>{step.description}</span> : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === 'timeline') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: TOKENS.spacing.xs }}>
        {section.events.map((event, index) => (
          <div key={`${event.label}-${index}`} style={{ display: 'flex', gap: TOKENS.spacing.sm, paddingBottom: 8, borderBottom: `1px solid ${TOKENS.colors.border}` }}>
            <span style={{ width: 76, flexShrink: 0, fontSize: 10, fontWeight: 700, color: toneColor(event.tone) }}>{event.date ?? String(index + 1).padStart(2, '0')}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: compact ? 11 : 13, fontWeight: 700 }}>{event.label}</span>
              {event.description ? <span style={{ fontSize: compact ? 9 : 11, color: TOKENS.colors.textMuted }}>{event.description}</span> : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === 'comparison') {
    return (
      <div style={{ display: 'flex', gap: TOKENS.spacing.sm }}>
        {section.columns.map((column, index) => (
          <div key={`${column.label}-${index}`} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 7, padding: compact ? 10 : 14, backgroundColor: TOKENS.colors.surfaceElevated, borderRadius: TOKENS.radius.md, borderTop: `3px solid ${toneColor(column.tone)}` }}>
            <span style={{ fontSize: compact ? 11 : 13, fontWeight: 700, color: toneColor(column.tone) }}>{column.label}</span>
            {column.items.map((item, itemIndex) => <span key={`${item}-${itemIndex}`} style={{ fontSize: compact ? 9 : 11, lineHeight: 1.3, color: TOKENS.colors.textMuted }}>• {item}</span>)}
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === 'diagram-cycle') {
    return (
      <div style={{ display: 'flex', alignItems: 'stretch', gap: TOKENS.spacing.xs }}>
        {section.nodes.map((node, index) => (
          <div key={`${node.label}-${index}`} style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, alignItems: 'center', textAlign: 'center', gap: 5, padding: compact ? 9 : 12, backgroundColor: TOKENS.colors.surfaceElevated, borderRadius: TOKENS.radius.md, borderBottom: `3px solid ${toneColor(node.tone)}` }}>
            <RefreshIcon size={compact ? 17 : 21} color={toneColor(node.tone)} />
            <span style={{ fontSize: compact ? 9 : 11, fontWeight: 700, color: toneColor(node.tone) }}>{node.label}</span>
            {node.description ? <span style={{ fontSize: compact ? 8 : 10, lineHeight: 1.25, color: TOKENS.colors.textMuted }}>{node.description}</span> : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', backgroundColor: TOKENS.colors.surfaceMuted, borderRadius: TOKENS.radius.sm }}>
        {section.columns.map((column, index) => <span key={`${column}-${index}`} style={{ flex: 1, padding: '7px 9px', fontSize: 10, fontWeight: 700, color: TOKENS.colors.neon }}>{column}</span>)}
      </div>
      {section.rows.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} style={{ display: 'flex', borderBottom: `1px solid ${TOKENS.colors.border}` }}>
          {row.map((cell, cellIndex) => <span key={`${cell}-${cellIndex}`} style={{ flex: 1, padding: '7px 9px', fontSize: compact ? 9 : 11, color: TOKENS.colors.textMuted }}>{cell}</span>)}
        </div>
      ))}
    </div>
  );
}

export function SectionCard({ section, compact = false, style }: { section: CanonicalSection; compact?: boolean; style?: CSSProperties }) {
  return (
    <GlassCard style={{ gap: compact ? 12 : TOKENS.spacing.md, ...style }}>
      <SectionTitle title={section.title} description={section.description} compact={compact} />
      <SectionContent section={section} compact={compact} />
    </GlassCard>
  );
}

export function AssuranceBadge({ passed, total }: { passed: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: TOKENS.spacing.sm, padding: '10px 14px', backgroundColor: TOKENS.colors.surfaceMuted, borderRadius: TOKENS.radius.md, border: `1px solid ${TOKENS.colors.border}` }}>
      <IconBadge size={38} tone={passed === total ? 'success' : 'warning'}>
        <ShieldCheckIcon size={21} color={passed === total ? TOKENS.colors.success : TOKENS.colors.warning} />
      </IconBadge>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 10, color: TOKENS.colors.textMuted }}>ASSURANCE STATUS</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: passed === total ? TOKENS.colors.success : TOKENS.colors.warning }}>{passed}/{total} CHECKS PASSED</span>
      </div>
    </div>
  );
}

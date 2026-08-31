import type { CSSProperties, ReactNode } from 'react';
import type { CanonicalInfographic, CanonicalSection } from '../schema/canonical.js';
import { TOKENS } from '../design-system/tokens.js';
import { toneColor } from './primitives.js';

const C = TOKENS.colors;
type Metric = CanonicalInfographic['hero']['metrics'][number];
type Process = Extract<CanonicalSection, { kind: 'process-steps' }>;

export const column: CSSProperties = { display: 'flex', flexDirection: 'column', minWidth: 0, flexShrink: 0 };
export const row: CSSProperties = { display: 'flex', minWidth: 0, flexShrink: 0, gap: 28 };

/** Content wraps at a readable size; it is never ellipsized or line-clamped. */
export function Text({ children, size = 16, color = C.textMuted, bold = false, style }: {
  children: string; size?: number; color?: string; bold?: boolean; style?: CSSProperties;
}) {
  return <span style={{ display: 'flex', flexShrink: 0, minWidth: 0, maxWidth: '100%',
    fontSize: size, lineHeight: 1.4, fontWeight: bold ? 700 : 400, color,
    wordBreak: 'break-word', ...style }}>{children}</span>;
}

export function Heading({ title, description }: { title: string; description?: string }) {
  return <div style={{ ...column, gap: 7, marginBottom: 20 }}>
    <div style={{ ...row, alignItems: 'center', gap: 12 }}>
      <div style={{ width: 22, height: 3, flexShrink: 0, backgroundColor: C.neon }} />
      <Text size={20} color={C.text} bold style={{ flex: 1 }}>{title}</Text>
    </div>
    {description ? <Text size={14}>{description}</Text> : null}
  </div>;
}

export function Panel({ section, children, style }: { section: CanonicalSection; children: ReactNode; style?: CSSProperties }) {
  return <div data-section={section.id} style={{ ...column, paddingTop: 20, borderTop: `1px solid ${C.border}`, ...style }}>
    <Heading title={section.title} description={section.description} />
    {children}
  </div>;
}

export function Hero({ data, size = 58 }: { data: CanonicalInfographic; size?: number }) {
  // Repeated highlight words are already visible in the headline, not extra claims.
  const extraHighlight = data.hero.highlight && !data.hero.title.includes(data.hero.highlight);
  return <div data-region="hero" style={{ ...column, gap: 18 }}>
    {data.hero.eyebrow ? <Text size={14} color={C.neon} bold style={{ letterSpacing: 2 }}>{data.hero.eyebrow}</Text> : null}
    <Text size={size} color={C.text} bold style={{ lineHeight: 1.04, letterSpacing: -2 }}>{data.hero.title}</Text>
    {extraHighlight ? <Text size={26} color={C.neon} bold>{data.hero.highlight!}</Text> : null}
    {data.hero.subtitle ? <Text size={18} color={C.neon} bold style={{ lineHeight: 1.5 }}>{data.hero.subtitle}</Text> : null}
    {data.hero.tags.length ? <div style={{ ...row, flexWrap: 'wrap', gap: 10 }}>
      {data.hero.tags.map((tag, i) => <Text key={i} size={12} style={{ borderBottom: `1px solid ${C.borderStrong}`, paddingBottom: 6 }}>{tag}</Text>)}
    </div> : null}
    {data.hero.metrics.length ? <Metrics metrics={data.hero.metrics} /> : null}
  </div>;
}

export function Metrics({ metrics, columns = metrics.length }: { metrics: Metric[]; columns?: number }) {
  const count = Math.max(1, Math.min(columns, 4));
  const rows = Array.from({ length: Math.ceil(metrics.length / count) }, (_, i) => metrics.slice(i * count, (i + 1) * count));
  return <div style={{ ...column, gap: 18 }}>
    {rows.map((metricsRow, r) => <div key={r} style={{ ...row, gap: 18 }}>
    {metricsRow.map((metric, i) => <div key={i} style={{ ...column, flex: 1, gap: 7 }}>
      <Text size={metric.value.length > 9 ? 22 : 38} color={toneColor(metric.tone)} bold style={{ lineHeight: 1.1 }}>{metric.value}</Text>
      <Text size={13} color={C.text} bold>{metric.label}</Text>
      {metric.detail ? <Text size={12}>{metric.detail}</Text> : null}
    </div>)}</div>)}
  </div>;
}

export function ProgressGauge({ metric, size = 228 }: { metric: Metric; size?: number }) {
  const percent = /^\s*(\d+(?:\.\d+)?)%\s*$/.exec(metric.value);
  const value = percent ? Number(percent[1]) : NaN;
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`Progress gauge requires a percentage from 0 to 100; received ${metric.value}.`);
  }
  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  return <div style={{ ...row, alignItems: 'center', gap: 26 }}>
    <div style={{ display: 'flex', width: size, height: size, flexShrink: 0, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 220 220" style={{ position: 'absolute', left: 0, top: 0 }}>
        <circle cx="110" cy="110" r={radius} fill="none" stroke={C.border} strokeWidth="12" />
        <circle cx="110" cy="110" r={radius} fill="none" stroke={toneColor(metric.tone)} strokeWidth="12"
          strokeDasharray={`${circumference * value / 100} ${circumference}`}
          transform="rotate(-90 110 110)" />
        <circle cx="110" cy="110" r="74" fill="none" stroke={C.surfaceMuted} strokeWidth="1" />
      </svg>
      <Text size={64} color={toneColor(metric.tone)} bold style={{ lineHeight: 1 }}>{metric.value}</Text>
    </div>
    <div style={{ ...column, flex: 1, gap: 12 }}>
      <Text size={19} color={C.text} bold>{metric.label}</Text>
      {metric.detail ? <Text size={16}>{metric.detail}</Text> : null}
    </div>
  </div>;
}

export function ProcessFlow({ section, compact = false }: { section: Process; compact?: boolean }) {
  if (compact) {
    const count = section.steps.length > 4 ? 3 : 2;
    const rows = Array.from({ length: Math.ceil(section.steps.length / count) }, (_, i) => section.steps.slice(i * count, (i + 1) * count));
    return <Panel section={section}><div style={{ ...column, gap: 24 }}>
      {rows.map((steps, r) => <div key={r} style={{ ...row, gap: 24 }}>
        {steps.map((step, i) => <div key={i} style={{ ...column, flex: 1, gap: 8 }}>
          {!/^\d+[. ]/.test(step.label) ? <Text size={15} color={toneColor(step.tone)} bold>{String(r * count + i + 1).padStart(2, '0')}</Text> : null}
          <Text size={15} color={C.text} bold>{step.label}</Text>
          {step.description ? <Text size={14}>{step.description}</Text> : null}
        </div>)}
      </div>)}
    </div></Panel>;
  }
  return <Panel section={section}>
    <div style={{ ...row, flexWrap: compact ? 'wrap' : 'nowrap', gap: compact ? 20 : 0 }}>
      {section.steps.map((step, i) => <div key={i} style={{ ...column,
        ...(compact ? { width: '47%', flexGrow: 1 } : { flex: 1 }),
        paddingRight: compact ? 8 : 20, gap: 8 }}>
        <div style={{ ...row, gap: 12, alignItems: 'center' }}>
          <Text size={compact ? 17 : 28} color={toneColor(step.tone)} bold>{String(i + 1).padStart(2, '0')}</Text>
          {!compact && i < section.steps.length - 1 ? <div style={{ ...row, flex: 1, gap: 0, alignItems: 'center' }}>
            <div style={{ height: 1, flex: 1, backgroundColor: C.borderStrong }} />
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2L7 6L2 10" fill="none" stroke={C.textMuted} strokeWidth="1.5" /></svg>
          </div> : null}
        </div>
        <Text size={compact ? 15 : 17} color={C.text} bold>{step.label}</Text>
        {step.description ? <Text size={compact ? 14 : 15}>{step.description}</Text> : null}
      </div>)}
    </div>
  </Panel>;
}

export function Comparison({ section }: { section: Extract<CanonicalSection, { kind: 'comparison' }> }) {
  return <Panel section={section}>
    <div style={{ ...row, gap: 20 }}>
      {section.columns.map((col, i) => <div key={i} style={{ ...column, flex: 1, gap: 13,
        borderTop: `3px solid ${toneColor(col.tone)}`, paddingTop: 16 }}>
        <Text size={18} color={toneColor(col.tone)} bold>{col.label}</Text>
        {col.items.map((item, j) => <div key={j} style={{ ...row, gap: 9 }}>
          <Text size={15} color={toneColor(col.tone)}>{col.tone === 'success' ? '+' : '−'}</Text>
          <Text size={15} style={{ flex: 1 }}>{item}</Text>
        </div>)}
      </div>)}
    </div>
  </Panel>;
}

export function Table({ section }: { section: Extract<CanonicalSection, { kind: 'table-lite' }> }) {
  if (!section.columns.length || section.rows.some((r) => r.length !== section.columns.length)) {
    throw new Error(`Table ${section.id} must have one cell per column; refusing to drop source cells.`);
  }
  const widths = section.columns.length === 4 ? [20, 27, 27, 26] : section.columns.map(() => 100 / section.columns.length);
  return <Panel section={section}>
    <div style={{ ...column }}>
      <div style={{ ...row, gap: 0, backgroundColor: C.surfaceMuted }}>
        {section.columns.map((label, i) => <div key={i} style={{ ...column, width: `${widths[i]}%`, padding: '12px 14px' }}>
          <Text size={13} color={C.neon} bold>{label}</Text>
        </div>)}
      </div>
      {section.rows.map((cells, i) => <div key={i} style={{ ...row, gap: 0, borderBottom: `1px solid ${C.border}`, backgroundColor: i % 2 ? C.surface : C.background }}>
        {cells.map((cell, j) => <div key={j} style={{ ...column, width: `${widths[j]}%`, padding: '13px 14px' }}>
          <Text size={14} color={j === 0 ? C.text : C.textMuted} bold={j === 0}>{cell}</Text>
        </div>)}
      </div>)}
    </div>
  </Panel>;
}

export function Section({ section }: { section: CanonicalSection }) {
  if (section.kind === 'process-steps') return <ProcessFlow section={section} />;
  if (section.kind === 'comparison') return <Comparison section={section} />;
  if (section.kind === 'table-lite') return <Table section={section} />;
  return <Panel section={section}>
    {section.kind === 'metric-grid' ? <Metrics metrics={section.metrics} /> : null}
    {section.kind === 'callout' ? <Text size={17} color={C.text}>{section.body}</Text> : null}
    {section.kind === 'bullet-list' ? <div style={{ ...column, gap: 12 }}>
      {section.items.map((item, i) => <div key={i} style={{ ...row, gap: 12 }}>
        <Text color={C.neon}>•</Text><Text style={{ flex: 1 }}>{item}</Text>
      </div>)}
    </div> : null}
    {section.kind === 'checklist' ? <div style={{ ...column }}>
      {section.items.map((item, i) => <div key={i} style={{ ...row, gap: 18, padding: '12px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
        <div style={{ ...column, flex: 1, gap: 5 }}><Text size={15} color={C.text}>{item.label}</Text>
          {item.detail ? <Text size={13}>{item.detail}</Text> : null}</div>
        <Text size={13} color={toneColor(item.status === 'passed' ? 'success' : item.status === 'failed' ? 'danger' : item.status === 'warning' ? 'warning' : 'neutral')} bold>{item.status.toUpperCase()}</Text>
      </div>)}
    </div> : null}
    {section.kind === 'timeline' ? <div style={{ ...column, gap: 0 }}>
      {section.events.map((event, i) => <div key={i} style={{ ...row, gap: 22, padding: '15px 0', borderBottom: `1px solid ${C.border}` }}>
        <Text size={15} color={C.neon} bold style={{ width: 114 }}>{event.date ?? String(i + 1)}</Text>
        <div style={{ ...column, flex: 1, gap: 4 }}><Text size={17} color={C.text} bold>{event.label}</Text>
          {event.description ? <Text size={14}>{event.description}</Text> : null}</div>
      </div>)}
    </div> : null}
    {section.kind === 'diagram-cycle' ? <div style={{ ...column, gap: 15 }}>
      <div style={{ ...row, gap: 16 }}>
        {section.nodes.map((node, i) => <div key={i} style={{ ...column, flex: 1, gap: 8 }}>
          <Text size={22} color={toneColor(node.tone)} bold>{String(i + 1).padStart(2, '0')}</Text>
          <Text size={16} color={C.text} bold>{node.label}</Text>
          {node.description ? <Text size={14}>{node.description}</Text> : null}
          {i < section.nodes.length - 1 ? <Text size={20} color={C.neon}>→</Text> : null}
        </div>)}
      </div>
      <div style={{ ...row, gap: 8, alignItems: 'center' }}><Text size={20} color={C.neon}>←</Text>
        <div style={{ flex: 1, height: 1, backgroundColor: C.neonMuted }} /></div>
    </div> : null}
  </Panel>;
}

export function PortfolioFooter({ data }: { data: CanonicalInfographic }) {
  return <div data-region="footer" style={{ ...column, gap: 18, paddingTop: 22, borderTop: `2px solid ${C.neon}` }}>
    <div style={{ ...row, gap: 26 }}>
      {data.footer.facts.map((fact, i) => <div key={i} style={{ ...column, flex: 1, gap: 7 }}>
        <Text size={11} bold style={{ letterSpacing: 1.3 }}>{fact.label}</Text>
        <Text size={14} color={toneColor(fact.tone)} bold>{fact.value}</Text>
      </div>)}
    </div>
    {data.footer.disclaimer ? <Text size={11}>{data.footer.disclaimer}</Text> : null}
  </div>;
}

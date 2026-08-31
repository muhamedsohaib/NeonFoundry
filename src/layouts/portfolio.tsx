import type { ReactNode } from 'react';
import type { CanonicalInfographic, CanonicalSection, PortfolioTemplate } from '../schema/canonical.js';
import { TOKENS } from '../design-system/tokens.js';
import { column, row, Hero, Section, Panel, Metrics, ProgressGauge, ProcessFlow,
  PortfolioFooter, Text } from '../components/portfolio-primitives.js';

type Props = { data: CanonicalInfographic };

/** Pick narrative roles without discarding unfamiliar/additional source sections. */
function parts(data: CanonicalInfographic) {
  const remaining = new Set(data.sections);
  const emphasis = data.sourceHints.emphasisOrder;
  const ordered = [...data.sections].sort((a, b) => {
    const rank = (id: string) => emphasis.includes(id) ? emphasis.indexOf(id) : emphasis.length;
    return rank(a.id) - rank(b.id);
  });
  return {
    take<K extends CanonicalSection['kind']>(kind: K, name?: RegExp): Extract<CanonicalSection, { kind: K }> | undefined {
      const candidates = ordered.filter((s) => remaining.has(s) && s.kind === kind);
      const found = (name ? candidates.find((s) => name.test(`${s.id} ${s.title}`)) : undefined) ?? candidates[0];
      if (found) remaining.delete(found);
      return found as Extract<CanonicalSection, { kind: K }> | undefined;
    },
    rest: () => ordered.filter((s) => remaining.has(s)).map((section) => <Section key={section.id} section={section} />),
  };
}

function Split({ left, right, ratio = 1 }: { left: ReactNode; right: ReactNode; ratio?: number }) {
  return <div style={{ ...row, gap: 38 }}>
    <div style={{ ...column, flex: ratio, gap: 26 }}>{left}</div>
    <div style={{ ...column, flex: 1, gap: 26 }}>{right}</div>
  </div>;
}

function CatalogTroubleshooting({ data }: Props) {
  const p = parts(data);
  const summary = p.take('callout', /summary|remediation/);
  const diagnostic = p.take('metric-grid', /diagnostic/);
  const root = p.take('process-steps', /root.cause/);
  const framework = p.take('process-steps', /framework|remediation/);
  const comparison = p.take('comparison');
  const coverage = diagnostic?.metrics.find((m) => /coverage/i.test(m.label) && /^\d+(\.\d+)?%$/.test(m.value));
  return <>
    <Split ratio={1.12}
      left={<><Hero data={data} size={62} />{summary ? <Section section={summary} /> : null}</>}
      right={diagnostic ? <Panel section={diagnostic} style={{ padding: 26, backgroundColor: TOKENS.colors.surface, borderTop: `2px solid ${TOKENS.colors.neon}`, gap: 8 }}>
        <Metrics metrics={diagnostic.metrics.filter((m) => m !== coverage)} />
        {coverage ? <div style={{ ...column, paddingTop: 22 }}><ProgressGauge metric={coverage} /></div> : null}
      </Panel> : null} />
    {root ? <ProcessFlow section={root} /> : null}
    <Split ratio={1.3}
      left={framework ? <ProcessFlow section={framework} compact /> : null}
      right={comparison ? <Section section={comparison} /> : null} />
    {p.rest()}
  </>;
}

function ValidationQa({ data }: Props) {
  const p = parts(data);
  const summary = p.take('callout');
  const checklist = p.take('checklist');
  const metrics = p.take('metric-grid');
  const flow = p.take('process-steps');
  const prevention = p.take('bullet-list', /prevention/);
  const cycle = p.take('diagram-cycle');
  const passed = checklist?.items.filter((i) => i.status === 'passed').length ?? 0;
  const total = checklist?.items.length ?? 0;
  return <>
    <Split ratio={0.94}
      left={<><Hero data={data} size={60} />{summary ? <Section section={summary} /> : null}
        {total > 0 ? <div style={{ ...column, gap: 14, padding: 24, borderLeft: `3px solid ${TOKENS.colors.neon}`, backgroundColor: TOKENS.colors.surface }}>
          <Text size={40} color={passed === total ? TOKENS.colors.success : TOKENS.colors.warning} bold>{passed === total ? 'ALL CHECKS PASSED' : `${passed}/${total} CHECKS PASSED`}</Text>
        </div> : null}</>}
      right={checklist ? <Section section={checklist} /> : null} />
    {metrics ? <Section section={metrics} /> : null}
    <Split ratio={1.3}
      left={<>{flow ? <ProcessFlow section={flow} compact /> : null}{cycle ? <Section section={cycle} /> : null}</>}
      right={prevention ? <Section section={prevention} /> : null} />
    {p.rest()}
  </>;
}

function RootCauseInvestigation({ data }: Props) {
  const p = parts(data);
  const problem = p.take('callout');
  const flow = p.take('process-steps');
  const table = p.take('table-lite', /field/);
  const summary = p.take('table-lite', /summary|case/);
  const coverage = p.take('bullet-list', /coverage/);
  const impacts = p.take('bullet-list', /impact/);
  return <>
    <Split ratio={1.7} left={<><Hero data={data} size={62} />{problem ? <Section section={problem} /> : null}</>}
      right={coverage ? <Section section={coverage} /> : null} />
    {flow ? <ProcessFlow section={flow} /> : null}
    {table ? <Section section={table} /> : null}
    <Split ratio={1.5} left={summary ? <Section section={summary} /> : null}
      right={impacts ? <Section section={impacts} /> : null} />
    {p.rest()}
  </>;
}

function RemediationComparison({ data }: Props) {
  const p = parts(data);
  const summary = p.take('callout');
  const comparison = p.take('comparison');
  const changes = p.take('table-lite');
  const metrics = p.take('metric-grid');
  const process = p.take('process-steps');
  const evidence = p.take('bullet-list', /evidence|validation/);
  return <>
    <Split ratio={1.7} left={<Hero data={data} size={56} />} right={summary ? <Section section={summary} /> : null} />
    {comparison ? <Section section={comparison} /> : null}
    {changes ? <Section section={changes} /> : null}
    {metrics ? <Section section={metrics} /> : null}
    <Split ratio={1.3} left={process ? <ProcessFlow section={process} compact /> : null}
      right={evidence ? <Section section={evidence} /> : null} />
    {p.rest()}
  </>;
}

function StrategicApproach({ data }: Props) {
  const p = parts(data);
  const method = p.take('process-steps');
  const tools = p.take('bullet-list', /tools|data/);
  const methodology = p.take('bullet-list', /methodology/);
  const why = p.take('bullet-list', /why/);
  const outcomes = p.take('bullet-list', /outcome/);
  const timeline = p.take('timeline');
  return <>
    <Split ratio={2} left={<Hero data={data} size={68} />} right={why ? <Section section={why} /> : null} />
    {method ? <ProcessFlow section={method} /> : null}
    <Split ratio={0.8} left={tools ? <Section section={tools} /> : null}
      right={methodology ? <Section section={methodology} /> : null} />
    <Split ratio={1.6} left={timeline ? <Section section={timeline} /> : null}
      right={outcomes ? <Panel section={outcomes}><div style={{ ...column, gap: 16 }}>
        {outcomes.items.map((item, i) => <Text key={i} size={30} color={TOKENS.colors.neon} bold>{item}</Text>)}
      </div></Panel> : null} />
    {p.rest()}
  </>;
}

const compositions = {
  'catalog-troubleshooting': CatalogTroubleshooting,
  'validation-qa': ValidationQa,
  'root-cause-investigation': RootCauseInvestigation,
  'remediation-comparison': RemediationComparison,
  'strategic-approach': StrategicApproach,
};

export function PortfolioLayout({ data, template, width, height }: Props & {
  template: PortfolioTemplate; width: number; height: number;
}) {
  const Composition = compositions[template];
  return <div style={{ ...column, width, minHeight: height, padding: 44, gap: 30,
    color: TOKENS.colors.text, backgroundColor: TOKENS.colors.background,
    borderTop: `6px solid ${TOKENS.colors.neon}`, fontFamily: TOKENS.fontFamily }}>
    <div data-region="content" style={{ ...column, gap: 30 }}><Composition data={data} /></div>
    <PortfolioFooter data={data} />
  </div>;
}

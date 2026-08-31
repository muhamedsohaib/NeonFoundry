import { TOKENS } from '../design-system/tokens.js';
import type { RenderProfile } from '../qa/quality.js';
import type { CanonicalInfographic, CanonicalSection } from '../schema/canonical.js';
import {
  AssuranceBadge,
  ChecklistRow,
  FooterFacts,
  GlassCard,
  MetricTile,
  PosterShell,  SectionContent,
  SectionTitle,
} from '../components/primitives.js';

interface QaLayoutProps {
  data: CanonicalInfographic;
  profile: RenderProfile;
  width?: number;
  height?: number;
}

function SupportingPanel({ sections, flex = 0.94 }: { sections: CanonicalSection[]; flex?: number }) {
  const sharedTitle = sections.length > 1 && sections.every((section) => section.title === sections[0]?.title)
    ? sections[0]?.title
    : undefined;

  return (
    <GlassCard style={{ flex, minHeight: 0, gap: 10, padding: '16px 20px', overflow: 'hidden' }}>
      {sharedTitle ? <SectionTitle title={sharedTitle} compact /> : null}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 8 }}>
        {sections.map((section, index) => (
          <div key={section.id} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gap: 6, paddingTop: index === 0 ? 0 : 7, borderTop: index === 0 ? 'none' : `1px solid ${TOKENS.colors.border}` }}>
            {!sharedTitle ? <SectionTitle title={section.title} description={section.description} compact /> : null}
            <SectionContent section={section} compact />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
export function QaLayout({ data, profile, width = 1600, height = 1120 }: QaLayoutProps) {
  const checklist = data.sections.find((section) => section.kind === 'checklist');
  const metricSections = data.sections.filter((section) => section.kind === 'metric-grid');
  const metrics = [...data.hero.metrics, ...metricSections.flatMap((section) => section.metrics)];
  const process = data.sections.find((section) => section.kind === 'process-steps');
  const supporting = data.sections.filter((section) => section !== checklist && section.kind !== 'metric-grid' && section !== process);
  const cycle = supporting.find((section) => section.kind === 'diagram-cycle');
  const leftSections = process ? [process, ...(cycle ? [cycle] : [])] : cycle ? [cycle] : supporting.slice(0, 1);
  const rightSupporting = supporting.filter((section) => !leftSections.includes(section));
  const passed = checklist?.items.filter((item) => item.status === 'passed').length ?? 0;
  const total = checklist?.items.length ?? 0;
  const padding = Math.round(TOKENS.spacing.lg * profile.paddingScale);

  return (
    <PosterShell width={width} height={height} padding={padding}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: TOKENS.spacing.md }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '51%', minWidth: 0, gap: TOKENS.spacing.md }}>
          <GlassCard accent style={{ flex: 1, minHeight: 0, justifyContent: 'space-between', padding: '34px 36px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: TOKENS.spacing.sm }}>
              <span style={{ alignSelf: 'flex-start', padding: '7px 12px', borderRadius: TOKENS.radius.pill, backgroundColor: TOKENS.colors.surfaceMuted, border: `1px solid ${TOKENS.colors.neonMuted}`, fontSize: 11, fontWeight: 700, color: TOKENS.colors.neon, letterSpacing: 1.3 }}>
                {data.hero.eyebrow ?? 'QUALITY ASSURANCE / VALIDATION'}
              </span>
              <span style={{ fontSize: Math.round(60 * profile.heroScale), fontWeight: 700, lineHeight: 1.02, letterSpacing: -2, color: TOKENS.colors.text }}>
                {data.hero.title}
              </span>
              {data.hero.highlight ? <span style={{ fontSize: Math.round(32 * profile.heroScale), fontWeight: 700, lineHeight: 1.08, color: TOKENS.colors.neon }}>{data.hero.highlight}</span> : null}
              {data.hero.subtitle ? <span style={{ maxWidth: 660, fontSize: 14, lineHeight: 1.45, color: TOKENS.colors.textMuted }}>{data.hero.subtitle}</span> : null}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: TOKENS.spacing.md }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.hero.tags.map((tag, index) => <span key={`${tag}-${index}`} style={{ padding: '7px 10px', borderRadius: TOKENS.radius.sm, backgroundColor: TOKENS.colors.surfaceElevated, border: `1px solid ${TOKENS.colors.border}`, color: TOKENS.colors.text, fontSize: 10, fontWeight: 700 }}>{tag}</span>)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: `1px solid ${TOKENS.colors.border}` }}>
                <span style={{ fontSize: 10, color: TOKENS.colors.textMuted, letterSpacing: 1.2 }}>SEMANTIC RECONSTRUCTION</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: TOKENS.colors.neon }}>QA / {data.meta.sourceMode.toUpperCase()}</span>
              </div>
            </div>
          </GlassCard>

          {leftSections.length > 0 ? <SupportingPanel sections={leftSections} flex={1} /> : (
            <GlassCard style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: TOKENS.colors.textMuted, fontSize: 13 }}>No process material supplied.</span>
            </GlassCard>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: '49%', minWidth: 0, gap: TOKENS.spacing.md }}>
          {checklist ? (
            <GlassCard style={{ flex: 1.2, minHeight: 0, gap: 10, padding: '18px 20px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: TOKENS.spacing.md }}>
                <SectionTitle title={checklist.title} description={checklist.description} compact />
                <AssuranceBadge passed={passed} total={total} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {checklist.items.map((item, index) => <ChecklistRow key={`${item.label}-${index}`} item={item} compact />)}
              </div>
            </GlassCard>
          ) : null}

          {metrics.length > 0 ? (
            <GlassCard style={{ flex: 0.86, minHeight: 0, gap: 10, padding: '17px 20px', overflow: 'hidden' }}>
              <SectionTitle title={metricSections[0]?.title ?? 'VALIDATION METRICS'} compact />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                {metrics.map((metric, index) => (
                  <div key={`${metric.label}-${index}`} style={{ display: 'flex', width: '48%', flexGrow: 1 }}>
                    <MetricTile metric={metric} compact />
                  </div>
                ))}
              </div>
            </GlassCard>
          ) : null}

          {rightSupporting.length > 0 ? <SupportingPanel sections={rightSupporting} /> : null}
        </div>
      </div>

      <FooterFacts facts={data.footer.facts} disclaimer={data.footer.disclaimer} compact />
    </PosterShell>
  );
}



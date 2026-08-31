import { TOKENS } from '../design-system/tokens.js';
import type { RenderProfile } from '../qa/quality.js';
import type { CanonicalInfographic } from '../schema/canonical.js';
import {
  FooterFacts,
  GlassCard,
  MetricTile,
  PosterShell,
  SectionCard,
} from '../components/primitives.js';

export interface LayoutProps {
  data: CanonicalInfographic;
  profile: RenderProfile;
  width?: number;
  height?: number;
}

export function DashboardLayout({ data, profile, width = 1600, height = 1120 }: LayoutProps) {
  const metricSections = data.sections.filter((section) => section.kind === 'metric-grid');
  const metrics = [...data.hero.metrics, ...metricSections.flatMap((section) => section.metrics)];
  const contentSections = data.sections.filter((section) => section.kind !== 'metric-grid');
  const columns = data.sourceHints.preferredColumns ?? profile.columns;
  const padding = Math.round(TOKENS.spacing.xxl * profile.paddingScale);

  return (
    <PosterShell width={width} height={height} padding={padding}>
      <GlassCard accent style={{
        minHeight: 224,
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        gap: TOKENS.spacing.xl,
        padding: '30px 36px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, justifyContent: 'space-between', gap: TOKENS.spacing.md }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: TOKENS.spacing.xs }}>
            <span style={{ fontSize: TOKENS.type.eyebrow, fontWeight: 700, color: TOKENS.colors.neon, letterSpacing: TOKENS.type.trackingWide }}>
              {data.hero.eyebrow ?? `${data.meta.intent.toUpperCase()} / SIGNAL BRIEF`}
            </span>
            <span style={{
              maxWidth: 980,
              fontSize: Math.round(TOKENS.type.hero * profile.heroScale),
              fontWeight: 700,
              lineHeight: TOKENS.type.lineHeightTight,
              letterSpacing: TOKENS.type.trackingTight,
              color: TOKENS.colors.text,
            }}>
              {data.hero.title}
            </span>
            {data.hero.highlight ? (
              <span style={{ fontSize: 26, fontWeight: 700, color: TOKENS.colors.neon, letterSpacing: -0.5 }}>
                {data.hero.highlight}
              </span>
            ) : null}
          </div>
          {data.hero.subtitle ? <span style={{ maxWidth: 900, fontSize: 15, lineHeight: 1.4, color: TOKENS.colors.textMuted }}>{data.hero.subtitle}</span> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', width: 320, flexShrink: 0, justifyContent: 'space-between', alignItems: 'flex-end', gap: TOKENS.spacing.md }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
            {data.hero.tags.map((tag, index) => (
              <span key={`${tag}-${index}`} style={{ padding: '7px 11px', fontSize: 10, fontWeight: 700, color: TOKENS.colors.neon, border: `1px solid ${TOKENS.colors.borderStrong}`, borderRadius: TOKENS.radius.pill, backgroundColor: TOKENS.colors.surfaceMuted }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </GlassCard>

      {metrics.length > 0 ? (
        <GlassCard style={{ gap: TOKENS.spacing.md, padding: '22px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.4, color: TOKENS.colors.text }}>KEY PERFORMANCE SIGNALS</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: TOKENS.spacing.sm }}>
            {metrics.map((metric, index) => (
              <div key={`${metric.label}-${index}`} style={{ display: 'flex', width: columns === 2 ? '48%' : '31%', flexGrow: 1 }}>
                <MetricTile metric={metric} compact={profile.density === 'compact'} />
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}

      <div style={{ display: 'flex', flex: 1, minHeight: 0, flexWrap: 'wrap', alignItems: 'stretch', gap: TOKENS.spacing.md }}>
        {contentSections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            compact
            style={{
              flex: 1,
              minWidth: contentSections.length === 1 ? '100%' : '46%',
              padding: '20px 24px',
            }}
          />
        ))}
        {contentSections.length === 0 ? (
          <GlassCard style={{ flex: 1, alignItems: 'center', justifyContent: 'center', color: TOKENS.colors.textMuted }}>
            <span style={{ fontSize: 15 }}>No supporting sections supplied.</span>
          </GlassCard>
        ) : null}
      </div>

      <FooterFacts facts={data.footer.facts} disclaimer={data.footer.disclaimer} compact />
    </PosterShell>
  );
}

import { TOKENS } from '../design-system/tokens.js';
import { FooterFacts, GlassCard, PosterShell, SectionCard } from '../components/primitives.js';
import type { RenderProfile } from '../qa/quality.js';
import type { CanonicalInfographic, CanonicalSection } from '../schema/canonical.js';

export interface ComparisonLayoutProps {
  data: CanonicalInfographic;
  profile: RenderProfile;
  width?: number;
  height?: number;
}

function priority(section: CanonicalSection): number {
  if (section.kind === 'comparison') return 0;
  if (section.kind === 'table-lite') return 1;
  if (section.kind === 'bullet-list' && /evidence|validation/i.test(section.title)) return 2;
  return 3;
}

function leftPriority(section: CanonicalSection): number {
  if (section.kind === 'callout') return 0;
  if (section.kind === 'process-steps') return 1;
  if (section.kind === 'metric-grid') return 2;
  return 3;
}

function HeroBlock({ data, profile }: { data: CanonicalInfographic; profile: RenderProfile }) {
  return (
    <GlassCard accent style={{ gap: 14, padding: '24px 28px', minHeight: 238 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: TOKENS.colors.neon, letterSpacing: 1.8 }}>
        {data.hero.eyebrow ?? 'CASE STUDY'}
      </span>
      <span style={{ fontSize: Math.round(48 * profile.heroScale), fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.4 }}>
        {data.hero.title}
      </span>
      {data.hero.subtitle ? (
        <span style={{ fontSize: 15, fontWeight: 700, color: TOKENS.colors.neon }}>{data.hero.subtitle}</span>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {data.hero.tags.map((tag, index) => (
          <span key={`${tag}-${index}`} style={{ padding: '6px 9px', fontSize: 9, fontWeight: 700, color: TOKENS.colors.text, border: `1px solid ${TOKENS.colors.borderStrong}`, borderRadius: TOKENS.radius.pill }}>
            {tag}
          </span>
        ))}
      </div>
    </GlassCard>
  );
}

export function ComparisonLayout({ data, profile, width = 1600, height = 1120 }: ComparisonLayoutProps) {
  const leftKinds = new Set<CanonicalSection['kind']>(['callout', 'process-steps', 'metric-grid', 'diagram-cycle']);
  const left = data.sections.filter((section) => leftKinds.has(section.kind)).sort((a, b) => leftPriority(a) - leftPriority(b));
  const right = data.sections.filter((section) => !leftKinds.has(section.kind)).sort((a, b) => priority(a) - priority(b));
  const padding = Math.round(24 * profile.paddingScale);

  return (
    <PosterShell width={width} height={height} padding={padding}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '39%', minWidth: 0, gap: 12 }}>
          <HeroBlock data={data} profile={profile} />
          {left.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              compact
              style={{ padding: '16px 18px', ...(section.kind === 'metric-grid' ? { flex: 1 } : {}) }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: 12 }}>
          {right.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              compact
              style={{
                padding: '16px 18px',
              }}
            />
          ))}
          {right.length === 0 ? (
            <GlassCard style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, color: TOKENS.colors.textMuted }}>No right-side comparison sections supplied.</span>
            </GlassCard>
          ) : null}
        </div>
      </div>
      <FooterFacts facts={data.footer.facts} disclaimer={data.footer.disclaimer} compact />
    </PosterShell>
  );
}



import type { CanonicalInfographic, PortfolioTemplate } from '../schema/canonical.js';
import type { LayoutDecision, RenderLayout } from './select-layout.js';

export const TEMPLATE_FAMILIES: Record<PortfolioTemplate, RenderLayout> = {
  'catalog-troubleshooting': 'dashboard',
  'validation-qa': 'qa',
  'root-cause-investigation': 'dashboard',
  'remediation-comparison': 'comparison',
  'strategic-approach': 'dashboard',
};

/** A template composes a family; it never overrides the selected family. */
export function selectTemplate(data: CanonicalInfographic, decision: LayoutDecision): PortfolioTemplate | undefined {
  const explicit = data.sourceHints.template;
  if (explicit) return TEMPLATE_FAMILIES[explicit] === decision.selected ? explicit : undefined;
  const title = data.hero.title;
  const has = (kind: CanonicalInfographic['sections'][number]['kind']) => data.sections.some((s) => s.kind === kind);
  let template: PortfolioTemplate | undefined;
  if (/catalog troubleshooting/i.test(title) && has('metric-grid') && has('process-steps') && has('comparison')) {
    template = 'catalog-troubleshooting';
  } else if (/validat|quality assurance/i.test(title) && has('checklist')) {
    template = 'validation-qa';
  } else if (/root.cause investigation/i.test(title) && has('table-lite')) {
    template = 'root-cause-investigation';
  } else if (/before.*after.*catalog remediation/i.test(title) && has('comparison') && has('table-lite')) {
    template = 'remediation-comparison';
  } else if (/strategic approach/i.test(title) && has('timeline') && has('process-steps')) {
    template = 'strategic-approach';
  }
  return template && TEMPLATE_FAMILIES[template] === decision.selected ? template : undefined;
}

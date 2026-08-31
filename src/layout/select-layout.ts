import type { CanonicalInfographic, LayoutFamily } from '../schema/canonical.js';

export type RenderLayout = 'qa' | 'dashboard' | 'comparison';

export type LayoutDecision = {
  requested: LayoutFamily;
  selected: RenderLayout;
  reason: string;
  fallbackFrom?: Exclude<LayoutFamily, 'auto' | 'qa' | 'dashboard' | 'comparison'>;
};

function isBeforeAfterComparison(data: CanonicalInfographic): boolean {
  if (data.meta.intent === 'comparison' || data.sourceHints.sourceLayoutGuess === 'comparison') return true;
  const comparisonSections = data.sections.filter((section) => section.kind === 'comparison');
  if (comparisonSections.length === 0) return false;
  const text = [
    data.hero.title,
    data.hero.subtitle ?? '',
    ...comparisonSections.map((section) => `${section.title} ${section.columns.map((column) => column.label).join(' ')}`),
  ].join(' ').toLowerCase();
  return text.includes('before') && text.includes('after');
}

export function selectLayout(
  data: CanonicalInfographic,
  requested?: LayoutFamily,
): LayoutDecision {
  const requestedLayout = requested ?? data.meta.layoutFamily;

  if (requestedLayout === 'qa' || requestedLayout === 'dashboard' || requestedLayout === 'comparison') {
    return {
      requested: requestedLayout,
      selected: requestedLayout,
      reason: `Using the explicitly requested ${requestedLayout} layout.`,
    };
  }

  if (requestedLayout !== 'auto') {
    return {
      requested: requestedLayout,
      selected: 'dashboard',
      reason: `The requested ${requestedLayout} layout is unsupported, so dashboard was selected.`,
      fallbackFrom: requestedLayout,
    };
  }

  if (isBeforeAfterComparison(data)) {
    return {
      requested: requestedLayout,
      selected: 'comparison',
      reason: 'Auto-selected comparison to preserve before/after remediation structure.',
    };
  }

  const checklistSections = data.sections.filter((section) => section.kind === 'checklist');
  const metricGridSections = data.sections.filter((section) => section.kind === 'metric-grid');
  const checklistItems = checklistSections.reduce((total, section) => total + section.items.length, 0);
  const isChecklistHeavy = data.meta.intent === 'checklist'
    || checklistItems >= 4
    || checklistSections.length > metricGridSections.length;

  if (isChecklistHeavy) {
    return {
      requested: requestedLayout,
      selected: 'qa',
      reason: 'Auto-selected QA for checklist-oriented content.',
    };
  }

  return {
    requested: requestedLayout,
    selected: 'dashboard',
    reason: 'Auto-selected dashboard because the content is not checklist- or comparison-oriented.',
  };
}

import type { CanonicalInfographic, LayoutFamily } from '../schema/canonical.js';

export type LayoutDecision = {
  requested: LayoutFamily;
  selected: 'qa' | 'dashboard';
  reason: string;
  fallbackFrom?: Exclude<LayoutFamily, 'auto' | 'qa' | 'dashboard'>;
};

export function selectLayout(
  data: CanonicalInfographic,
  requested?: LayoutFamily,
): LayoutDecision {
  const requestedLayout = requested ?? data.meta.layoutFamily;

  if (requestedLayout === 'qa' || requestedLayout === 'dashboard') {
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
    reason: 'Auto-selected dashboard because the content is not checklist-oriented.',
  };
}

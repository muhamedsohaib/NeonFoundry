import type { CanonicalInfographic, CanonicalSection } from '../schema/canonical.js';

export type FidelityIssueCode =
  | 'placeholder-content'
  | 'semantic-thin'
  | 'comparison-thin'
  | 'section-kind-mismatch'
  | 'evidence-thin';

export interface FidelityIssue {
  code: FidelityIssueCode;
  message: string;
  sectionId?: string;
}

export interface SemanticFidelityReport {
  passed: boolean;
  score: number;
  concreteFacts: number;
  placeholderCount: number;
  issues: FidelityIssue[];
}

const PLACEHOLDER_PATTERNS = [
  /^\s*\//,
  /(?:^|[_\s-])(block|column|grid|flow|table)(?:$|[_\s-])/i,
  /^(before_after|process_steps|catalog_health|evidence_and_validation|exact_field_level)/i,
];

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

function sectionFacts(section: CanonicalSection): string[] {
  switch (section.kind) {
    case 'metric-grid': return section.metrics.map((m) => `${m.label}: ${m.value}${m.detail ? ` ${m.detail}` : ''}`);
    case 'checklist': return section.items.map((item) => `${item.label}${item.detail ? ` ${item.detail}` : ''}`);
    case 'bullet-list': return section.items;
    case 'process-steps': return section.steps.map((step) => `${step.label}${step.description ? ` ${step.description}` : ''}`);
    case 'timeline': return section.events.map((event) => `${event.date ?? ''} ${event.label} ${event.description ?? ''}`.trim());
    case 'comparison': return section.columns.flatMap((column) => column.items);
    case 'callout': return [section.body];
    case 'diagram-cycle': return section.nodes.map((node) => `${node.label}${node.description ? ` ${node.description}` : ''}`);
    case 'table-lite': return section.rows.map((row) => row.filter(Boolean).join(' | '));
  }
}

function hasBeforeAfterSignal(data: CanonicalInfographic): boolean {
  const text = [
    data.hero.title,
    data.hero.subtitle ?? '',
    ...data.sections.map((section) => `${section.title} ${section.description ?? ''}`),
  ].join(' ').toLowerCase();
  return text.includes('before') && text.includes('after');
}

function addKindMismatchIssues(data: CanonicalInfographic, issues: FidelityIssue[]): void {
  for (const section of data.sections) {
    const title = section.title.toLowerCase();
    if (title.includes('process') && section.kind !== 'process-steps') {
      issues.push({ code: 'section-kind-mismatch', message: `Process section "${section.title}" was not extracted as process steps.`, sectionId: section.id });
    }
    if ((title.includes('health') || title.includes('improvement')) && section.kind === 'comparison') {
      issues.push({ code: 'section-kind-mismatch', message: `Metrics section "${section.title}" was reduced to a comparison placeholder.`, sectionId: section.id });
    }
    if (title.includes('field-level changes') && section.kind !== 'table-lite') {
      issues.push({ code: 'section-kind-mismatch', message: `Field-change section "${section.title}" was not extracted as a concrete table.`, sectionId: section.id });
    }
  }
}

function addExpectedStructureIssues(data: CanonicalInfographic, issues: FidelityIssue[]): void {
  const emphasis = data.sourceHints.emphasisOrder.join(' ').toLowerCase();
  const visualHints = data.sourceHints.visualNotes.join(' ').toLowerCase();
  const sourceText = [
    data.hero.title, data.hero.subtitle ?? '', data.hero.highlight ?? '', ...data.hero.tags,
    ...data.sections.map((section) => `${section.title} ${section.description ?? ''} ${sectionFacts(section).join(' ')}`),
    emphasis, visualHints,
  ].join(' ').toLowerCase();

  const fieldTableExpected = /(field[_\s-]*(?:level[_\s-]*)?(?:change|mapping)|exact[_\s-]*field)/i.test(emphasis)
    || (hasBeforeAfterSignal(data) && /(field-level fixes|exact field level)/i.test(sourceText));
  if (fieldTableExpected && !data.sections.some((section) => section.kind === 'table-lite')) {
    issues.push({ code: 'section-kind-mismatch', message: 'Source hierarchy signals an exact field-change table, but no concrete field-change table was preserved.' });
  }

  const processExpected = /(process|workflow|steps?\s+from|detection\s+to\s+live|detected.*live)/i.test(`${emphasis} ${visualHints}`);
  if (processExpected && !data.sections.some((section) => section.kind === 'process-steps')) {
    issues.push({ code: 'section-kind-mismatch', message: 'Source hierarchy signals a remediation process, but no concrete process steps were preserved.' });
  }

  const metricsExpected = /(catalog health improvement|health metrics?|results? metrics?)/i.test(sourceText);
  if (metricsExpected && !data.sections.some((section) => section.kind === 'metric-grid')) {
    issues.push({ code: 'section-kind-mismatch', message: 'Source hierarchy signals catalog-health metrics, but no concrete metric grid was preserved.' });
  }

  const evidenceExpected = /(evidence|validation)/i.test(emphasis)
    || data.sections.some((section) => /(evidence|validation)/i.test(section.title));
  if (evidenceExpected) {
    const evidenceFacts = data.sections
      .filter((section) => /(evidence|validation)/i.test(section.title))
      .flatMap(sectionFacts);
    const concreteValidation = evidenceFacts.filter((fact) =>
      /(change log|qa checks?|screenshot proof|impact verified|quality assured|timestamps|manual qa|preventive controls)/i.test(fact));
    if (concreteValidation.length < 2) {
      issues.push({ code: 'evidence-thin', message: 'Evidence & validation section lacks concrete validation evidence from the source.' });
    }
  }
}

export function assessSemanticFidelity(data: CanonicalInfographic): SemanticFidelityReport {
  if (data.meta.sourceMode !== 'image') {
    return { passed: true, score: 100, concreteFacts: 0, placeholderCount: 0, issues: [] };
  }

  const issues: FidelityIssue[] = [];
  const facts = data.sections.flatMap(sectionFacts);
  const placeholderFacts = facts.filter(isPlaceholder);
  const concreteFacts = facts.filter((fact) => !isPlaceholder(fact) && fact.trim().length >= 3).length;

  if (placeholderFacts.length > 0) {
    issues.push({
      code: 'placeholder-content',
      message: `${placeholderFacts.length} placeholder/descriptive value(s) were returned instead of source content.`,
    });
  }

  if (data.sections.length > 0 && concreteFacts === 0) {
    issues.push({
      code: 'semantic-thin',
      message: 'No concrete section facts were extracted from the source image.',
    });
  }

  if (hasBeforeAfterSignal(data)) {
    const comparisons = data.sections.filter((section) => section.kind === 'comparison');
    const substantial = comparisons.some((section) => {
      const before = section.columns.find((column) => /\bbefore\b/i.test(column.label) && !/\bafter\b/i.test(column.label));
      const after = section.columns.find((column) => /\bafter\b/i.test(column.label) && !/\bbefore\b/i.test(column.label));
      if (!before || !after) return false;
      const beforeItems = before.items.filter((item) => !isPlaceholder(item));
      const afterItems = after.items.filter((item) => !isPlaceholder(item));
      return beforeItems.length >= 2 && afterItems.length >= 2
        && JSON.stringify(beforeItems) !== JSON.stringify(afterItems);
    });
    if (!substantial) {
      issues.push({ code: 'comparison-thin', message: 'Before/after source did not yield two concrete comparison columns.' });
    }
  }

  addKindMismatchIssues(data, issues);
  addExpectedStructureIssues(data, issues);
  const score = Math.max(0, 100 - placeholderFacts.length * 12 - issues.length * 10);
  return { passed: issues.length === 0, score, concreteFacts, placeholderCount: placeholderFacts.length, issues };
}

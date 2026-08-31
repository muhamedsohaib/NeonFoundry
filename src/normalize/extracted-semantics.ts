import {
  parseCanonicalInfographic,
  type CanonicalInfographic,
  type CanonicalSection,
} from '../schema/canonical.js';

type ComparisonSection = Extract<CanonicalSection, { kind: 'comparison' }>;
type TableSection = Extract<CanonicalSection, { kind: 'table-lite' }>;
type ProcessSection = Extract<CanonicalSection, { kind: 'process-steps' }>;
type MetricGridSection = Extract<CanonicalSection, { kind: 'metric-grid' }>;
type BulletSection = Extract<CanonicalSection, { kind: 'bullet-list' }>;

type ComparisonColumn = ComparisonSection['columns'][number];

function signal(section: CanonicalSection): string {
  return `${section.id} ${section.title} ${section.description ?? ''}`.toLowerCase();
}

function findColumn(section: ComparisonSection, pattern: RegExp): ComparisonColumn | undefined {
  return section.columns.find((column) => pattern.test(column.label));
}

function isFieldMapping(section: CanonicalSection): boolean {
  if (section.kind !== 'comparison') return false;
  return /(field.*(?:change|mapping)|(?:change|mapping).*field)/i.test(signal(section));
}
function comparisonToTable(section: ComparisonSection): TableSection | null {
  const field = findColumn(section, /^\s*field\s*$/i);
  const before = findColumn(section, /\bbefore\b/i);
  const after = findColumn(section, /\bafter\b/i);
  const impact = findColumn(section, /\bimpact\b/i);
  if (!field || !before || !after) return null;

  const columns = ['FIELD', 'BEFORE', 'AFTER', ...(impact ? ['CHANGE IMPACT'] : [])];
  const rowCount = Math.max(field.items.length, before.items.length, after.items.length);
  const rows = Array.from({ length: rowCount }, (_, index) => [
    field.items[index] ?? '',
    before.items[index] ?? '',
    after.items[index] ?? '',
    ...(impact ? [impact.items[index] ?? ''] : []),
  ]).filter((row) => row.some((cell) => cell.trim().length > 0));

  return {
    id: section.id,
    kind: 'table-lite',
    title: 'EXACT FIELD-LEVEL CHANGES',
    description: section.description,
    tone: section.tone,
    columns,
    rows,
  };
}
const PROCESS_RANK = new Map([
  ['detected', 0],
  ['identified', 0],
  ['corrected', 1],
  ['remediated', 1],
  ['validated', 2],
  ['verified', 2],
  ['live', 3],
]);

function comparisonToProcess(section: ComparisonSection): CanonicalSection | null {
  if (!/(process|workflow|\bflow\b)/i.test(signal(section)) || section.columns.length < 3) return null;
  const steps = section.columns.map((column) => {
    const rawDescription = column.items.join(' • ');
    const stepNumber = column.label.match(/^\s*STEP\s+(\d+)\s*$/i)?.[1];
    const namedDescription = rawDescription.match(/^([^:]{2,30}):\s*(.+)$/);
    return {
      label: stepNumber && namedDescription ? namedDescription[1]!.trim() : column.label,
      description: stepNumber && namedDescription ? namedDescription[2]!.trim() : rawDescription || undefined,
      tone: column.tone,
      stepNumber: stepNumber ? Number(stepNumber) : undefined,
    };
  });
  if (steps.every((step) => step.stepNumber !== undefined)) {
    steps.sort((a, b) => (a.stepNumber ?? 99) - (b.stepNumber ?? 99));
  } else if (steps.every((step) => PROCESS_RANK.has(step.label.trim().toLowerCase()))) {
    steps.sort((a, b) => (PROCESS_RANK.get(a.label.trim().toLowerCase()) ?? 99)
      - (PROCESS_RANK.get(b.label.trim().toLowerCase()) ?? 99));
  }
  return {
    id: section.id, kind: 'process-steps', title: section.title, description: section.description, tone: section.tone,
    steps: steps.map(({ stepNumber: _stepNumber, ...step }) => step),
  };
}

function normalizeProcessSection(section: ProcessSection): ProcessSection {
  const steps = section.steps.map((step) => {
    const stepNumber = step.label.match(/^\s*STEP\s+(\d+)\s*$/i)?.[1];
    const named = step.description?.match(/^([A-Z][A-Z\s_-]{2,30})\s*(?:\/|:|—|-)\s*(.+)$/);
    const semanticLabel = named?.[1]?.trim();
    const recognized = semanticLabel && PROCESS_RANK.has(semanticLabel.toLowerCase());
    return {
      ...step,
      label: recognized ? semanticLabel : step.label,
      description: recognized ? named?.[2]?.trim() : step.description,
      stepNumber: stepNumber ? Number(stepNumber) : undefined,
    };
  });
  if (steps.every((step) => step.stepNumber !== undefined)) {
    steps.sort((a, b) => (a.stepNumber ?? 99) - (b.stepNumber ?? 99));
  } else if (steps.every((step) => PROCESS_RANK.has(step.label.trim().toLowerCase()))) {
    steps.sort((a, b) => (PROCESS_RANK.get(a.label.trim().toLowerCase()) ?? 99)
      - (PROCESS_RANK.get(b.label.trim().toLowerCase()) ?? 99));
  }
  return { ...section, steps: steps.map(({ stepNumber: _stepNumber, ...step }) => step) };
}

function comparisonToMetrics(section: ComparisonSection): CanonicalSection | null {
  const looksMetricLike = /(health|metrics?|improvement|results?|outcomes?)/i.test(signal(section));
  if (!looksMetricLike || section.columns.length < 2) return null;
  if (!section.columns.every((column) => column.items.length === 1)) return null;
  const columns = [...section.columns];
  if (columns.every((column) => /^\s*METRIC\s+\d+\s*$/i.test(column.label))) {
    columns.sort((a, b) => Number(a.label.match(/\d+/)?.[0] ?? 99) - Number(b.label.match(/\d+/)?.[0] ?? 99));
  }
  return {
    id: section.id,
    kind: 'metric-grid',
    title: section.title,
    description: section.description,
    tone: section.tone,
    metrics: columns.map((column) => {
      const raw = column.items[0]!;
      const numeric = raw.match(/^(\d+(?:\.\d+)?%?)\s+(.+)$/);
      if (numeric) return { label: numeric[2]!.trim(), value: numeric[1]!, tone: column.tone };
      if (/^\s*METRIC\s+\d+\s*$/i.test(column.label) && /integrity.*restored/i.test(raw)) {
        return { label: 'CATALOG HEALTH', value: raw, tone: column.tone };
      }
      return { label: column.label, value: raw, tone: column.tone };
    }),
  };
}

function normalizeMetricGridSection(section: MetricGridSection): MetricGridSection {
  if (!/(health|metrics?|improvement|results?|outcomes?)/i.test(signal(section))) return section;
  const sectionLabel = normalizedText(section.title);
  return {
    ...section,
    metrics: section.metrics.map((metric) => {
      const genericLabel = normalizedText(metric.label) === sectionLabel || /^\s*METRIC\s+\d+\s*$/i.test(metric.label);
      if (!genericLabel) return metric;
      const detail = metric.detail?.trim();
      if (detail && /integrity.*restored/i.test(detail)) {
        return { ...metric, label: 'CATALOG HEALTH', value: detail, detail: undefined };
      }
      if (detail) return { ...metric, label: detail, detail: undefined };
      const numeric = metric.value.match(/^(\d+(?:\.\d+)?%?)\s+(.+)$/);
      if (numeric) return { ...metric, label: numeric[2]!.trim(), value: numeric[1]! };
      return metric;
    }),
  };
}

function comparisonToEvidence(section: ComparisonSection): CanonicalSection | null {
  if (!/(evidence|validation|proof|assurance)/i.test(signal(section))) return null;
  const items = section.columns.flatMap((column) => {
    if (/^(section\s+header|header|title)$/i.test(column.label.trim())) {
      return column.items.filter((item) => item.trim().toLowerCase() !== section.title.trim().toLowerCase())
        .map((item) => `${column.label} — ${item}`);
    }
    return column.items.map((item) => {
      const concrete = item.match(/^([^:]{2,32}):\s*(.+)$/);
      if (/^(validation\s+step|evidence\s+item|item)$/i.test(column.label.trim()) && concrete) {
        return `${concrete[1]!.trim()} — ${concrete[2]!.trim()}`;
      }
      return `${column.label} — ${item}`;
    });
  });
  if (items.length === 0) return null;
  return { id: section.id, kind: 'bullet-list', title: section.title, description: section.description, tone: section.tone, items };
}

const FIELD_CHANGE_BULLET = /^FIELD CHANGES\s*[—-]\s*([^:]+):\s*(.*?)\s*(?:->|→)\s*(.*?)\s*\|\s*(.+)$/i;

function bulletFieldTable(section: BulletSection): TableSection | null {
  const rows = section.items.flatMap((item) => {
    const match = item.match(FIELD_CHANGE_BULLET);
    return match ? [[match[1]!.trim(), match[2]!.trim(), match[3]!.trim(), match[4]!.trim()]] : [];
  });
  if (rows.length < 2) return null;
  return {
    id: `${section.id}-field-changes`,
    kind: 'table-lite',
    title: 'EXACT FIELD-LEVEL CHANGES',
    columns: ['FIELD', 'BEFORE', 'AFTER', 'CHANGE IMPACT'],
    rows,
  };
}

function withoutFieldChangeBullets(section: BulletSection): BulletSection {
  return { ...section, items: section.items.filter((item) => !FIELD_CHANGE_BULLET.test(item)) };
}

function splitFlattenedHealthEvidence(section: BulletSection): CanonicalSection[] | null {
  const healthPayloads = section.items.flatMap((item) => {
    const match = item.match(/^CATALOG HEALTH IMPROVEMENT\s*[?-]\s*(.+)$/i);
    return match ? [match[1]!.trim()] : [];
  });
  const evidencePayloads = section.items.flatMap((item) => {
    const match = item.match(/^EVIDENCE\s*&\s*VALIDATION\s*[?-]\s*(.+)$/i);
    return match ? [match[1]!.trim()] : [];
  });
  if (healthPayloads.length < 2 && evidencePayloads.length < 2) return null;

  const repaired: CanonicalSection[] = [];
  if (healthPayloads.length >= 2) {
    repaired.push({
      id: `${section.id}-health`, kind: 'metric-grid', title: 'CATALOG HEALTH IMPROVEMENT', tone: section.tone,
      metrics: healthPayloads.map((payload) => {
        const numeric = payload.match(/^(\d+(?:\.\d+)?%?)\s+(.+)$/);
        if (numeric) return { label: numeric[2]!.trim(), value: numeric[1]! };
        if (/integrity.*restored/i.test(payload)) return { label: 'CATALOG HEALTH', value: payload };
        return { label: payload, value: 'RESTORED' };
      }),
    });
  }
  if (evidencePayloads.length >= 2) {
    repaired.push({
      id: `${section.id}-evidence`, kind: 'bullet-list', title: 'EVIDENCE & VALIDATION', tone: section.tone,
      items: evidencePayloads.map((payload) => {
        const concrete = payload.match(/^([^:]{2,32}):\s*(.+)$/);
        return concrete ? `${concrete[1]!.trim()} ? ${concrete[2]!.trim()}` : payload;
      }),
    });
  }
  const consumed = section.items.filter((item) => !/^(CATALOG HEALTH IMPROVEMENT|EVIDENCE\s*&\s*VALIDATION)\s*[?-]/i.test(item));
  if (consumed.length > 0) repaired.push({ ...section, items: consumed });
  return repaired;
}

function splitMergedStatus(raw: string): string[] {
  const [status, detail = ''] = raw.split('|', 2).map((part) => part.trim());
  const list = detail.replace(/^(?:red|green)\s+list:\s*/i, '').split(/,\s*/).map((item) => item.trim()).filter(Boolean);
  return [status, ...list].filter(Boolean);
}

function repairMergedBeforeAfter(section: ComparisonSection): ComparisonSection | null {
  const items = unique(section.columns.flatMap((column) => column.items));
  const before = items.find((item) => /variation status:\s*suppressed/i.test(item));
  const after = items.find((item) => /variation status:\s*active/i.test(item));
  if (!before || !after) return null;
  return {
    ...section,
    title: 'BEFORE vs AFTER REMEDIATION',
    columns: [
      { label: 'BEFORE REMEDIATION', items: splitMergedStatus(before), tone: 'danger' },
      { label: 'AFTER REMEDIATION', items: splitMergedStatus(after), tone: 'success' },
    ],
  };
}

function normalizeEvidenceBulletSection(section: BulletSection): BulletSection {
  return {
    ...section,
    items: section.items.map((item) => item.replace(/^\s*(?:Validation Items?|Evidence Items?)\s*[—-]\s*/i, '').trim()),
  };
}

function splitPromotedTags(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(/[•·|]/g).map((part) => part.trim()).filter((part) => part.length > 1);
}

function normalizedText(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function isStructuralHeroMetric(
  label: string,
  value: string,
  hero: Pick<CanonicalInfographic['hero'], 'title' | 'subtitle' | 'highlight'>,
  detail?: string,
): boolean {
  const normalizedLabel = normalizedText(label)!;
  const normalizedValue = normalizedText(value)!;
  const heroLabels = [hero.title, hero.subtitle, hero.highlight].map(normalizedText).filter(Boolean);
  if (normalizedLabel === normalizedValue && /^(description|submetrics?)$/.test(normalizedLabel)) return true;
  if (/^(description|subheader|submetrics?)$/.test(normalizedLabel)
    && (heroLabels.includes(normalizedValue) || (detail?.trim().length ?? 0) >= 20)) return true;
  if (label.trim().length >= 40 && heroLabels.includes(normalizedValue)) return true;
  if (value.trim().length < 40) return false;
  if (heroLabels.includes(normalizedLabel)) return true;
  return splitPromotedTags(detail).length >= 2;
}

function normalizeBeforeAfter(section: ComparisonSection): ComparisonSection {
  const before = section.columns.find((column) => /\bbefore\b/i.test(column.label) && !/\bafter\b/i.test(column.label));
  const after = section.columns.find((column) => /\bafter\b/i.test(column.label) && !/\bbefore\b/i.test(column.label));
  if (!before || !after) return repairMergedBeforeAfter(section) ?? section;
  const rest = section.columns.filter((column) => column !== before && column !== after);
  return { ...section, columns: [before, after, ...rest] };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function bestFieldTable(sections: CanonicalSection[]): TableSection | null {
  const candidates = sections.flatMap((section): TableSection[] => {
    if (section.kind === 'comparison' && isFieldMapping(section)) {
      const table = comparisonToTable(section);
      return table ? [table] : [];
    }
    if (section.kind === 'bullet-list') {
      const table = bulletFieldTable(section);
      return table ? [table] : [];
    }
    return [];
  });
  return candidates.sort((a, b) => b.rows.length - a.rows.length)[0] ?? null;
}
export function repairExtractedSemantics(data: CanonicalInfographic): CanonicalInfographic {
  if (data.meta.sourceMode !== 'image') return data;

  const descriptionMetric = data.hero.metrics.find((metric) => metric.label.trim().toLowerCase() === 'description')
    ?? data.hero.metrics.find((metric) => isStructuralHeroMetric(metric.label, metric.value, data.hero, metric.detail));
  const subMetrics = data.hero.metrics.find((metric) => /sub[\s_-]*metrics?/i.test(metric.label));
  const heroMetrics = data.hero.metrics.filter((metric) => !isStructuralHeroMetric(metric.label, metric.value, data.hero, metric.detail));
  const structuralSummaryDetail = descriptionMetric
    && isStructuralHeroMetric(descriptionMetric.label, descriptionMetric.value, data.hero, descriptionMetric.detail)
    ? descriptionMetric.detail
    : undefined;
  const heroTags = unique([...data.hero.tags, ...splitPromotedTags(subMetrics?.detail ?? structuralSummaryDetail)])
    .filter((tag) => normalizedText(tag) !== normalizedText(data.hero.title));
  const fieldTable = bestFieldTable(data.sections);
  const subtitleRepeatsTitle = data.hero.subtitle?.trim().toLowerCase() === data.hero.title.trim().toLowerCase();
  const highlightRepeatsTitle = data.hero.highlight?.trim().toLowerCase() === data.hero.title.trim().toLowerCase();
  const promotedHighlightToSubtitle = Boolean(subtitleRepeatsTitle && data.hero.highlight && !highlightRepeatsTitle);
  const normalizedSubtitle = promotedHighlightToSubtitle ? data.hero.highlight : data.hero.subtitle;
  const normalizedHighlight = highlightRepeatsTitle || promotedHighlightToSubtitle ? undefined : data.hero.highlight;
  const summaryTitle = !subtitleRepeatsTitle && data.hero.subtitle ? data.hero.subtitle : 'SUMMARY';
  let emittedFieldTable = false;
  const sections: CanonicalSection[] = [];

  const descriptionPlaceholder = descriptionMetric
    && descriptionMetric.label.trim().toLowerCase() === 'description'
    && descriptionMetric.value.trim().toLowerCase() === 'description';
  const reversedSummary = descriptionMetric
    && descriptionMetric.label.trim().length >= 40
    && [data.hero.title, data.hero.subtitle, data.hero.highlight].map(normalizedText).filter(Boolean)
      .includes(normalizedText(descriptionMetric.value));
  const namedDescriptionDetail = descriptionMetric
    && normalizedText(descriptionMetric.label) === 'description'
    && (descriptionMetric.detail?.trim().length ?? 0) >= 20;
  const summaryBody = descriptionPlaceholder || namedDescriptionDetail
    ? descriptionMetric?.detail
    : reversedSummary ? descriptionMetric?.label : descriptionMetric?.value;
  if (summaryBody) {
    sections.push({
      id: 'source-summary',
      kind: 'callout',
      title: summaryTitle,
      body: summaryBody,
      tone: 'neon',
    });
  }

  for (const section of data.sections) {
    if (isFieldMapping(section)) {
      if (!emittedFieldTable && fieldTable) {
        sections.push(fieldTable);
        emittedFieldTable = true;
      }
      continue;
    }

    if (section.kind === 'bullet-list') {
      const split = splitFlattenedHealthEvidence(section);
      if (split) {
        sections.push(...split);
        continue;
      }
    }

    if (section.kind === 'bullet-list' && bulletFieldTable(section)) {
      if (!emittedFieldTable && fieldTable) {
        sections.push(fieldTable);
        emittedFieldTable = true;
      }
      const remaining = withoutFieldChangeBullets(section);
      if (remaining.items.length > 0) sections.push(remaining);
      continue;
    }

    if (section.kind === 'bullet-list' && /(evidence|validation)/i.test(signal(section))) {
      sections.push(normalizeEvidenceBulletSection(section));
      continue;
    }

    if (section.kind === 'process-steps') {
      sections.push(normalizeProcessSection(section));
      continue;
    }

    if (section.kind === 'metric-grid') {
      sections.push(normalizeMetricGridSection(section));
      continue;
    }

    if (section.kind === 'comparison') {
      const repaired = comparisonToProcess(section)
        ?? comparisonToMetrics(section)
        ?? comparisonToEvidence(section);
      sections.push(repaired ?? normalizeBeforeAfter(section));
      continue;
    }

    sections.push(section);
  }

  return parseCanonicalInfographic({
    ...data,
    hero: { ...data.hero, subtitle: normalizedSubtitle, highlight: normalizedHighlight, tags: heroTags, metrics: heroMetrics },
    sections,
  });
}

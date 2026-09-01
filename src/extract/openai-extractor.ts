import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

import type { IngestedInput } from '../ingest/input.js';
import { repairExtractedSemantics } from '../normalize/extracted-semantics.js';
import { assessSemanticFidelity, type SemanticFidelityReport } from '../qa/fidelity.js';
import { parseCanonicalInfographic, type CanonicalInfographic, type CanonicalSection } from '../schema/canonical.js';
import { parseStructuredExtraction, StructuredCanonicalExtractionSchema } from './structured-schema.js';

type ExtractableInput = Extract<IngestedInput, { mode: 'report' | 'image' }>;
type ParsedResponse = { status: string; output_parsed: unknown | null };
type ParseDependency = (request: Record<string, unknown>) => Promise<ParsedResponse>;

export interface ExtractorOptions {
  apiKey?: string;
  model?: string;
  baseURL?: string;
  parse?: ParseDependency;
}

const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'dots-studio/dots-3-note-preview:free';

const SYSTEM_REQUIREMENTS = `Reconstruct the source infographic semantics faithfully.
Copy every legible concrete fact, label, metric, date, percentage, claim, table row, comparison item,
and process step that materially contributes to the source message. Never invent missing values.
Preserve the source information hierarchy and before/after relationships while allowing the renderer
to improve spacing and geometry. Use the most specific canonical section kind available.
Keep visually distinct source sections distinct in the JSON. Never merge BEFORE and AFTER into one column,
never duplicate identical comparison columns, and never collapse a metric block together with evidence.
When the source contains FIELD / BEFORE / AFTER / CHANGE IMPACT rows, use table-lite and preserve every legible row.
  When it contains a DETECTED ? CORRECTED ? VALIDATED ? LIVE sequence (or equivalent), use process-steps.
  Use metric-grid for KPI/result blocks and bullet-list for evidence/validation claims.
  For image sources, also recover only confident coarse composition hints: major zones, columns, grouping,
  directional flow, section order, dominant regions, and relative emphasis. Prioritize semantic accuracy over
  uncertain coordinates; omit a hint rather than inventing geometry.
  Never return descriptions of blocks such as "/before remediation column", "metrics grid", "process flow",
or "evidence block". Return the actual visible contents of those blocks instead.
Use layoutFamily "auto". When uncertain about unreadable text, omit only that text rather than replacing
a whole section with a placeholder.`;
function retryInstruction(report?: SemanticFidelityReport): string {
  if (!report) return '';
  const details = report.issues.map((issue) => issue.message).join(' ');
  return `\n\nA prior extraction failed fidelity checks: ${details}\nRe-read the image carefully. Preserve each missing structure explicitly: distinct BEFORE/AFTER columns, table-lite for visible field-change rows, process-steps for visible sequences, metric-grid for KPI blocks, and concrete evidence bullets. Do not merge multiple source panels into one generic section.`;
}

function buildMessages(input: ExtractableInput, report?: SemanticFidelityReport): unknown[] {
  if (input.mode === 'image') {
    return [
      { role: 'system', content: SYSTEM_REQUIREMENTS },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this infographic and recover its complete concrete message, not merely its section names or visual structure. Also capture confident coarse major zones, columns, grouping, directional flow, section order, dominant regions, and relative emphasis without sacrificing semantic accuracy.' + retryInstruction(report),
          },
          { type: 'image_url', image_url: { url: input.dataUrl } },
        ],
      },
    ];
  }

  return [
    { role: 'system', content: SYSTEM_REQUIREMENTS },
    { role: 'user', content: `SOURCE REPORT:\n\n${input.text}` },
  ];
}

function normalizeExtracted(value: unknown, mode: ExtractableInput['mode']): CanonicalInfographic {
  const record = value as Record<string, unknown>;
  const meta = (record.meta ?? {}) as Record<string, unknown>;
  const forced = { ...record, meta: { ...meta, sourceMode: mode, layoutFamily: 'auto' } };
  try {
    return parseCanonicalInfographic(forced);
  } catch {
    return parseStructuredExtraction(forced);
  }
}
function getApiKey(options: ExtractorOptions): string {
  return options.apiKey ?? process.env.OPENROUTER_API_KEY ?? '';
}

function getModel(options: ExtractorOptions): string {
  return options.model ?? process.env.OPENROUTER_MODEL ?? process.env.LLM_MODEL ?? DEFAULT_MODEL;
}

function getBaseURL(options: ExtractorOptions): string {
  return options.baseURL ?? process.env.OPENROUTER_BASE_URL ?? process.env.LLM_BASE_URL ?? DEFAULT_OPENROUTER_BASE_URL;
}

function buildRequest(
  input: ExtractableInput,
  model: string,
  report?: SemanticFidelityReport,
): Record<string, unknown> {
  return {
    model,
    messages: buildMessages(input, report),
    response_format: zodResponseFormat(
      StructuredCanonicalExtractionSchema,
      'canonical_infographic',
    ),
  };
}

function createOpenRouterParser(apiKey: string, options: ExtractorOptions): ParseDependency {
  const client = new OpenAI({
    apiKey,
    baseURL: getBaseURL(options),
    defaultHeaders: {
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER ?? 'http://localhost',
      'X-Title': process.env.OPENROUTER_APP_NAME ?? 'satori-infographics',
    },
  });

  return async (payload) => {
    const completion = await client.chat.completions.parse(payload as never);
    return {
      status: 'completed',
      output_parsed: completion.choices[0]?.message.parsed ?? null,
    };
  };
}
function sectionRole(section: CanonicalSection): string {
  const text = `${section.id} ${section.title}`.toLowerCase();
  if (/(field.*(?:change|mapping)|(?:change|mapping).*field)/i.test(text)) return 'field-table';
  if (/(process|workflow|\bflow\b)/i.test(text)) return 'process';
  if (section.kind === 'bullet-list' && /(evidence|validation|proof|assurance)/i.test(text)) return 'evidence';
  if (section.kind === 'metric-grid' && /(catalog health|health improvement|metrics?|results?|outcomes?|evidence|validation|proof|assurance)/i.test(text)) return 'metrics';
  if (section.kind === 'comparison' && /before.*after|after.*before/i.test(text)) return 'before-after';
  if (/(evidence|validation|proof|assurance)/i.test(text)) return 'evidence';
  if (/(catalog health|health improvement|metrics?|results?|outcomes?)/i.test(text)) return 'metrics';
  if (/before.*after|after.*before/i.test(text)) return 'before-after';
  if (section.kind === 'callout' && /(summary|remediation|precise)/i.test(text)) return 'summary';
  return `${section.kind}:${section.title.trim().toLowerCase()}`;
}

function isCanonicalForRole(section: CanonicalSection, role: string): boolean {
  return (role === 'field-table' && section.kind === 'table-lite')
    || (role === 'process' && section.kind === 'process-steps')
    || (role === 'metrics' && section.kind === 'metric-grid')
    || (role === 'evidence' && section.kind === 'bullet-list')
    || (role === 'before-after' && section.kind === 'comparison')
    || (role === 'summary' && section.kind === 'callout');
}

function sectionScore(section: CanonicalSection): number {
  switch (section.kind) {
    case 'table-lite': return section.rows.length * 20 + section.columns.length;
    case 'process-steps': return section.steps.length * 20;
    case 'metric-grid': return section.metrics.length * 20;
    case 'bullet-list': return section.items.length * 12;
    case 'comparison': return section.columns.reduce((sum, column) => sum + column.items.length * 10, 0) + section.columns.length;
    case 'callout': return section.body.length;
    case 'checklist': return section.items.length * 10;
    case 'timeline': return section.events.length * 10;
    case 'diagram-cycle': return section.nodes.length * 10;
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

type SourceHints = CanonicalInfographic['sourceHints'];
const structuralHintKeys = ['compositionPattern', 'primaryAxis', 'columnRatios', 'sectionGroups', 'sectionOrder', 'zoneMap', 'relativeImportance'] as const;

function structurallyCompatible(current: SourceHints, next: SourceHints): boolean {
  return structuralHintKeys.every((key) => current[key] === undefined || next[key] === undefined
    || JSON.stringify(current[key]) === JSON.stringify(next[key]));
}

function higherConfidenceHints(current: SourceHints, next: SourceHints): SourceHints {
  return (next.compositionConfidence ?? 0) > (current.compositionConfidence ?? 0) ? next : current;
}

function mergeCandidateDocuments(
  current: CanonicalInfographic | undefined,
  next: CanonicalInfographic,
): CanonicalInfographic {
  if (!current) return next;

  const byIdentity = new Map<string, CanonicalSection>();
  for (const section of [...current.sections, ...next.sections]) {
    const role = sectionRole(section);
    const titleIdentity = section.title.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
    let identity = `${role}:${titleIdentity}`;
    if (section.id.startsWith('rescue-')) {
      const sameRoleEntries = [...byIdentity.entries()]
        .filter(([, existingSection]) => sectionRole(existingSection) === role);
      const onlyRoleEntry = sameRoleEntries.length === 1 ? sameRoleEntries[0] : undefined;
      if (onlyRoleEntry) identity = onlyRoleEntry[0];
    }
    const existing = byIdentity.get(identity);
    if (!existing) { byIdentity.set(identity, section); continue; }
    const candidateCanonical = isCanonicalForRole(section, role);
    const existingCanonical = isCanonicalForRole(existing, role);
    if ((candidateCanonical && !existingCanonical)
      || (candidateCanonical === existingCanonical && sectionScore(section) > sectionScore(existing))) {
      byIdentity.set(identity, section);
    }
  }

  const footerByLabel = new Map<string, CanonicalInfographic['footer']['facts'][number]>();
  for (const fact of [...current.footer.facts, ...next.footer.facts]) {
    const key = fact.label.trim().toLowerCase();
    const existing = footerByLabel.get(key);
    if (!existing || fact.value.length > existing.value.length) footerByLabel.set(key, fact);
  }

  const heroMetrics = [...current.hero.metrics, ...next.hero.metrics].filter((metric, index, all) =>
    all.findIndex((candidate) => candidate.label === metric.label && candidate.value === metric.value) === index);
  const preferredHints = higherConfidenceHints(current.sourceHints, next.sourceHints);
  const compatibleHints = structurallyCompatible(current.sourceHints, next.sourceHints);

  return parseCanonicalInfographic({
    ...current,
    meta: { ...current.meta, layoutFamily: 'auto' },
    hero: {
      ...current.hero,
      eyebrow: current.hero.eyebrow ?? next.hero.eyebrow,
      subtitle: current.hero.subtitle ?? next.hero.subtitle,
      highlight: current.hero.highlight ?? next.hero.highlight,
      tags: uniqueStrings([...current.hero.tags, ...next.hero.tags]),
      metrics: heroMetrics,
    },
    sections: [...byIdentity.values()],
    footer: {
      facts: [...footerByLabel.values()],
      disclaimer: current.footer.disclaimer ?? next.footer.disclaimer,
    },
    sourceHints: {
      ...preferredHints,
      compositionConfidence: Math.max(current.sourceHints.compositionConfidence ?? 0, next.sourceHints.compositionConfidence ?? 0),
      emphasisOrder: compatibleHints
        ? uniqueStrings([...current.sourceHints.emphasisOrder, ...next.sourceHints.emphasisOrder])
        : preferredHints.emphasisOrder,
      visualNotes: compatibleHints
        ? uniqueStrings([...current.sourceHints.visualNotes, ...next.sourceHints.visualNotes])
        : preferredHints.visualNotes,
    },
  });
}


const FocusedRescueSchema = z.object({
  hero: z.object({
    eyebrow: z.string().nullable(), title: z.string().nullable(), subtitle: z.string().nullable(),
    summary: z.string().nullable(), tags: z.array(z.string()),
  }).strict(),
  beforeAfter: z.object({ before: z.array(z.string()), after: z.array(z.string()) }).strict().nullable(),
  fieldChanges: z.array(z.object({
    field: z.string(), before: z.string(), after: z.string(), impact: z.string().nullable(),
  }).strict()),
  process: z.array(z.object({ label: z.string(), description: z.string().nullable() }).strict()),
  metrics: z.array(z.object({ label: z.string(), value: z.string() }).strict()),
  evidence: z.array(z.string()),
  footerFacts: z.array(z.object({ label: z.string(), value: z.string() }).strict()),
  disclaimer: z.string().nullable(),
}).strict();

function buildFocusedRescueRequest(input: ExtractableInput, model: string, report?: SemanticFidelityReport): Record<string, unknown> {
  const missing = report?.issues.map((issue) => issue.message).join(' ') ?? '';
  const prompt = `Read the infographic again and rescue concrete source content only. ${missing}\n`+
    'Return distinct BEFORE and AFTER lists, every visible FIELD/BEFORE/AFTER/CHANGE IMPACT row, the process sequence, KPI metrics, evidence/validation bullets, and hero/footer text. Never invent text.';
  const userContent = input.mode === 'image'
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: input.dataUrl } }]
    : prompt + `\n\nSOURCE REPORT:\n${input.text}`;
  return { model, messages: [{ role: 'system', content: SYSTEM_REQUIREMENTS }, { role: 'user', content: userContent }],
    response_format: zodResponseFormat(FocusedRescueSchema, 'focused_infographic_rescue') };
}

function focusedRescueToCanonical(value: unknown, base?: CanonicalInfographic): CanonicalInfographic {
  const rescue = FocusedRescueSchema.parse(value);
  const sections: CanonicalSection[] = [];
  if (rescue.hero.summary) sections.push({ id: 'rescue-summary', kind: 'callout', title: rescue.hero.subtitle ?? 'SUMMARY', body: rescue.hero.summary, tone: 'neon' });
  if (rescue.beforeAfter && rescue.beforeAfter.before.length && rescue.beforeAfter.after.length) sections.push({
    id: 'rescue-before-after', kind: 'comparison', title: 'BEFORE vs AFTER REMEDIATION',
    columns: [{ label: 'BEFORE REMEDIATION', items: rescue.beforeAfter.before, tone: 'danger' }, { label: 'AFTER REMEDIATION', items: rescue.beforeAfter.after, tone: 'success' }],
  });
  if (rescue.fieldChanges.length) sections.push({ id: 'rescue-field-changes', kind: 'table-lite', title: 'EXACT FIELD-LEVEL CHANGES',
    columns: ['FIELD','BEFORE','AFTER','CHANGE IMPACT'], rows: rescue.fieldChanges.map((row) => [row.field,row.before,row.after,row.impact ?? '']) });
  const rescueProcess = rescue.process.filter((step) => step.label.trim()).map((step) => ({ label: step.label.trim(), description: step.description?.trim() || undefined }));
  if (rescueProcess.length) sections.push({ id: 'rescue-process', kind: 'process-steps', title: 'PROCESS FLOW', steps: rescueProcess });
  const rescueMetrics = rescue.metrics.flatMap((metric) => {
    const label = metric.label.trim(); const value = metric.value.trim();
    if (value) return [{ label, value }];
    if (/integrity.*restored/i.test(label)) return [{ label: 'CATALOG HEALTH', value: label }];
    return [];
  });
  if (rescueMetrics.length) sections.push({ id: 'rescue-metrics', kind: 'metric-grid', title: 'CATALOG HEALTH IMPROVEMENT', metrics: rescueMetrics });
  const rescueEvidence = rescue.evidence.map((item) => item.trim()).filter(Boolean);
  if (rescueEvidence.length) sections.push({ id: 'rescue-evidence', kind: 'bullet-list', title: 'EVIDENCE & VALIDATION', items: rescueEvidence });
  return parseCanonicalInfographic({
    meta: { version: 1, intent: base?.meta.intent ?? 'mixed', layoutFamily: 'auto', sourceMode: 'image' },
    hero: { eyebrow: rescue.hero.eyebrow ?? base?.hero.eyebrow, title: rescue.hero.title ?? base?.hero.title ?? 'SOURCE INFOGRAPHIC',
      subtitle: rescue.hero.subtitle ?? base?.hero.subtitle, tags: uniqueStrings([...(base?.hero.tags ?? []), ...rescue.hero.tags]), metrics: [] },
    sections,
    footer: { facts: rescue.footerFacts.length ? rescue.footerFacts : (base?.footer.facts ?? []), disclaimer: rescue.disclaimer ?? base?.footer.disclaimer },
    sourceHints: { emphasisOrder: ['before-after','exact-field-level-changes','process-flow','catalog-health-improvement','evidence-validation'], sourceLayoutGuess: 'comparison' },
  });
}

export async function extractWithOpenAI(
  input: ExtractableInput,
  options: ExtractorOptions = {},
): Promise<CanonicalInfographic> {
  const apiKey = getApiKey(options);
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is required for image or report extraction. OPENAI_API_KEY is not required when using OpenRouter.',
    );
  }

  const model = getModel(options);
  const parse = options.parse ?? createOpenRouterParser(apiKey, options);
  const maxAttempts = input.mode === 'image' ? 3 : 1;
  let fidelity: SemanticFidelityReport | undefined;
  let accumulated: CanonicalInfographic | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await parse(buildRequest(input, model, fidelity));
    if (response.status !== 'completed' || response.output_parsed == null) {
      throw new Error(`OpenRouter extraction did not complete successfully (status: ${response.status}, model: ${model}).`);
    }

    const normalized = normalizeExtracted(response.output_parsed, input.mode);
    const document = input.mode === 'image' ? repairExtractedSemantics(normalized) : normalized;
    if (input.mode !== 'image') return document;

    accumulated = mergeCandidateDocuments(accumulated, document);
    fidelity = assessSemanticFidelity(accumulated);
    if (fidelity.passed) return accumulated;
  }

  if (input.mode === 'image') {
    const rescueResponse = await parse(buildFocusedRescueRequest(input, model, fidelity));
    if (rescueResponse.status === 'completed' && rescueResponse.output_parsed != null) {
      const rescued = repairExtractedSemantics(focusedRescueToCanonical(rescueResponse.output_parsed, accumulated));
      accumulated = mergeCandidateDocuments(accumulated, rescued);
      fidelity = assessSemanticFidelity(accumulated);
      if (fidelity.passed) return accumulated;
    }
  }

  const details = fidelity?.issues.map((issue) => issue.message).join(' ') ?? 'Unknown fidelity failure.';
  throw new Error(`Semantic fidelity check failed after ${maxAttempts} extraction attempts plus focused rescue. ${details}`);
}


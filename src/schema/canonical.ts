import { z } from 'zod';

const SourceModeSchema = z.enum(['image', 'report', 'json']);
const LayoutFamilySchema = z.enum(['auto', 'qa', 'dashboard', 'process', 'comparison', 'timeline']);
const LayoutIntentSchema = z.enum(['report', 'checklist', 'process', 'comparison', 'timeline', 'mixed']);
const ToneSchema = z.enum(['neutral', 'neon', 'success', 'warning', 'danger']);
const CompositionPatternSchema = z.enum([
  'single-column', 'asymmetric-two-column', 'symmetric-two-column', 'hero-left-data-right',
  'hero-top-content-bottom', 'comparison-led', 'process-led', 'table-led', 'timeline-led',
  'checklist-led', 'metric-led', 'mixed-narrative', 'banded', 'poster-sidebar', 'dashboard-lite',
]);
const CompositionAxisSchema = z.enum(['horizontal', 'vertical']);
export const PortfolioTemplateSchema = z.enum([
  'catalog-troubleshooting', 'validation-qa', 'root-cause-investigation',
  'remediation-comparison', 'strategic-approach',
]);
export type PortfolioTemplate = z.infer<typeof PortfolioTemplateSchema>;

const MetricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  detail: z.string().optional(),
  tone: ToneSchema.optional(),
}).strict();

const sectionBase = {
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  tone: ToneSchema.optional(),
};

const MetricGridSectionSchema = z.object({
  ...sectionBase,
  kind: z.literal('metric-grid'),
  metrics: z.array(MetricSchema),
}).strict();

const ChecklistSectionSchema = z.object({
  ...sectionBase,
  kind: z.literal('checklist'),
  items: z.array(z.object({
    label: z.string().min(1),
    detail: z.string().optional(),
    status: z.enum(['pending', 'passed', 'warning', 'failed']),
    tone: ToneSchema.optional(),
  }).strict()),
}).strict();

const BulletListSectionSchema = z.object({
  ...sectionBase,
  kind: z.literal('bullet-list'),
  items: z.array(z.string().min(1)),
}).strict();

const ProcessStepsSectionSchema = z.object({
  ...sectionBase,
  kind: z.literal('process-steps'),
  steps: z.array(z.object({
    label: z.string().min(1),
    description: z.string().optional(),
    tone: ToneSchema.optional(),
  }).strict()),
}).strict();

const TimelineSectionSchema = z.object({
  ...sectionBase,
  kind: z.literal('timeline'),
  events: z.array(z.object({
    label: z.string().min(1),
    date: z.string().optional(),
    description: z.string().optional(),
    tone: ToneSchema.optional(),
  }).strict()),
}).strict();

const ComparisonSectionSchema = z.object({
  ...sectionBase,
  kind: z.literal('comparison'),
  columns: z.array(z.object({
    label: z.string().min(1),
    items: z.array(z.string().min(1)),
    tone: ToneSchema.optional(),
  }).strict()).min(2),
}).strict();

const CalloutSectionSchema = z.object({
  ...sectionBase,
  kind: z.literal('callout'),
  body: z.string().min(1),
}).strict();

const DiagramCycleSectionSchema = z.object({
  ...sectionBase,
  kind: z.literal('diagram-cycle'),
  nodes: z.array(z.object({
    label: z.string().min(1),
    description: z.string().optional(),
    tone: ToneSchema.optional(),
  }).strict()),
}).strict();

const TableLiteSectionSchema = z.object({
  ...sectionBase,
  kind: z.literal('table-lite'),
  columns: z.array(z.string().min(1)),
  rows: z.array(z.array(z.string())),
}).strict();

const CanonicalSectionSchema = z.discriminatedUnion('kind', [
  MetricGridSectionSchema,
  ChecklistSectionSchema,
  BulletListSectionSchema,
  ProcessStepsSectionSchema,
  TimelineSectionSchema,
  ComparisonSectionSchema,
  CalloutSectionSchema,
  DiagramCycleSectionSchema,
  TableLiteSectionSchema,
]);

const SourceHintsSchema = z.object({
  template: PortfolioTemplateSchema.optional(),
  preferredColumns: z.union([z.literal(2), z.literal(3)]).optional(),
  emphasisOrder: z.array(z.string().min(1)).default([]),
  sourceLayoutGuess: LayoutFamilySchema.optional(),
  compositionConfidence: z.number().min(0).max(1).optional(),
  visualNotes: z.array(z.string().min(1)).default([]),
  compositionPattern: CompositionPatternSchema.optional(),
  primaryAxis: CompositionAxisSchema.optional(),
  columnRatios: z.array(z.number().positive()).min(1).max(3).optional(),
  sectionGroups: z.array(z.object({
    id: z.string().min(1),
    sectionIds: z.array(z.string().min(1)).min(1),
    direction: CompositionAxisSchema.optional(),
  }).strict()).optional(),
  sectionOrder: z.array(z.string().min(1)).optional(),
  zoneMap: z.array(z.object({
    sectionId: z.string().min(1),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().positive().max(1),
    h: z.number().positive().max(1),
  }).strict().refine((zone) => zone.x + zone.w <= 1 && zone.y + zone.h <= 1, {
    message: 'zone must remain within normalized 0–1 coordinates',
  })).optional(),
  relativeImportance: z.record(z.string().min(1), z.number().min(0).max(1)).optional(),
}).strict().prefault({});

export const CanonicalInfographicSchema = z.object({
  meta: z.object({
    version: z.literal(1),
    intent: LayoutIntentSchema,
    layoutFamily: LayoutFamilySchema,
    sourceMode: SourceModeSchema,
  }).strict(),
  hero: z.object({
    eyebrow: z.string().optional(),
    title: z.string().min(1),
    highlight: z.string().optional(),
    subtitle: z.string().optional(),
    tags: z.array(z.string().min(1)).default([]),
    metrics: z.array(MetricSchema).default([]),
  }).strict(),
  sections: z.array(CanonicalSectionSchema),
  footer: z.object({
    facts: z.array(z.object({
      label: z.string().min(1),
      value: z.string().min(1),
      tone: ToneSchema.optional(),
    }).strict()).default([]),
    disclaimer: z.string().optional(),
  }).strict(),
  sourceHints: SourceHintsSchema,
}).strict().superRefine((data, ctx) => {
  const sectionIds = new Set(data.sections.map((section) => section.id));
  const structuralIds = new Set(['hero', 'footer', ...sectionIds]);
  const importanceIds = new Set(['hero', ...sectionIds]);
  const { sourceHints } = data;

  const addIssue = (path: (string | number)[], message: string) => ctx.addIssue({
    code: 'custom', path: ['sourceHints', ...path], message,
  });

  const groupIds = sourceHints.sectionGroups?.map((group) => group.id) ?? [];
  if (new Set(groupIds).size !== groupIds.length) addIssue(['sectionGroups'], 'section group IDs must be unique');
  sourceHints.sectionGroups?.forEach((group, groupIndex) => group.sectionIds.forEach((sectionId, sectionIndex) => {
    if (!structuralIds.has(sectionId)) addIssue(['sectionGroups', groupIndex, 'sectionIds', sectionIndex], `unknown section reference: ${sectionId}`);
  }));

  const order = sourceHints.sectionOrder ?? [];
  if (new Set(order).size !== order.length) addIssue(['sectionOrder'], 'section order IDs must be unique');
  order.forEach((sectionId, index) => {
    if (!sectionIds.has(sectionId)) addIssue(['sectionOrder', index], `unknown section reference: ${sectionId}`);
  });

  const zoneIds = sourceHints.zoneMap?.map((zone) => zone.sectionId) ?? [];
  if (new Set(zoneIds).size !== zoneIds.length) addIssue(['zoneMap'], 'zone map section IDs must be unique');
  sourceHints.zoneMap?.forEach((zone, index) => {
    if (!structuralIds.has(zone.sectionId)) addIssue(['zoneMap', index, 'sectionId'], `unknown section reference: ${zone.sectionId}`);
  });

  Object.keys(sourceHints.relativeImportance ?? {}).forEach((sectionId) => {
    if (!importanceIds.has(sectionId)) addIssue(['relativeImportance', sectionId], `unknown section reference: ${sectionId}`);
  });
});

export type CanonicalInfographic = z.infer<typeof CanonicalInfographicSchema>;
export type CanonicalSection = CanonicalInfographic['sections'][number];
export type LayoutFamily = CanonicalInfographic['meta']['layoutFamily'];
export type LayoutIntent = CanonicalInfographic['meta']['intent'];
export type SourceMode = CanonicalInfographic['meta']['sourceMode'];

export function parseCanonicalInfographic(value: unknown): CanonicalInfographic {
  return CanonicalInfographicSchema.parse(value);
}

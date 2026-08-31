import { z } from 'zod';

const SourceModeSchema = z.enum(['image', 'report', 'json']);
const LayoutFamilySchema = z.enum(['auto', 'qa', 'dashboard', 'process', 'comparison', 'timeline']);
const LayoutIntentSchema = z.enum(['report', 'checklist', 'process', 'comparison', 'timeline', 'mixed']);
const ToneSchema = z.enum(['neutral', 'neon', 'success', 'warning', 'danger']);
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
  sourceHints: z.object({
    template: PortfolioTemplateSchema.optional(),
    preferredColumns: z.union([z.literal(2), z.literal(3)]).optional(),
    emphasisOrder: z.array(z.string().min(1)).default([]),
    sourceLayoutGuess: LayoutFamilySchema.optional(),
    compositionConfidence: z.number().min(0).max(1).optional(),
    visualNotes: z.array(z.string().min(1)).default([]),
  }).strict().prefault({}),
}).strict();

export type CanonicalInfographic = z.infer<typeof CanonicalInfographicSchema>;
export type CanonicalSection = CanonicalInfographic['sections'][number];
export type LayoutFamily = CanonicalInfographic['meta']['layoutFamily'];
export type LayoutIntent = CanonicalInfographic['meta']['intent'];
export type SourceMode = CanonicalInfographic['meta']['sourceMode'];

export function parseCanonicalInfographic(value: unknown): CanonicalInfographic {
  return CanonicalInfographicSchema.parse(value);
}

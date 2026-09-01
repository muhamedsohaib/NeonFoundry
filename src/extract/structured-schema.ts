import { z } from 'zod';

import { parseCanonicalInfographic, type CanonicalInfographic } from '../schema/canonical.js';

const SourceMode = z.enum(['image', 'report', 'json']);
const LayoutFamily = z.enum(['auto', 'qa', 'dashboard', 'process', 'comparison', 'timeline']);
const LayoutIntent = z.enum(['report', 'checklist', 'process', 'comparison', 'timeline', 'mixed']);
const Tone = z.enum(['neutral', 'neon', 'success', 'warning', 'danger']);
const CompositionPattern = z.enum([
  'single-column', 'asymmetric-two-column', 'symmetric-two-column', 'hero-left-data-right',
  'hero-top-content-bottom', 'comparison-led', 'process-led', 'table-led', 'timeline-led',
  'checklist-led', 'metric-led', 'mixed-narrative', 'banded', 'poster-sidebar', 'dashboard-lite',
]);
const CompositionAxis = z.enum(['horizontal', 'vertical']);

const Metric = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  detail: z.string().nullable(),
  tone: Tone.nullable(),
}).strict();

const sectionBase = {
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  tone: Tone.nullable(),
};

const ChecklistItem = z.object({
  label: z.string().min(1),
  detail: z.string().nullable(),
  status: z.enum(['pending', 'passed', 'warning', 'failed']),
  tone: Tone.nullable(),
}).strict();
const MetricGrid = z.object({
  ...sectionBase,
  kind: z.literal('metric-grid'),
  metrics: z.array(Metric),
}).strict();

const Checklist = z.object({
  ...sectionBase,
  kind: z.literal('checklist'),
  items: z.array(ChecklistItem),
}).strict();

const BulletList = z.object({
  ...sectionBase,
  kind: z.literal('bullet-list'),
  items: z.array(z.string().min(1)),
}).strict();

const ProcessSteps = z.object({
  ...sectionBase,
  kind: z.literal('process-steps'),
  steps: z.array(z.object({
    label: z.string().min(1),
    description: z.string().nullable(),
    tone: Tone.nullable(),
  }).strict()),
}).strict();
const Timeline = z.object({
  ...sectionBase,
  kind: z.literal('timeline'),
  events: z.array(z.object({
    label: z.string().min(1),
    date: z.string().nullable(),
    description: z.string().nullable(),
    tone: Tone.nullable(),
  }).strict()),
}).strict();

const Comparison = z.object({
  ...sectionBase,
  kind: z.literal('comparison'),
  columns: z.array(z.object({
    label: z.string().min(1),
    items: z.array(z.string().min(1)),
    tone: Tone.nullable(),
  }).strict()).min(2),
}).strict();

const Callout = z.object({
  ...sectionBase,
  kind: z.literal('callout'),
  body: z.string().min(1),
}).strict();
const DiagramCycle = z.object({
  ...sectionBase,
  kind: z.literal('diagram-cycle'),
  nodes: z.array(z.object({
    label: z.string().min(1),
    description: z.string().nullable(),
    tone: Tone.nullable(),
  }).strict()),
}).strict();

const TableLite = z.object({
  ...sectionBase,
  kind: z.literal('table-lite'),
  columns: z.array(z.string().min(1)),
  rows: z.array(z.array(z.string())),
}).strict();

const Section = z.discriminatedUnion('kind', [
  MetricGrid,
  Checklist,
  BulletList,
  ProcessSteps,
  Timeline,
  Comparison,
  Callout,
  DiagramCycle,
  TableLite,
]);
export const StructuredCanonicalExtractionSchema = z.object({
  meta: z.object({
    version: z.literal(1),
    intent: LayoutIntent,
    layoutFamily: LayoutFamily,
    sourceMode: SourceMode,
  }).strict(),
  hero: z.object({
    eyebrow: z.string().nullable(),
    title: z.string().min(1),
    highlight: z.string().nullable(),
    subtitle: z.string().nullable(),
    tags: z.array(z.string().min(1)),
    metrics: z.array(Metric),
  }).strict(),
  sections: z.array(Section),
  footer: z.object({
    facts: z.array(z.object({
      label: z.string().min(1),
      value: z.string().min(1),
      tone: Tone.nullable(),
    }).strict()),
    disclaimer: z.string().nullable(),
  }).strict(),
  sourceHints: z.object({
    preferredColumns: z.union([z.literal(2), z.literal(3)]).nullable(),
    emphasisOrder: z.array(z.string().min(1)),
    sourceLayoutGuess: LayoutFamily.nullable(),
    compositionConfidence: z.number().min(0).max(1).nullable(),
    visualNotes: z.array(z.string().min(1)),
    compositionPattern: CompositionPattern.nullable(),
    primaryAxis: CompositionAxis.nullable(),
    columnRatios: z.array(z.number().positive()).min(1).max(3).nullable(),
    sectionGroups: z.array(z.object({
      id: z.string().min(1),
      sectionIds: z.array(z.string().min(1)).min(1),
      direction: CompositionAxis.nullable(),
    }).strict()).nullable(),
    sectionOrder: z.array(z.string().min(1)).nullable(),
    zoneMap: z.array(z.object({
      sectionId: z.string().min(1),
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      w: z.number().positive().max(1),
      h: z.number().positive().max(1),
    }).strict()).nullable(),
    relativeImportance: z.array(z.object({
      sectionId: z.string().min(1),
      value: z.number().min(0).max(1),
    }).strict()).nullable(),
  }).strict(),
}).strict();
function stripNullObjectValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripNullObjectValues);
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== null)
      .map(([key, entry]) => [key, stripNullObjectValues(entry)]),
  );
}

export function parseStructuredExtraction(value: unknown): CanonicalInfographic {
  const parsed = StructuredCanonicalExtractionSchema.parse(value);
  const relativeImportance = parsed.sourceHints.relativeImportance;
  return parseCanonicalInfographic(stripNullObjectValues({
    ...parsed,
    sourceHints: {
      ...parsed.sourceHints,
      relativeImportance: relativeImportance === null ? null : Object.fromEntries(
        relativeImportance.map(({ sectionId, value: importance }) => [sectionId, importance]),
      ),
    },
  }));
}

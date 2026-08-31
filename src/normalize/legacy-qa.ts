import {
  parseCanonicalInfographic,
  type CanonicalInfographic,
  type CanonicalSection,
} from '../schema/canonical.js';

type LegacyRecord = Record<string, unknown>;

const toneByLegacyColor: Record<string, 'danger' | 'warning' | 'success'> = {
  red: 'danger',
  orange: 'warning',
  lime: 'success',
};

function asRecord(value: unknown, name: string): LegacyRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Legacy QA ${name} must be an object`);
  }

  return value as LegacyRecord;
}

function asArray(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Legacy QA ${name} must be an array`);
  }

  return value;
}

function requiredString(record: LegacyRecord, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Legacy QA ${key} must be a non-empty string`);
  }

  return value;
}

function optionalString(record: LegacyRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function mapStatus(value: string): 'pending' | 'passed' | 'warning' | 'failed' {
  const normalized = value.toLowerCase();
  if (normalized === 'passed' || normalized === 'warning' || normalized === 'failed') {
    return normalized;
  }

  return 'pending';
}

export function adaptLegacyQa(value: unknown): CanonicalInfographic {
  const legacy = asRecord(value, 'document');
  const hero = asRecord(legacy.hero, 'hero');
  const checklist = asRecord(legacy.checklist, 'checklist');
  const metrics = asRecord(legacy.metrics, 'metrics');
  const prevention = asRecord(legacy.prevention, 'prevention');
  const footer = asRecord(legacy.footer, 'footer');

  const sections: CanonicalSection[] = [
    {
      id: 'checklist',
      kind: 'checklist',
      title: requiredString(checklist, 'title'),
      items: asArray(checklist.items, 'checklist.items').map((item) => {
        const entry = asRecord(item, 'checklist item');
        return {
          label: requiredString(entry, 'checkpoint'),
          status: mapStatus(requiredString(entry, 'status')),
        };
      }),
    },
    {
      id: 'metrics',
      kind: 'metric-grid',
      title: requiredString(metrics, 'title'),
      metrics: asArray(metrics.cards, 'metrics.cards').map((card) => {
        const entry = asRecord(card, 'metric card');
        const color = optionalString(entry, 'color');
        return {
          label: requiredString(entry, 'label'),
          value: requiredString(entry, 'value'),
          detail: optionalString(entry, 'sub'),
          ...(color && toneByLegacyColor[color] ? { tone: toneByLegacyColor[color] } : {}),
        };
      }),
    },
    {
      id: 'prevention',
      kind: 'bullet-list',
      title: requiredString(prevention, 'title'),
      items: asArray(prevention.bulletPoints, 'prevention.bulletPoints').map((item) => {
        if (typeof item !== 'string' || item.length === 0) {
          throw new Error('Legacy QA prevention bullet must be a non-empty string');
        }

        return item;
      }),
    },
    {
      id: 'steps',
      kind: 'process-steps',
      title: 'QUALITY ASSURANCE PROCESS',
      steps: asArray(legacy.steps, 'steps').map((step) => {
        const entry = asRecord(step, 'step');
        return {
          label: requiredString(entry, 'title'),
          description: optionalString(entry, 'desc'),
        };
      }),
    },
    {
      id: 'prevention-cycle',
      kind: 'diagram-cycle',
      title: requiredString(prevention, 'title'),
      nodes: asArray(prevention.cycle, 'prevention.cycle').map((node) => {
        const entry = asRecord(node, 'cycle node');
        return {
          label: requiredString(entry, 'title'),
          description: optionalString(entry, 'desc'),
        };
      }),
    },
  ];

  return parseCanonicalInfographic({
    meta: {
      version: 1,
      intent: 'checklist',
      layoutFamily: 'auto',
      sourceMode: 'json',
    },
    hero: {
      eyebrow: optionalString(hero, 'tag'),
      title: [optionalString(hero, 'titleLine1'), optionalString(hero, 'titleLine2')]
        .filter((line): line is string => line !== undefined)
        .join(' '),
      highlight: optionalString(hero, 'titleHighlight'),
      subtitle: optionalString(hero, 'subtitle'),
      tags: asArray(hero.pillNav, 'hero.pillNav').map((tag) => {
        if (typeof tag !== 'string' || tag.length === 0) {
          throw new Error('Legacy QA hero tag must be a non-empty string');
        }

        return tag;
      }),
    },
    sections,
    footer: {
      facts: [
        { label: 'Duration', value: requiredString(footer, 'duration') },
        { label: 'Scope', value: requiredString(footer, 'scope') },
        { label: 'Industry', value: requiredString(footer, 'industry') },
        { label: 'Focus', value: requiredString(footer, 'focus') },
      ],
      disclaimer: optionalString(footer, 'disclaimer'),
    },
    sourceHints: {},
  });
}

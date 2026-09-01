import { describe, expect, it } from 'vitest';
import { parseCanonicalInfographic } from '../src/schema/canonical.js';

const supportedSections = [
  {
    name: 'metric-grid',
    section: {
      id: 'metrics',
      kind: 'metric-grid',
      title: 'KEY METRICS',
      metrics: [{ label: 'Coverage', value: '97%' }],
    },
  },
  {
    name: 'checklist',
    section: {
      id: 'checks',
      kind: 'checklist',
      title: 'VALIDATION',
      items: [{ label: 'Schema valid', status: 'passed' }],
    },
  },
  {
    name: 'bullet-list',
    section: {
      id: 'findings',
      kind: 'bullet-list',
      title: 'FINDINGS',
      items: ['Readable hierarchy'],
    },
  },
  {
    name: 'process-steps',
    section: {
      id: 'process',
      kind: 'process-steps',
      title: 'PROCESS',
      steps: [{ label: 'Extract' }],
    },
  },
  {
    name: 'timeline',
    section: {
      id: 'timeline',
      kind: 'timeline',
      title: 'TIMELINE',
      events: [{ label: 'Launch' }],
    },
  },
  {
    name: 'comparison',
    section: {
      id: 'comparison',
      kind: 'comparison',
      title: 'BEFORE / AFTER',
      columns: [
        { label: 'Before', items: ['Noisy'] },
        { label: 'After', items: ['Clear'] },
      ],
    },
  },
  {
    name: 'callout',
    section: {
      id: 'callout',
      kind: 'callout',
      title: 'TAKEAWAY',
      body: 'Clarity beats decoration.',
    },
  },
  {
    name: 'diagram-cycle',
    section: {
      id: 'cycle',
      kind: 'diagram-cycle',
      title: 'FEEDBACK LOOP',
      nodes: [{ label: 'Observe' }],
    },
  },
  {
    name: 'table-lite',
    section: {
      id: 'table',
      kind: 'table-lite',
      title: 'SUMMARY',
      columns: ['Metric'],
      rows: [['97%']],
    },
  },
] as const;

function minimalInput() {
  return {
    meta: { version: 1, intent: 'report', layoutFamily: 'auto', sourceMode: 'json' },
    hero: { title: 'CATALOG HEALTH' },
    sections: [],
    footer: {},
  };
}

describe('canonical infographic schema', () => {
  it.each(supportedSections)('accepts the $name section kind', ({ section }) => {
    const doc = parseCanonicalInfographic({
      ...minimalInput(),
      sections: [section],
    });

    expect(doc.sections).toEqual([section]);
  });

  it('applies hero, footer, and omitted source hints defaults', () => {
    const doc = parseCanonicalInfographic(minimalInput());

    expect(doc.hero.tags).toEqual([]);
    expect(doc.hero.metrics).toEqual([]);
    expect(doc.footer.facts).toEqual([]);
    expect(doc.sourceHints).toEqual({ emphasisOrder: [], visualNotes: [] });
  });

  it('applies nested source hints defaults when source hints are present', () => {
    const doc = parseCanonicalInfographic({
      ...minimalInput(),
      sourceHints: { preferredColumns: 3 },
    });

    expect(doc.sourceHints).toEqual({
      preferredColumns: 3,
      emphasisOrder: [],
      visualNotes: [],
    });
  });

  it('creates fresh omitted source hints defaults for every parse', () => {
    const first = parseCanonicalInfographic(minimalInput());
    const second = parseCanonicalInfographic(minimalInput());

    first.sourceHints.emphasisOrder.push('hero');
    first.sourceHints.visualNotes.push('keep the whitespace');

    expect(first.sourceHints).toEqual({
      emphasisOrder: ['hero'],
      visualNotes: ['keep the whitespace'],
    });
    expect(second.sourceHints.emphasisOrder).toEqual([]);
    expect(second.sourceHints.visualNotes).toEqual([]);
  });

  it('accepts validated source composition hints without changing old documents', () => {
    const doc = parseCanonicalInfographic({
      ...minimalInput(),
      sections: [
        supportedSections[0].section,
        supportedSections[3].section,
      ],
      sourceHints: {
        compositionPattern: 'hero-left-data-right',
        primaryAxis: 'horizontal',
        columnRatios: [2, 1],
        sectionGroups: [{ id: 'top-row', sectionIds: ['hero', 'metrics'], direction: 'horizontal' }],
        sectionOrder: ['metrics', 'process'],
        zoneMap: [
          { sectionId: 'hero', x: 0, y: 0, w: 0.6, h: 0.4 },
          { sectionId: 'metrics', x: 0.65, y: 0, w: 0.35, h: 0.4 },
        ],
        relativeImportance: { hero: 1, metrics: 0.7 },
      },
    });

    expect(doc.sourceHints.compositionPattern).toBe('hero-left-data-right');
    expect(doc.sourceHints.zoneMap).toHaveLength(2);
  });

  it.each([
    ['overflowing coordinates', { zoneMap: [{ sectionId: 'hero', x: 0.8, y: 0, w: 0.3, h: 0.2 }] }],
    ['duplicate group ids', { sectionGroups: [{ id: 'group', sectionIds: ['hero'] }, { id: 'group', sectionIds: ['metrics'] }] }],
    ['unknown references', { sectionOrder: ['missing'] }],
    ['non-positive ratios', { columnRatios: [1, 0] }],
  ])('rejects source hints with %s', (_name, sourceHints) => {
    expect(() => parseCanonicalInfographic({
      ...minimalInput(),
      sections: [supportedSections[0].section],
      sourceHints,
    })).toThrow(/sourceHints/);
  });

  it('rejects an unknown section kind with a useful path', () => {
    expect(() => parseCanonicalInfographic({
      ...minimalInput(),
      sections: [{ id: 'bad', kind: 'mystery' }],
    })).toThrow(/sections/);
  });
});

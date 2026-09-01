import { expect, it } from 'vitest';

import { analyzeComposition } from '../src/composition/analyze.js';
import { assessCompositionFidelity } from '../src/composition/fidelity.js';
import { parseCanonicalInfographic, type CanonicalInfographic } from '../src/schema/canonical.js';

function document(sections: CanonicalInfographic['sections'], sourceHints: Record<string, unknown> = {}) {
  return parseCanonicalInfographic({
    meta: { version: 1, intent: 'mixed', layoutFamily: 'auto', sourceMode: 'json' },
    hero: { title: 'Composition test' },
    sections,
    footer: { facts: [] },
    sourceHints,
  });
}

function bullets(id: string) {
  return { id, kind: 'bullet-list' as const, title: id, items: [id] };
}

it('quantizes explicit zones into source columns and rows', () => {
  const data = document([bullets('left'), bullets('right'), bullets('below')], {
    compositionPattern: 'asymmetric-two-column',
    columnRatios: [2, 1],
    primaryAxis: 'horizontal',
    zoneMap: [
      { sectionId: 'left', x: 0, y: 0, w: 0.62, h: 0.3 },
      { sectionId: 'right', x: 0.67, y: 0, w: 0.33, h: 0.3 },
      { sectionId: 'below', x: 0, y: 0.4, w: 1, h: 0.3 },
    ],
  });

  const blueprint = analyzeComposition(data);

  expect(blueprint.provenance).toBe('explicit-geometry');
  expect(blueprint.columns).toBe(2);
  expect(blueprint.columnRatios).toEqual([2 / 3, 1 / 3]);
  expect(blueprint.regions.map(({ sectionIds, row, column, columnSpan }) => ({ sectionIds, row, column, columnSpan }))).toEqual([
    { sectionIds: ['left'], row: 0, column: 0, columnSpan: 1 },
    { sectionIds: ['right'], row: 0, column: 1, columnSpan: 1 },
    { sectionIds: ['below'], row: 1, column: 0, columnSpan: 2 },
  ]);
});

it('honors explicit order and keeps explicit groups adjacent', () => {
  const data = document([bullets('first'), bullets('middle'), bullets('last')], {
    sectionOrder: ['last', 'first', 'middle'],
    sectionGroups: [{ id: 'bookends', sectionIds: ['last', 'middle'], direction: 'horizontal' }],
  });

  const blueprint = analyzeComposition(data);

  expect(blueprint.provenance).toBe('explicit-groups');
  expect(blueprint.sourceOrder).toEqual(['last', 'first', 'middle']);
  expect(blueprint.regions.map((region) => region.sectionIds)).toEqual([['last', 'middle'], ['first']]);
  expect(blueprint.regions[0]).toMatchObject({ direction: 'horizontal', columnSpan: 1 });
});

it('does not call an authoritative group an order-fidelity failure', () => {
  const data = document([bullets('first'), bullets('middle'), bullets('last')], {
    sectionOrder: ['last', 'first', 'middle'],
    sectionGroups: [{ id: 'bookends', sectionIds: ['last', 'middle'] }],
  });

  expect(assessCompositionFidelity(data, analyzeComposition(data)).issues).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ code: 'order-drift' })]),
  );
});

it('emits every canonical section once even when a source group repeats a member', () => {
  const data = document([bullets('one'), bullets('two')], {
    sectionGroups: [{ id: 'repeated', sectionIds: ['one', 'one', 'two'] }],
  });

  expect(analyzeComposition(data).regions.flatMap((region) => region.sectionIds)).toEqual(['one', 'two']);
});

const familyCases: Array<[string, CanonicalInfographic['sections']]> = [
  ['metric-led', [{ id: 'metrics', kind: 'metric-grid', title: 'metrics', metrics: [{ label: 'A', value: '1' }] }]],
  ['checklist-led', [{ id: 'checks', kind: 'checklist', title: 'checks', items: [{ label: 'A', status: 'passed' }] }]],
  ['process-led', [{ id: 'flow', kind: 'process-steps', title: 'flow', steps: [{ label: 'A' }, { label: 'B' }, { label: 'C' }] }]],
  ['timeline-led', [{ id: 'time', kind: 'timeline', title: 'time', events: [{ label: 'A' }] }]],
  ['comparison-led', [{ id: 'compare', kind: 'comparison', title: 'compare', columns: [{ label: 'A', items: [] }, { label: 'B', items: [] }] }]],
  ['table-led', [{ id: 'table', kind: 'table-lite', title: 'table', columns: ['A'], rows: [['1']] }]],
];

it.each(familyCases)('infers the %s composition family from semantic structure', (expectedFamily, sections) => {
  expect(analyzeComposition(document(sections)).family).toBe(expectedFamily);
});

it('uses a one-column source-order stack when structure does not signal a layout', () => {
  const blueprint = analyzeComposition(document([bullets('one'), bullets('two'), bullets('three')]));

  expect(blueprint).toMatchObject({ family: 'mixed-narrative', columns: 1, provenance: 'safe-fallback' });
  expect(analyzeComposition(document([bullets('only')])).family).toBe('single-column');
  expect(blueprint.regions.map((region) => region.sectionIds)).toEqual([['one'], ['two'], ['three']]);
});

it('allocates explicit importance without using content length as a proxy', () => {
  const data = document([
    { id: 'short', kind: 'callout', title: 'short', body: 'small' },
    { id: 'long', kind: 'bullet-list', title: 'long', items: Array.from({ length: 20 }, () => 'long content') },
  ], { relativeImportance: { short: 1, long: 0.1 } });

  const blueprint = analyzeComposition(data);

  expect(blueprint.regions.find((region) => region.sectionIds.includes('short'))?.emphasis).toBe('dominant');
  expect(blueprint.regions.find((region) => region.sectionIds.includes('long'))?.emphasis).not.toBe('dominant');
});

it('keeps full-width semantic grammar outside explicit grouping', () => {
  const data = document([
    { id: 'table', kind: 'table-lite', title: 'table', columns: ['A'], rows: [['1']] },
    { id: 'comparison', kind: 'comparison', title: 'comparison', columns: [{ label: 'A', items: [] }, { label: 'B', items: [] }] },
    { id: 'timeline', kind: 'timeline', title: 'timeline', events: [{ label: 'A' }] },
    { id: 'process', kind: 'process-steps', title: 'process', steps: [{ label: 'A' }, { label: 'B' }, { label: 'C' }] },
  ], { preferredColumns: 2, primaryAxis: 'horizontal' });

  const blueprint = analyzeComposition(data);

  expect(blueprint.columns).toBe(2);
  expect(blueprint.regions.every((region) => region.column === 0 && region.columnSpan === 2)).toBe(true);
});

it('reports every named structural fidelity failure with documented penalties', () => {
  const data = document([
    { id: 'process', kind: 'process-steps', title: 'process', steps: [{ label: 'A' }, { label: 'B' }, { label: 'C' }] },
    { id: 'table', kind: 'table-lite', title: 'table', columns: ['A'], rows: [['1']] },
    bullets('helper'),
    bullets('omitted'),
  ], {
    preferredColumns: 2,
    primaryAxis: 'horizontal',
    relativeImportance: { table: 1 },
    sectionGroups: [{ id: 'flow-helper', sectionIds: ['process', 'helper'] }],
  });
  const good = analyzeComposition(data);
  const blueprint = {
    ...good,
    columns: 1,
    regions: [
      { id: 'helper', sectionIds: ['helper', 'helper'], row: 0, column: 0, rowSpan: 1, columnSpan: 1, direction: 'vertical' as const, emphasis: 'supporting' as const, importance: 0 },
      { id: 'process', sectionIds: ['process'], row: 1, column: 0, rowSpan: 1, columnSpan: 1, direction: 'vertical' as const, emphasis: 'supporting' as const, importance: 0 },
      { id: 'table', sectionIds: ['table'], row: 2, column: 1, rowSpan: 1, columnSpan: 1, direction: 'vertical' as const, emphasis: 'supporting' as const, importance: 0 },
    ],
    footer: { id: 'footer' as const, row: 0 },
  };

  const report = assessCompositionFidelity(data, blueprint);

  expect(report.passed).toBe(false);
  expect(report.score).toBeLessThan(100);
  expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
    'missing-section', 'duplicate-section', 'order-drift', 'broken-group', 'wrong-section-grammar',
    'lost-dominant-emphasis', 'process-direction', 'source-columns', 'footer-order',
  ]));
});

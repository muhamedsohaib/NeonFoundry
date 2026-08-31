import { expect, it } from 'vitest';
import { selectLayout } from '../src/layout/select-layout.js';
import { parseCanonicalInfographic } from '../src/schema/canonical.js';

const base = (sections: unknown[], intent = 'mixed') => parseCanonicalInfographic({
  meta: { version: 1, intent, layoutFamily: 'auto', sourceMode: 'json' },
  hero: { title: 'TEST' },
  sections,
  footer: { facts: [] },
  sourceHints: {},
});

it('selects qa for checklist-heavy content', () => {
  const doc = base([
    {
      id: 'c',
      kind: 'checklist',
      title: 'QA',
      items: [
        { label: 'Structure', status: 'passed' },
        { label: 'Attributes', status: 'passed' },
      ],
    },
  ], 'checklist');

  expect(selectLayout(doc).selected).toBe('qa');
});

it('falls back unsupported requested timeline to dashboard and records it', () => {
  const doc = base([
    {
      id: 'm',
      kind: 'metric-grid',
      title: 'M',
      metrics: [{ label: 'A', value: '1' }],
    },
  ]);

  expect(selectLayout(doc, 'timeline')).toMatchObject({
    selected: 'dashboard',
    fallbackFrom: 'timeline',
  });
});

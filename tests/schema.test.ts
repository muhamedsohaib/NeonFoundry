import { describe, expect, it } from 'vitest';
import { parseCanonicalInfographic } from '../src/schema/canonical.js';

describe('canonical infographic schema', () => {
  it('accepts a minimal dashboard document and applies safe defaults', () => {
    const doc = parseCanonicalInfographic({
      meta: { version: 1, intent: 'report', layoutFamily: 'auto', sourceMode: 'json' },
      hero: { title: 'CATALOG HEALTH' },
      sections: [{ id: 'kpi', kind: 'metric-grid', title: 'KEY METRICS', metrics: [{ label: 'Coverage', value: '97%' }] }],
      footer: { facts: [] },
      sourceHints: {},
    });
    expect(doc.meta.version).toBe(1);
    expect(doc.hero.tags).toEqual([]);
    expect(doc.sections[0].kind).toBe('metric-grid');
  });

  it('rejects an unknown section kind with a useful path', () => {
    expect(() => parseCanonicalInfographic({ meta: { version: 1, intent: 'mixed', layoutFamily: 'auto', sourceMode: 'json' }, hero: { title: 'X' }, sections: [{ id: 'bad', kind: 'mystery' }], footer: { facts: [] }, sourceHints: {} })).toThrow(/sections/);
  });
});

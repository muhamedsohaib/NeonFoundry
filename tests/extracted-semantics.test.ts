import { expect, it } from 'vitest';
import { repairExtractedSemantics } from '../src/normalize/extracted-semantics.js';
import { parseCanonicalInfographic } from '../src/schema/canonical.js';

function comparison(id: string, title: string, columns: Array<{ label: string; items: string[] }>) {
  return { id, kind: 'comparison' as const, title, columns };
}

it('repairs comparison-shaped vision output into concrete canonical structures', () => {
  const doc = parseCanonicalInfographic({
    meta: { version: 1, intent: 'comparison', layoutFamily: 'auto', sourceMode: 'image' },
    hero: {
      title: 'BEFORE vs AFTER CATALOG REMEDIATION',
      highlight: 'PRECISE CHANGES. VERIFIABLE RESULTS.',
      subtitle: 'BEFORE vs AFTER CATALOG REMEDIATION',
      tags: [],
      metrics: [
        {
          label: 'BEFORE vs AFTER CATALOG REMEDIATION',
          value: 'We fix catalog issues at the exact field level.',
          detail: 'FIELD-LEVEL FIXES • ACCURATE MAPPINGS • VALIDATED OUTCOMES',
        },
      ],
    },
    sections: [
      comparison('before-after', 'BEFORE vs AFTER REMEDIATION', [
        { label: 'AFTER', items: ['Variation displaying', 'Catalog health restored'] },
        { label: 'BEFORE', items: ['Variation not displaying', 'Low catalog health'] },
      ]),
      comparison('field-short', 'EXACT FIELD-LEVEL CHANGES', [
        { label: 'FIELD', items: ['Variation Theme'] },
        { label: 'BEFORE', items: ['Headphones (Incorrect)'] },
        { label: 'AFTER', items: ['Over Ear Headphones'] },
        { label: 'CHANGE IMPACT', items: ['Theme aligned'] },
      ]),
      comparison('field-full', 'EXTENDED FIELD MAPPINGS', [
        { label: 'FIELD', items: ['Variation Theme', 'Color', 'Size'] },
        { label: 'BEFORE (INCORRECT)', items: ['Headphones (Incorrect)', 'Mixed / Invalid Values', 'One Size (Incorrect)'] },
        { label: 'AFTER (CORRECT)', items: ['Over Ear Headphones', 'Black, White, Blue', 'Standard, Large'] },
        { label: 'CHANGE IMPACT', items: ['Theme aligned', 'Mapping corrected', 'Size mapping fixed'] },
      ]),
      comparison('process', 'PROCESS FLOW', [
        { label: 'STEP 4', items: ['LIVE: Healthy listing back in sync'] },
        { label: 'STEP 3', items: ['VALIDATED: Changes tested & confirmed'] },
        { label: 'STEP 2', items: ['CORRECTED: Field-level remediation applied'] },
        { label: 'STEP 1', items: ['DETECTED: Issue identified in catalog'] },
      ]),
      comparison('health', 'CATALOG HEALTH IMPROVEMENT', [
        { label: 'METRIC 4', items: ['INTEGRITY RESTORED'] },
        { label: 'METRIC 3', items: ['100% VARIATIONS RESTORED'] },
        { label: 'METRIC 2', items: ['12 LISTINGS AFFECTED'] },
        { label: 'METRIC 1', items: ['5 ISSUES RESOLVED'] },
      ]),
      comparison('evidence', 'EVIDENCE & VALIDATION', [
        { label: 'VALIDATION STEP', items: ['CHANGE LOG: All changes logged with timestamps and user ID'] },
        { label: 'VALIDATION STEP', items: ['QA CHECKS: Automated + manual QA checks passed'] },
        { label: 'SECTION HEADER', items: ['EVIDENCE & VALIDATION'] },
      ]),
    ],
    footer: { facts: [] }, sourceHints: {},
  });

  const repaired = repairExtractedSemantics(doc);
  expect(repaired.hero.subtitle).toBe('PRECISE CHANGES. VERIFIABLE RESULTS.');
  expect(repaired.hero.metrics).toEqual([]);
  expect(repaired.hero.tags).toEqual(expect.arrayContaining(['FIELD-LEVEL FIXES', 'ACCURATE MAPPINGS', 'VALIDATED OUTCOMES']));
  const callout = repaired.sections.find((section) => section.kind === 'callout');
  expect(callout?.kind).toBe('callout');
  if (callout?.kind === 'callout') expect(callout.body).toBe('We fix catalog issues at the exact field level.');

  const tables = repaired.sections.filter((section) => section.kind === 'table-lite');
  expect(tables).toHaveLength(1);
  expect(tables[0]?.rows).toHaveLength(3);
  expect(tables[0]?.rows[1]).toEqual(['Color', 'Mixed / Invalid Values', 'Black, White, Blue', 'Mapping corrected']);

  const process = repaired.sections.find((section) => section.kind === 'process-steps');
  expect(process?.kind).toBe('process-steps');
  if (process?.kind === 'process-steps') expect(process.steps.map((step) => step.label)).toEqual(['DETECTED', 'CORRECTED', 'VALIDATED', 'LIVE']);

  const health = repaired.sections.find((section) => section.kind === 'metric-grid');
  expect(health?.kind).toBe('metric-grid');
  if (health?.kind === 'metric-grid') expect(health.metrics.map((metric) => metric.value)).toEqual(['5', '12', '100%', 'INTEGRITY RESTORED']);

  const evidence = repaired.sections.find((section) => section.kind === 'bullet-list');
  expect(evidence?.kind).toBe('bullet-list');
  if (evidence?.kind === 'bullet-list') {
    expect(evidence.items[0]).toMatch(/^CHANGE LOG —/);
    expect(evidence.items.some((item) => /SECTION HEADER/i.test(item))).toBe(false);
  }

  const comparisons = repaired.sections.filter((section) => section.kind === 'comparison');
  expect(comparisons).toHaveLength(1);
  expect(comparisons[0]?.columns[0]?.label).toMatch(/BEFORE/i);
  expect(comparisons[0]?.columns[1]?.label).toMatch(/AFTER/i);
});

it('repairs already-canonical free-model sections and splits field rows from evidence', () => {
  const doc = parseCanonicalInfographic({
    meta: { version: 1, intent: 'process', layoutFamily: 'auto', sourceMode: 'image' },
    hero: {
      title: 'BEFORE vs AFTER CATALOG REMEDIATION',
      subtitle: 'PRECISE CHANGES. VERIFIABLE RESULTS.',
      tags: ['FIELD-LEVEL FIXES'],
      metrics: [{
        label: 'PRECISE CHANGES. VERIFIABLE RESULTS.',
        value: 'We fix catalog issues at the exact field level—ensuring accurate parent/child relationships.',
        detail: 'FIELD-LEVEL FIXES • ACCURATE MAPPINGS • VALIDATED OUTCOMES',
      }],
    },
    sections: [{
      id: 'health', kind: 'metric-grid', title: 'CATALOG HEALTH IMPROVEMENT',
      metrics: [
        { label: 'CATALOG HEALTH IMPROVEMENT', value: '5', detail: 'ISSUES RESOLVED' },
        { label: 'CATALOG HEALTH IMPROVEMENT', value: '100%', detail: 'VARIATIONS RESTORED' },
        { label: 'CATALOG HEALTH IMPROVEMENT', value: 'INTEGRITY', detail: 'INTEGRITY RESTORED' },
      ],
    }, {
      id: 'process', kind: 'process-steps', title: 'Remediation Workflow',
      steps: [
        { label: 'Step 1', description: 'DETECTED / Issue identified in catalog' },
        { label: 'Step 2', description: 'CORRECTED / Field-level remediation applied' },
        { label: 'Step 3', description: 'VALIDATED / Changes tested & confirmed' },
        { label: 'Step 4', description: 'LIVE / Healthy listing back in sync' },
      ],
    }, {
      id: 'evidence', kind: 'bullet-list', title: 'EVIDENCE & VALIDATION',
      items: [
        'FIELD CHANGES — Variation Theme: Headphones (Incorrect) -> Over Ear Headphones | Theme aligned',
        'FIELD CHANGES — Color: Mixed / Invalid Values -> Black, White, Blue | Mapping corrected',
        'CHANGE LOG — All changes logged with timestamps and user ID',
        'QA CHECKS — Automated + manual QA checks passed successfully',
      ],
    }],
    footer: { facts: [] }, sourceHints: { emphasisOrder: ['exact_field_level_changes', 'evidence_validation'] },
  });

  const repaired = repairExtractedSemantics(doc);
  expect(repaired.hero.metrics).toEqual([]);
  const callout = repaired.sections.find((section) => section.kind === 'callout');
  expect(callout?.kind).toBe('callout');
  if (callout?.kind === 'callout') expect(callout.body).toContain('We fix catalog issues');
  const health = repaired.sections.find((section) => section.kind === 'metric-grid');
  expect(health?.kind).toBe('metric-grid');
  if (health?.kind === 'metric-grid') {
    expect(health.metrics.map((metric) => metric.label)).toEqual(['ISSUES RESOLVED', 'VARIATIONS RESTORED', 'CATALOG HEALTH']);
    expect(health.metrics.map((metric) => metric.value)).toEqual(['5', '100%', 'INTEGRITY RESTORED']);
  }
  const process = repaired.sections.find((section) => section.kind === 'process-steps');
  expect(process?.kind).toBe('process-steps');
  if (process?.kind === 'process-steps') expect(process.steps.map((step) => step.label)).toEqual(['DETECTED', 'CORRECTED', 'VALIDATED', 'LIVE']);
  const table = repaired.sections.find((section) => section.kind === 'table-lite');
  expect(table?.kind).toBe('table-lite');
  if (table?.kind === 'table-lite') expect(table.rows).toHaveLength(2);
  const evidence = repaired.sections.find((section) => section.kind === 'bullet-list');
  expect(evidence?.kind).toBe('bullet-list');
  if (evidence?.kind === 'bullet-list') {
    expect(evidence.items).toHaveLength(2);
    expect(evidence.items[0]).toMatch(/^CHANGE LOG/);
  }
});


it('repairs flattened free-router summary, health, evidence, and before-after sections', () => {
  const doc = parseCanonicalInfographic({
    meta: { version: 1, intent: 'report', layoutFamily: 'auto', sourceMode: 'image' },
    hero: {
      title: 'BEFORE vs AFTER CATALOG REMEDIATION', subtitle: 'PRECISE CHANGES. VERIFIABLE RESULTS.',
      tags: ['FIELD-LEVEL FIXES', 'ACCURATE MAPPINGS'],
      metrics: [{
        label: 'We fix catalog issues at the exact field level?ensuring accurate parent/child relationships.',
        value: 'BEFORE vs AFTER CATALOG REMEDIATION',
        detail: 'FIELD-LEVEL FIXES ? ACCURATE MAPPINGS ? VALIDATED OUTCOMES',
      }],
    },
    sections: [
      { id: 'bottom', kind: 'bullet-list', title: 'CATALOG HEALTH IMPROVEMENT & EVIDENCE & VALIDATION', items: [
        'CATALOG HEALTH IMPROVEMENT ? 5 ISSUES RESOLVED',
        'CATALOG HEALTH IMPROVEMENT ? 100% VARIATIONS RESTORED',
        'EVIDENCE & VALIDATION ? CHANGE LOG: All changes logged with timestamps and user ID',
        'EVIDENCE & VALIDATION ? QA CHECKS: Automated + manual QA checks passed successfully',
      ] },
      { id: 'top', kind: 'comparison', title: 'BEFORE VS AFTER COMPARISON & CORE VALUE', columns: [
        { label: 'BEFORE REMEDIATION VS AFTER REMEDIATION', items: [
          'VARIATION STATUS: SUPPRESSED (Not Displaying) | Red list: Variation not displaying on detail page, Incorrect size & color mapping, Low catalog health',
          'VARIATION STATUS: ACTIVE (Displaying) | Green list: Variation displaying on detail page, Correct size & color mapping, Catalog health restored',
        ] },
        { label: 'BEFORE REMEDIATION VS AFTER REMEDIATION', items: [
          'VARIATION STATUS: SUPPRESSED (Not Displaying) | Red list: Variation not displaying on detail page, Incorrect size & color mapping, Low catalog health',
          'VARIATION STATUS: ACTIVE (Displaying) | Green list: Variation displaying on detail page, Correct size & color mapping, Catalog health restored',
        ] },
      ] },
    ],
    footer: { facts: [] }, sourceHints: {},
  });
  const repaired = repairExtractedSemantics(doc);
  expect(repaired.hero.metrics).toEqual([]);
  const callout = repaired.sections.find((section) => section.kind === 'callout');
  expect(callout?.kind).toBe('callout');
  if (callout?.kind === 'callout') expect(callout.body).toMatch(/^We fix catalog issues/);
  const metrics = repaired.sections.find((section) => section.kind === 'metric-grid');
  expect(metrics?.kind).toBe('metric-grid');
  if (metrics?.kind === 'metric-grid') expect(metrics.metrics.map((metric) => metric.label)).toEqual(['ISSUES RESOLVED', 'VARIATIONS RESTORED']);
  const evidence = repaired.sections.find((section) => section.kind === 'bullet-list');
  expect(evidence?.kind).toBe('bullet-list');
  if (evidence?.kind === 'bullet-list') expect(evidence.items).toEqual(expect.arrayContaining([expect.stringMatching(/^CHANGE LOG ?/), expect.stringMatching(/^QA CHECKS ?/)]));
  const compare = repaired.sections.find((section) => section.kind === 'comparison');
  expect(compare?.kind).toBe('comparison');
  if (compare?.kind === 'comparison') {
    expect(compare.columns.map((column) => column.label)).toEqual(['BEFORE REMEDIATION', 'AFTER REMEDIATION']);
    expect(compare.columns[0]?.items.join(' ')).toMatch(/SUPPRESSED/);
    expect(compare.columns[1]?.items.join(' ')).toMatch(/ACTIVE/);
  }
});


it('promotes Dots-style Subheader and Description hero metrics into real hero content', () => {
  const doc = parseCanonicalInfographic({
    meta: { version: 1, intent: 'report', layoutFamily: 'auto', sourceMode: 'image' },
    hero: {
      title: 'BEFORE vs AFTER CATALOG REMEDIATION',
      highlight: 'BEFORE vs AFTER CATALOG REMEDIATION',
      subtitle: 'PRECISE CHANGES. VERIFIABLE RESULTS.',
      tags: ['FIELD-LEVEL FIXES'],
      metrics: [
        { label: 'Subheader', value: 'PRECISE CHANGES. VERIFIABLE RESULTS.', detail: 'FIELD-LEVEL FIXES ? ACCURATE MAPPINGS ? VALIDATED OUTCOMES' },
        { label: 'Description', value: 'Core description text', detail: 'We fix catalog issues at the exact field level?ensuring accurate parent/child relationships, correct attributes, and a healthy, visible listing.' },
      ],
    },
    sections: [], footer: { facts: [] }, sourceHints: {},
  });
  const repaired = repairExtractedSemantics(doc);
  expect(repaired.hero.metrics).toEqual([]);
  expect(repaired.hero.highlight).toBeUndefined();
  expect(repaired.hero.tags).not.toContain(expect.stringMatching(/^We fix catalog issues/));
  const callout = repaired.sections.find((section) => section.kind === 'callout');
  expect(callout?.kind).toBe('callout');
  if (callout?.kind === 'callout') expect(callout.body).toMatch(/^We fix catalog issues at the exact field level/);
});

it('removes duplicate hero title tags and generic evidence prefixes', () => {
  const doc = parseCanonicalInfographic({
    meta: { version: 1, intent: 'report', layoutFamily: 'auto', sourceMode: 'image' },
    hero: { title: 'BEFORE vs AFTER CATALOG REMEDIATION', tags: ['BEFORE vs AFTER CATALOG REMEDIATION', 'FIELD-LEVEL FIXES'] },
    sections: [{
      id: 'evidence', kind: 'bullet-list', title: 'EVIDENCE & VALIDATION',
      items: ['Validation Items — CHANGE LOG: All changes logged', 'Validation Items — QA CHECKS: Manual QA passed'],
    }],
    footer: { facts: [] }, sourceHints: {},
  });
  const repaired = repairExtractedSemantics(doc);
  expect(repaired.hero.tags).toEqual(['FIELD-LEVEL FIXES']);
  const evidence = repaired.sections.find((section) => section.kind === 'bullet-list');
  expect(evidence?.kind).toBe('bullet-list');
  if (evidence?.kind === 'bullet-list') expect(evidence.items).toEqual(['CHANGE LOG: All changes logged', 'QA CHECKS: Manual QA passed']);
});

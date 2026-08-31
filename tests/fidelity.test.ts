import fs from 'node:fs';
import { expect, it } from 'vitest';
import { assessSemanticFidelity } from '../src/qa/fidelity.js';
import { parseCanonicalInfographic } from '../src/schema/canonical.js';

it('rejects image extraction that describes blocks instead of extracting their contents', () => {
  const doc = parseCanonicalInfographic({
    meta: { version: 1, intent: 'report', layoutFamily: 'auto', sourceMode: 'image' },
    hero: { title: 'BEFORE vs AFTER CATALOG REMEDIATION' },
    sections: [
      {
        id: 'comparison', kind: 'comparison', title: 'BEFORE vs AFTER',
        columns: [
          { label: 'before', items: ['/before remediation column'] },
          { label: 'after', items: ['/after remediation column'] },
        ],
      },
      {
        id: 'health', kind: 'comparison', title: 'CATALOG HEALTH IMPROVEMENT',
        columns: [
          { label: 'metrics', items: ['/catalog health improvement block'] },
          { label: 'other', items: [] },
        ],
      },
    ],
    footer: { facts: [] }, sourceHints: {},
  });
  const fidelity = assessSemanticFidelity(doc);
  expect(fidelity.passed).toBe(false);
  expect(fidelity.issues.some((issue) => issue.code === 'placeholder-content')).toBe(true);
});

it('accepts a concrete remediation case study with claims, metrics, process, and field changes', () => {
  const raw = JSON.parse(fs.readFileSync(
    new URL('./fixtures/canonical-remediation-comparison.json', import.meta.url),
    'utf8',
  ));
  const doc = parseCanonicalInfographic(raw);
  const fidelity = assessSemanticFidelity(doc);
  expect(fidelity.passed).toBe(true);
  expect(fidelity.score).toBeGreaterThanOrEqual(85);
  expect(fidelity.concreteFacts).toBeGreaterThanOrEqual(20);
});

it('rejects a remediation extraction that loses the field table or validation evidence', () => {
  const doc = parseCanonicalInfographic({
    meta: { version: 1, intent: 'process', layoutFamily: 'auto', sourceMode: 'image' },
    hero: { title: 'BEFORE vs AFTER CATALOG REMEDIATION' },
    sections: [{
      id: 'compare', kind: 'comparison', title: 'BEFORE vs AFTER',
      columns: [
        { label: 'BEFORE', items: ['Variation not displaying', 'Low catalog health'] },
        { label: 'AFTER', items: ['Variation displaying', 'Catalog health restored'] },
      ],
    }, {
      id: 'process', kind: 'process-steps', title: 'Remediation Workflow',
      steps: [
        { label: 'DETECTED', description: 'Issue identified' },
        { label: 'CORRECTED', description: 'Field remediation applied' },
        { label: 'VALIDATED', description: 'Changes confirmed' },
        { label: 'LIVE', description: 'Listing restored' },
      ],
    }, {
      id: 'evidence', kind: 'bullet-list', title: 'EVIDENCE & VALIDATION',
      items: [
        'FIELD CHANGES — Color: Mixed / Invalid Values -> Black, White, Blue | Mapping corrected',
        'LISTING STATUS — VARIATION STATUS: SUPPRESSED -> ACTIVE',
      ],
    }, {
      id: 'health', kind: 'metric-grid', title: 'CATALOG HEALTH IMPROVEMENT',
      metrics: [
        { label: 'ISSUES RESOLVED', value: '5' },
        { label: 'VARIATIONS RESTORED', value: '100%' },
      ],
    }],
    footer: { facts: [] },
    sourceHints: { emphasisOrder: ['exact_field_level_changes', 'evidence_validation'] },
  });
  const fidelity = assessSemanticFidelity(doc);
  expect(fidelity.passed).toBe(false);
  expect(fidelity.issues.some((issue) => issue.message.includes('field-change table'))).toBe(true);
  expect(fidelity.issues.some((issue) => issue.message.includes('validation evidence'))).toBe(true);
});


it('rejects image output when visual/source signals require missing process and field-change structures', () => {
  const doc = parseCanonicalInfographic({
    meta: { version: 1, intent: 'comparison', layoutFamily: 'auto', sourceMode: 'image' },
    hero: { title: 'BEFORE vs AFTER CATALOG REMEDIATION', tags: ['FIELD-LEVEL FIXES'] },
    sections: [
      { id: 'compare', kind: 'comparison', title: 'BEFORE vs AFTER', columns: [
        { label: 'BEFORE', items: ['Variation suppressed', 'Low catalog health'] },
        { label: 'AFTER', items: ['Variation active', 'Catalog health restored'] },
      ] },
      { id: 'evidence', kind: 'bullet-list', title: 'EVIDENCE & VALIDATION', items: [
        'CHANGE LOG ? All changes logged with timestamps',
        'QA CHECKS ? Automated + manual QA checks passed',
      ] },
    ],
    footer: { facts: [] },
    sourceHints: { visualNotes: ['Red-orange-green progression shows steps from detection to live status.'] },
  });
  const fidelity = assessSemanticFidelity(doc);
  expect(fidelity.passed).toBe(false);
  expect(fidelity.issues.some((issue) => /process/i.test(issue.message))).toBe(true);
  expect(fidelity.issues.some((issue) => /field-change table/i.test(issue.message))).toBe(true);
});

it('accepts a complete simple image without an arbitrary minimum fact count', () => {
  const doc = parseCanonicalInfographic({
    meta: { version: 1, intent: 'report', layoutFamily: 'auto', sourceMode: 'image' },
    hero: { title: 'THREE KEY METRICS' },
    sections: [{
      id: 'metrics', kind: 'metric-grid', title: 'RESULTS', metrics: [
        { label: 'Revenue', value: '+18%' },
        { label: 'Returns', value: '-7%' },
        { label: 'Availability', value: '99%' },
      ],
    }],
    footer: { facts: [] }, sourceHints: {},
  });
  const fidelity = assessSemanticFidelity(doc);
  expect(fidelity.passed).toBe(true);
  expect(fidelity.concreteFacts).toBe(3);
});

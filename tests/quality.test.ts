import { expect, it } from 'vitest';
import { parseCanonicalInfographic } from '../src/schema/canonical.js';
import { deriveRenderProfile, runQualityChecks } from '../src/qa/quality.js';

it('chooses a compact two-column profile for dense content', () => {
  const doc = parseCanonicalInfographic({
    meta: { version: 1, intent: 'checklist', layoutFamily: 'auto', sourceMode: 'json' },
    hero: { title: 'A VERY LONG VALIDATION HEADING THAT NEEDS CONTROLLED COMPACTION WITHOUT DESTROYING HIERARCHY' },
    sections: [{ id: 'c', kind: 'checklist', title: 'CHECKS', items: Array.from({ length: 10 }, (_, i) => ({ label: `Checkpoint ${i + 1}`, status: 'passed' })) }],
    footer: { facts: [] }, sourceHints: { preferredColumns: 3 },
  });
  const report = runQualityChecks(doc);
  const profile = deriveRenderProfile(report);
  expect(report.warnings.length).toBeGreaterThan(0);
  expect(profile.columns).toBe(2);
  expect(profile.density).toBe('compact');
  expect(profile.heroScale).toBeLessThan(1);
});

it('reduces the overall quality score when image semantics are incomplete', () => {
  const doc = parseCanonicalInfographic({
    meta: { version: 1, intent: 'comparison', layoutFamily: 'auto', sourceMode: 'image' },
    hero: { title: 'BEFORE vs AFTER CATALOG REMEDIATION' },
    sections: [{
      id: 'comparison', kind: 'comparison', title: 'BEFORE vs AFTER',
      columns: [
        { label: 'Before', items: ['/before remediation column'] },
        { label: 'After', items: ['/after remediation column'] },
      ],
    }],
    footer: { facts: [] }, sourceHints: {},
  });
  const report = runQualityChecks(doc);
  expect(report.score).toBeLessThan(100);
  expect(report.semanticFidelity.passed).toBe(false);
  expect(report.semanticFidelity.placeholderCount).toBeGreaterThan(0);
});

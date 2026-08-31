import fs from 'node:fs';
import { expect, it } from 'vitest';
import { parseCanonicalInfographic } from '../src/schema/canonical.js';
import { selectLayout } from '../src/layout/select-layout.js';
import { adaptLegacyQa } from '../src/normalize/legacy-qa.js';
import { deriveRenderProfile, runQualityChecks } from '../src/qa/quality.js';
import { renderInfographic } from '../src/render/render-infographic.js';

it('renders a canonical dashboard to neon SVG and PNG', async () => {
  const raw = JSON.parse(fs.readFileSync(new URL('./fixtures/canonical-dashboard.json', import.meta.url), 'utf8'));
  const doc = parseCanonicalInfographic(raw);
  const decision = selectLayout(doc);
  const result = await renderInfographic(doc, decision, deriveRenderProfile(runQualityChecks(doc)));
  expect(result.layout).toBe('dashboard');
  expect(result.svg).toContain('<svg');
  expect(result.svg.toLowerCase()).toContain('ccff00');
  expect(result.png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
}, 15_000);

it('renders the current legacy QA fixture through the canonical QA layout', async () => {
  const legacy = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url), 'utf8'));
  const doc = adaptLegacyQa(legacy);
  const decision = selectLayout(doc);
  const result = await renderInfographic(doc, decision, deriveRenderProfile(runQualityChecks(doc)));
  expect(result.layout).toBe('qa');
  expect(result.png.length).toBeGreaterThan(10_000);
}, 15_000);

it('renders remediation comparisons with the source message preserved', async () => {
  const raw = JSON.parse(fs.readFileSync(
    new URL('./fixtures/canonical-remediation-comparison.json', import.meta.url),
    'utf8',
  ));
  const doc = parseCanonicalInfographic(raw);
  const decision = selectLayout(doc);
  const result = await renderInfographic(doc, decision, deriveRenderProfile(runQualityChecks(doc)));

  expect(result.layout).toBe('comparison');
  const sourceMessage = JSON.stringify(doc);
  expect(sourceMessage).toContain('Variation not displaying on detail page');
  expect(sourceMessage).toContain('Over Ear Headphones');
  expect(sourceMessage).toContain('100%');
  expect(result.svg).toContain('<svg');
  expect(result.png.length).toBeGreaterThan(10_000);
}, 15_000);

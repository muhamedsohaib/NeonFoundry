import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

import { selectLayout } from '../src/layout/select-layout.js';
import { deriveRenderProfile, runQualityChecks } from '../src/qa/quality.js';
import { renderInfographic } from '../src/render/render-infographic.js';
import { parseCanonicalInfographic } from '../src/schema/canonical.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(here, 'fixtures', 'generalization');
const files = fs.readdirSync(fixtureDir).filter((name) => name.endsWith('.json')).sort();

function load(name: string) {
  return parseCanonicalInfographic(JSON.parse(fs.readFileSync(path.join(fixtureDir, name), 'utf8')));
}

it('ships ten varied non-portfolio generalization fixtures', () => {
  expect(files).toHaveLength(10);
  const domains = files.map((name) => load(name).hero.title);
  expect(new Set(domains).size).toBe(10);
});

it.each(files)('%s preserves structure through generalized rendering', async (name) => {
  const data = load(name);
  const decision = selectLayout(data);
  const rendered = await renderInfographic(data, decision, deriveRenderProfile(runQualityChecks(data)));
  expect(rendered.template).toBeUndefined();
  expect(rendered.blueprint).toBeDefined();
  expect(rendered.compositionFidelity?.passed).toBe(true);
  expect(rendered.png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');

  const measuredSections = new Set(rendered.geometry.map((node) => node.sectionId).filter(Boolean));
  for (const section of data.sections) expect(measuredSections.has(section.id)).toBe(true);

  const footer = rendered.geometry.find((node) => node.region === 'footer');
  const sectionBottom = Math.max(...rendered.geometry.filter((node) => node.sectionId)
    .map((node) => node.top + node.height));
  expect(footer).toBeDefined();
  expect(footer!.top).toBeGreaterThanOrEqual(sectionBottom - 1);

  for (const section of data.sections.filter((item) => ['table-lite', 'comparison', 'timeline'].includes(item.kind))) {
    const region = rendered.blueprint!.regions.find((item) => item.sectionIds.includes(section.id));
    expect(region).toMatchObject({ column: 0, columnSpan: rendered.blueprint!.columns });
  }
}, 20_000);

it('auto-sizes the tall poster instead of clipping its content', async () => {
  const data = load('09-research-tall-poster.json');
  const decision = selectLayout(data);
  const rendered = await renderInfographic(data, decision, deriveRenderProfile(runQualityChecks(data)));
  expect(rendered.height).toBeGreaterThan(1120);
});

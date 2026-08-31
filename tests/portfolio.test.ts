import fs from 'node:fs';
import { expect, it } from 'vitest';
import { selectLayout } from '../src/layout/select-layout.js';
import { parseCanonicalInfographic } from '../src/schema/canonical.js';
import { deriveRenderProfile, runQualityChecks } from '../src/qa/quality.js';
import { renderInfographic } from '../src/render/render-infographic.js';
import { selectTemplate } from '../src/layout/select-template.js';
import { layoutOverflows } from '../src/render/geometry.js';
import { ProgressGauge } from '../src/components/portfolio-primitives.js';

const catalog = () => parseCanonicalInfographic(JSON.parse(fs.readFileSync(
  new URL('./fixtures/portfolio-catalog-troubleshooting.json', import.meta.url), 'utf8',
)));
const render = (data = catalog(), options = {}) => renderInfographic(data,
  selectLayout(data), deriveRenderProfile(runQualityChecks(data)), { pngWidth: 800, ...options });

it('selects the catalog composition without changing the canonical dashboard family', async () => {
  const data = catalog();
  const result = await render(data);
  expect(result.layout).toBe('dashboard');
  expect(result.template).toBe('catalog-troubleshooting');
});

it('accepts only known optional template names and keeps old JSON valid', () => {
  const data = catalog();
  expect(parseCanonicalInfographic(data)).toEqual(data);
  expect(() => parseCanonicalInfographic({ ...data, sourceHints: { template: 'catalog-troubleshooting' } })).not.toThrow();
  expect(() => parseCanonicalInfographic({ ...data, sourceHints: { template: 'made-up' } })).toThrow();
});

it('preserves source facts in the rendered geometry with a dominant gauge and bounded sections', async () => {
  const result = await render();
  const nodes = result.geometry;
  const text = nodes.map((node) => node.text ?? '').join(' ');
  for (const fact of ['87%', '23', '112', '18', '94', 'Key catalog checks completed',
    'SYMPTOM', 'INVESTIGATE', 'ROOT CAUSE', 'RESOLVE', 'VALIDATE',
    '6. RECURRENCE PREVENTION', 'Suppressed ASIN', 'ASIN active', '7–30 DAYS',
    'Illustrative case scenario']) expect(text).toContain(fact);
  for (const section of catalog().sections) expect(text).toContain(section.title);
  expect(text).not.toMatch(/LIVE CANONICAL VIEW|JSON SOURCE|2-COLUMN REFLOW/);
  const gauge = nodes.find((node) => node.text === '87%')!;
  const count = nodes.find((node) => node.text === '112')!;
  expect(gauge.height).toBeGreaterThan(count.height * 1.5);
  const footer = nodes.find((node) => node.region === 'footer')!;
  const sections = nodes.filter((node) => node.sectionId);
  expect(sections).toHaveLength(5);
  for (const node of sections) expect(node.top + node.height).toBeLessThanOrEqual(footer.top - 16);
  const beforeAfter = sections.find((node) => node.sectionId === 'before-after')!;
  expect(beforeAfter.height).toBeLessThan(result.height * 0.32);
  const stepNodes = ['SYMPTOM', 'INVESTIGATE', 'ROOT CAUSE', 'RESOLVE', 'VALIDATE']
    .map((label) => nodes.find((node) => node.text === label)!);
  expect(Math.max(...stepNodes.map((node) => node.top)) - Math.min(...stepNodes.map((node) => node.top))).toBeLessThan(2);
  expect(stepNodes.map((node) => node.left)).toEqual(stepNodes.map((node) => node.left).sort((a, b) => a - b));
});

it('reflows long source text deterministically and rejects an undersized fixed canvas', async () => {
  const data = catalog();
  const summary = data.sections.find((section) => section.kind === 'callout')!;
  summary.body = 'Preserve every field and every original relationship. '.repeat(16).trim();
  const first = await render(data);
  const second = await render(data);
  expect(first.svg).toBe(second.svg);
  expect(first.png.equals(second.png)).toBe(true);
  expect(first.geometry.some((node) => node.text === summary.body)).toBe(true);
  await expect(render(data, { height: 400 })).rejects.toThrow(/overflow|fit|canvas/i);
}, 20_000);

const templates = ['catalog-troubleshooting', 'validation-qa', 'root-cause-investigation',
  'remediation-comparison', 'strategic-approach'] as const;

it.each(templates)('%s renders every source fact, every section, and a separate footer', async (template) => {
  const data = parseCanonicalInfographic(JSON.parse(fs.readFileSync(new URL(`./fixtures/portfolio-${template}.json`, import.meta.url), 'utf8')));
  const result = await render(data);
  expect(result.template).toBe(template);
  const text = result.geometry.map((node) => node.text ?? '').join(' ').toLowerCase();
  const facts = (value: unknown): string[] => typeof value === 'string' ? [value]
    : Array.isArray(value) ? value.flatMap(facts)
      : value && typeof value === 'object' ? Object.entries(value)
        .filter(([key]) => !['id', 'kind', 'tone'].includes(key)).flatMap(([, val]) => facts(val)) : [];
  for (const fact of [...facts(data.hero), ...facts(data.sections), ...facts(data.footer)]) {
    expect(text, `Missing rendered source fact: ${fact}`).toContain(fact.toLowerCase());
  }
  expect(result.geometry.filter((node) => node.sectionId).map((node) => node.sectionId).sort())
    .toEqual(data.sections.map((section) => section.id).sort());
  expect(text).not.toMatch(/live canonical view|json source|2-column reflow/);
  expect(layoutOverflows(result.geometry, result.width, result.height)).toEqual([]);
  const footer = result.geometry.find((node) => node.region === 'footer')!;
  for (const section of result.geometry.filter((node) => node.sectionId)) {
    expect(section.top + section.height).toBeLessThanOrEqual(footer.top - 16);
  }
}, 15_000);

it('uses explicit template metadata for renamed heroes but never overrides a CLI family', () => {
  const data = catalog();
  data.hero.title = 'CLIENT CASE STUDY';
  data.sourceHints.template = 'catalog-troubleshooting';
  expect(selectTemplate(data, selectLayout(data))).toBe('catalog-troubleshooting');
  expect(selectTemplate(data, selectLayout(data, 'comparison'))).toBeUndefined();
  expect(selectTemplate(data, selectLayout(data, 'auto'))).toBeUndefined();
  delete data.sourceHints.template;
  expect(selectTemplate(data, selectLayout(data))).toBeUndefined();
});

it('keeps the comparison composition proportional to its source content', async () => {
  const data = parseCanonicalInfographic(JSON.parse(fs.readFileSync(
    new URL('./fixtures/portfolio-remediation-comparison.json', import.meta.url), 'utf8',
  )));
  const result = await render(data);
  const panel = result.geometry.find((node) => node.sectionId === 'before-after')!;
  expect(panel.height).toBeLessThan(result.height * 0.3);
  const columns = data.sections.find((section) => section.kind === 'comparison')!.columns;
  for (const column of columns) {
    const label = result.geometry.find((node) => node.text === column.label)!;
    expect(label.top).toBeGreaterThanOrEqual(panel.top);
    expect(label.top + label.height).toBeLessThanOrEqual(panel.top + panel.height);
  }
});

it('preserves unfamiliar extra sections and uses emphasis order to prioritize them', async () => {
  const data = catalog();
  data.sections.push({ id: 'extra-a', kind: 'callout', title: 'SOURCE NOTE A', body: 'Original caveat A.' });
  data.sections.push({ id: 'extra-b', kind: 'callout', title: 'SOURCE NOTE B', body: 'Original caveat B.' });
  data.sourceHints.emphasisOrder.push('extra-b', 'extra-a');
  const result = await render(data);
  const a = result.geometry.find((n) => n.sectionId === 'extra-a')!;
  const b = result.geometry.find((n) => n.sectionId === 'extra-b')!;
  expect(a).toBeDefined();
  expect(b.top).toBeLessThan(a.top);
});

it('detects a child beyond its parent even when it fits the canvas', () => {
  expect(layoutOverflows([
    { id: '0', left: 0, top: 0, width: 200, height: 25 },
    { id: '1', parent: '0', left: 0, top: 0, width: 190, height: 80, text: 'Overflow content' },
  ], 200, 100).join(' ')).toMatch(/does not fit/);
});

it('rejects invalid gauge percentages and preserves fractional progress', async () => {
  for (const value of ['-1%', '101%', 'unknown', 'Infinity%']) {
    expect(() => ProgressGauge({ metric: { label: 'Coverage', value } })).toThrow(/percentage/);
  }
  for (const value of ['0%', '87.5%', '100%']) {
    const data = catalog();
    const diagnostic = data.sections.find((section) => section.kind === 'metric-grid')!;
    diagnostic.metrics[4]!.value = value;
    const result = await render(data);
    expect(result.svg).toContain('stroke-dasharray');
    expect(result.geometry.some((node) => node.text === value)).toBe(true);
  }
});

it('removes internal debug labels from generic client artwork too', async () => {
  const data = parseCanonicalInfographic(JSON.parse(fs.readFileSync(new URL('./fixtures/canonical-dashboard.json', import.meta.url), 'utf8')));
  const result = await render(data);
  expect(result.geometry.map((node) => node.text ?? '').join(' ')).not.toMatch(/LIVE CANONICAL VIEW|JSON SOURCE|2-COLUMN REFLOW/);
});

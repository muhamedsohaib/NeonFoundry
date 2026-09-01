import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';

import { analyzeComposition } from '../src/composition/analyze.js';
import { assessCompositionFidelity } from '../src/composition/fidelity.js';
import { selectLayout } from '../src/layout/select-layout.js';
import { writeArtifacts } from '../src/pipeline/write-artifacts.js';
import { deriveRenderProfile, runQualityChecks } from '../src/qa/quality.js';
import { renderInfographic } from '../src/render/render-infographic.js';
import { parseCanonicalInfographic } from '../src/schema/canonical.js';

function sourceDocument() {
  return parseCanonicalInfographic({
    meta: { version: 1, intent: 'mixed', layoutFamily: 'auto', sourceMode: 'json' },
    hero: { title: 'Warehouse Flow', subtitle: 'Structure-preserving test' },
    sections: [
      { id: 'metrics', kind: 'metric-grid', title: 'Signals', metrics: [
        { label: 'Throughput', value: '84%' }, { label: 'Queues', value: '7' },
      ] },
      { id: 'flow', kind: 'process-steps', title: 'Flow', steps: [
        { label: 'Receive' }, { label: 'Sort' }, { label: 'Dispatch' },
      ] },
      { id: 'notes', kind: 'bullet-list', title: 'Notes', items: ['Keep order', 'Keep groups'] },
    ],
    footer: { facts: [{ label: 'Window', value: '24h' }] },
    sourceHints: {
      compositionPattern: 'asymmetric-two-column',
      primaryAxis: 'horizontal',
      preferredColumns: 2,
      columnRatios: [2, 1],
      sectionOrder: ['metrics', 'flow', 'notes'],
      zoneMap: [
        { sectionId: 'hero', x: 0, y: 0, w: 0.62, h: 0.22 },
        { sectionId: 'metrics', x: 0.67, y: 0, w: 0.33, h: 0.22 },
        { sectionId: 'flow', x: 0, y: 0.3, w: 1, h: 0.28 },
        { sectionId: 'notes', x: 0, y: 0.66, w: 0.5, h: 0.2 },
        { sectionId: 'footer', x: 0, y: 0.92, w: 1, h: 0.08 },
      ],
      relativeImportance: { flow: 1, metrics: 0.7, notes: 0.3 },
      emphasisOrder: ['flow', 'metrics', 'notes'],
    },
  });
}

it('renders unknown structured input through a generalized composition blueprint', async () => {
  const data = sourceDocument();
  const decision = selectLayout(data, 'auto');
  const profile = deriveRenderProfile(runQualityChecks(data));
  const rendered = await renderInfographic(data, decision, profile);

  expect(rendered.template).toBeUndefined();
  expect(rendered.blueprint).toMatchObject({ columns: 2, provenance: 'explicit-geometry' });
  expect(rendered.compositionFidelity?.passed).toBe(true);
  expect(rendered.geometry.some((node) => node.region === 'flow')).toBe(true);
  expect(rendered.geometry.some((node) => node.region === 'footer')).toBe(true);
  expect(rendered.svg).not.toContain('LIVE CANONICAL VIEW');
  expect(rendered.svg).not.toContain('JSON SOURCE');
});

it('writes blueprint and composition fidelity only to debug diagnostics', async () => {
  const data = sourceDocument();
  const decision = selectLayout(data, 'auto');
  const quality = runQualityChecks(data);
  const profile = deriveRenderProfile(quality);
  const rendered = await renderInfographic(data, decision, profile);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neon-generalized-'));
  const paths = await writeArtifacts({ data, rendered, decision, quality, profile,
    outputName: 'generalized', outputDir: dir, debug: true });
  const debug = JSON.parse(await fs.readFile(paths.debug!, 'utf8'));

  expect(debug.blueprint).toEqual(rendered.blueprint);
  expect(debug.compositionFidelity).toEqual(rendered.compositionFidelity);
  expect(rendered.svg).not.toContain('explicit-geometry');
});

it('preserves a lone right-column panel instead of stretching it full width', async () => {
  const raw = sourceDocument();
  const data = parseCanonicalInfographic({
    ...raw,
    sections: [...raw.sections, { id: 'right-only', kind: 'bullet-list', title: 'Right only', items: ['Stay right'] }],
    sourceHints: {
      ...raw.sourceHints,
      sectionOrder: [...(raw.sourceHints.sectionOrder ?? []), 'right-only'],
      zoneMap: [
        ...(raw.sourceHints.zoneMap ?? []).filter((zone) => zone.sectionId !== 'footer'),
        { sectionId: 'right-only', x: 0.67, y: 0.87, w: 0.33, h: 0.06 },
        { sectionId: 'footer', x: 0, y: 0.96, w: 1, h: 0.04 },
      ],
    },
  });
  const rendered = await renderInfographic(data, selectLayout(data, 'auto'), deriveRenderProfile(runQualityChecks(data)));
  const region = rendered.geometry.find((node) => node.region === 'right-only');
  expect(region).toBeDefined();
  expect(region!.left).toBeGreaterThan(rendered.width * 0.5);
  expect(region!.width).toBeLessThan(rendered.width * 0.5);
}, 15_000);

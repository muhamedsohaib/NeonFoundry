# Hybrid Infographic Reconstruction Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the fixed Satori prototype into a working hybrid infographic compiler that accepts canonical/legacy JSON, report text, or an infographic image and exports validated JSON, SVG, PNG, and optional debug metadata using QA or dashboard layouts.

**Architecture:** Inputs are ingested into typed source payloads, image/report inputs are extracted through the OpenAI Responses API, all inputs normalize to one Zod-validated canonical model, deterministic rules select a supported layout and reflow profile, and Satori/Resvg produce final artifacts. Rendering is independent of API access.

**Tech Stack:** Node.js 24.19+, TypeScript, React, Satori, `@resvg/resvg-js`, OpenAI Node SDK, Zod, Commander, Sharp, Kleur, Vitest, Roboto Mono.

**Spec:** `docs/superpowers/specs/2026-08-31-hybrid-infographic-reconstruction-design.md`

## Global Constraints

- Color palette stays **neon with dark grey**.
- Global font stays **Roboto Mono**; no active Inter render path.
- Hybrid reconstruction preserves useful hierarchy/composition but rebuilds final geometry deterministically.
- Pure canonical/legacy JSON rendering must not require `OPENAI_API_KEY`.
- Slice 1 renders `qa` and `dashboard`; unsupported requested/recognized families fall back to `dashboard` with a recorded reason.
- TDD is mandatory: observe the intended test fail before production implementation.
- Outputs default to `output/` and include canonical JSON, SVG, PNG, and optional debug JSON.
- Work occurs on `feature/hybrid-reconstruction-engine` in the live project root.

## File Map

- Modify `package.json`, `package-lock.json`, `tsconfig.json`: ESM scripts, dependencies, Vitest/typecheck commands.
- Create `src/schema/canonical.ts`: canonical Zod schemas and exported TypeScript types.
- Create `src/normalize/legacy-qa.ts`: current `data.json` -> canonical adapter.
- Create `src/normalize/json.ts`: canonical-or-legacy JSON normalization.
- Create `src/layout/select-layout.ts`: deterministic layout decision.
- Create `src/design-system/tokens.ts`: visual tokens and typography scale.
- Create `src/render/fonts.ts`: local Roboto Mono loading.
- Create `src/qa/quality.ts`: warnings and deterministic reflow profile.- Create `src/components/icons.tsx`, `src/components/primitives.tsx`: reusable Satori-safe visual primitives.
- Create `src/layouts/qa.tsx`, `src/layouts/dashboard.tsx`: supported renderers.
- Create `src/render/render-infographic.ts`: Satori/Resvg renderer and artifact buffers.
- Create `src/ingest/input.ts`: mode detection, file loading, Sharp preprocessing.
- Create `src/extract/openai-extractor.ts`: lazy OpenAI extraction using Responses structured outputs.
- Create `src/pipeline/run.ts`, `src/pipeline/write-artifacts.ts`: orchestration and output contract.
- Create `src/cli.ts`: Commander entrypoint for `generate`, `extract`, `render`, `validate`.
- Create `tests/*.test.ts` plus `tests/fixtures/canonical-dashboard.json`: behavior tests.
- Create/modify `README.md`: real usage and environment requirements.

---

### Task 1: Tooling and Canonical Schema

**Files:**
- Modify: `package.json`, `package-lock.json`, `tsconfig.json`
- Create: `src/schema/canonical.ts`
- Create: `tests/schema.test.ts`

**Interfaces:**
- Produces `CanonicalInfographicSchema`, `CanonicalInfographic`, `CanonicalSection`, `LayoutIntent`, `LayoutFamily`, `SourceMode`, and `parseCanonicalInfographic(value: unknown): CanonicalInfographic`.

- [ ] **Step 1: Install tooling/config dependencies and replace the placeholder test command.**

Run:
```powershell
npm.cmd install zod commander sharp kleur @fontsource/roboto-mono
npm.cmd install -D vitest
```

Set package scripts to:
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit",
  "generate": "tsx src/cli.ts generate",
  "extract": "tsx src/cli.ts extract",
  "render": "tsx src/cli.ts render",
  "validate": "tsx src/cli.ts validate"
}
```
Set `"type": "module"` and keep NodeNext TypeScript resolution.
- [ ] **Step 2: Write the failing canonical schema test.**

`tests/schema.test.ts`:
```ts
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
```

- [ ] **Step 3: Run RED.**

Run: `npm.cmd test -- tests/schema.test.ts`  
Expected: FAIL because `src/schema/canonical.ts` does not exist.

- [ ] **Step 4: Implement the canonical schema.**

Define strict enums `sourceMode = image|report|json`, `layoutFamily = auto|qa|dashboard|process|comparison|timeline`, and `intent = report|checklist|process|comparison|timeline|mixed`. Implement a Zod discriminated union for all nine section kinds in the spec. Shared tone values are `neutral|neon|success|warning|danger`.

Required API:
```ts
export type CanonicalInfographic = z.infer<typeof CanonicalInfographicSchema>;
export type CanonicalSection = CanonicalInfographic['sections'][number];
export type LayoutFamily = CanonicalInfographic['meta']['layoutFamily'];
export type LayoutIntent = CanonicalInfographic['meta']['intent'];
export type SourceMode = CanonicalInfographic['meta']['sourceMode'];
export function parseCanonicalInfographic(value: unknown): CanonicalInfographic {
  return CanonicalInfographicSchema.parse(value);
}
```
Use `.default([])` for optional arrays such as hero tags and footer facts, and `.default({})`/field defaults for source hints.
- [ ] **Step 5: Run GREEN and typecheck.**

Run:
```powershell
npm.cmd test -- tests/schema.test.ts
npm.cmd run typecheck
```
Expected: schema tests PASS and TypeScript reports no errors.

- [ ] **Step 6: Commit.**

```powershell
git add package.json package-lock.json tsconfig.json src/schema/canonical.ts tests/schema.test.ts
git commit -m "feat: add canonical infographic schema"
```

### Task 2: Legacy QA Adapter and Layout Selection

**Files:**
- Create: `src/normalize/legacy-qa.ts`
- Create: `src/normalize/json.ts`
- Create: `src/layout/select-layout.ts`
- Create: `tests/legacy-adapter.test.ts`
- Create: `tests/layout-selection.test.ts`

**Interfaces:**
- Consumes: `CanonicalInfographic`, `LayoutFamily`, `parseCanonicalInfographic`.
- Produces: `adaptLegacyQa(value: unknown): CanonicalInfographic`, `normalizeJsonInput(value: unknown): CanonicalInfographic`, `selectLayout(data: CanonicalInfographic, requested?: LayoutFamily): LayoutDecision`.
- `LayoutDecision = { requested: LayoutFamily; selected: 'qa' | 'dashboard'; reason: string; fallbackFrom?: Exclude<LayoutFamily, 'auto'|'qa'|'dashboard'> }`.

- [ ] **Step 1: Write failing legacy-adapter test using the real `data.json`.**

```ts
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { adaptLegacyQa } from '../src/normalize/legacy-qa.js';

it('maps the current QA fixture into canonical checklist and metric sections', () => {
  const legacy = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url), 'utf8'));
  const doc = adaptLegacyQa(legacy);
  expect(doc.meta.intent).toBe('checklist');
  expect(doc.hero.title).toContain('VALIDATE');
  expect(doc.sections.some((s) => s.kind === 'checklist')).toBe(true);
  expect(doc.sections.some((s) => s.kind === 'metric-grid')).toBe(true);
  expect(doc.meta.sourceMode).toBe('json');
});
```

- [ ] **Step 2: Run RED.**  
Run: `npm.cmd test -- tests/legacy-adapter.test.ts`  
Expected: FAIL because the adapter does not exist.
- [ ] **Step 3: Implement `adaptLegacyQa` and `normalizeJsonInput`.**

Map legacy hero title lines into one title string and preserve the highlighted line in `hero.highlight`. Map checklist items to a `checklist` section, validation cards to `metric-grid`, prevention bullets to `bullet-list`, steps to `process-steps`, cycle nodes to `diagram-cycle`, and footer values to facts. `normalizeJsonInput` first attempts `parseCanonicalInfographic`; on failure it attempts `adaptLegacyQa`; if both fail, throw `Error('Input JSON is neither canonical infographic data nor the supported legacy QA schema')` with the canonical Zod message attached as `cause`.

- [ ] **Step 4: Run adapter GREEN.**  
Run: `npm.cmd test -- tests/legacy-adapter.test.ts`  
Expected: PASS.

- [ ] **Step 5: Write failing layout-selection tests.**

```ts
import { expect, it } from 'vitest';
import { parseCanonicalInfographic } from '../src/schema/canonical.js';
import { selectLayout } from '../src/layout/select-layout.js';

const base = (sections: unknown[], intent = 'mixed') => parseCanonicalInfographic({
  meta: { version: 1, intent, layoutFamily: 'auto', sourceMode: 'json' },
  hero: { title: 'TEST' }, sections, footer: { facts: [] }, sourceHints: {},
});

it('selects qa for checklist-heavy content', () => {
  const doc = base([{ id: 'c', kind: 'checklist', title: 'QA', items: [{ label: 'Structure', status: 'passed' }, { label: 'Attributes', status: 'passed' }] }], 'checklist');
  expect(selectLayout(doc).selected).toBe('qa');
});

it('falls back unsupported requested timeline to dashboard and records it', () => {
  const doc = base([{ id: 'm', kind: 'metric-grid', title: 'M', metrics: [{ label: 'A', value: '1' }] }]);
  expect(selectLayout(doc, 'timeline')).toMatchObject({ selected: 'dashboard', fallbackFrom: 'timeline' });
});
```

- [ ] **Step 6: Run RED, implement selector, run GREEN.**

Run RED: `npm.cmd test -- tests/layout-selection.test.ts`.

Implement `selectLayout` with priority: explicit `qa|dashboard` -> exact; explicit unsupported -> dashboard fallback; auto -> QA if checklist intent or checklist items >= 4 or checklist sections outnumber metric-grid sections; otherwise dashboard. Return a human-readable `reason` for every decision.

Run GREEN: `npm.cmd test -- tests/layout-selection.test.ts`.

- [ ] **Step 7: Commit.**

```powershell
git add src/normalize src/layout tests/legacy-adapter.test.ts tests/layout-selection.test.ts
git commit -m "feat: normalize legacy QA data and select layouts"
```
### Task 3: Design Tokens, Local Roboto Mono, and QA/Reflow

**Files:**
- Create: `src/design-system/tokens.ts`
- Create: `src/render/fonts.ts`
- Create: `src/qa/quality.ts`
- Create: `tests/design-system.test.ts`
- Create: `tests/quality.test.ts`

**Interfaces:**
- Produces `TOKENS`, `loadRobotoMonoFonts(): Promise<SatoriFont[]>`, `QualityReport`, `RenderProfile`, `runQualityChecks(data): QualityReport`, and `deriveRenderProfile(report): RenderProfile`.

- [ ] **Step 1: Write failing design-system test.**

```ts
import { expect, it } from 'vitest';
import { TOKENS } from '../src/design-system/tokens.js';
import { loadRobotoMonoFonts } from '../src/render/fonts.js';

it('locks the visual system to neon dark and Roboto Mono', async () => {
  expect(TOKENS.fontFamily).toBe('Roboto Mono');
  expect(TOKENS.colors.background).toMatch(/^#/);
  expect(TOKENS.colors.neon.toLowerCase()).toBe('#ccff00');
  const fonts = await loadRobotoMonoFonts();
  expect(fonts.map((f) => f.name)).toEqual(['Roboto Mono', 'Roboto Mono']);
  expect(fonts.map((f) => f.weight)).toEqual([400, 700]);
});
```

- [ ] **Step 2: Run RED.**  
Run: `npm.cmd test -- tests/design-system.test.ts`  
Expected: FAIL because tokens/fonts do not exist.

- [ ] **Step 3: Implement tokens and local font loading.**

`TOKENS` must expose `fontFamily`, `colors`, `spacing`, `radius`, and `type`. Use `#ccff00` as the primary neon and dark-grey/near-black surfaces rather than pure decorative gradients everywhere. `loadRobotoMonoFonts` reads regular and 700-weight `.woff` files from `@fontsource/roboto-mono` via `createRequire(import.meta.url).resolve(...)`, returns ArrayBuffers accepted by Satori, and memoizes the promise. No Google Fonts HTTP request.

- [ ] **Step 4: Run design-system GREEN.**  
Run: `npm.cmd test -- tests/design-system.test.ts`.
- [ ] **Step 5: Write failing quality/reflow tests.**

```ts
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
```

- [ ] **Step 6: Run RED.**  
Run: `npm.cmd test -- tests/quality.test.ts`.

- [ ] **Step 7: Implement deterministic quality rules.**

Use exported shapes:
```ts
export interface QualityWarning { code: 'hero-long'|'section-dense'|'footer-dense'|'metric-label-long'; message: string; sectionId?: string }
export interface QualityReport { warnings: QualityWarning[]; score: number; densityPoints: number }
export interface RenderProfile { density: 'comfortable'|'compact'; columns: 2|3; heroScale: 1|0.92|0.84; paddingScale: 1|0.9 }
```
Rules: hero > 72 chars warns; checklist > 8 items adds 3 density points; each section beyond 4 adds 1; metric labels > 28 chars warn; footer facts > 4 warns. Score is `Math.max(0, 100 - warnings.length * 8 - densityPoints * 3)`. Density points >= 3 -> compact, columns 2, padding .9; hero-long -> scale .84 if > 100 chars else .92.

- [ ] **Step 8: Run GREEN and commit.**

```powershell
npm.cmd test -- tests/design-system.test.ts tests/quality.test.ts
git add src/design-system src/render/fonts.ts src/qa tests/design-system.test.ts tests/quality.test.ts
git commit -m "feat: add neon design system and deterministic reflow"
```
### Task 4: Reusable Components and QA/Dashboard Renderers

**Files:**
- Create: `src/components/icons.tsx`
- Create: `src/components/primitives.tsx`
- Create: `src/layouts/qa.tsx`
- Create: `src/layouts/dashboard.tsx`
- Create: `src/render/render-infographic.ts`
- Create: `tests/render.test.ts`
- Create: `tests/fixtures/canonical-dashboard.json`

**Interfaces:**
- Consumes `CanonicalInfographic`, `LayoutDecision`, `RenderProfile`, `TOKENS`, `loadRobotoMonoFonts`.
- Produces `renderInfographic(data, decision, profile, options?): Promise<RenderedInfographic>` where `RenderedInfographic = { layout: 'qa'|'dashboard'; svg: string; png: Buffer; width: number; height: number }`.

- [ ] **Step 1: Add a canonical dashboard fixture and failing render test.**

`tests/render.test.ts`:
```ts
import fs from 'node:fs';
import { expect, it } from 'vitest';
import { parseCanonicalInfographic } from '../src/schema/canonical.js';
import { selectLayout } from '../src/layout/select-layout.js';
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
});
```
Fixture must contain a hero, four metrics, one bullet-list/callout section, footer facts, and `sourceHints.preferredColumns = 2`.

- [ ] **Step 2: Run RED.**  
Run: `npm.cmd test -- tests/render.test.ts`  
Expected: FAIL because renderer/layout components do not exist.
- [ ] **Step 3: Implement shared primitives and dashboard layout minimally to pass.**

Create Satori-safe primitives `PosterShell`, `GlassCard`, `SectionTitle`, `MetricTile`, `ChecklistRow`, `FooterFacts`, and `IconBadge`. Styles must come from `TOKENS`; do not duplicate palette literals except semantic icon tones. Port the useful existing SVG icon paths into `src/components/icons.tsx`.

`DashboardLayout({ data, profile })` uses a 1600x1120 canvas: hero across top, responsive 2/3-column metric grid, remaining sections in balanced cards, footer facts at bottom. Use Roboto Mono via shell `fontFamily`.

- [ ] **Step 4: Implement QA layout and renderer.**

`QaLayout({ data, profile })` retains the strongest current QA concepts—large left hero, checklist/status emphasis, metric cards, prevention/process material—but consumes canonical sections rather than the old fixed data shape. Reuse shared primitives; no hard-coded case-study copy.

`renderInfographic`:
```ts
export async function renderInfographic(
  data: CanonicalInfographic,
  decision: LayoutDecision,
  profile: RenderProfile,
  options: { width?: number; height?: number; pngWidth?: number } = {},
): Promise<RenderedInfographic>
```
Defaults: 1600x1120 SVG canvas, 3200px PNG width. Load only Roboto Mono 400/700, call Satori with selected JSX layout, then Resvg.

- [ ] **Step 5: Run render GREEN.**  
Run: `npm.cmd test -- tests/render.test.ts`.

- [ ] **Step 6: Add legacy QA render coverage, run all Task 4 tests.**

Append:
```ts
it('renders the current legacy QA fixture through the canonical QA layout', async () => {
  const legacy = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url), 'utf8'));
  const doc = adaptLegacyQa(legacy);
  const decision = selectLayout(doc);
  const result = await renderInfographic(doc, decision, deriveRenderProfile(runQualityChecks(doc)));
  expect(result.layout).toBe('qa');
  expect(result.png.length).toBeGreaterThan(10_000);
});
```
Run: `npm.cmd test -- tests/render.test.ts`.

- [ ] **Step 7: Commit.**

```powershell
git add src/components src/layouts src/render/render-infographic.ts tests/render.test.ts tests/fixtures/canonical-dashboard.json
git commit -m "feat: add reusable QA and dashboard renderers"
```
### Task 5: Input Ingestion and OpenAI Extraction

**Files:**
- Create: `src/ingest/input.ts`
- Create: `src/extract/openai-extractor.ts`
- Create: `tests/ingest.test.ts`
- Create: `tests/extractor.test.ts`

**Interfaces:**
- Produces `detectInputMode(path, explicit?): SourceMode`, `ingestInput(path, explicit?): Promise<IngestedInput>`, `preprocessImage(path): Promise<Buffer>`, `extractWithOpenAI(input, options?): Promise<CanonicalInfographic>`.
- `IngestedInput` is a discriminated union: `{ mode:'json'; path; value:unknown } | { mode:'report'; path; text:string } | { mode:'image'; path; png:Buffer; dataUrl:string }`.

- [ ] **Step 1: Write failing ingestion tests.**

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { expect, it } from 'vitest';
import { detectInputMode, ingestInput } from '../src/ingest/input.js';

it('detects supported modes and rejects unknown extensions', () => {
  expect(detectInputMode('x.json')).toBe('json');
  expect(detectInputMode('x.md')).toBe('report');
  expect(detectInputMode('x.webp')).toBe('image');
  expect(() => detectInputMode('x.pdf')).toThrow(/Unsupported input extension/);
});

it('preprocesses an image into a bounded PNG data URL', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'infographic-'));
  const file = path.join(dir, 'wide.jpg');
  await sharp({ create: { width: 3000, height: 1200, channels: 3, background: '#222222' } }).jpeg().toFile(file);
  const input = await ingestInput(file);
  expect(input.mode).toBe('image');
  if (input.mode === 'image') {
    expect(input.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    const meta = await sharp(input.png).metadata();
    expect(meta.width).toBeLessThanOrEqual(2048);
  }
});
```

- [ ] **Step 2: Run RED, implement ingestion, run GREEN.**

Run RED: `npm.cmd test -- tests/ingest.test.ts`. Implement explicit mode override validation, existence errors, UTF-8 reads for text/JSON, and Sharp `resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).png()` for images. Run GREEN with the same command.
- [ ] **Step 3: Write failing extractor tests.**

```ts
import { expect, it } from 'vitest';
import { extractWithOpenAI } from '../src/extract/openai-extractor.js';

it('fails clearly before an API call when the key is missing', async () => {
  await expect(extractWithOpenAI({ mode: 'report', path: 'report.txt', text: 'Three KPIs improved.' }, { apiKey: '' }))
    .rejects.toThrow(/OPENAI_API_KEY/);
});

it('accepts an injected structured response and normalizes it', async () => {
  const parse = async () => ({ status: 'completed', output_parsed: {
    meta: { version: 1, intent: 'report', layoutFamily: 'auto', sourceMode: 'report' },
    hero: { title: 'PERFORMANCE' },
    sections: [{ id: 'm', kind: 'metric-grid', title: 'METRICS', metrics: [{ label: 'Lift', value: '18%' }] }],
    footer: { facts: [] }, sourceHints: {},
  }});
  const doc = await extractWithOpenAI({ mode: 'report', path: 'report.txt', text: 'Lift was 18%.' }, { apiKey: 'test', parse });
  expect(doc.hero.title).toBe('PERFORMANCE');
});
```

- [ ] **Step 4: Run RED.**  
Run: `npm.cmd test -- tests/extractor.test.ts`.

- [ ] **Step 5: Implement the Responses API extractor.**

Use the official SDK pattern:
```ts
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

const response = await client.responses.parse({
  model: options.model ?? process.env.OPENAI_MODEL ?? 'gpt-5.6-sol',
  input,
  text: { format: zodTextFormat(CanonicalInfographicSchema, 'canonical_infographic') },
});
```
For image mode, `input` is a user content array containing one `input_text` extraction instruction and one `input_image` whose `image_url` is the preprocessed data URL. For report mode, provide system-level extraction requirements plus report text. Prompt requirements: copy visible/source facts faithfully; never fabricate values; recover hierarchy, metrics, section kinds, reading order, source layout guess and composition confidence; use `layoutFamily:'auto'`.

Expose an optional injected `parse` dependency matching the result contract above so tests do not make network calls. If `status !== 'completed'` or `output_parsed` is null, throw an error containing the status. Force `meta.sourceMode` to the actual input mode before final `parseCanonicalInfographic`.

- [ ] **Step 6: Run GREEN and commit.**

```powershell
npm.cmd test -- tests/ingest.test.ts tests/extractor.test.ts
git add src/ingest src/extract tests/ingest.test.ts tests/extractor.test.ts
git commit -m "feat: ingest source files and extract infographic semantics"
```
### Task 6: End-to-End Pipeline and Artifact Writer

**Files:**
- Create: `src/pipeline/run.ts`
- Create: `src/pipeline/write-artifacts.ts`
- Create: `tests/pipeline.test.ts`

**Interfaces:**
- Produces `resolveCanonicalInput(inputPath, mode?, extractorOptions?): Promise<CanonicalInfographic>`.
- Produces `runGenerate(options: GenerateOptions): Promise<GenerateResult>`.
- `GenerateOptions = { inputPath: string; outputName: string; outputDir?: string; mode?: SourceMode; layout?: LayoutFamily; debug?: boolean; extractorOptions?: ExtractorOptions }`.
- `GenerateResult = { data; decision; quality; profile; rendered; paths }` with `paths = { json; svg; png; debug?: string }`.

- [ ] **Step 1: Write failing no-API JSON pipeline test.**

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { runGenerate } from '../src/pipeline/run.js';

it('generates all primary artifacts from canonical JSON without an API key', async () => {
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'infographic-out-'));
  const input = new URL('./fixtures/canonical-dashboard.json', import.meta.url).pathname.replace(/^\/(.:)/, '$1');
  const oldKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const result = await runGenerate({ inputPath: input, outputName: 'demo', outputDir: out, debug: true });
    expect(result.decision.selected).toBe('dashboard');
    await expect(fs.stat(result.paths.json)).resolves.toBeTruthy();
    await expect(fs.stat(result.paths.svg)).resolves.toBeTruthy();
    await expect(fs.stat(result.paths.png)).resolves.toBeTruthy();
    await expect(fs.stat(result.paths.debug!)).resolves.toBeTruthy();
  } finally {
    if (oldKey) process.env.OPENAI_API_KEY = oldKey;
  }
});
```

- [ ] **Step 2: Run RED.**  
Run: `npm.cmd test -- tests/pipeline.test.ts`.

- [ ] **Step 3: Implement canonical resolution and artifact writing.**

`resolveCanonicalInput`: `ingestInput`; JSON -> `normalizeJsonInput`; report/image -> `extractWithOpenAI`. `writeArtifacts` creates output directory recursively, writes pretty JSON with trailing newline, UTF-8 SVG, PNG buffer, and debug JSON containing `layoutDecision`, `quality`, and `renderProfile` only when requested. Sanitize `outputName` to `[A-Za-z0-9._-]`, replacing other runs with `-` and rejecting an empty result.
- [ ] **Step 4: Implement `runGenerate`.**

Order is fixed: resolve canonical -> select layout -> run quality -> derive profile -> render -> write artifacts. If rendering fails after canonical data exists, rethrow with `cause` and include the intended JSON/debug paths in the error message; do not swallow failures.

- [ ] **Step 5: Run GREEN and commit.**

```powershell
npm.cmd test -- tests/pipeline.test.ts
npm.cmd run typecheck
git add src/pipeline tests/pipeline.test.ts
git commit -m "feat: orchestrate infographic generation pipeline"
```

### Task 7: CLI Commands

**Files:**
- Create: `src/cli.ts`
- Create: `tests/cli.test.ts`

**Interfaces:**
- Produces `createProgram(deps?): Command` and `main(argv?: string[]): Promise<void>`.
- CLI commands are `generate`, `extract`, `render`, `validate` with shared `--input`, `--output`, `--mode`, `--layout`, and `--debug` where meaningful.

- [ ] **Step 1: Write failing CLI help/validation tests.**

```ts
import { expect, it } from 'vitest';
import { createProgram } from '../src/cli.js';

it('registers all four user-facing commands', () => {
  const names = createProgram().commands.map((c) => c.name());
  expect(names).toEqual(['generate', 'extract', 'render', 'validate']);
});

it('requires --input for generate', async () => {
  const program = createProgram();
  program.exitOverride();
  await expect(program.parseAsync(['node', 'cli', 'generate'], { from: 'node' })).rejects.toMatchObject({ code: 'commander.missingMandatoryOptionValue' });
});
```

If Commander emits `commander.missingMandatoryOptionValue` vs `commander.missingMandatoryOptionValue` differently in the installed version, assert the documented actual code after observing RED; do not weaken the test to `toThrow()` only.

- [ ] **Step 2: Run RED.**  
Run: `npm.cmd test -- tests/cli.test.ts`.

- [ ] **Step 3: Implement CLI.**

`generate` calls `runGenerate` and prints paths. `extract` calls `resolveCanonicalInput` and writes `<output>.json` only. `render` requires JSON mode or a `.json` file, normalizes canonical/legacy JSON, then runs selection/quality/render/artifact writing without OpenAI. `validate` resolves input to canonical, prints layout decision + quality report, and when `--output` is provided writes `<output>.debug.json` without SVG/PNG. Use Kleur for headings/status only; output content remains machine-readable file paths.
- [ ] **Step 4: Run CLI GREEN and manual help smoke.**

```powershell
npm.cmd test -- tests/cli.test.ts
npx.cmd tsx src/cli.ts --help
npx.cmd tsx src/cli.ts generate --help
```
Expected: tests pass; help lists all four commands and required options.

- [ ] **Step 5: Commit.**

```powershell
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: add one-shot infographic CLI"
```

### Task 8: Legacy Cleanup, Documentation, and Full Verification

**Files:**
- Move: `index.ts`, `generate-from-report.ts`, `render.ts`, `template.tsx`, `icons.tsx`, `types.ts` -> `legacy/`
- Modify: `tsconfig.json`
- Create/Modify: `README.md`
- Create: `tests/architecture.test.ts`

**Interfaces:**
- No new runtime interface. This task locks the new `src/cli.ts` pipeline as the only supported entrypoint and documents the migration.

- [ ] **Step 1: Write failing architecture test before moving legacy code.**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

it('keeps active source on Roboto Mono and the new CLI only', () => {
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  const source = walk('src').filter((p) => /\.(ts|tsx)$/.test(p)).map((p) => fs.readFileSync(p, 'utf8')).join('\n');
  expect(source).not.toMatch(/fontFamily:\s*['"]Inter|fetchFont\(['"]Inter/);
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  expect(Object.values(pkg.scripts).join(' ')).not.toMatch(/\b(index|render|generate-from-report)\.ts\b/);
  expect(fs.existsSync('legacy/template.tsx')).toBe(true);
});
```

- [ ] **Step 2: Run RED.**  
Run: `npm.cmd test -- tests/architecture.test.ts`  
Expected: FAIL because `legacy/template.tsx` is not present yet.
- [ ] **Step 3: Move legacy prototype files and exclude them from active typechecking.**

Use `git mv` into `legacy/`. Keep `data.json` at the root as the migration fixture. Add `"exclude": ["legacy", "node_modules", "output"]` to `tsconfig.json`. Do not import legacy modules from `src/`.

- [ ] **Step 4: Write README with exact working commands.**

Document:
```powershell
npm.cmd install
npm.cmd test
npm.cmd run typecheck
npm.cmd run render -- --input data.json --output legacy-qa --debug
npm.cmd run render -- --input tests/fixtures/canonical-dashboard.json --output dashboard-smoke --debug
npm.cmd run generate -- --input .\my-faulty-infographic.png --output rebuilt --debug
npm.cmd run extract -- --input .\report.md --output report-data
npm.cmd run validate -- --input data.json --layout auto --debug
```
Explain that image/report extraction needs `OPENAI_API_KEY`, optional `OPENAI_MODEL` defaults to `gpt-5.6-sol`, while JSON render does not use the API. State slice-1 layout support (`qa`, `dashboard`) and dashboard fallback behavior.

- [ ] **Step 5: Run architecture GREEN.**  
Run: `npm.cmd test -- tests/architecture.test.ts`.

- [ ] **Step 6: Run complete automated verification.**

```powershell
npm.cmd test
npm.cmd run typecheck
```
Expected: all tests pass; typecheck exits 0.

- [ ] **Step 7: Run both real local render smoke commands.**

```powershell
npm.cmd run render -- --input data.json --output legacy-qa --debug
npm.cmd run render -- --input tests/fixtures/canonical-dashboard.json --output dashboard-smoke --debug
```
Expected files:
- `output/legacy-qa.json`, `.svg`, `.png`, `.debug.json`
- `output/dashboard-smoke.json`, `.svg`, `.png`, `.debug.json`

Open both PNG files for visual inspection. Reject the implementation if text is clipped, sections overlap, the palette departs from neon/dark-grey, or typography is visibly not Roboto Mono.

- [ ] **Step 8: Commit.**

```powershell
git add -A
git commit -m "docs: finalize hybrid infographic compiler slice one"
```

## Final Review Gate

After Task 8, run a fresh Codex code review against the complete branch. Address load-bearing correctness, type-safety, API, rendering, or test findings; re-run `npm.cmd test`, `npm.cmd run typecheck`, and both smoke renders after fixes. Do not merge/push/publish without explicit user instruction.
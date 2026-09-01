# NeonFoundry

**Source-faithful infographic reconstruction with real text and deterministic vector rendering.**

NeonFoundry rebuilds flawed or AI-generated infographic images into structured, editable-quality SVG/PNG compositions. It treats the source image as evidence, extracts its actual message, validates semantic fidelity, then renders real text and vector geometry with React + Satori.

It is designed to avoid the failure mode where an image looks polished but silently loses the original claims, metrics, comparisons, or process flow.

## What it preserves

- Headlines, subtitles, labels, claims, metrics, percentages, and footer facts.
- Distinct BEFORE / AFTER states and their concrete differences.
- Field-level change tables and business-impact rows.
- Process sequences such as `DETECTED → CORRECTED → VALIDATED → LIVE`.
- KPI/health blocks and evidence/validation statements.
- Source hierarchy while allowing deterministic spacing and geometry improvements.

## Rendering stack

- React + Satori for deterministic SVG layout.
- Resvg for PNG rasterization.
- Roboto Mono bundled locally through `@fontsource/roboto-mono`.
- Dark graphite visual system with `#ccff00` neon accent.
- No AI-painted final text.

## Install

```powershell
npm.cmd install
npm.cmd test
npm.cmd run typecheck
```

## Image reconstruction

Create a local `.env` file from `.env.example` and add an OpenRouter key:

```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=dots-studio/dots-3-note-preview:free
```

Then run:

```powershell
npm.cmd run generate -- `
  --input .\my-infographic.png `
  --output rebuilt `
  --debug
```

The default model is currently the free Dots3 Note Preview vision model. Free-model availability and provider rate limits can change; override `OPENROUTER_MODEL` when needed.

## Fidelity gate

Image extraction is fail-closed. NeonFoundry does not accept an extraction merely because it contains many words.

It checks for concrete source facts, rejects placeholder descriptions, verifies distinct before/after columns, and can require field tables, process steps, metrics, and evidence when the source signals those structures.

When a free vision model returns complementary partial results, NeonFoundry conservatively accumulates the strongest canonical structures across attempts. If the general schema remains incomplete, a smaller focused rescue pass recovers only the missing concrete structures before rendering.

If fidelity still fails, generation stops rather than producing a misleading infographic.

## CLI

```powershell
npm.cmd run generate  -- --input <image|report|json> --output <name> --debug
npm.cmd run extract   -- --input <image|report> --output <name>
npm.cmd run render    -- --input <canonical.json> --output <name> --debug
npm.cmd run validate  -- --input <canonical.json> --layout auto --debug
```

Layout precedence is explicit `--layout`, then canonical `meta.layoutFamily`, then
automatic inference. Writing `--layout auto` explicitly requests inference.

Canonical JSON rendering is completely local and does not require an API key.

Generated artifacts are written to `output/`:

- `<name>.json` — normalized canonical data
- `<name>.svg` — deterministic vector render
- `<name>.png` — high-resolution raster export
- `<name>.debug.json` — layout, quality, fidelity, and render-profile diagnostics

## Supported structures

The canonical schema supports metric grids, checklists, bullet lists, process steps, timelines, comparisons, callouts, cycle diagrams, and lightweight tables.

Dedicated renderers currently cover:

- QA/checklist compositions
- dashboard/report compositions
- before/after comparison and remediation case studies

Portfolio JSON can opt into a narrative composition with `sourceHints.template`:

- `catalog-troubleshooting` — dominant diagnostic gauge, root-cause journey,
  compact framework, and compact state comparison
- `validation-qa` — assurance status, checklist, validation metrics, and controls
- `root-cause-investigation` — diagnostic coverage, investigation flow, and issue table
- `remediation-comparison` — balanced before/after states and exact field changes
- `strategic-approach` — operating method, tools, timeline, and outcome anchors

When template metadata is absent, recognizable portfolio narratives use the matching
composition automatically. A template never overrides an incompatible CLI layout.
Satori node geometry is checked before export; source text that does not fit causes an
error instead of clipping beneath a card or footer. Debug JSON records template,
canvas, and measured geometry without adding diagnostic labels to client artwork.

## Structure-preserving generalization

Unknown infographics are analyzed into a deterministic composition blueprint instead of being forced into a generic dashboard. Optional `sourceHints` can preserve coarse `zoneMap` geometry, `sectionGroups`, `sectionOrder`, `compositionPattern`, `primaryAxis`, `columnRatios`, and `relativeImportance`. Explicit geometry/grouping takes precedence; absent hints fall back conservatively to source order and semantic section grammar.

Tables remain tables, comparisons remain paired, timelines remain chronological, and process/checklist/metric structures retain their visual grammar. Debug JSON includes the inferred `blueprint` and heuristic `compositionFidelity` report; those diagnostics never appear in client SVG/PNG output. Canvas height grows automatically when needed, while an explicitly undersized fixed canvas fails rather than clipping content.

Input formats include PNG, JPEG, WebP, TXT, Markdown, canonical JSON, and the bundled legacy JSON fixture.

## Pipeline

```text
ingest
  → semantic extraction / local normalization
  → deterministic semantic repair
  → source-fidelity validation
  → layout / specialized-template selection
  → source composition blueprint + fidelity analysis
  → density / quality analysis
  → Satori SVG render
  → PNG export
```

The original prototype remains under `legacy/` for reference. The supported entrypoint is `src/cli.ts` through the npm scripts in `package.json`.

## License

ISC. See `LICENSE`.

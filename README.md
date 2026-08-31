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

Input formats include PNG, JPEG, WebP, TXT, Markdown, canonical JSON, and the bundled legacy JSON fixture.

## Pipeline

```text
ingest
  → semantic extraction / local normalization
  → deterministic semantic repair
  → source-fidelity validation
  → layout selection
  → density / quality analysis
  → Satori SVG render
  → PNG export
```

The original prototype remains under `legacy/` for reference. The supported entrypoint is `src/cli.ts` through the npm scripts in `package.json`.

## License

ISC. See `LICENSE`.

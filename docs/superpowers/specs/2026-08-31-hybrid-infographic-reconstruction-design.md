# Hybrid Infographic Reconstruction Engine — Design Spec

**Project:** `satori-infographics`  
**Date:** 2026-08-31  
**Status:** Approved  
**Objective:** Turn faulty AI-generated infographics into polished, human-looking infographics by extracting semantic intent and deterministically rebuilding the visual in React/Satori.

## Product Direction

The engine uses **hybrid reconstruction**. The source image is treated as semantic/layout evidence, not as the final canvas. Useful information hierarchy, recognisable composition, emphasis, and design philosophy are preserved where they work; malformed geometry, bad spacing, overcrowding, fake charts, typographic artifacts, and inconsistent alignment are rebuilt.

Final output is generated as real text and vector geometry, not painted text.

## Non-Negotiable Visual Constraints

- Palette: **neon with dark grey**.
- Global font: **Roboto Mono** only.
- Effects remain restrained: neon is an accent, not decorative noise.
- Strong whitespace, exact alignment, and consistent rhythm take priority over source-image fidelity.

## Supported Inputs

1. Image: `.png`, `.jpg`, `.jpeg`, `.webp`.
2. Report text: `.txt`, `.md`.
3. Structured JSON: canonical schema or legacy QA fixture via adapter.

## Outputs

For output base name `<name>`, write under `output/` by default:
- `<name>.json` canonical normalized data.
- `<name>.svg` deterministic vector render.
- `<name>.png` high-resolution raster render.
- `<name>.debug.json` when debug mode is enabled.
## Canonical Data Flow

`ingest -> extract -> normalize -> select layout -> QA/reflow -> render -> export`

### Ingest
Detect or honor explicit mode. JSON and report inputs are read directly. Images are normalized through `sharp` to a bounded PNG suitable for vision extraction.

### Extract
- Report text: OpenAI Responses API returns structured semantic content.
- Image: OpenAI vision reads visible text, metrics, section hierarchy, chart/diagram intent, reading order, and composition hints.
- Extraction requires `OPENAI_API_KEY`; pure canonical JSON rendering does not.

Use the current OpenAI Node SDK Responses API and structured outputs. Extraction failures must surface actionable errors rather than silently inventing missing content.

### Normalize
All source-oriented extraction is converted to one canonical schema validated by Zod. A legacy QA adapter maps the existing `data.json` shape into the canonical schema so the current case-study sample remains usable.

### Layout Selection
Deterministic heuristics select the best supported renderer. Explicit `--layout` overrides auto-selection.

Slice 1 renderers:
- `qa`: checklist/validation-heavy material.
- `dashboard`: metric/report/mixed summary material.

The selector may recognize process, comparison, or timeline intent in slice 1, but unsupported families must fall back to `dashboard` rather than pretending a dedicated renderer exists.

## Canonical Schema

Top-level fields:
- `meta`
- `hero`
- `sections[]`
- `footer`
- `sourceHints`

`meta` records version, intent, requested/selected layout family, and source mode. `hero` records eyebrow, title, optional highlight, subtitle, tags, and optional hero metrics.
Canonical section kinds supported by the schema:
- `metric-grid`
- `checklist`
- `bullet-list`
- `process-steps`
- `timeline`
- `comparison`
- `callout`
- `diagram-cycle`
- `table-lite`

Only the first two layout families are fully rendered in slice 1; other section kinds remain representable so later slices do not require a schema rewrite.

`footer` contains optional fact items plus disclaimer text. `sourceHints` contains preferred column count, emphasis order, source layout guess, composition confidence, and visual notes.

## Design System

Centralize visual tokens in code:
- page and surface backgrounds;
- glass/panel fills;
- subtle and accent borders;
- primary neon;
- neutral primary/secondary/muted text;
- semantic danger/warning/success accents;
- spacing scale;
- corner radius scale;
- typography scale;
- icon sizes.

Roboto Mono must be loaded through one font utility and consumed by every Satori render path. No Inter-based render path may remain as an active CLI path.

## QA and Deterministic Reflow

Before rendering, compute a quality report containing warnings and a reflow profile. Checks include:
- hero heading length;
- description/body density;
- checklist rows per section;
- metric label/value balance;
- total section density;
- footer fact width/crowding.

Reflow is deterministic. Allowed strategies are bounded font reduction, bounded padding reduction, long-list splitting, three-column to two-column reduction, dense-section promotion, and tile-to-list fallback. Debug output records which strategy was selected.
## CLI Contract

Commands:
- `generate`: ingest/extract/normalize/select/QA/render/export.
- `extract`: ingest/extract/normalize and write canonical JSON.
- `render`: validate canonical or legacy JSON, select/override layout, QA, render/export.
- `validate`: validate and print/write QA report without rendering.

Shared flags:
- `--input <path>`
- `--output <name>`
- `--mode <image|report|json>`
- `--layout <auto|qa|dashboard|process|comparison|timeline>`
- `--debug`

## Dependency Direction

Keep: React, Satori, `@resvg/resvg-js`, OpenAI SDK, dotenv.  
Add: Zod, Commander, Sharp, a lightweight CLI color library, Vitest, and a local Roboto Mono font package if needed to remove runtime Google Fonts dependence.

The implementation should prefer local/bundled Roboto Mono data so canonical JSON rendering does not require an external font-network request.

## Error Handling

- Unsupported file extension: explicit input-mode error.
- Missing input file: explicit path error.
- Missing `OPENAI_API_KEY` for report/image extraction: fail before API call with instructions.
- Invalid canonical JSON: return Zod issue paths.
- Legacy JSON not recognized: report that neither canonical nor supported legacy schema matched.
- OpenAI incomplete/unparsed response: fail with response status details.
- Render failure: preserve canonical JSON/debug diagnostics when already produced.
- Output directory creation is automatic.

## Testing Strategy

Use Vitest and TDD. Tests cover schema validation, legacy adaptation, input-mode detection, layout selection, QA/reflow, render smoke behavior, output file creation, and CLI orchestration. OpenAI requests are isolated behind an extraction interface so pure rendering tests never require network/API access.

## Slice 1 Acceptance Criteria

1. Existing QA sample can be adapted and rendered through the new architecture.
2. A canonical dashboard fixture renders SVG and PNG.
3. `npm test` is meaningful and green.
4. `npm run typecheck` is green.
5. `generate`, `extract`, `render`, and `validate` commands exist.
6. Image/report extraction uses the Responses API when credentials exist.
7. Auto layout chooses QA or dashboard and safely falls back to dashboard for unsupported families.
8. Roboto Mono and neon/dark-grey tokens are centralized and enforced.
9. QA/reflow decisions are deterministic and available in debug output.
10. README documents real commands, environment variables, output files, and slice-1 layout support.
## Risks and Boundaries

Vision extraction is probabilistic, so canonical JSON and debug metadata must remain inspectable. Satori supports a constrained CSS subset, so layouts should favor deliberate grids, cards, SVG diagrams, and typography over browser-only effects. Arbitrary source images vary widely; hybrid reconstruction intentionally prioritizes semantic accuracy and design quality over pixel-level imitation.

Out of scope for slice 1:
- browser UI;
- Figma/PowerPoint editable export;
- perfect OCR fallback;
- dedicated process/comparison/timeline renderers;
- pixel-perfect recreation of every source layout.

These are later slices, not hidden promises in the first implementation.
# Structure-Preserving Composition Engine Plan

**Spec:** `C:\Users\muham\Desktop\codex for satori.txt`

**Goal:** Generalize NeonFoundry beyond named portfolio templates. For unknown canonical inputs, reconstruct source layout logic, order, grouping, section grammar, and relative emphasis using deterministic structural hints and conservative inference. Keep the five portfolio templates unchanged as higher-confidence specializations.

**Constraints:** Existing canonical JSON stays valid. Semantic text and section types are never truncated, flattened, or rewritten. Use nested Flexbox because Satori does not support CSS Grid. Explicit source geometry/grouping beats heuristic inference. Missing hints fall back to source order and one-column/full-width semantic grammar rather than an invented dashboard. No new dependency.

## Task 1: Backward-compatible source composition hints and extraction

**Files:** `src/schema/canonical.ts`, `src/extract/structured-schema.ts`, `src/extract/openai-extractor.ts`, `tests/schema.test.ts`, `tests/extractor.test.ts`

Add optional `sourceHints` fields:

- `compositionPattern`: `single-column | asymmetric-two-column | symmetric-two-column | hero-left-data-right | hero-top-content-bottom | comparison-led | process-led | table-led | timeline-led | checklist-led | metric-led | mixed-narrative | banded | poster-sidebar | dashboard-lite`
- `primaryAxis`: `horizontal | vertical`
- `columnRatios`: one to three positive numbers, normalized by the analyzer rather than schema
- `sectionGroups`: `{ id, sectionIds, direction? }[]`, unique non-empty IDs; references validated against `hero`, `footer`, or actual section IDs at canonical parse time
- `sectionOrder`: string array with unique valid section IDs
- `zoneMap`: `{ sectionId, x, y, w, h }[]`, normalized 0–1 coordinates with positive dimensions and `x+w <= 1`, `y+h <= 1`
- `relativeImportance`: record from valid section/hero IDs to values in `[0, 1]`

Mirror nullable fields in structured extraction. Strengthen the vision system/user prompts to request coarse major zones, columns, grouping, directional flow, section order, dominant regions, and relative emphasis while explicitly prioritizing semantic accuracy over uncertain coordinates. Merge retry hints conservatively: keep geometry/group/order from the higher-confidence candidate; union only compatible notes/emphasis.

TDD cases: old JSON unchanged; valid hint document accepted; invalid coordinate, duplicate/unknown references, and non-positive ratios rejected; structured extraction strips null hints; request prompt explicitly asks for structure; retry merging does not combine contradictory zone maps.

## Task 2: Pure composition analyzer, blueprint, and fidelity model

**Files:** `src/composition/types.ts`, `src/composition/analyze.ts`, `src/composition/fidelity.ts`, `tests/composition-analysis.test.ts`

Create internal `CompositionBlueprint` with family, columns, normalized column ratios, primary axis, density, ordered regions, source section order, and confidence provenance (`explicit-geometry | explicit-groups | structural-inference | safe-fallback`). Regions contain IDs, section IDs, row/column/span, direction, and emphasis.

Analyzer priority:

1. validated `zoneMap`, `sectionGroups`, `sectionOrder`, `relativeImportance`, `compositionPattern`, and column ratios;
2. semantic structure plus `preferredColumns`, `emphasisOrder`, and section order;
3. safe full-width stack in source order.

Quantize coarse zones into rows/columns without copying exact pixels. Overlapping Y zones share rows; X order determines columns. Explicit groups stay adjacent. Without geometry, full-width grammar (`table-lite`, `comparison`, `timeline`, long horizontal `process-steps`) remains full width unless grouping explicitly says otherwise. Pair adjacent supporting sections only when two columns are strongly signaled. Importance uses explicit importance, zone area, then emphasis order; content length alone never dominates. High-confidence known templates remain selected outside this analyzer.

Create composition fidelity checks over source, blueprint, and optional measured geometry. Deterministic issue codes cover missing/duplicate sections, order drift, broken groups, wrong section grammar, lost dominant emphasis, process direction, source columns, and footer ordering. Score is a documented heuristic penalty total, not claimed measurement precision.

TDD cases cover all inference families, source order, group adjacency, normalized ratios, dominant/supporting region allocation, full-width semantic grammar, safe fallback, and each fidelity issue.

## Task 3: Generalized rendering integration and diagnostics

**Files:** `src/layouts/generalized.tsx`, `src/components/portfolio-primitives.tsx`, `src/render/render-infographic.ts`, `src/pipeline/write-artifacts.ts`, `tests/generalized-render.test.ts`, `tests/render.test.ts`

Render blueprints with nested Flexbox rows and columns. Hero, each region, and footer receive measurement markers. Reuse existing semantic `Section` render grammar: tables stay tables, comparisons paired, processes sequenced, timelines chronological, checklists status-oriented, metrics metric-oriented, and cycles cyclical. Region emphasis changes width, typography/padding, and divider strength without altering text.

Rendering hierarchy: compatible explicit/high-confidence portfolio template, otherwise generalized blueprint, with existing generic layout only as fail-closed safe fallback if blueprint creation is impossible. Auto-height and fixed-height overflow behavior stays intact. Return `blueprint` and `compositionFidelity`; debug JSON includes both. Client SVG/PNG includes no debug labels.

TDD cases render source order and groups into measured geometry; horizontal process alignment; two-column relationships; dominant region larger than supporting; table cells/rows present; comparison labels paired; timeline chronological; footer below every region; long text retained; deterministic SVG/PNG; fixed undersized canvas fails; old portfolio outputs/tests remain green.

## Task 4: Ten realistic generalization fixtures, visual QA, and docs

**Files:** `tests/fixtures/generalization/*.json`, `tests/generalization-archetypes.test.ts`, `README.md`

Add ten non-Amazon fixtures: single-column process, asymmetric hero-left/metrics-right, table-led report, comparison-led infographic, timeline-led infographic, checklist-heavy infographic, metric-led infographic, mixed narrative case study, tall poster, and dense multi-section infographic. Use varied domains (energy, healthcare operations without medical advice, logistics, manufacturing, education, climate, product delivery, civic service, research operations, and cybersecurity operations). Every fixture declares enough explicit hints to state source structure; at least three omit geometry and exercise conservative inference.

Tests assert every source section/fact renders, section grammar stays recognizable, ordering/grouping/columns/emphasis match each fixture, no overlap/debug labels, and footer is last. Render all ten at 3200 px output width. Inspect PNGs for recognizable distinct compositions, readable typography, balanced spacing, no dashboard homogenization, no empty containers, no clipping, and correct flow. Document hint schema, precedence, debug fidelity output, and fallback behavior.

## Final verification

Run `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd audit`, `git diff --check`, secret/publication scan, `.gitignore` checks, and render all portfolio plus generalization fixtures. Review diff against `main`, fix all P0/P1 and relevant P2. Commit branch, fast-forward main, rerun tests/typecheck on main, push `origin/main`, and verify local SHA equals remote SHA.

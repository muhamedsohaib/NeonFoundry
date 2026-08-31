# Portfolio composition implementation plan

The supplied implementation brief is the approved specification. Extraction and
semantic fidelity remain unchanged. No new dependencies are needed.

1. Reproduce the CLI default bug; add real CLI regression coverage for omitted,
   explicit, and automatic layout selection. Remove only Commander's default.
2. Add optional `sourceHints.template` with five validated names. Keep family
   selection separate from composition selection. Explicit incompatible CLI
   families suppress a template; automatic recognition requires both the narrative
   title and its structures. Image 1 must work without changing its approved JSON.
3. Add five named compositions using shared typography, metrics, process, table,
   comparison, and vector gauge primitives. Catalog: hero/diagnostics, horizontal
   root cause, compact framework/comparison. QA: hero/status/checklist, validation
   metrics, assurance workflow and prevention. Investigation: problem/coverage,
   investigation flow, field issues/case summary, business impacts. Comparison:
   before/after and exact changes take priority. Strategy: method, tools and
   methodology, timeline and outcomes. Preserve every supplied section and fact.
4. Measure actual Satori node geometry. Reject overflow rather than exporting
   clipped content. Default canvases may grow vertically for long source text;
   explicitly fixed canvases fail with actionable diagnostics. Never truncate
   facts or shrink body text to illegibility. Keep diagnostics out of artwork.
5. Add public, illustrative JSON fixtures for all five briefs, geometry/content
   regressions, long-text checks, and deterministic SVG/PNG checks. Render Image 1
   from the untouched local source at 3200 px; visually inspect all five outputs.
6. Review against main, run all tests/typecheck/audit and publication checks, commit,
   merge into main, rerun tests/typecheck, push, and compare remote/local SHAs.

Baseline: main was clean; 13 test files / 54 tests and typecheck passed. npm audit
reported zero vulnerabilities. The reproduced Image 1 debug output selected
comparison despite canonical `layoutFamily: dashboard`.

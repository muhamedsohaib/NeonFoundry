import type { CanonicalInfographic, CanonicalSection } from '../schema/canonical.js';
import type {
  CompositionBlueprint,
  CompositionFidelityIssue,
  CompositionFidelityIssueCode,
  CompositionFidelityReport,
  CompositionMeasuredRegion,
} from './types.js';

export const COMPOSITION_FIDELITY_PENALTIES: Record<CompositionFidelityIssueCode, number> = {
  'missing-section': 25,
  'duplicate-section': 25,
  'order-drift': 15,
  'broken-group': 15,
  'wrong-section-grammar': 15,
  'lost-dominant-emphasis': 15,
  'process-direction': 10,
  'source-columns': 15,
  'footer-order': 20,
};

function expectedOrder(data: CanonicalInfographic): string[] {
  const requested = data.sourceHints.sectionOrder ?? [];
  return [...requested, ...data.sections.map((section) => section.id).filter((id) => !requested.includes(id))];
}

function fullWidth(section: CanonicalSection, axis: 'horizontal' | 'vertical'): boolean {
  return section.kind === 'table-lite' || section.kind === 'comparison' || section.kind === 'timeline'
    || (section.kind === 'process-steps' && axis === 'horizontal');
}

function expectedDominant(data: CanonicalInfographic): string | undefined {
  const importance = data.sourceHints.relativeImportance;
  if (importance && Object.keys(importance).length) return Object.entries(importance).sort((left, right) => right[1] - left[1])[0]?.[0];
  if (data.sourceHints.zoneMap?.length) return [...data.sourceHints.zoneMap]
    .filter((zone) => zone.sectionId !== 'hero' && zone.sectionId !== 'footer')
    .sort((left, right) => right.w * right.h - left.w * left.h)[0]?.sectionId;
  return data.sourceHints.emphasisOrder[0];
}

function sourceColumns(data: CanonicalInfographic): number {
  const zones = (data.sourceHints.zoneMap ?? []).filter((zone) => zone.sectionId !== 'footer');
  if (zones.length) return Math.max(1, ...zones.map((zone) => zones.filter((other) => zone.y < other.y + other.h && other.y < zone.y + zone.h).length));
  if (data.sourceHints.columnRatios?.length) return data.sourceHints.columnRatios.length;
  if (data.sourceHints.preferredColumns) return data.sourceHints.preferredColumns;
  return 1;
}

function orderWithGroups(ids: string[], data: CanonicalInfographic): string[] {
  const groupBySection = new Map<string, string>();
  for (const group of data.sourceHints.sectionGroups ?? []) {
    for (const sectionId of group.sectionIds) if (!groupBySection.has(sectionId)) groupBySection.set(sectionId, group.id);
  }
  const seenGroups = new Set<string>();
  return ids.flatMap((id) => {
    const groupId = groupBySection.get(id);
    if (!groupId) return [id];
    if (seenGroups.has(groupId)) return [];
    seenGroups.add(groupId);
    return [`group:${groupId}`];
  });
}

export function assessCompositionFidelity(
  data: CanonicalInfographic,
  blueprint: CompositionBlueprint,
  measured: readonly CompositionMeasuredRegion[] = [],
): CompositionFidelityReport {
  const issues: CompositionFidelityIssue[] = [];
  const report = (code: CompositionFidelityIssueCode, message: string, sectionId?: string) => {
    if (!issues.some((issue) => issue.code === code && issue.sectionId === sectionId)) issues.push({ code, message, sectionId });
  };
  const expected = expectedOrder(data);
  const actual = blueprint.regions.flatMap((region) => region.sectionIds);
  const sourceIds = new Set(data.sections.map((section) => section.id));
  const missing = expected.filter((id) => !actual.includes(id));
  if (missing.length) report('missing-section', `Blueprint omitted source section(s): ${missing.join(', ')}.`);
  const duplicates = actual.filter((id, index) => sourceIds.has(id) && actual.indexOf(id) !== index);
  if (duplicates.length) report('duplicate-section', `Blueprint repeated source section(s): ${[...new Set(duplicates)].join(', ')}.`);
  const actualExpected = actual.filter((id) => sourceIds.has(id));
  if (JSON.stringify(orderWithGroups(actualExpected, data)) !== JSON.stringify(orderWithGroups(expected, data))) {
    report('order-drift', 'Blueprint order differs from the requested source order.');
  }

  for (const group of data.sourceHints.sectionGroups ?? []) {
    const positions = group.sectionIds.map((id) => actual.indexOf(id));
    if (positions.some((position) => position === -1) || positions.some((position, index) => index > 0 && position !== positions[index - 1] + 1)) {
      report('broken-group', `Source group "${group.id}" is no longer adjacent.`);
    }
  }

  for (const section of data.sections) {
    const region = blueprint.regions.find((candidate) => candidate.sectionIds.includes(section.id));
    if (region && fullWidth(section, blueprint.primaryAxis) && (region.column !== 0 || region.columnSpan !== blueprint.columns)) {
      report('wrong-section-grammar', `Section "${section.id}" lost its full-width ${section.kind} grammar.`, section.id);
    }
    if (region && section.kind === 'process-steps' && blueprint.primaryAxis === 'horizontal' && region.direction !== 'horizontal') {
      report('process-direction', `Process "${section.id}" no longer follows horizontal source flow.`, section.id);
    }
  }

  const dominant = expectedDominant(data);
  if (dominant) {
    const region = blueprint.regions.find((candidate) => candidate.sectionIds.includes(dominant));
    if (region && region.emphasis !== 'dominant') report('lost-dominant-emphasis', `Dominant source section "${dominant}" was not allocated dominant emphasis.`, dominant);
  }

  const columns = sourceColumns(data);
  if (columns > 1 && blueprint.columns !== columns) report('source-columns', `Blueprint uses ${blueprint.columns} column(s), but source hints require ${columns}.`);
  if (blueprint.footer.row <= Math.max(-1, ...blueprint.regions.map((region) => region.row + region.rowSpan - 1))) {
    report('footer-order', 'Blueprint footer is not below every content region.');
  }
  if (measured.length) {
    const footer = measured.find((region) => region.id === 'footer');
    const contentBottom = Math.max(...measured.filter((region) => region.id !== 'footer').map((region) => region.y + region.height));
    if (!footer || footer.y < contentBottom) report('footer-order', 'Measured footer is not below every content region.');
  }

  const score = Math.max(0, 100 - issues.reduce((total, issue) => total + COMPOSITION_FIDELITY_PENALTIES[issue.code], 0));
  return { passed: issues.length === 0, score, issues };
}

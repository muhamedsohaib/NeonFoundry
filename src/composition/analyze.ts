import type { CanonicalInfographic, CanonicalSection } from '../schema/canonical.js';
import type {
  CompositionAxis,
  CompositionBlueprint,
  CompositionDensity,
  CompositionFamily,
  CompositionProvenance,
  CompositionRegion,
  RegionEmphasis,
} from './types.js';

type Zone = NonNullable<CanonicalInfographic['sourceHints']['zoneMap']>[number];
type Group = NonNullable<CanonicalInfographic['sourceHints']['sectionGroups']>[number];

function orderedSections(data: CanonicalInfographic): CanonicalSection[] {
  const byId = new Map(data.sections.map((section) => [section.id, section]));
  const requested = data.sourceHints.sectionOrder ?? [];
  return [...requested.map((id) => byId.get(id)).filter((section): section is CanonicalSection => Boolean(section)),
    ...data.sections.filter((section) => !requested.includes(section.id))];
}

function family(data: CanonicalInfographic): CompositionFamily {
  if (data.sourceHints.compositionPattern) return data.sourceHints.compositionPattern;
  if (data.sections.some((section) => section.kind === 'table-lite')) return 'table-led';
  if (data.sections.some((section) => section.kind === 'comparison')) return 'comparison-led';
  if (data.sections.some((section) => section.kind === 'timeline')) return 'timeline-led';
  if (data.sections.some((section) => section.kind === 'process-steps')) return 'process-led';
  if (data.sections.some((section) => section.kind === 'checklist')) return 'checklist-led';
  if (data.sections.some((section) => section.kind === 'metric-grid')) return 'metric-led';
  return data.sections.length <= 1 ? 'single-column' : 'mixed-narrative';
}

function familyColumns(value: CompositionFamily): number {
  return ['asymmetric-two-column', 'symmetric-two-column', 'hero-left-data-right', 'poster-sidebar', 'dashboard-lite'].includes(value) ? 2 : 1;
}

function normalizeRatios(ratios: number[], columns: number): number[] {
  const usable = ratios.length === columns && ratios.every((ratio) => ratio > 0) ? ratios : Array.from({ length: columns }, () => 1);
  const total = usable.reduce((sum, ratio) => sum + ratio, 0);
  return usable.map((ratio) => ratio / total);
}

function density(count: number): CompositionDensity {
  return count >= 7 ? 'dense' : count <= 2 ? 'sparse' : 'balanced';
}

function importance(data: CanonicalInfographic, sectionId: string): number {
  const explicit = data.sourceHints.relativeImportance?.[sectionId];
  if (explicit !== undefined) return explicit;
  const zone = data.sourceHints.zoneMap?.find((item) => item.sectionId === sectionId);
  if (zone) return zone.w * zone.h;
  const order = data.sourceHints.emphasisOrder.indexOf(sectionId);
  return order === -1 ? 0 : 1 - order / Math.max(1, data.sourceHints.emphasisOrder.length);
}

function emphases(items: Array<{ sectionIds: string[]; importance: number }>): RegionEmphasis[] {
  const ranked = [...items].sort((left, right) => right.importance - left.importance);
  const explicitImportance = ranked.some((item) => item.importance > 0);
  const result = new Map<string, RegionEmphasis>();
  ranked.forEach((item, index) => {
    const key = item.sectionIds.join('|');
    result.set(key, explicitImportance && index === 0 ? 'dominant' : index === 0 ? 'primary' : index === 1 ? 'secondary' : 'supporting');
  });
  return items.map((item) => result.get(item.sectionIds.join('|')) ?? 'supporting');
}

function semanticFullWidth(sectionIds: string[], byId: Map<string, CanonicalSection>, axis: CompositionAxis): boolean {
  return sectionIds.some((id) => {
    const kind = byId.get(id)?.kind;
    return kind === 'table-lite' || kind === 'comparison' || kind === 'timeline' || (kind === 'process-steps' && axis === 'horizontal');
  });
}

function groupedSections(sections: CanonicalSection[], groups: Group[] | undefined): Array<{ id: string; sectionIds: string[]; direction?: CompositionAxis }> {
  if (!groups?.length) return sections.map((section) => ({ id: section.id, sectionIds: [section.id] }));
  const byId = new Map(sections.map((section) => [section.id, section]));
  const memberToGroup = new Map<string, Group>();
  for (const group of groups) for (const id of group.sectionIds) if (!memberToGroup.has(id) && byId.has(id)) memberToGroup.set(id, group);
  const emitted = new Set<string>();
  const result: Array<{ id: string; sectionIds: string[]; direction?: CompositionAxis }> = [];
  for (const section of sections) {
    const group = memberToGroup.get(section.id);
    if (!group) {
      result.push({ id: section.id, sectionIds: [section.id] });
      continue;
    }
    if (emitted.has(group.id)) continue;
    emitted.add(group.id);
    result.push({ id: group.id, sectionIds: [...new Set(group.sectionIds.filter((id) => byId.has(id)))], direction: group.direction });
  }
  return result;
}

function zoneRows(zones: Zone[]): Zone[][] {
  const rows: Zone[][] = [];
  for (const zone of [...zones].sort((left, right) => left.y - right.y || left.x - right.x)) {
    const row = rows.find((candidate) => candidate.some((existing) => zone.y < existing.y + existing.h && existing.y < zone.y + zone.h));
    if (row) row.push(zone); else rows.push([zone]);
  }
  return rows.map((row) => row.sort((left, right) => left.x - right.x));
}

function geometryRegions(
  data: CanonicalInfographic,
  items: Array<{ id: string; sectionIds: string[]; direction?: CompositionAxis }>,
  columns: number,
  axis: CompositionAxis,
): CompositionRegion[] {
  const zoneBySection = new Map((data.sourceHints.zoneMap ?? []).map((zone) => [zone.sectionId, zone]));
  const zones = items.flatMap((item) => item.sectionIds.map((id) => zoneBySection.get(id)).filter((zone): zone is Zone => Boolean(zone)));
  const rowBySection = new Map<string, number>();
  const columnBySection = new Map<string, number>();
  zoneRows(zones).forEach((row, rowIndex) => row.forEach((zone, columnIndex) => {
    rowBySection.set(zone.sectionId, rowIndex);
    columnBySection.set(zone.sectionId, columnIndex);
  }));
  const regions = items.map((item, index) => {
    const itemZones = item.sectionIds.map((id) => zoneBySection.get(id)).filter((zone): zone is Zone => Boolean(zone));
    const first = itemZones[0];
    const row = first ? rowBySection.get(first.sectionId)! : zoneRows(zones).length + index;
    const fullWidth = !first || itemZones.some((zone) => zone.w >= 0.75) || semanticFullWidth(item.sectionIds, new Map(data.sections.map((section) => [section.id, section])), axis);
    return {
      id: item.id,
      sectionIds: item.sectionIds,
      row,
      column: fullWidth ? 0 : Math.min(columns - 1, columnBySection.get(first.sectionId) ?? 0),
      rowSpan: 1,
      columnSpan: fullWidth ? columns : 1,
      direction: item.direction ?? axis,
      emphasis: 'supporting' as RegionEmphasis,
      importance: Math.max(...item.sectionIds.map((id) => importance(data, id))),
    };
  });
  const regionEmphases = emphases(regions);
  return regions.map((region, index) => ({ ...region, emphasis: regionEmphases[index] }));
}

function inferredRegions(
  data: CanonicalInfographic,
  items: Array<{ id: string; sectionIds: string[]; direction?: CompositionAxis }>,
  columns: number,
  axis: CompositionAxis,
): CompositionRegion[] {
  const byId = new Map(data.sections.map((section) => [section.id, section]));
  let row = 0;
  let column = 0;
  const regions = items.map((item) => {
    const fullWidth = columns === 1 || semanticFullWidth(item.sectionIds, byId, axis) || item.direction === 'horizontal';
    if (fullWidth && column) { row += 1; column = 0; }
    const region: CompositionRegion = {
      id: item.id,
      sectionIds: item.sectionIds,
      row,
      column: fullWidth ? 0 : column,
      rowSpan: 1,
      columnSpan: fullWidth ? columns : 1,
      direction: item.direction ?? axis,
      emphasis: 'supporting',
      importance: Math.max(...item.sectionIds.map((id) => importance(data, id))),
    };
    if (fullWidth || column === columns - 1) { row += 1; column = 0; } else column += 1;
    return region;
  });
  const regionEmphases = emphases(regions);
  return regions.map((region, index) => ({ ...region, emphasis: regionEmphases[index] }));
}

export function analyzeComposition(data: CanonicalInfographic): CompositionBlueprint {
  const ordered = orderedSections(data);
  const sourceOrder = ordered.map((section) => section.id);
  const hasGeometry = Boolean(data.sourceHints.zoneMap?.some((zone) => sourceOrder.includes(zone.sectionId)));
  const hasGroups = Boolean(data.sourceHints.sectionGroups?.length);
  const inferredFamily = family(data);
  const axis = data.sourceHints.primaryAxis ?? 'vertical';
  const geometryRows = hasGeometry ? zoneRows((data.sourceHints.zoneMap ?? []).filter((zone) => sourceOrder.includes(zone.sectionId))) : [];
  const columns = data.sourceHints.columnRatios?.length
    ?? (hasGeometry ? Math.max(1, ...geometryRows.map((row) => row.length)) : data.sourceHints.preferredColumns ?? familyColumns(inferredFamily));
  const groups = groupedSections(ordered, data.sourceHints.sectionGroups);
  const provenance: CompositionProvenance = hasGeometry ? 'explicit-geometry' : hasGroups ? 'explicit-groups'
    : inferredFamily === 'single-column' || inferredFamily === 'mixed-narrative' ? 'safe-fallback' : 'structural-inference';
  const regions = hasGeometry ? geometryRegions(data, groups, columns, axis) : inferredRegions(data, groups, columns, axis);

  return {
    family: inferredFamily,
    columns,
    columnRatios: normalizeRatios(data.sourceHints.columnRatios ?? [], columns),
    primaryAxis: axis,
    density: density(sourceOrder.length),
    sourceOrder,
    regions,
    footer: { id: 'footer', row: Math.max(0, ...regions.map((region) => region.row + region.rowSpan)) },
    provenance,
  };
}

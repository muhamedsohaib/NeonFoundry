import type { ReactNode } from 'react';

import type { CompositionBlueprint, CompositionRegion } from '../composition/types.js';
import { Hero, PortfolioFooter, Section, column, row } from '../components/portfolio-primitives.js';
import { TOKENS } from '../design-system/tokens.js';
import type { CanonicalInfographic, CanonicalSection } from '../schema/canonical.js';

type Props = {
  data: CanonicalInfographic;
  blueprint: CompositionBlueprint;
  width: number;
  height: number;
};

function regionSections(data: CanonicalInfographic, region: CompositionRegion): CanonicalSection[] {
  const byId = new Map(data.sections.map((section) => [section.id, section]));
  return region.sectionIds.map((id) => byId.get(id)).filter((section): section is CanonicalSection => Boolean(section));
}

function emphasisStyle(region: CompositionRegion) {
  if (region.emphasis === 'dominant') return { borderTop: `2px solid ${TOKENS.colors.neon}`, paddingTop: 24 };
  if (region.emphasis === 'primary') return { borderTop: `1px solid ${TOKENS.colors.borderStrong}`, paddingTop: 20 };
  return { borderTop: `1px solid ${TOKENS.colors.border}`, paddingTop: 18 };
}

function RegionBlock({ data, region }: { data: CanonicalInfographic; region: CompositionRegion }) {
  const sections = regionSections(data, region);
  const direction = region.direction === 'horizontal' && sections.length > 1 ? row : column;
  return <div data-region={region.id} style={{ ...direction, gap: 26, minWidth: 0, ...emphasisStyle(region) }}>
    {sections.map((section) => <div key={section.id} style={{ ...column, flex: 1, minWidth: 0 }}>
      <Section section={section} />
    </div>)}
  </div>;
}

function rowMap(blueprint: CompositionBlueprint): CompositionRegion[][] {
  const rows = new Map<number, CompositionRegion[]>();
  for (const region of blueprint.regions) {
    const current = rows.get(region.row) ?? [];
    current.push(region);
    rows.set(region.row, current);
  }
  return [...rows.entries()].sort(([a], [b]) => a - b)
    .map(([, regions]) => regions.sort((a, b) => a.column - b.column));
}
function overlaps(a: { y: number; h: number }, b: { y: number; h: number }): boolean {
  return a.y < b.y + b.h && b.y < a.y + a.h;
}

function topHeroRegions(data: CanonicalInfographic, blueprint: CompositionBlueprint): Set<string> {
  const hero = data.sourceHints.zoneMap?.find((zone) => zone.sectionId === 'hero');
  if (!hero) return new Set();
  const zoneById = new Map((data.sourceHints.zoneMap ?? []).map((zone) => [zone.sectionId, zone]));
  return new Set(blueprint.regions.filter((region) => region.sectionIds.some((id) => {
    const zone = zoneById.get(id);
    return zone ? overlaps(hero, zone) : false;
  })).map((region) => region.id));
}

function RegionRow({ data, blueprint, regions }: {
  data: CanonicalInfographic; blueprint: CompositionBlueprint; regions: CompositionRegion[];
}) {
  if (regions.length === 1 && regions[0].columnSpan >= blueprint.columns) {
    return <RegionBlock data={data} region={regions[0]} />;
  }
  return <div style={{ ...row, gap: 34, alignItems: 'flex-start' }}>
    {regions.map((region) => {
      const span = Math.max(1, region.columnSpan);
      const ratio = blueprint.columnRatios.slice(region.column, region.column + span).reduce((sum, value) => sum + value, 0) || 1;
      return <div key={region.id} style={{ ...column, flex: ratio, minWidth: 0 }}>
        <RegionBlock data={data} region={region} />
      </div>;
    })}
  </div>;
}

export function GeneralizedLayout({ data, blueprint, width, height }: Props): ReactNode {
  const rows = rowMap(blueprint);
  const heroRegions = topHeroRegions(data, blueprint);
  const top = rows.length ? rows[0] : [];
  const heroSharesRow = heroRegions.size > 0 && top.some((region) => heroRegions.has(region.id));
  const remainingRows = heroSharesRow ? rows.slice(1) : rows;

  return <div style={{ ...column, width, minHeight: height, padding: 44, gap: 30,
    color: TOKENS.colors.text, backgroundColor: TOKENS.colors.background,
    borderTop: `6px solid ${TOKENS.colors.neon}`, fontFamily: TOKENS.fontFamily }}>
    <div data-region="content" style={{ ...column, gap: 30 }}>
      {heroSharesRow ? <div style={{ ...row, gap: 38, alignItems: 'flex-start' }}>
        <div data-region="hero" style={{ ...column, flex: data.sourceHints.zoneMap?.find((zone) => zone.sectionId === 'hero')?.w ?? 1, minWidth: 0 }}>
          <Hero data={data} />
        </div>
        <div style={{ ...column, flex: 1, gap: 30 }}>
          <RegionRow data={data} blueprint={blueprint} regions={top} />
        </div>
      </div> : <Hero data={data} />}
      {remainingRows.map((regions, index) => <RegionRow key={index} data={data} blueprint={blueprint} regions={regions} />)}
    </div>
    <PortfolioFooter data={data} />
  </div>;
}

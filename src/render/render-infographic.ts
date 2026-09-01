import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

import { analyzeComposition } from '../composition/analyze.js';
import { assessCompositionFidelity } from '../composition/fidelity.js';
import type { CompositionBlueprint, CompositionFidelityReport, CompositionMeasuredRegion } from '../composition/types.js';
import { GeneralizedLayout } from '../layouts/generalized.js';
import { PortfolioLayout } from '../layouts/portfolio.js';
import { selectTemplate } from '../layout/select-template.js';
import type { LayoutDecision, RenderLayout } from '../layout/select-layout.js';
import type { RenderProfile } from '../qa/quality.js';
import type { CanonicalInfographic, PortfolioTemplate } from '../schema/canonical.js';
import { loadRobotoMonoFonts } from './fonts.js';
import { instrument, layoutOverflows, type GeometryNode } from './geometry.js';

export interface RenderedInfographic {
  layout: RenderLayout;
  svg: string;
  png: Buffer;
  width: number;
  height: number;
  template?: PortfolioTemplate;
  blueprint?: CompositionBlueprint;
  compositionFidelity?: CompositionFidelityReport;
  geometry: GeometryNode[];
}
function measuredRegions(nodes: GeometryNode[]): CompositionMeasuredRegion[] {
  const seen = new Set<string>();
  return nodes.flatMap((node) => {
    if (!node.region || seen.has(node.region)) return [];
    seen.add(node.region);
    return [{ id: node.region, x: node.left, y: node.top, width: node.width, height: node.height }];
  });
}

export async function renderInfographic(
  data: CanonicalInfographic,
  decision: LayoutDecision,
  profile: RenderProfile,
  options: { width?: number; height?: number; pngWidth?: number } = {},
): Promise<RenderedInfographic> {
  const width = options.width ?? 1600;
  let height = options.height ?? 1120;
  const pngWidth = options.pngWidth ?? 3200;
  const fonts = await loadRobotoMonoFonts();
  const template = selectTemplate(data, decision);
  const blueprint = template ? undefined : analyzeComposition(data);

  const build = () => template
    ? PortfolioLayout({ data, template, width, height })
    : GeneralizedLayout({ data, blueprint: blueprint!, width, height });
  let measured = instrument(build());
  let svg = await satori(measured.element, { width, height, fonts, onNodeDetected: measured.onNodeDetected });
  const neededHeight = Math.ceil(Math.max(height, ...measured.nodes.map((node) => node.top + node.height)));
  if (options.height === undefined && neededHeight > height) {
    height = neededHeight;
    measured = instrument(build());
    svg = await satori(measured.element, { width, height, fonts, onNodeDetected: measured.onNodeDetected });
  }

  const overflow = layoutOverflows(measured.nodes, width, height);
  if (overflow.length) {
    throw new Error(`Layout overflow; increase canvas size or recompose source sections. ${overflow.slice(0, 5).join(' ')}`);
  }

  const compositionFidelity = blueprint
    ? assessCompositionFidelity(data, blueprint, measuredRegions(measured.nodes))
    : undefined;
  const png = Buffer.from(new Resvg(svg, {
    fitTo: { mode: 'width', value: pngWidth },
  }).render().asPng());

  return {
    layout: decision.selected,
    svg,
    png,
    width,
    height,
    template,
    blueprint,
    compositionFidelity,
    geometry: measured.nodes,
  };
}

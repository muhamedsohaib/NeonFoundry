import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

import { ComparisonLayout } from '../layouts/comparison.js';
import { DashboardLayout } from '../layouts/dashboard.js';
import { QaLayout } from '../layouts/qa.js';
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
  geometry: GeometryNode[];
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
  const build = () => template ? PortfolioLayout({ data, template, width, height }) : decision.selected === 'qa'
    ? QaLayout({ data, profile, width, height })
    : decision.selected === 'comparison'
      ? ComparisonLayout({ data, profile, width, height })
      : DashboardLayout({ data, profile, width, height });

  let measured = instrument(build());
  let svg = await satori(measured.element, { width, height, fonts, onNodeDetected: measured.onNodeDetected });
  // Keep source text readable on default canvases. A fixed height is a hard limit.
  const neededHeight = Math.ceil(Math.max(height, ...measured.nodes.map((n) => n.top + n.height)));
  if (options.height === undefined && neededHeight > height) {
    height = neededHeight;
    measured = instrument(build());
    svg = await satori(measured.element, { width, height, fonts, onNodeDetected: measured.onNodeDetected });
  }
  const overflow = layoutOverflows(measured.nodes, width, height);
  if (overflow.length) throw new Error(`Layout overflow; increase canvas size or recompose source sections. ${overflow.slice(0, 5).join(' ')}`);
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
    geometry: measured.nodes,
  };
}

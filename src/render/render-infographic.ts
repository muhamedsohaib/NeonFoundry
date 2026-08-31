import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

import { DashboardLayout } from '../layouts/dashboard.js';
import { QaLayout } from '../layouts/qa.js';
import type { LayoutDecision } from '../layout/select-layout.js';
import type { RenderProfile } from '../qa/quality.js';
import type { CanonicalInfographic } from '../schema/canonical.js';
import { loadRobotoMonoFonts } from './fonts.js';

export interface RenderedInfographic {
  layout: 'qa' | 'dashboard';
  svg: string;
  png: Buffer;
  width: number;
  height: number;
}

export async function renderInfographic(
  data: CanonicalInfographic,
  decision: LayoutDecision,
  profile: RenderProfile,
  options: { width?: number; height?: number; pngWidth?: number } = {},
): Promise<RenderedInfographic> {
  const width = options.width ?? 1600;
  const height = options.height ?? 1120;
  const pngWidth = options.pngWidth ?? 3200;
  const fonts = await loadRobotoMonoFonts();
  const element = decision.selected === 'qa'
    ? QaLayout({ data, profile, width, height })
    : DashboardLayout({ data, profile, width, height });

  const svg = await satori(element, { width, height, fonts });
  const png = Buffer.from(new Resvg(svg, {
    fitTo: { mode: 'width', value: pngWidth },
  }).render().asPng());

  return {
    layout: decision.selected,
    svg,
    png,
    width,
    height,
  };
}

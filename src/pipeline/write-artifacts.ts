import fs from 'node:fs/promises';
import path from 'node:path';

import type { LayoutDecision } from '../layout/select-layout.js';
import type { QualityReport, RenderProfile } from '../qa/quality.js';
import type { RenderedInfographic } from '../render/render-infographic.js';
import type { CanonicalInfographic } from '../schema/canonical.js';

export interface ArtifactPaths {
  json: string;
  svg: string;
  png: string;
  debug?: string;
}

export interface WriteArtifactsOptions {
  data: CanonicalInfographic;
  rendered: RenderedInfographic;
  decision: LayoutDecision;
  quality: QualityReport;
  profile: RenderProfile;
  outputName: string;
  outputDir?: string;
  debug?: boolean;
}

export function sanitizeOutputName(value: string): string {
  const safe = value.trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!safe) throw new Error('Output name is empty after sanitization.');
  return safe;
}
export function resolveArtifactPaths(
  outputName: string,
  outputDir = 'output',
  debug = false,
): ArtifactPaths {
  const base = path.join(outputDir, sanitizeOutputName(outputName));
  return {
    json: `${base}.json`,
    svg: `${base}.svg`,
    png: `${base}.png`,
    ...(debug ? { debug: `${base}.debug.json` } : {}),
  };
}

export async function writeArtifacts(options: WriteArtifactsOptions): Promise<ArtifactPaths> {
  const paths = resolveArtifactPaths(options.outputName, options.outputDir, options.debug);
  await fs.mkdir(path.dirname(paths.json), { recursive: true });

  await Promise.all([
    fs.writeFile(paths.json, `${JSON.stringify(options.data, null, 2)}\n`, 'utf8'),
    fs.writeFile(paths.svg, options.rendered.svg, 'utf8'),
    fs.writeFile(paths.png, options.rendered.png),
  ]);

  if (paths.debug) {
    const debug = {
      layoutDecision: options.decision,
      quality: options.quality,
      renderProfile: options.profile,
      template: options.rendered.template,
      blueprint: options.rendered.blueprint,
      compositionFidelity: options.rendered.compositionFidelity,
      canvas: { width: options.rendered.width, height: options.rendered.height },
      geometry: options.rendered.geometry,
    };
    await fs.writeFile(paths.debug, `${JSON.stringify(debug, null, 2)}\n`, 'utf8');
  }

  return paths;
}

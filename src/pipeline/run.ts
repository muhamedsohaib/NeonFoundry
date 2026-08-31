import { extractWithOpenAI, type ExtractorOptions } from '../extract/openai-extractor.js';
import { ingestInput } from '../ingest/input.js';
import { selectLayout, type LayoutDecision } from '../layout/select-layout.js';
import { normalizeJsonInput } from '../normalize/json.js';
import { deriveRenderProfile, runQualityChecks, type QualityReport, type RenderProfile } from '../qa/quality.js';
import { renderInfographic, type RenderedInfographic } from '../render/render-infographic.js';
import type { CanonicalInfographic, LayoutFamily, SourceMode } from '../schema/canonical.js';
import { resolveArtifactPaths, writeArtifacts, type ArtifactPaths } from './write-artifacts.js';

export interface GenerateOptions {
  inputPath: string;
  outputName: string;
  outputDir?: string;
  mode?: SourceMode;
  layout?: LayoutFamily;
  debug?: boolean;
  extractorOptions?: ExtractorOptions;
}

export interface GenerateResult {
  data: CanonicalInfographic;
  decision: LayoutDecision;
  quality: QualityReport;
  profile: RenderProfile;
  rendered: RenderedInfographic;
  paths: ArtifactPaths;
}
export async function resolveCanonicalInput(
  inputPath: string,
  mode?: SourceMode,
  extractorOptions?: ExtractorOptions,
): Promise<CanonicalInfographic> {
  const input = await ingestInput(inputPath, mode);
  if (input.mode === 'json') return normalizeJsonInput(input.value);
  return extractWithOpenAI(input, extractorOptions);
}

export async function runGenerate(options: GenerateOptions): Promise<GenerateResult> {
  const data = await resolveCanonicalInput(options.inputPath, options.mode, options.extractorOptions);
  const decision = selectLayout(data, options.layout);
  const quality = runQualityChecks(data);
  const profile = deriveRenderProfile(quality);
  const intendedPaths = resolveArtifactPaths(options.outputName, options.outputDir, options.debug);

  let rendered: RenderedInfographic;
  try {
    rendered = await renderInfographic(data, decision, profile);
  } catch (error) {
    const diagnostics = intendedPaths.debug ? `; debug: ${intendedPaths.debug}` : '';
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(
      `Infographic rendering failed after canonical resolution. Intended JSON: ${intendedPaths.json}${diagnostics}.${detail}`,
      { cause: error },
    );
  }

  const paths = await writeArtifacts({
    data,
    rendered,
    decision,
    quality,
    profile,
    outputName: options.outputName,
    outputDir: options.outputDir,
    debug: options.debug,
  });

  return { data, decision, quality, profile, rendered, paths };
}

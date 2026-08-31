import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import type { IngestedInput } from '../ingest/input.js';
import { parseCanonicalInfographic, type CanonicalInfographic } from '../schema/canonical.js';
import { parseStructuredExtraction, StructuredCanonicalExtractionSchema } from './structured-schema.js';

type ExtractableInput = Extract<IngestedInput, { mode: 'report' | 'image' }>;
type ParsedResponse = { status: string; output_parsed: unknown | null };
type ParseDependency = (request: Record<string, unknown>) => Promise<ParsedResponse>;

export interface ExtractorOptions {
  apiKey?: string;
  model?: string;
  parse?: ParseDependency;
}

const SYSTEM_REQUIREMENTS = `Reconstruct the source infographic semantics faithfully.
Copy only facts, labels, metrics, dates, and claims actually visible or stated in the source.
Never invent missing values. Recover hierarchy, reading order, meaningful section kinds,
source layout guess, visual notes, and composition confidence. Use layoutFamily "auto".
Return concise human-readable copy suitable for deterministic infographic rendering.`;
function buildInput(input: ExtractableInput): unknown[] {
  if (input.mode === 'image') {
    return [
      { role: 'system', content: SYSTEM_REQUIREMENTS },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Read every legible text element and infer only the source structure needed to rebuild it cleanly.',
          },
          { type: 'input_image', image_url: input.dataUrl, detail: 'high' },
        ],
      },
    ];
  }

  return [
    { role: 'system', content: SYSTEM_REQUIREMENTS },
    {
      role: 'user',
      content: [{ type: 'input_text', text: `SOURCE REPORT:\n${input.text}` }],
    },
  ];
}

function normalizeExtracted(value: unknown, mode: ExtractableInput['mode']): CanonicalInfographic {
  const record = value as Record<string, unknown>;
  const meta = (record.meta ?? {}) as Record<string, unknown>;
  const forced = { ...record, meta: { ...meta, sourceMode: mode } };
  try {
    return parseCanonicalInfographic(forced);
  } catch {
    return parseStructuredExtraction(forced);
  }
}
export async function extractWithOpenAI(
  input: ExtractableInput,
  options: ExtractorOptions = {},
): Promise<CanonicalInfographic> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for image or report extraction.');
  }

  const request = {
    model: options.model ?? process.env.OPENAI_MODEL ?? 'gpt-5.6-sol',
    input: buildInput(input),
    text: { format: zodTextFormat(StructuredCanonicalExtractionSchema, 'canonical_infographic') },
  };

  const parse: ParseDependency = options.parse ?? (async (payload) => {
    const client = new OpenAI({ apiKey });
    return client.responses.parse(payload as never) as unknown as Promise<ParsedResponse>;
  });

  const response = await parse(request);
  if (response.status !== 'completed' || response.output_parsed == null) {
    throw new Error(`OpenAI extraction did not complete successfully (status: ${response.status}).`);
  }

  return normalizeExtracted(response.output_parsed, input.mode);
}


import fs from 'node:fs/promises';
import nodePath from 'node:path';

import sharp from 'sharp';

import type { SourceMode } from '../schema/canonical.js';

export type IngestedInput =
  | { mode: 'json'; path: string; value: unknown }
  | { mode: 'report'; path: string; text: string }
  | { mode: 'image'; path: string; png: Buffer; dataUrl: string };

const EXTENSION_MODES: Record<string, SourceMode> = {
  '.json': 'json',
  '.md': 'report',
  '.markdown': 'report',
  '.txt': 'report',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.webp': 'image',
};

function isSourceMode(value: unknown): value is SourceMode {
  return value === 'json' || value === 'report' || value === 'image';
}

export function detectInputMode(filePath: string, explicit?: SourceMode): SourceMode {
  if (explicit !== undefined) {
    if (!isSourceMode(explicit)) {
      throw new Error(`Unsupported explicit input mode: ${String(explicit)}`);
    }
    return explicit;
  }

  const extension = nodePath.extname(filePath).toLowerCase();
  const mode = EXTENSION_MODES[extension];
  if (!mode) {
    throw new Error(`Unsupported input extension: ${extension || '(none)'}`);
  }

  return mode;
}

export async function preprocessImage(filePath: string): Promise<Buffer> {
  return sharp(filePath)
    .rotate()
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
}

async function assertInputFile(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) throw new Error('not a file');
  } catch {
    throw new Error(`Input file does not exist or is not a file: ${filePath}`);
  }
}

export async function ingestInput(filePath: string, explicit?: SourceMode): Promise<IngestedInput> {
  const mode = detectInputMode(filePath, explicit);
  await assertInputFile(filePath);

  if (mode === 'json') {
    const text = await fs.readFile(filePath, 'utf8');
    try {
      return { mode, path: filePath, value: JSON.parse(text) as unknown };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid JSON input at ${filePath}: ${message}`);
    }
  }

  if (mode === 'report') {
    return { mode, path: filePath, text: await fs.readFile(filePath, 'utf8') };
  }

  const png = await preprocessImage(filePath);
  return {
    mode,
    path: filePath,
    png,
    dataUrl: `data:image/png;base64,${png.toString('base64')}`,
  };
}

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import type { Font as SatoriFont } from 'satori';

const require = createRequire(import.meta.url);

let fontPromise: Promise<SatoriFont[]> | undefined;

async function readFont(path: string): Promise<ArrayBuffer> {
  const file = await readFile(path);
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}

export function loadRobotoMonoFonts(): Promise<SatoriFont[]> {
  fontPromise ??= Promise.all([
    readFont(require.resolve('@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff')),
    readFont(require.resolve('@fontsource/roboto-mono/files/roboto-mono-latin-700-normal.woff')),
  ]).then(([regular, bold]) => [
    { name: 'Roboto Mono', data: regular, weight: 400, style: 'normal' },
    { name: 'Roboto Mono', data: bold, weight: 700, style: 'normal' },
  ]);

  return fontPromise;
}

export type { SatoriFont };

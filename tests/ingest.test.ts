import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { expect, it } from 'vitest';
import { detectInputMode, ingestInput } from '../src/ingest/input.js';

it('detects supported modes and rejects unknown extensions', () => {
  expect(detectInputMode('x.json')).toBe('json');
  expect(detectInputMode('x.md')).toBe('report');
  expect(detectInputMode('x.webp')).toBe('image');
  expect(() => detectInputMode('x.pdf')).toThrow(/Unsupported input extension/);
});

it('preprocesses an image into a bounded PNG data URL', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'infographic-'));
  const file = path.join(dir, 'wide.jpg');
  await sharp({ create: { width: 3000, height: 1200, channels: 3, background: '#222222' } }).jpeg().toFile(file);
  const input = await ingestInput(file);
  expect(input.mode).toBe('image');
  if (input.mode === 'image') {
    expect(input.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    const meta = await sharp(input.png).metadata();
    expect(meta.width).toBeLessThanOrEqual(2048);
  }
});

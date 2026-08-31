import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { runGenerate } from '../src/pipeline/run.js';

it('generates all primary artifacts from canonical JSON without an API key', async () => {
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'infographic-out-'));
  const input = new URL('./fixtures/canonical-dashboard.json', import.meta.url).pathname.replace(/^\/(.:)/, '$1');
  const oldKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const result = await runGenerate({ inputPath: input, outputName: 'demo', outputDir: out, debug: true });
    expect(result.decision.selected).toBe('dashboard');
    await expect(fs.stat(result.paths.json)).resolves.toBeTruthy();
    await expect(fs.stat(result.paths.svg)).resolves.toBeTruthy();
    await expect(fs.stat(result.paths.png)).resolves.toBeTruthy();
    await expect(fs.stat(result.paths.debug!)).resolves.toBeTruthy();
  } finally {
    if (oldKey) process.env.OPENAI_API_KEY = oldKey;
  }
});

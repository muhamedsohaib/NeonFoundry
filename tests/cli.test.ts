import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createProgram } from '../src/cli.js';
import { runGenerate } from '../src/pipeline/run.js';
import type { LayoutDecision } from '../src/layout/select-layout.js';

it('registers all four user-facing commands', () => {
  const names = createProgram().commands.map((command) => command.name());
  expect(names).toEqual(['generate', 'extract', 'render', 'validate']);
});

it.each(['generate', 'render'])('%s distinguishes omitted layout from explicit auto', async (command) => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'neon-cli-'));
  const inputPath = path.join(outputDir, 'input.json');
  await fs.writeFile(inputPath, JSON.stringify({
    meta: { version: 1, intent: 'comparison', layoutFamily: 'dashboard', sourceMode: 'json' },
    hero: { title: 'A SMALL COMPARISON' },
    sections: [{ id: 'states', kind: 'comparison', title: 'BEFORE / AFTER', columns: [
      { label: 'BEFORE', items: ['Broken'] }, { label: 'AFTER', items: ['Restored'] },
    ] }], footer: {},
  }));
  const decisions: LayoutDecision[] = [];
  try {
    for (const flags of [[], ['--layout', 'qa'], ['--layout', 'auto']]) {
      const program = createProgram({ runGenerate: async (options) => {
        const result = await runGenerate({ ...options, outputDir });
        decisions.push(result.decision);
        return result;
      } });
      await program.parseAsync([command, '--input', inputPath, '--output', 'result', ...flags], { from: 'user' });
    }
    expect(decisions.map(({ selected }) => selected)).toEqual(['dashboard', 'qa', 'comparison']);
    expect(decisions.map(({ requested }) => requested)).toEqual(['dashboard', 'qa', 'auto']);
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true });
  }
}, 30_000);

it('requires --input for generate', async () => {
  const program = createProgram();
  program.exitOverride();
  program.configureOutput({ writeErr: () => undefined });
  for (const command of program.commands) command.configureOutput({ writeErr: () => undefined });
  await expect(
    program.parseAsync(['node', 'cli', 'generate'], { from: 'node' }),
  ).rejects.toMatchObject({ code: 'commander.missingMandatoryOptionValue' });
});

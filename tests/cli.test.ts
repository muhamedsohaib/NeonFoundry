import { expect, it } from 'vitest';
import { createProgram } from '../src/cli.js';

it('registers all four user-facing commands', () => {
  const names = createProgram().commands.map((command) => command.name());
  expect(names).toEqual(['generate', 'extract', 'render', 'validate']);
});

it('requires --input for generate', async () => {
  const program = createProgram();
  program.exitOverride();
  await expect(
    program.parseAsync(['node', 'cli', 'generate'], { from: 'node' }),
  ).rejects.toMatchObject({ code: 'commander.missingMandatoryOptionValue' });
});

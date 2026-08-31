import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

it('keeps active source on Roboto Mono and the new CLI only', () => {
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  const source = walk('src')
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  expect(source).not.toMatch(/fontFamily:\s*['"]Inter|fetchFont\(['"]Inter/);
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  expect(Object.values(pkg.scripts).join(' ')).not.toMatch(/\b(index|render|generate-from-report)\.ts\b/);
  expect(fs.existsSync('legacy/template.tsx')).toBe(true);
});

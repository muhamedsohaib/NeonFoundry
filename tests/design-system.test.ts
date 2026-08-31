import { expect, it } from 'vitest';
import { TOKENS } from '../src/design-system/tokens.js';
import { loadRobotoMonoFonts } from '../src/render/fonts.js';

it('locks the visual system to neon dark and Roboto Mono', async () => {
  expect(TOKENS.fontFamily).toBe('Roboto Mono');
  expect(TOKENS.colors.background).toMatch(/^#/);
  expect(TOKENS.colors.neon.toLowerCase()).toBe('#ccff00');
  const fonts = await loadRobotoMonoFonts();
  expect(fonts.map((f) => f.name)).toEqual(['Roboto Mono', 'Roboto Mono']);
  expect(fonts.map((f) => f.weight)).toEqual([400, 700]);
});

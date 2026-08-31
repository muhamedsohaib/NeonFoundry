import { expect, it } from 'vitest';
import { extractWithOpenAI } from '../src/extract/openai-extractor.js';

it('fails clearly before an API call when the key is missing', async () => {
  await expect(extractWithOpenAI({ mode: 'report', path: 'report.txt', text: 'Three KPIs improved.' }, { apiKey: '' }))
    .rejects.toThrow(/OPENAI_API_KEY/);
});

it('accepts an injected structured response and normalizes it', async () => {
  const parse = async () => ({ status: 'completed', output_parsed: {
    meta: { version: 1, intent: 'report', layoutFamily: 'auto', sourceMode: 'report' },
    hero: { title: 'PERFORMANCE' },
    sections: [{ id: 'm', kind: 'metric-grid', title: 'METRICS', metrics: [{ label: 'Lift', value: '18%' }] }],
    footer: { facts: [] }, sourceHints: {},
  }});
  const doc = await extractWithOpenAI({ mode: 'report', path: 'report.txt', text: 'Lift was 18%.' }, { apiKey: 'test', parse });
  expect(doc.hero.title).toBe('PERFORMANCE');
});

/// <reference types="node" />

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { adaptLegacyQa } from '../src/normalize/legacy-qa.js';

describe('legacy QA adapter', () => {
  it('maps the current QA fixture into canonical checklist and metric sections', () => {
    const legacy = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url), 'utf8'));
    const doc = adaptLegacyQa(legacy);

    expect(doc.meta.intent).toBe('checklist');
    expect(doc.hero.title).toContain('VALIDATE');
    expect(doc.sections.some((section) => section.kind === 'checklist')).toBe(true);
    expect(doc.sections.some((section) => section.kind === 'metric-grid')).toBe(true);
    expect(doc.meta.sourceMode).toBe('json');
  });
});

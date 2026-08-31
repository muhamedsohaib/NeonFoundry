import { expect, it } from 'vitest';
import { extractWithOpenAI } from '../src/extract/openai-extractor.js';

it('fails clearly before an API call when the key is missing', async () => {
  await expect(extractWithOpenAI({ mode: 'report', path: 'report.txt', text: 'Three KPIs improved.' }, { apiKey: '' }))
    .rejects.toThrow(/OPENROUTER_API_KEY/);
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

it('retries image extraction once when the first structured result is semantically incomplete', async () => {
  const bad = {
    meta: { version: 1, intent: 'comparison', layoutFamily: 'auto', sourceMode: 'image' },
    hero: { title: 'BEFORE vs AFTER CATALOG REMEDIATION' },
    sections: [{
      id: 'compare', kind: 'comparison', title: 'BEFORE vs AFTER',
      columns: [
        { label: 'BEFORE', items: ['/before remediation column'] },
        { label: 'AFTER', items: ['/after remediation column'] },
      ],
    }],
    footer: { facts: [] }, sourceHints: {},
  };
  const good = {
    ...bad,
    sections: [{
      id: 'compare', kind: 'comparison', title: 'BEFORE vs AFTER',
      columns: [
        { label: 'BEFORE', items: ['Variation suppressed', 'Broken parent-child links', 'Low catalog health'], tone: 'danger' },
        { label: 'AFTER', items: ['Variation active', 'Parent-child links restored', 'Catalog health restored'], tone: 'success' },
      ],
    }, {
      id: 'metrics', kind: 'metric-grid', title: 'RESULTS',
      metrics: [{ label: 'Issues resolved', value: '5' }, { label: 'Variations restored', value: '100%' }],
    }],
    footer: { facts: [{ label: 'Duration', value: '7-30 DAYS' }] },
  };
  const requests: Record<string, unknown>[] = [];
  const responses = [bad, good];
  const parse = async (request: Record<string, unknown>) => {
    requests.push(request);
    return { status: 'completed', output_parsed: responses[requests.length - 1] };
  };
  const doc = await extractWithOpenAI(
    { mode: 'image', path: 'bad.png', png: Buffer.from('fake'),
      dataUrl: 'data:image/png;base64,AA==' },
    { apiKey: 'test', parse },
  );

  expect(requests).toHaveLength(2);
  expect(JSON.stringify(requests[1])).toContain('fidelity');
  expect(doc.sections.some((section) => section.kind === 'metric-grid')).toBe(true);
});

it('repairs concrete comparison-shaped vision output before fidelity validation', async () => {
  const raw = {
    meta: { version: 1, intent: 'comparison', layoutFamily: 'auto', sourceMode: 'image' },
    hero: { title: 'BEFORE vs AFTER CATALOG REMEDIATION' },
    sections: [
      { id: 'compare', kind: 'comparison', title: 'BEFORE vs AFTER', columns: [
        { label: 'BEFORE', items: ['Variation suppressed', 'Broken links', 'Low catalog health'] },
        { label: 'AFTER', items: ['Variation active', 'Links restored', 'Catalog health restored'] },
      ] },
      { id: 'fields', kind: 'comparison', title: 'EXACT FIELD-LEVEL CHANGES', columns: [
        { label: 'FIELD', items: ['Color', 'Size', 'Parent-Child Link'] },
        { label: 'BEFORE', items: ['Invalid', 'One Size', 'Broken'] },
        { label: 'AFTER', items: ['Black', 'Large', 'Linked'] },
      ] },
      { id: 'process', kind: 'comparison', title: 'PROCESS FLOW', columns: [
        { label: 'LIVE', items: ['Healthy'] }, { label: 'VALIDATED', items: ['Confirmed'] },
        { label: 'CORRECTED', items: ['Fixed'] }, { label: 'DETECTED', items: ['Found'] },
      ] },
      { id: 'health', kind: 'comparison', title: 'CATALOG HEALTH IMPROVEMENT', columns: [
        { label: 'ISSUES RESOLVED', items: ['5'] }, { label: 'LISTINGS AFFECTED', items: ['12'] },
        { label: 'VARIATIONS RESTORED', items: ['100%'] }, { label: 'INTEGRITY', items: ['RESTORED'] },
      ] },
    ], footer: { facts: [] }, sourceHints: {},
  };
  let calls = 0;
  const parse = async () => { calls += 1; return { status: 'completed', output_parsed: raw }; };
  const doc = await extractWithOpenAI(
    { mode: 'image', path: 'bad.png', png: Buffer.from('fake'), dataUrl: 'data:image/png;base64,AA==' },
    { apiKey: 'test', parse },
  );
  expect(calls).toBe(1);
  expect(doc.sections.some((section) => section.kind === 'table-lite')).toBe(true);
  expect(doc.sections.some((section) => section.kind === 'process-steps')).toBe(true);
  expect(doc.sections.some((section) => section.kind === 'metric-grid')).toBe(true);
});


it('merges complementary image extraction attempts before fidelity acceptance', async () => {
  const hero = { title: 'BEFORE vs AFTER CATALOG REMEDIATION', tags: ['FIELD-LEVEL FIXES'] };
  const base = {
    meta: { version: 1, intent: 'comparison', layoutFamily: 'auto', sourceMode: 'image' }, hero,
    footer: { facts: [] },
    sourceHints: { emphasisOrder: ['exact field changes', 'process', 'catalog health', 'evidence'] },
  };
  const partialA = { ...base, sections: [
    { id: 'compare', kind: 'comparison', title: 'BEFORE vs AFTER', columns: [
      { label: 'BEFORE', items: ['Variation suppressed', 'Low catalog health'] },
      { label: 'AFTER', items: ['Variation active', 'Catalog health restored'] },
    ] },
    { id: 'fields', kind: 'comparison', title: 'EXACT FIELD-LEVEL CHANGES', columns: [
      { label: 'FIELD', items: ['Color', 'Size'] },
      { label: 'BEFORE', items: ['Invalid', 'One Size'] },
      { label: 'AFTER', items: ['Black', 'Large'] },
      { label: 'CHANGE IMPACT', items: ['Corrected', 'Fixed'] },
    ] },
  ] };
  const partialB = { ...base, sections: [
    { id: 'compare2', kind: 'comparison', title: 'BEFORE vs AFTER', columns: [
      { label: 'BEFORE', items: ['Variation suppressed', 'Low catalog health'] },
      { label: 'AFTER', items: ['Variation active', 'Catalog health restored'] },
    ] },
    { id: 'process', kind: 'process-steps', title: 'PROCESS FLOW', steps: [
      { label: 'DETECTED', description: 'Issue found' }, { label: 'CORRECTED', description: 'Field fixed' },
      { label: 'VALIDATED', description: 'Change confirmed' }, { label: 'LIVE', description: 'Listing synced' },
    ] },
    { id: 'health', kind: 'metric-grid', title: 'CATALOG HEALTH IMPROVEMENT', metrics: [
      { label: 'ISSUES RESOLVED', value: '5' }, { label: 'VARIATIONS RESTORED', value: '100%' },
    ] },
    { id: 'evidence', kind: 'bullet-list', title: 'EVIDENCE & VALIDATION', items: [
      'CHANGE LOG ? All changes logged with timestamps', 'QA CHECKS ? Automated + manual QA checks passed',
    ] },
  ] };
  const responses = [partialA, partialB];
  let calls = 0;
  const parse = async () => ({ status: 'completed', output_parsed: responses[calls++] });
  const doc = await extractWithOpenAI(
    { mode: 'image', path: 'bad.png', png: Buffer.from('fake'), dataUrl: 'data:image/png;base64,AA==' },
    { apiKey: 'test', parse },
  );
  expect(calls).toBe(2);
  expect(doc.sections.some((section) => section.kind === 'table-lite')).toBe(true);
  expect(doc.sections.some((section) => section.kind === 'process-steps')).toBe(true);
  expect(doc.sections.some((section) => section.kind === 'metric-grid')).toBe(true);
  expect(doc.sections.some((section) => section.kind === 'bullet-list' && /evidence/i.test(section.title))).toBe(true);
});

it('suppresses stale structural variants when a later attempt yields the canonical section', async () => {
  const base = { meta:{version:1,intent:'comparison',layoutFamily:'auto',sourceMode:'image'}, hero:{title:'BEFORE vs AFTER'}, footer:{facts:[]}, sourceHints:{emphasisOrder:['exact field changes','evidence validation']} };
  const first = { ...base, sections:[
    { id:'compare',kind:'comparison',title:'BEFORE vs AFTER',columns:[{label:'BEFORE',items:['Bad','Broken']},{label:'AFTER',items:['Good','Fixed']}] },
    { id:'fields',kind:'comparison',title:'EXACT FIELD-LEVEL CHANGES',columns:[{label:'BEFORE',items:['Invalid']},{label:'AFTER',items:['Correct']}] },
  ]};
  const second = { ...base, sections:[
    { id:'fields',kind:'table-lite',title:'EXACT FIELD-LEVEL CHANGES',columns:['FIELD','BEFORE','AFTER'],rows:[['Color','Invalid','Black'],['Size','One Size','Large']] },
    { id:'evidence',kind:'bullet-list',title:'EVIDENCE & VALIDATION',items:['CHANGE LOG â€” logged with timestamps','QA CHECKS â€” manual QA passed'] },
  ]};
  const responses = [first, second]; let calls = 0;
  const parse = async () => ({ status:'completed', output_parsed: responses[calls++] });
  const doc = await extractWithOpenAI({ mode:'image',path:'x.png',png:Buffer.from('x'),dataUrl:'data:image/png;base64,AA==' },{apiKey:'test',parse});
  expect(doc.sections.filter((s) => /field-level changes/i.test(s.title))).toHaveLength(1);
  expect(doc.sections.find((s) => /field-level changes/i.test(s.title))?.kind).toBe('table-lite');
});

it('accumulates complementary image structures across a third extraction attempt', async () => {
  const base = { meta:{version:1,intent:'comparison',layoutFamily:'auto',sourceMode:'image'}, hero:{title:'BEFORE vs AFTER'}, footer:{facts:[]}, sourceHints:{emphasisOrder:['before after','exact field changes','process flow','catalog health','evidence validation']} };
  const first = { ...base, sections:[
    {id:'compare',kind:'comparison',title:'BEFORE vs AFTER',columns:[{label:'BEFORE',items:['Suppressed','Broken links']},{label:'AFTER',items:['Active','Links restored']}]},
    {id:'fields',kind:'table-lite',title:'EXACT FIELD-LEVEL CHANGES',columns:['FIELD','BEFORE','AFTER'],rows:[['Color','Invalid','Black'],['Size','One','Large']]},
  ]};
  const second = { ...base, sections:[
    {id:'process',kind:'process-steps',title:'PROCESS FLOW',steps:[{label:'DETECTED'},{label:'CORRECTED'},{label:'VALIDATED'},{label:'LIVE'}]},
    {id:'health',kind:'metric-grid',title:'CATALOG HEALTH IMPROVEMENT',metrics:[{label:'ISSUES RESOLVED',value:'5'},{label:'VARIATIONS RESTORED',value:'100%'}]},
  ]};
  const third = { ...base, sections:[
    {id:'evidence',kind:'bullet-list',title:'EVIDENCE & VALIDATION',items:['CHANGE LOG â€” logged with timestamps','QA CHECKS â€” manual QA passed','SCREENSHOT PROOF â€” before and after captured']},
  ]};
  const responses = [first, second, third]; let calls = 0;
  const parse = async () => ({status:'completed',output_parsed:responses[calls++]});
  const doc = await extractWithOpenAI({mode:'image',path:'x.png',png:Buffer.from('x'),dataUrl:'data:image/png;base64,AA=='},{apiKey:'test',parse});
  expect(calls).toBe(3);
  expect(doc.sections.map((s)=>s.kind)).toEqual(expect.arrayContaining(['comparison','table-lite','process-steps','metric-grid','bullet-list']));
});


it('uses a focused rescue extraction after general image attempts remain incomplete', async () => {
  const incomplete = { meta:{version:1,intent:'comparison',layoutFamily:'auto',sourceMode:'image'}, hero:{title:'BEFORE vs AFTER'}, sections:[{id:'compare',kind:'comparison',title:'BEFORE vs AFTER',columns:[{label:'BEFORE',items:['Suppressed','Broken']},{label:'AFTER',items:['Active','Restored']}]}], footer:{facts:[]}, sourceHints:{emphasisOrder:['exact field changes','process flow','catalog health','evidence validation']} };
  const rescue = {
    hero:{eyebrow:'CASE STUDY',title:'BEFORE vs AFTER',subtitle:'PRECISE CHANGES. VERIFIABLE RESULTS.',summary:'We fix catalog issues at the exact field level.',tags:['FIELD-LEVEL FIXES']},
    beforeAfter:{before:['Variation not displaying','Low catalog health'],after:['Variation displaying','Catalog health restored']},
    fieldChanges:[{field:'Color',before:'Invalid',after:'Black',impact:'Mapping corrected'},{field:'Size',before:'One Size',after:'Large',impact:'Size mapping fixed'}],
    process:[{label:'DETECTED',description:'Issue identified'},{label:'CORRECTED',description:'Remediation applied'},{label:'VALIDATED',description:'Changes confirmed'},{label:'LIVE',description:'Listing healthy'}],
    metrics:[{label:'ISSUES RESOLVED',value:'5'},{label:'VARIATIONS RESTORED',value:'100%'},{label:'INTEGRITY RESTORED',value:''}],
    evidence:['CHANGE LOG â€” logged with timestamps','QA CHECKS â€” manual QA passed','SCREENSHOT PROOF â€” before and after captured'],
    footerFacts:[{label:'DURATION',value:'7-30 DAYS'}],disclaimer:'Independent marketplace services'
  };
  const responses = [incomplete,incomplete,incomplete,rescue]; let calls=0;
  const parse = async () => ({status:'completed',output_parsed:responses[calls++]});
  const doc = await extractWithOpenAI({mode:'image',path:'x.png',png:Buffer.from('x'),dataUrl:'data:image/png;base64,AA=='},{apiKey:'test',parse});
  expect(calls).toBe(4);
  expect(doc.sections.map((s)=>s.kind)).toEqual(expect.arrayContaining(['comparison','table-lite','process-steps','metric-grid','bullet-list']));
});


it('replaces stale field-change bullet variants with a canonical rescued table', async () => {
  const base={meta:{version:1,intent:'comparison',layoutFamily:'auto',sourceMode:'image'},hero:{title:'BEFORE vs AFTER'},footer:{facts:[]},sourceHints:{emphasisOrder:['exact field changes','evidence validation']}};
  const first={...base,sections:[
    {id:'compare',kind:'comparison',title:'BEFORE vs AFTER',columns:[{label:'BEFORE',items:['Suppressed','Broken']},{label:'AFTER',items:['Active','Restored']}]},
    {id:'bad-fields',kind:'bullet-list',title:'EXACT FIELD-LEVEL CHANGES',items:['Color: Invalid -> Black','Size: One -> Large']},
  ]};
  const second={...base,sections:[
    {id:'good-fields',kind:'table-lite',title:'EXACT FIELD-LEVEL CHANGES',columns:['FIELD','BEFORE','AFTER'],rows:[['Color','Invalid','Black'],['Size','One','Large']]},
    {id:'evidence',kind:'bullet-list',title:'EVIDENCE & VALIDATION',items:['CHANGE LOG â€” timestamps recorded','QA CHECKS â€” manual QA passed']},
  ]};
  const responses=[first,second]; let calls=0;
  const parse=async()=>({status:'completed',output_parsed:responses[calls++]});
  const doc=await extractWithOpenAI({mode:'image',path:'x.png',png:Buffer.from('x'),dataUrl:'data:image/png;base64,AA=='},{apiKey:'test',parse});
  const fields=doc.sections.filter((s)=>/field-level changes/i.test(s.title));
  expect(fields).toHaveLength(1); expect(fields[0]?.kind).toBe('table-lite');
});

it('keeps validation evidence separate from result metrics across retries', async () => {
  const base = {
    meta: { version: 1, intent: 'comparison', layoutFamily: 'auto', sourceMode: 'image' },
    hero: { title: 'BEFORE vs AFTER' },
    sections: [
      { id: 'compare', kind: 'comparison', title: 'BEFORE vs AFTER', columns: [
        { label: 'BEFORE', items: ['Suppressed', 'Broken links'] },
        { label: 'AFTER', items: ['Active', 'Links restored'] },
      ] },
      { id: 'fields', kind: 'table-lite', title: 'EXACT FIELD-LEVEL CHANGES', columns: ['FIELD','BEFORE','AFTER'], rows: [
        ['Color','Invalid','Black'], ['Size','One Size','Large'],
      ] },
      { id: 'process', kind: 'process-steps', title: 'PROCESS FLOW', steps: [
        { label: 'DETECTED' }, { label: 'CORRECTED' }, { label: 'VALIDATED' }, { label: 'LIVE' },
      ] },
      { id: 'metrics', kind: 'metric-grid', title: 'VALIDATION RESULTS', metrics: [
        { label: 'Issues resolved', value: '5' }, { label: 'Restored', value: '100%' },
      ] },
    ],
    footer: { facts: [] }, sourceHints: { emphasisOrder: ['evidence_validation'] },
  };
  const second = {
    ...base,
    sections: [...base.sections, {
      id: 'evidence', kind: 'bullet-list', title: 'VALIDATION EVIDENCE', items: [
        'CHANGE LOG â€” All changes logged with timestamps',
        'QA CHECKS â€” Automated + manual QA passed',
      ],
    }],
  };
  const responses = [base, second];
  let calls = 0;
  const parse = async () => ({ status: 'completed', output_parsed: responses[calls++] });
  const doc = await extractWithOpenAI(
    { mode: 'image', path: 'x.png', png: Buffer.from('fake'), dataUrl: 'data:image/png;base64,AA==' },
    { apiKey: 'test', parse },
  );
  expect(calls).toBe(2);
  expect(doc.sections.some((section) => section.kind === 'metric-grid' && section.title === 'VALIDATION RESULTS')).toBe(true);
  expect(doc.sections.some((section) => section.kind === 'bullet-list' && /VALIDATION/i.test(section.title))).toBe(true);
});

it('preserves distinct metric panels that share the same semantic role across retries', async () => {
  const base = {
    meta: { version: 1, intent: 'comparison', layoutFamily: 'auto', sourceMode: 'image' },
    hero: { title: 'BEFORE vs AFTER' }, footer: { facts: [] },
    sourceHints: { emphasisOrder: ['evidence validation'] },
  };
  const first = { ...base, sections: [
    { id: 'compare', kind: 'comparison', title: 'BEFORE vs AFTER', columns: [
      { label: 'BEFORE', items: ['Suppressed', 'Broken links'] },
      { label: 'AFTER', items: ['Active', 'Links restored'] },
    ] },
    { id: 'health', kind: 'metric-grid', title: 'CATALOG HEALTH IMPROVEMENT', metrics: [
      { label: 'Issues resolved', value: '5' }, { label: 'Restored', value: '100%' },
    ] },
  ] };
  const second = { ...base, sections: [...first.sections, {
    id: 'validation-metrics', kind: 'metric-grid', title: 'VALIDATION RESULTS', metrics: [
      { label: 'Checks passed', value: '12' }, { label: 'Screenshots', value: '5' },
    ],
  }, {
    id: 'evidence', kind: 'bullet-list', title: 'EVIDENCE & VALIDATION', items: [
      'CHANGE LOG — timestamps recorded', 'QA CHECKS — manual QA passed',
    ],
  }] };
  const responses = [first, second]; let calls = 0;
  const parse = async () => ({ status: 'completed', output_parsed: responses[calls++] });
  const doc = await extractWithOpenAI(
    { mode: 'image', path: 'x.png', png: Buffer.from('x'), dataUrl: 'data:image/png;base64,AA==' },
    { apiKey: 'test', parse },
  );
  expect(calls).toBe(2);
  expect(doc.sections.filter((section) => section.kind === 'metric-grid').map((section) => section.title))
    .toEqual(expect.arrayContaining(['CATALOG HEALTH IMPROVEMENT', 'VALIDATION RESULTS']));
});

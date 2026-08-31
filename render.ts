// render.ts
import fs from 'fs/promises';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { QAValidationPoster } from './template.js';
import { QAValidationPosterData } from './types.js';

async function fetchGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&display=swap`;
  const css = await (await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  })).text();

  const fontUrlMatch = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!fontUrlMatch) {
    throw new Error(`Failed to load ${family} @ ${weight}`);
  }

  const res = await fetch(fontUrlMatch[1]);
  return await res.arrayBuffer();
}

async function run() {
  console.log('Loading QA dataset from data.json...');
  const rawData = await fs.readFile('./data.json', 'utf-8');
  const payload: QAValidationPosterData = JSON.parse(rawData);

  console.log('Fetching Roboto Mono fonts...');
  const [robotoMonoRegular, robotoMonoBold] = await Promise.all([
    fetchGoogleFont('Roboto Mono', 400),
    fetchGoogleFont('Roboto Mono', 700),
  ]);

  console.log('Compiling JSX into pure vector SVG (1600x1120)...');
  const svg = await satori(QAValidationPoster({ data: payload }), {
    width: 1600,
    height: 1120,
    fonts: [
      { name: 'Roboto Mono', data: robotoMonoRegular, weight: 400, style: 'normal' },
      { name: 'Roboto Mono', data: robotoMonoBold, weight: 700, style: 'normal' },
    ],
  });

  await fs.writeFile('qa-infographic.svg', svg);
  console.log(' Saved: qa-infographic.svg');

  console.log('Rasterizing 3200px lossless PNG...');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 3200 },
  });
  const png = resvg.render().asPng();
  await fs.writeFile('qa-infographic.png', png);
  console.log(' Saved: qa-infographic.png');
}

run().catch(console.error);
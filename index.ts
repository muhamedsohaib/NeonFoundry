// index.ts
import fs from 'fs/promises';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { InfographicCard } from './template.js';
import { InfographicPayload } from './types.js';

// Downloads TTF binary buffers directly from Google Fonts at runtime
async function getFontBuffer(family: string, weight: number): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`;
  const cssResponse = await fetch(cssUrl);
  const cssText = await cssResponse.text();

  const fontUrlMatch = cssText.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!fontUrlMatch) {
    throw new Error(`Unable to resolve TTF font binary for ${family} @ weight ${weight}`);
  }

  const binaryResponse = await fetch(fontUrlMatch[1]);
  return await binaryResponse.arrayBuffer();
}

async function renderInfographic(payload: InfographicPayload, filename: string) {
  console.log('Fetching vector font glyphs...');
  const [fontRegular, fontBold] = await Promise.all([
    getFontBuffer('Inter', 400),
    getFontBuffer('Inter', 800),
  ]);

  console.log('Compiling JSX structure into pure SVG geometry...');
  const svgString = await satori(InfographicCard({ data: payload }), {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'Inter', data: fontBold, weight: 800, style: 'normal' },
    ],
  });

  // 1. Output the raw vector SVG
  await fs.writeFile(`${filename}.svg`, svgString, 'utf-8');
  console.log(`✓ Vector SVG saved to ${filename}.svg`);

  // 2. Convert the SVG to a 2400px ultra-crisp PNG using Resvg
  const resvgInstance = new Resvg(svgString, {
    fitTo: { mode: 'width', value: 2400 },
  });
  const pngBuffer = resvgInstance.render().asPng();
  await fs.writeFile(`${filename}.png`, pngBuffer);
  console.log(`✓ High-resolution PNG saved to ${filename}.png`);
}

// Sample JSON payload matching the contract
const mockAiResponse: InfographicPayload = {
  badge: 'Infrastructure Pulse',
  title: 'Edge Cluster Throughput',
  subtitle: 'Real-time telemetry across distributed edge workers.',
  metrics: [
    { label: 'Ingest Rate', value: '1.4M/s', change: '+18%', trend: 'up', progress: 88 },
    { label: 'P99 Latency', value: '42ms', change: '-24%', trend: 'up', progress: 95 },
    { label: 'Uptime SLA', value: '99.98%', change: '+0.02%', trend: 'up', progress: 100 },
  ],
  footerNote: 'Source: Production Edge Telemetry',
};

renderInfographic(mockAiResponse, 'telemetry-report');
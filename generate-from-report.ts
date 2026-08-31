import 'dotenv/config';
import fs from 'fs/promises';
import OpenAI from 'openai';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { InfographicPoster } from './template.js';
import { AmazonCaseStudyData } from './types.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchFont(family: string, weight: number): Promise<ArrayBuffer> {
  const url = `[https://fonts.googleapis.com/css2?family=$](https://fonts.googleapis.com/css2?family=$){family}:wght@${weight}&display=swap`;
  const css = await (await fetch(url)).text();
  const fontUrl = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)![1];
  return await (await fetch(fontUrl)).arrayBuffer();
}

async function extractStructuredData(rawReportText: string): Promise<AmazonCaseStudyData> {
  console.log('Extracting structured schema via LLM...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // or 'gpt-4o'
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an automated infographic compiler. Extract the input text into the exact JSON schema required for a 6-step diagnostic case study poster. Respect character limits strictly.`,
      },
      {
        role: 'user',
        content: rawReportText,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content!) as AmazonCaseStudyData;
}

async function runPipeline(rawReport: string, outputBaseName = 'output') {
  // 1. LLM extracts JSON adhering to the layout bounds
  const data = await extractStructuredData(rawReport);

  // 2. Load vector font glyphs
  console.log('Fetching vector typography...');
  const [interReg, interBold, interBlack] = await Promise.all([
    fetchFont('Inter', 400),
    fetchFont('Inter', 700),
    fetchFont('Inter', 900),
  ]);

  // 3. Satori compiles JSON into mathematical vector SVG
  console.log('Rendering SVG...');
  const svg = await satori(InfographicPoster({ data }), {
    width: 1400,
    height: 1050,
    fonts: [
      { name: 'Inter', data: interReg, weight: 400, style: 'normal' },
      { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
      { name: 'Inter', data: interBlack, weight: 900, style: 'normal' },
    ],
  });

  // 4. Save lossless SVG & high-res PNG
  await fs.writeFile(`${outputBaseName}.svg`, svg);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 2800 } });
  await fs.writeFile(`${outputBaseName}.png`, resvg.render().asPng());

  console.log(` Done: ${outputBaseName}.svg & ${outputBaseName}.png created.`);
}

// Example usage: Pass any raw diagnostic or audit log
const sampleInputReport = `
We performed an audit on Seller Central for Brand X. Found 45 disconnected variation themes,
affecting 340 active listings (25 parents, 315 children). Diagnostic coverage reached 92%.
Root cause was an incorrect apparel size_name mapping causing Amazon suppressed buy boxes.
We resolved it via feed templates and validated within 14 days. All variations are live now.
`;

runPipeline(sampleInputReport, 'brand-x-audit');
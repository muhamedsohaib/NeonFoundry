import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { Command, Option } from 'commander';
import kleur from 'kleur';

import { selectLayout } from './layout/select-layout.js';
import { resolveCanonicalInput, runGenerate } from './pipeline/run.js';
import { resolveArtifactPaths, sanitizeOutputName } from './pipeline/write-artifacts.js';
import { deriveRenderProfile, runQualityChecks } from './qa/quality.js';
import type { LayoutFamily, SourceMode } from './schema/canonical.js';

export interface CliDependencies {
  runGenerate: typeof runGenerate;
  resolveCanonicalInput: typeof resolveCanonicalInput;
}

const MODES = ['image', 'report', 'json'] as const;
const LAYOUTS = ['auto', 'qa', 'dashboard', 'process', 'comparison', 'timeline'] as const;

function defaultOutputName(inputPath: string, explicit?: string): string {
  return explicit ? sanitizeOutputName(explicit) : sanitizeOutputName(path.parse(inputPath).name || 'infographic');
}

function printPaths(paths: { json?: string; svg?: string; png?: string; debug?: string }): void {
  for (const [label, value] of Object.entries(paths)) {
    if (value) console.log(`${label}: ${value}`);
  }
}
function addModeOption(command: Command): Command {
  return command.addOption(new Option('--mode <mode>', 'Input mode override').choices([...MODES]));
}

function addLayoutOption(command: Command): Command {
  return command.addOption(new Option('--layout <layout>', 'Override canonical layout; auto explicitly infers from content').choices([...LAYOUTS]));
}

export function createProgram(deps: Partial<CliDependencies> = {}): Command {
  const active: CliDependencies = {
    runGenerate: deps.runGenerate ?? runGenerate,
    resolveCanonicalInput: deps.resolveCanonicalInput ?? resolveCanonicalInput,
  };
  const program = new Command()
    .name('satori-infographics')
    .description('Deterministically rebuild AI-generated infographics into clean neon/dark-grey layouts.');

  addLayoutOption(addModeOption(program.command('generate')
    .description('Extract, normalize, lay out, render, and export an infographic.')
    .requiredOption('--input <path>', 'Source image, report, or JSON file')
    .option('--output <name>', 'Output base name')
    .option('--debug', 'Write debug diagnostics')))
    .action(async (options) => {
      const result = await active.runGenerate({
        inputPath: options.input,
        outputName: defaultOutputName(options.input, options.output),
        mode: options.mode as SourceMode | undefined,
        layout: options.layout as LayoutFamily | undefined,
        debug: Boolean(options.debug),
      });
      console.log(kleur.green('Generated infographic'));
      printPaths(result.paths);
    });
  addModeOption(program.command('extract')
    .description('Extract source semantics and write canonical JSON only.')
    .requiredOption('--input <path>', 'Source image, report, or JSON file')
    .option('--output <name>', 'Output base name'))
    .action(async (options) => {
      const data = await active.resolveCanonicalInput(
        options.input,
        options.mode as SourceMode | undefined,
      );
      const target = resolveArtifactPaths(defaultOutputName(options.input, options.output)).json;
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      console.log(kleur.green('Extracted canonical data'));
      console.log(`json: ${target}`);
    });

  addLayoutOption(program.command('render')
    .description('Render canonical or supported legacy JSON without OpenAI.')
    .requiredOption('--input <path>', 'JSON source file')
    .option('--output <name>', 'Output base name')
    .option('--debug', 'Write debug diagnostics'))
    .action(async (options) => {
      if (path.extname(options.input).toLowerCase() !== '.json') {
        throw new Error('render accepts JSON input only. Use generate for image or report sources.');
      }
      const result = await active.runGenerate({
        inputPath: options.input,
        outputName: defaultOutputName(options.input, options.output),
        mode: 'json',
        layout: options.layout as LayoutFamily | undefined,
        debug: Boolean(options.debug),
      });
      console.log(kleur.green('Rendered infographic'));
      printPaths(result.paths);
    });
  addLayoutOption(addModeOption(program.command('validate')
    .description('Validate source semantics and print layout/quality diagnostics.')
    .requiredOption('--input <path>', 'Source image, report, or JSON file')
    .option('--output <name>', 'Optional debug output base name')
    .option('--debug', 'Include diagnostic output')))
    .action(async (options) => {
      const data = await active.resolveCanonicalInput(
        options.input,
        options.mode as SourceMode | undefined,
      );
      const decision = selectLayout(data, options.layout as LayoutFamily | undefined);
      const quality = runQualityChecks(data);
      const profile = deriveRenderProfile(quality);
      const report = { layoutDecision: decision, quality, renderProfile: profile };
      console.log(kleur.cyan('Validation'));
      console.log(JSON.stringify(report, null, 2));

      if (options.output) {
        const target = resolveArtifactPaths(defaultOutputName(options.input, options.output), 'output', true).debug!;
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        console.log(`debug: ${target}`);
      }
    });

  const rootExitOverride = program.exitOverride.bind(program);
  program.exitOverride = ((callback?: Parameters<Command['exitOverride']>[0]) => {
    rootExitOverride(callback);
    for (const command of program.commands) command.exitOverride(callback);
    return program;
  }) as Command['exitOverride'];
  return program;
}

export async function main(argv: string[] = process.argv): Promise<void> {
  await createProgram().parseAsync(argv, { from: 'node' });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(kleur.red(message));
    process.exitCode = 1;
  });
}




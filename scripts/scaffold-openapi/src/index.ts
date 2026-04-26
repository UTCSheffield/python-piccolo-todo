#!/usr/bin/env node

import fs from 'fs';
import { parseOpenAPI } from './parser.js';
import { generateApp } from './generator.js';

function parseArgs(args: string[]): {
  command?: string;
  apiUrl?: string;
  outputDir?: string;
  appName?: string;
} {
  const result: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        result[key] = args[++i];
      }
    }
  }

  const positionalArgs = args.filter(a => !a.startsWith('-'));

  return {
    command: positionalArgs[0],
    apiUrl: positionalArgs[1] || result['api-url'],
    outputDir: positionalArgs[2] || result['output-dir'] || result['output'],
    appName: result['app-name'] || 'generated-app',
  };
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (!parsed.command || !parsed.apiUrl || !parsed.outputDir) {
    console.log(`
OpenAPI React App Scaffold Generator

Usage:
  node dist/index.js create <apiUrl> <outputDir> [options]

Arguments:
  create       Generate a new React app from an OpenAPI 3.1 schema
  <apiUrl>     URL to the OpenAPI JSON schema (e.g., http://localhost:8000/openapi.json)
  <outputDir>  Directory to generate the app into

Options:
  --app-name NAME  Name of the generated app (default: generated-app)

Example:
  node dist/index.js create http://localhost:8000/openapi.json ./my-app --app-name MyApp
    `);
    process.exit(1);
  }

  try {
    console.log(`📦 Fetching OpenAPI schema from ${parsed.apiUrl}...`);
    const schema = await parseOpenAPI(parsed.apiUrl);

    console.log(`✅ Schema fetched. Found ${schema.endpoints.length} endpoints.`);
    console.log(`📝 Generating app in ${parsed.outputDir}...`);

    if (!fs.existsSync(parsed.outputDir)) {
      fs.mkdirSync(parsed.outputDir, { recursive: true });
    }

    await generateApp(schema, parsed.outputDir, parsed.appName || 'generated-app', parsed.apiUrl);

    console.log(`
✨ App generated successfully!

Next steps:
  cd ${parsed.outputDir}
  npm install
  npm run dev
    `);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

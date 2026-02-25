#!/usr/bin/env node

import { runCli } from './index';

async function main(): Promise<void> {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}

void main();

#!/usr/bin/env node

import { runMcp } from './index';

async function main(): Promise<void> {
  const exitCode = await runMcp(process.argv.slice(2));
  process.exitCode = exitCode;
}

void main();

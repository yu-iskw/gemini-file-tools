import { Command, CommanderError } from 'commander';
import type { Readable, Writable } from 'node:stream';

import {
  GeminiFilesValidationError,
  createGeminiFilesClient,
  resolveSafetyMode,
  type GeminiFilesClient,
  type SafetyMode,
} from '@typescript-template/common';

import { createMcpServer } from './server';
import { runStdioServer } from './stdio';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

interface McpIo {
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
}

const DEFAULT_IO: McpIo = {
  stdout: { write: (chunk: string) => process.stdout.write(chunk) },
  stderr: { write: (chunk: string) => process.stderr.write(chunk) },
};

interface RuntimeDependencies {
  env: NodeJS.ProcessEnv;
  stdin: Readable;
  stdout: Writable;
  createClient: (config: {
    apiKey: string;
    baseUrl?: string;
    timeoutMs?: number;
    userAgent?: string;
  }) => GeminiFilesClient;
  createServer: typeof createMcpServer;
  runStdio: typeof runStdioServer;
}

const DEFAULT_DEPS: RuntimeDependencies = {
  env: process.env,
  stdin: process.stdin,
  stdout: process.stdout,
  createClient: createGeminiFilesClient,
  createServer: createMcpServer,
  runStdio: runStdioServer,
};

interface StartupOptions {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  safetyMode?: SafetyMode;
}

function renderError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return `Unknown error: ${String(error)}`;
}

function normalizeCommanderMessage(message: string): string {
  return message.replace(/^error:\s*/u, '');
}

function parsePositiveNumber(value: string): number {
  const timeoutMs = Number(value);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new GeminiFilesValidationError('timeout-ms must be a positive number');
  }
  return timeoutMs;
}

function resolveApiKey(options: StartupOptions, env: NodeJS.ProcessEnv): string {
  const apiKey = options.apiKey ?? env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new GeminiFilesValidationError(
      'Missing API key. Set GEMINI_API_KEY, GOOGLE_API_KEY, or pass --api-key.',
    );
  }
  return apiKey;
}

function resolveTimeoutMs(options: StartupOptions, env: NodeJS.ProcessEnv): number | undefined {
  if (options.timeoutMs !== undefined) {
    return options.timeoutMs;
  }

  const rawTimeout = env.GEMINI_TIMEOUT_MS;
  if (rawTimeout === undefined) {
    return undefined;
  }

  const timeoutMs = Number(rawTimeout);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new GeminiFilesValidationError('GEMINI_TIMEOUT_MS must be a positive number');
  }
  return timeoutMs;
}

interface ResolvedStartupConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs?: number;
  safetyMode: SafetyMode;
}

function resolveStartupConfig(
  options: StartupOptions,
  env: NodeJS.ProcessEnv,
): ResolvedStartupConfig {
  return {
    apiKey: resolveApiKey(options, env),
    baseUrl: options.baseUrl ?? env.GEMINI_BASE_URL ?? DEFAULT_BASE_URL,
    timeoutMs: resolveTimeoutMs(options, env),
    safetyMode: resolveSafetyMode({
      cliFlag: options.safetyMode,
      env: env.GEMINI_FILES_SAFETY_MODE,
      defaultMode: 'read-only',
    }),
  };
}

async function startServer(
  config: ResolvedStartupConfig,
  deps: RuntimeDependencies,
): Promise<void> {
  const client = deps.createClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    userAgent: '@gemini-file-tools/gemini-files-mcp',
  });

  const server = deps.createServer({ client, safetyMode: config.safetyMode });
  await deps.runStdio(deps.stdin, deps.stdout, server.handleRequest);
}

function createProgram(io: McpIo): Command {
  const program = new Command();
  program
    .name('gemini-files-mcp')
    .description('MCP stdio server for Gemini Files')
    .allowExcessArguments(false)
    .option('--api-key <key>')
    .option('--base-url <url>')
    .option('--timeout-ms <ms>', 'Request timeout in milliseconds', parsePositiveNumber)
    .option('--safety-mode <mode>');

  program.configureOutput({
    writeOut: (str) => io.stdout.write(str),
    writeErr: (str) => io.stderr.write(str),
    outputError: () => undefined,
  });
  program.exitOverride();

  return program;
}

export async function runMcp(
  argv: string[] = process.argv.slice(2),
  io: McpIo = DEFAULT_IO,
  deps: RuntimeDependencies = DEFAULT_DEPS,
): Promise<number> {
  try {
    const program = createProgram(io);
    await program.parseAsync(argv, { from: 'user' });

    const options = program.opts<StartupOptions>();
    const config = resolveStartupConfig(options, deps.env);
    await startServer(config, deps);

    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === 'commander.helpDisplayed') {
        return 0;
      }

      io.stderr.write(`${normalizeCommanderMessage(error.message)}\n`);
      return 2;
    }

    io.stderr.write(`${renderError(error)}\n`);
    if (error instanceof GeminiFilesValidationError) {
      return 2;
    }
    return 1;
  }
}

export async function startMcpServer(): Promise<void> {
  const config = resolveStartupConfig({}, DEFAULT_DEPS.env);
  await startServer(config, DEFAULT_DEPS);
}

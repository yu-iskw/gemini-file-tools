import { Command, CommanderError } from 'commander';

import {
  GeminiFilesError,
  GeminiFilesValidationError,
  resolveSafetyMode,
  type SafetyMode,
} from '@typescript-template/common';

import { handleDelete, handleDownload, handleGet, handleList, handleUpload } from './commands';
import { createClientFromOptions } from './client';
import type { CliDependencies, CliIo, CliOptions } from './types';

const DEFAULT_IO: CliIo = {
  stdout: { write: (chunk: string) => process.stdout.write(chunk) },
  stderr: { write: (chunk: string) => process.stderr.write(chunk) },
};

const DEFAULT_DEPS: CliDependencies = {
  createClient: createClientFromOptions,
};

function usage(): string {
  return [
    'Usage:',
    '  gemini-files [--api-key <key>] [--base-url <url>] [--timeout-ms <ms>] [--safety-mode <mode>] [--json] files <action> ...',
    'Safety Modes:',
    '  read-only (default), balanced, unsafe',
    'Actions:',
    '  files upload <path> [--display-name <name>] [--mime-type <mime>] [--force]',
    '  files list [--page-size <n>] [--page-token <token>]',
    '  files get <name>',
    '  files delete <name> --force',
    '  files download <name> --output <path> [--force]',
  ].join('\n');
}

function mapExitCode(error: unknown): number {
  if (error instanceof GeminiFilesValidationError) {
    return 2;
  }

  if (error instanceof GeminiFilesError) {
    if (error.code === 'AUTH_ERROR') {
      return 3;
    }

    if (error.code === 'API_ERROR') {
      return 4;
    }

    if (error.code === 'NETWORK_ERROR') {
      return 5;
    }
  }

  return 1;
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

function parsePositiveNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new GeminiFilesValidationError('timeout must be a positive number');
  }
  return parsed;
}

function parsePageSize(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new GeminiFilesValidationError('page-size must be a positive number');
  }
  return parsed;
}

interface CliGlobalOptions {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  json?: boolean;
  safetyMode?: SafetyMode;
}

function normalizeCommanderMessage(message: string): string {
  return message.replace(/^error:\s*/u, '');
}

function hasCommanderErrorCode(error: unknown): error is { code: string; message: string } {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const candidate = error as { code?: unknown; message?: unknown };
  return typeof candidate.code === 'string' && candidate.code.startsWith('commander.');
}

export async function runCli(
  argv: string[],
  io: CliIo = DEFAULT_IO,
  deps: CliDependencies = DEFAULT_DEPS,
): Promise<number> {
  try {
    if (argv.length === 0 || argv.includes('--help')) {
      io.stdout.write(`${usage()}\n`);
      return 0;
    }

    const program = new Command();
    program
      .name('gemini-files')
      .allowExcessArguments(false)
      .option('--api-key <key>')
      .option('--base-url <url>')
      .option('--timeout-ms <ms>', 'Request timeout in milliseconds', parsePositiveNumber)
      .option('--safety-mode <mode>')
      .option('--json');

    const filesCommand = program.command('files').description('Manage Gemini Files');

    const runWithContext = async (
      runner: (context: {
        options: CliOptions;
        safetyMode: SafetyMode;
        json: boolean;
      }) => Promise<void>,
    ): Promise<void> => {
      const rawOptions = program.opts<CliGlobalOptions>();
      const options: CliOptions = {
        apiKey: rawOptions.apiKey,
        baseUrl: rawOptions.baseUrl,
        timeoutMs: rawOptions.timeoutMs,
        json: rawOptions.json,
        safetyMode: rawOptions.safetyMode,
      };

      const safetyMode = resolveSafetyMode({
        cliFlag: options.safetyMode,
        env: process.env.GEMINI_FILES_SAFETY_MODE,
        defaultMode: 'read-only',
      });

      await runner({
        options,
        safetyMode,
        json: Boolean(options.json),
      });
    };

    filesCommand
      .command('upload <path>')
      .option('--display-name <name>')
      .option('--mime-type <mime>')
      .option('--force')
      .action(
        async (
          path: string,
          options: { displayName?: string; mimeType?: string; force?: boolean },
        ) => {
          await runWithContext(async ({ options: cliOptions, safetyMode, json }) => {
            const client = deps.createClient(cliOptions);
            await handleUpload(client, io, json, safetyMode, path, options);
          });
        },
      );

    filesCommand
      .command('list')
      .option('--page-size <n>', 'Number of files to return', parsePageSize)
      .option('--page-token <token>')
      .action(async (options: { pageSize?: number; pageToken?: string }) => {
        await runWithContext(async ({ options: cliOptions, json }) => {
          const client = deps.createClient(cliOptions);
          await handleList(client, io, json, options);
        });
      });

    filesCommand.command('get <name>').action(async (name: string) => {
      await runWithContext(async ({ options: cliOptions, json }) => {
        const client = deps.createClient(cliOptions);
        await handleGet(client, io, json, name);
      });
    });

    filesCommand
      .command('delete <name>')
      .option('--force')
      .action(async (name: string, options: { force?: boolean }) => {
        await runWithContext(async ({ options: cliOptions, safetyMode, json }) => {
          const client = deps.createClient(cliOptions);
          await handleDelete(client, io, json, safetyMode, name, Boolean(options.force));
        });
      });

    filesCommand
      .command('download <name>')
      .option('--output <path>')
      .option('--force')
      .action(async (name: string, options: { output?: string; force?: boolean }) => {
        await runWithContext(async ({ options: cliOptions, safetyMode, json }) => {
          const client = deps.createClient(cliOptions);
          await handleDownload(client, io, json, safetyMode, name, {
            output: options.output ?? '',
            force: options.force,
          });
        });
      });

    filesCommand.action(() => {
      throw new GeminiFilesValidationError(
        'Unknown files action. Expected upload|list|get|delete|download',
      );
    });

    program.configureOutput({
      writeOut: (str) => io.stdout.write(str),
      writeErr: (str) => io.stderr.write(str),
      outputError: () => undefined,
    });
    program.exitOverride();

    await program.parseAsync(argv, { from: 'user' });
    return 0;
  } catch (error) {
    if (error instanceof CommanderError || hasCommanderErrorCode(error)) {
      const commanderCode = error.code;
      if (commanderCode === 'commander.helpDisplayed') {
        return 0;
      }

      io.stderr.write(`${normalizeCommanderMessage(error.message)}\n`);
      io.stderr.write(`${usage()}\n`);
      return 2;
    }

    if (error instanceof GeminiFilesValidationError && error.message.length > 0) {
      io.stderr.write(`${error.message}\n`);
      io.stderr.write(`${usage()}\n`);
      return mapExitCode(error);
    }

    io.stderr.write(`${renderError(error)}\n`);
    if (error instanceof GeminiFilesValidationError) {
      io.stderr.write(`${usage()}\n`);
    }
    return mapExitCode(error);
  }
}

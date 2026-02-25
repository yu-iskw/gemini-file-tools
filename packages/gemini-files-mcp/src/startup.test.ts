import { describe, expect, it, vi } from 'vitest';

import { runMcp } from './index';

function makeIo() {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    io: {
      stdout: { write: (chunk: string) => stdout.push(chunk) },
      stderr: { write: (chunk: string) => stderr.push(chunk) },
    },
    stdout,
    stderr,
  };
}

function makeDeps(env: NodeJS.ProcessEnv = {}) {
  const createClient = vi.fn(() => ({}) as any);
  const handleRequest = vi.fn(async () => undefined);
  const createServer = vi.fn(() => ({ handleRequest }));
  const runStdio = vi.fn(async () => undefined);

  return {
    deps: {
      env,
      stdin: process.stdin,
      stdout: process.stdout,
      createClient,
      createServer,
      runStdio,
    },
    createClient,
    createServer,
    runStdio,
  };
}

describe('mcp startup', () => {
  it('prints help and exits successfully without starting server', async () => {
    const { io, stdout, stderr } = makeIo();
    const { deps, createClient, runStdio } = makeDeps({});

    const code = await runMcp(['--help'], io, deps as any);

    expect(code).toBe(0);
    expect(stdout.join('')).toContain('Usage:');
    expect(stderr).toHaveLength(0);
    expect(createClient).not.toHaveBeenCalled();
    expect(runStdio).not.toHaveBeenCalled();
  });

  it('fails validation for invalid --timeout-ms', async () => {
    const { io, stderr } = makeIo();
    const { deps, runStdio } = makeDeps({ GEMINI_API_KEY: 'env-key' });

    const code = await runMcp(['--timeout-ms', '0'], io, deps as any);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain('timeout-ms must be a positive number');
    expect(runStdio).not.toHaveBeenCalled();
  });

  it('uses flags over env for startup configuration', async () => {
    const { io } = makeIo();
    const { deps, createClient, createServer, runStdio } = makeDeps({
      GEMINI_API_KEY: 'env-gemini',
      GOOGLE_API_KEY: 'env-google',
      GEMINI_BASE_URL: 'https://env.example.com',
      GEMINI_TIMEOUT_MS: '50',
      GEMINI_FILES_SAFETY_MODE: 'read-only',
    });

    const code = await runMcp(
      [
        '--api-key',
        'flag-key',
        '--base-url',
        'https://flag.example.com',
        '--timeout-ms',
        '150',
        '--safety-mode',
        'balanced',
      ],
      io,
      deps as any,
    );

    expect(code).toBe(0);
    expect(createClient).toHaveBeenCalledWith({
      apiKey: 'flag-key',
      baseUrl: 'https://flag.example.com',
      timeoutMs: 150,
      userAgent: '@gemini-file-tools/gemini-files-mcp',
    });
    expect(createServer).toHaveBeenCalledWith(
      expect.objectContaining({
        safetyMode: 'balanced',
      }),
    );
    expect(runStdio).toHaveBeenCalledTimes(1);
  });

  it('falls back to GEMINI_API_KEY when no flag is provided', async () => {
    const { io } = makeIo();
    const { deps, createClient } = makeDeps({ GEMINI_API_KEY: 'gemini-key' });

    const code = await runMcp([], io, deps as any);

    expect(code).toBe(0);
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'gemini-key',
      }),
    );
  });

  it('falls back to GOOGLE_API_KEY when GEMINI_API_KEY is missing', async () => {
    const { io } = makeIo();
    const { deps, createClient } = makeDeps({ GOOGLE_API_KEY: 'google-key' });

    const code = await runMcp([], io, deps as any);

    expect(code).toBe(0);
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'google-key',
      }),
    );
  });

  it('fails when no API key source exists', async () => {
    const { io, stderr } = makeIo();
    const { deps, runStdio } = makeDeps({});

    const code = await runMcp([], io, deps as any);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain('Missing API key');
    expect(runStdio).not.toHaveBeenCalled();
  });

  it('fails validation for invalid GEMINI_TIMEOUT_MS in env', async () => {
    const { io, stderr } = makeIo();
    const { deps, runStdio } = makeDeps({
      GEMINI_API_KEY: 'env-key',
      GEMINI_TIMEOUT_MS: '-1',
    });

    const code = await runMcp([], io, deps as any);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain('GEMINI_TIMEOUT_MS must be a positive number');
    expect(runStdio).not.toHaveBeenCalled();
  });
});

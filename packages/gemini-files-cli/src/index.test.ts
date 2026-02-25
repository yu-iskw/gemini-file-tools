import { describe, expect, it } from 'vitest';

import { GeminiFilesError } from '@typescript-template/common';

import { runCli } from './index';

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

function unimplementedClient() {
  return {
    uploadFile: () => {
      throw new Error('not implemented');
    },
    getFile: () => {
      throw new Error('not implemented');
    },
    listFiles: () => {
      throw new Error('not implemented');
    },
    deleteFile: () => {
      throw new Error('not implemented');
    },
    downloadFile: () => {
      throw new Error('not implemented');
    },
  };
}

describe('gemini-files-cli', () => {
  it('prints usage with --help', async () => {
    const { io, stdout, stderr } = makeIo();

    const code = await runCli(['--help'], io);

    expect(code).toBe(0);
    expect(stderr).toHaveLength(0);
    expect(stdout.join('')).toContain('Usage:');
    expect(stdout.join('')).toContain('files upload <path>');
  });

  it('returns validation code for unknown options', async () => {
    const { io, stderr } = makeIo();

    const code = await runCli(['--wat'], io);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain("unknown option '--wat'");
  });

  it('prints list output as json', async () => {
    const { io, stdout, stderr } = makeIo();
    const createClient = () => ({
      ...unimplementedClient(),
      listFiles: async () => ({ files: [{ name: 'files/1' }], nextPageToken: 'n' }),
    });

    const code = await runCli(['--json', 'files', 'list'], io, { createClient });

    expect(code).toBe(0);
    expect(stderr).toHaveLength(0);
    expect(stdout.join('')).toContain('files/1');
    expect(stdout.join('')).toContain('nextPageToken');
  });

  it('enforces read-only safety mode by default for writes', async () => {
    const { io } = makeIo();
    const createClient = () => ({
      ...unimplementedClient(),
      uploadFile: async () => ({ name: 'files/1' }),
      listFiles: async () => ({ files: [] }),
    });

    const code = await runCli(['files', 'upload', 'a.txt'], io, { createClient });
    expect(code).toBe(2);
  });

  it('requires --force in balanced mode for writes', async () => {
    const { io } = makeIo();
    const createClient = () => ({
      ...unimplementedClient(),
      uploadFile: async () => ({ name: 'files/1' }),
      listFiles: async () => ({ files: [] }),
    });

    const code = await runCli(['--safety-mode', 'balanced', 'files', 'upload', 'a.txt'], io, {
      createClient,
    });
    expect(code).toBe(2);
  });

  it('requires --force for delete', async () => {
    const { io } = makeIo();
    const createClient = () => ({
      ...unimplementedClient(),
      deleteFile: async () => undefined,
    });

    const code = await runCli(['--safety-mode', 'unsafe', 'files', 'delete', 'files/1'], io, {
      createClient,
    });

    expect(code).toBe(2);
  });

  it('requires --output for download', async () => {
    const { io } = makeIo();
    const createClient = () => ({
      ...unimplementedClient(),
      downloadFile: async () => Buffer.from('x'),
    });

    const code = await runCli(['--safety-mode', 'unsafe', 'files', 'download', 'files/1'], io, {
      createClient,
    });

    expect(code).toBe(2);
  });

  it('maps auth/api/network errors to expected exit codes', async () => {
    const authIo = makeIo();
    const apiIo = makeIo();
    const netIo = makeIo();

    const authCode = await runCli(['files', 'list'], authIo.io, {
      createClient: () => ({
        ...unimplementedClient(),
        listFiles: () => {
          throw new GeminiFilesError({
            code: 'AUTH_ERROR',
            message: 'denied',
            retryable: false,
            status: 403,
          });
        },
      }),
    });

    const apiCode = await runCli(['files', 'list'], apiIo.io, {
      createClient: () => ({
        ...unimplementedClient(),
        listFiles: () => {
          throw new GeminiFilesError({
            code: 'API_ERROR',
            message: 'bad request',
            retryable: false,
            status: 400,
          });
        },
      }),
    });

    const netCode = await runCli(['files', 'list'], netIo.io, {
      createClient: () => ({
        ...unimplementedClient(),
        listFiles: () => {
          throw new GeminiFilesError({
            code: 'NETWORK_ERROR',
            message: 'network',
            retryable: true,
          });
        },
      }),
    });

    expect(authCode).toBe(3);
    expect(apiCode).toBe(4);
    expect(netCode).toBe(5);
  });
});

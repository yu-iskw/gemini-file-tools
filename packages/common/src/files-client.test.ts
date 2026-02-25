import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  listMock: vi.fn(),
  getMock: vi.fn(),
  deleteMock: vi.fn(),
  downloadMock: vi.fn(),
}));

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      files = {
        upload: state.uploadMock,
        list: state.listMock,
        get: state.getMock,
        delete: state.deleteMock,
        download: state.downloadMock,
      };

      constructor(_: unknown) {}
    },
  };
});

import { GeminiFilesError, GeminiFilesValidationError, createGeminiFilesClient } from './index';

beforeEach(() => {
  state.uploadMock.mockReset();
  state.listMock.mockReset();
  state.getMock.mockReset();
  state.deleteMock.mockReset();
  state.downloadMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('files-client', () => {
  it('lists files with mapped fields and pagination', async () => {
    state.listMock.mockResolvedValue({
      page: [{ name: 'files/1', displayName: 'one' }],
      params: { config: { pageToken: 'next-token' } },
    });

    const client = createGeminiFilesClient({ apiKey: 'secret' });
    const result = await client.listFiles({ pageSize: 10 });

    expect(result.files).toEqual([{ name: 'files/1', displayName: 'one' }]);
    expect(result.nextPageToken).toBe('next-token');
  });

  it('gets a single file', async () => {
    state.getMock.mockResolvedValue({ name: 'files/abc', mimeType: 'text/plain' });

    const client = createGeminiFilesClient({ apiKey: 'secret' });
    const file = await client.getFile({ name: 'abc' });

    expect(file).toEqual({ name: 'files/abc', mimeType: 'text/plain' });
  });

  it('downloads raw bytes through sdk downloader', async () => {
    const expected = Buffer.from('hello world');

    state.downloadMock.mockImplementation(async ({ downloadPath }: { downloadPath: string }) => {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(downloadPath, expected);
    });

    const client = createGeminiFilesClient({ apiKey: 'secret' });
    const bytes = await client.downloadFile({ name: 'files/abc' });

    expect(bytes.equals(expected)).toBe(true);
  });

  it('normalizes auth/api/network errors', async () => {
    const client = createGeminiFilesClient({ apiKey: 'secret' });

    state.listMock.mockRejectedValueOnce({ status: 403, message: 'denied' });
    await expect(client.listFiles()).rejects.toMatchObject({ code: 'AUTH_ERROR', status: 403 });

    state.listMock.mockRejectedValueOnce({ status: 429, message: 'rate limited' });
    await expect(client.listFiles()).rejects.toMatchObject({ code: 'API_ERROR', retryable: true });

    state.listMock.mockRejectedValueOnce(new Error('offline'));
    await expect(client.listFiles()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('throws validation errors for missing input', async () => {
    const client = createGeminiFilesClient({ apiKey: 'secret' });

    await expect(client.getFile({ name: '' })).rejects.toBeInstanceOf(GeminiFilesValidationError);
    await expect(client.deleteFile({ name: '' })).rejects.toBeInstanceOf(
      GeminiFilesValidationError,
    );
    await expect(client.downloadFile({ name: '' })).rejects.toBeInstanceOf(
      GeminiFilesValidationError,
    );
  });

  it('exposes sdk/api errors as GeminiFilesError', async () => {
    state.getMock.mockRejectedValue({ status: 500, message: 'internal' });

    const client = createGeminiFilesClient({ apiKey: 'secret' });
    await expect(client.getFile({ name: 'files/1' })).rejects.toBeInstanceOf(GeminiFilesError);
  });
});

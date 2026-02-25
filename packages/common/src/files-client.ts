import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GoogleGenAI } from '@google/genai';

import { GeminiFilesValidationError, normalizeGeminiFilesError } from './errors';
import type {
  DeleteFileInput,
  DownloadFileInput,
  GeminiFile,
  GeminiFilesClient,
  GeminiFilesClientConfig,
  GetFileInput,
  ListFilesInput,
  ListFilesOutput,
  UploadFileInput,
} from './files-types';

interface RawGeminiFile {
  name?: unknown;
  displayName?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  createTime?: unknown;
  updateTime?: unknown;
  state?: unknown;
  uri?: unknown;
  downloadUri?: unknown;
}

function maybeString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function mapGeminiFile(raw: unknown): GeminiFile {
  const value = raw as RawGeminiFile;
  const name = maybeString(value?.name);

  if (!name) {
    throw new GeminiFilesValidationError('Gemini SDK returned a file without a name', raw);
  }

  return {
    name,
    displayName: maybeString(value.displayName),
    mimeType: maybeString(value.mimeType),
    sizeBytes: maybeString(value.sizeBytes),
    createTime: maybeString(value.createTime),
    updateTime: maybeString(value.updateTime),
    state: maybeString(value.state),
    uri: maybeString(value.uri),
    downloadUri: maybeString(value.downloadUri),
  };
}

function normalizeFileName(name: string): string {
  return name.startsWith('files/') ? name : `files/${name}`;
}

function toHttpOptions(config: GeminiFilesClientConfig): {
  timeout?: number;
  baseUrl?: string;
  headers?: Record<string, string>;
} {
  const headers: Record<string, string> = {};
  if (config.userAgent) {
    headers['User-Agent'] = config.userAgent;
  }

  return {
    timeout: config.timeoutMs,
    baseUrl: config.baseUrl,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  };
}

function nextPageTokenFromPager(pager: {
  params?: { config?: { pageToken?: string } };
}): string | undefined {
  return pager.params?.config?.pageToken;
}

export function createGeminiFilesClient(config: GeminiFilesClientConfig): GeminiFilesClient {
  if (!config.apiKey) {
    throw new GeminiFilesValidationError('Missing apiKey in GeminiFilesClientConfig');
  }

  const ai = new GoogleGenAI({
    apiKey: config.apiKey,
    httpOptions: toHttpOptions(config),
  });

  return {
    async uploadFile(input: UploadFileInput): Promise<GeminiFile> {
      if (!input.path) {
        throw new GeminiFilesValidationError('uploadFile requires a file path');
      }

      try {
        const file = await ai.files.upload({
          file: input.path,
          config: {
            displayName: input.displayName,
            mimeType: input.mimeType,
          },
        });

        return mapGeminiFile(file);
      } catch (error) {
        throw normalizeGeminiFilesError(error);
      }
    },

    async listFiles(input: ListFilesInput = {}): Promise<ListFilesOutput> {
      try {
        const pager = await ai.files.list({
          config: {
            pageSize: input.pageSize,
            pageToken: input.pageToken,
          },
        });

        const files = pager.page.map(mapGeminiFile);
        return {
          files,
          nextPageToken: nextPageTokenFromPager(pager),
        };
      } catch (error) {
        throw normalizeGeminiFilesError(error);
      }
    },

    async getFile(input: GetFileInput): Promise<GeminiFile> {
      if (!input.name) {
        throw new GeminiFilesValidationError('getFile requires a file name');
      }

      try {
        const file = await ai.files.get({ name: normalizeFileName(input.name) });
        return mapGeminiFile(file);
      } catch (error) {
        throw normalizeGeminiFilesError(error);
      }
    },

    async deleteFile(input: DeleteFileInput): Promise<void> {
      if (!input.name) {
        throw new GeminiFilesValidationError('deleteFile requires a file name');
      }

      try {
        await ai.files.delete({ name: normalizeFileName(input.name) });
      } catch (error) {
        throw normalizeGeminiFilesError(error);
      }
    },

    async downloadFile(input: DownloadFileInput): Promise<Buffer> {
      if (!input.name) {
        throw new GeminiFilesValidationError('downloadFile requires a file name');
      }

      const outputPath = join(tmpdir(), `gemini-files-${randomUUID()}`);

      try {
        await ai.files.download({ file: normalizeFileName(input.name), downloadPath: outputPath });
        return await readFile(outputPath);
      } catch (error) {
        throw normalizeGeminiFilesError(error);
      } finally {
        await rm(outputPath, { force: true }).catch(() => undefined);
      }
    },
  };
}

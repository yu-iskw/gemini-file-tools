import { writeFile } from 'node:fs/promises';

import {
  GeminiFilesValidationError,
  enforceCliSafety,
  type GeminiFilesClient,
  type SafetyMode,
} from '@typescript-template/common';

import type { CliIo } from './types';

function writeJson(io: CliIo, payload: unknown): void {
  io.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

export interface UploadOptions {
  displayName?: string;
  mimeType?: string;
  force?: boolean;
}

export interface ListOptions {
  pageSize?: number;
  pageToken?: string;
}

export interface DownloadOptions {
  output: string;
  force?: boolean;
}

export async function handleUpload(
  client: GeminiFilesClient,
  io: CliIo,
  json: boolean,
  safetyMode: SafetyMode,
  path: string,
  options: UploadOptions,
): Promise<void> {
  enforceCliSafety({ mode: safetyMode, operation: 'upload', forceFlag: Boolean(options.force) });

  const file = await client.uploadFile({
    path,
    displayName: options.displayName,
    mimeType: options.mimeType,
  });

  if (json) {
    writeJson(io, { file });
  } else {
    io.stdout.write(`Uploaded: ${file.name}\n`);
  }
}

export async function handleList(
  client: GeminiFilesClient,
  io: CliIo,
  json: boolean,
  options: ListOptions,
): Promise<void> {
  const result = await client.listFiles({
    pageSize: options.pageSize,
    pageToken: options.pageToken,
  });

  if (json) {
    writeJson(io, result);
  } else {
    for (const file of result.files) {
      io.stdout.write(`${file.name}\n`);
    }
    if (result.nextPageToken) {
      io.stdout.write(`nextPageToken=${result.nextPageToken}\n`);
    }
  }
}

export async function handleGet(
  client: GeminiFilesClient,
  io: CliIo,
  json: boolean,
  name: string,
): Promise<void> {
  const file = await client.getFile({ name });
  if (json) {
    writeJson(io, { file });
  } else {
    io.stdout.write(`${file.name}\n`);
  }
}

export async function handleDelete(
  client: GeminiFilesClient,
  io: CliIo,
  json: boolean,
  safetyMode: SafetyMode,
  name: string,
  force: boolean,
): Promise<void> {
  if (!force) {
    throw new GeminiFilesValidationError('Delete requires --force to avoid accidental removal');
  }

  enforceCliSafety({ mode: safetyMode, operation: 'delete', forceFlag: force });

  await client.deleteFile({ name });
  if (json) {
    writeJson(io, { ok: true });
  } else {
    io.stdout.write(`Deleted: ${name}\n`);
  }
}

export async function handleDownload(
  client: GeminiFilesClient,
  io: CliIo,
  json: boolean,
  safetyMode: SafetyMode,
  name: string,
  options: DownloadOptions,
): Promise<void> {
  if (!options.output) {
    throw new GeminiFilesValidationError('download requires --output <path>');
  }

  enforceCliSafety({
    mode: safetyMode,
    operation: 'download',
    forceFlag: Boolean(options.force),
  });

  const bytes = await client.downloadFile({ name });
  await writeFile(options.output, bytes);

  if (json) {
    writeJson(io, { outputPath: options.output, sizeBytes: bytes.length });
  } else {
    io.stdout.write(`Downloaded: ${name} -> ${options.output} (${bytes.length} bytes)\n`);
  }
}

import { GeminiFilesValidationError, createGeminiFilesClient } from '@typescript-template/common';

import type { CliOptions } from './types';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

export function createClientFromOptions(options: CliOptions) {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiFilesValidationError('Missing API key. Set GEMINI_API_KEY or pass --api-key.');
  }

  return createGeminiFilesClient({
    apiKey,
    baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    timeoutMs: options.timeoutMs,
    userAgent: '@gemini-file-tools/gemini-files-cli',
  });
}

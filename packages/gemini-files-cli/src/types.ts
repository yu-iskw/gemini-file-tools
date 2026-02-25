import type { GeminiFilesClient, SafetyMode } from '@typescript-template/common';

export interface CliIo {
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
}

export interface CliOptions {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  json?: boolean;
  safetyMode?: SafetyMode;
}

export interface CliDependencies {
  createClient: (options: CliOptions) => GeminiFilesClient;
}

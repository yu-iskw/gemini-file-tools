import type { GeminiFilesClient, SafetyMode } from '@typescript-template/common';

export interface McpJsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpJsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface StructuredToolError {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

export interface McpDependencies {
  client: GeminiFilesClient;
  safetyMode: SafetyMode;
}

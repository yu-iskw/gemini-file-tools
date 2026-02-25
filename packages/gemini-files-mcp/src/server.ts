import { writeFile } from 'node:fs/promises';

import {
  GeminiFilesValidationError,
  enforceMcpSafety,
  type FileOperation,
} from '@typescript-template/common';

import { mapToolError } from './errors';
import type { McpDependencies, McpJsonRpcRequest, McpJsonRpcResponse } from './types';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
}

const TOOLS: ToolDefinition[] = [
  {
    name: 'files_upload',
    description: 'Upload a file to Gemini Files API.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        displayName: { type: 'string' },
        mimeType: { type: 'string' },
        confirm: { type: 'boolean' },
      },
      required: ['path'],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'files_list',
    description: 'List files from Gemini Files API.',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: { type: 'number' },
        pageToken: { type: 'string' },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'files_get',
    description: 'Get a file by name.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'files_delete',
    description: 'Delete a file by name.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        confirm: { type: 'boolean' },
      },
      required: ['name'],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'files_download',
    description: 'Download a file by name to a local path.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        outputPath: { type: 'string' },
        confirm: { type: 'boolean' },
      },
      required: ['name', 'outputPath'],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
];

function response(id: string | number | null, result: unknown): McpJsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

function errorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): McpJsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, data },
  };
}

function expectString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new GeminiFilesValidationError(`${fieldName} is required and must be a non-empty string`);
  }
  return value;
}

function parseConfirm(argumentsValue: Record<string, unknown>): boolean {
  return argumentsValue.confirm === true;
}

function enforceToolSafety(
  mode: McpDependencies['safetyMode'],
  operation: FileOperation,
  argumentsValue: Record<string, unknown>,
): void {
  enforceMcpSafety({
    mode,
    operation,
    confirm: parseConfirm(argumentsValue),
  });
}

export function createMcpServer(dependencies: McpDependencies) {
  async function handleToolCall(params: Record<string, unknown>): Promise<unknown> {
    const toolName = expectString(params.name, 'name');
    const argumentsValue = (params.arguments ?? {}) as Record<string, unknown>;

    switch (toolName) {
      case 'files_upload': {
        enforceToolSafety(dependencies.safetyMode, 'upload', argumentsValue);
        const path = expectString(argumentsValue.path, 'path');
        const displayName =
          typeof argumentsValue.displayName === 'string' ? argumentsValue.displayName : undefined;
        const mimeType =
          typeof argumentsValue.mimeType === 'string' ? argumentsValue.mimeType : undefined;
        const file = await dependencies.client.uploadFile({ path, displayName, mimeType });
        return {
          content: [{ type: 'text', text: JSON.stringify({ file }) }],
          structuredContent: { file },
        };
      }

      case 'files_list': {
        const pageSize =
          typeof argumentsValue.pageSize === 'number' && Number.isFinite(argumentsValue.pageSize)
            ? argumentsValue.pageSize
            : undefined;
        const pageToken =
          typeof argumentsValue.pageToken === 'string' ? argumentsValue.pageToken : undefined;
        const result = await dependencies.client.listFiles({ pageSize, pageToken });
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        };
      }

      case 'files_get': {
        const name = expectString(argumentsValue.name, 'name');
        const file = await dependencies.client.getFile({ name });
        return {
          content: [{ type: 'text', text: JSON.stringify({ file }) }],
          structuredContent: { file },
        };
      }

      case 'files_delete': {
        enforceToolSafety(dependencies.safetyMode, 'delete', argumentsValue);
        const name = expectString(argumentsValue.name, 'name');
        await dependencies.client.deleteFile({ name });
        const result = { ok: true };
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        };
      }

      case 'files_download': {
        enforceToolSafety(dependencies.safetyMode, 'download', argumentsValue);
        const name = expectString(argumentsValue.name, 'name');
        const outputPath = expectString(argumentsValue.outputPath, 'outputPath');
        const bytes = await dependencies.client.downloadFile({ name });
        await writeFile(outputPath, bytes);
        const result = { outputPath, sizeBytes: bytes.length };
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        };
      }

      default:
        throw new GeminiFilesValidationError(`Unknown tool: ${toolName}`);
    }
  }

  async function handleRequest(
    request: McpJsonRpcRequest,
  ): Promise<McpJsonRpcResponse | undefined> {
    const id = request.id ?? null;

    try {
      switch (request.method) {
        case 'initialize':
          return response(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'gemini-files-mcp',
              version: '0.1.0',
            },
          });

        case 'tools/list':
          return response(id, { tools: TOOLS });

        case 'tools/call':
          return response(
            id,
            await handleToolCall((request.params ?? {}) as Record<string, unknown>),
          );

        case 'notifications/initialized':
          return undefined;

        default:
          return errorResponse(id, -32601, `Method not found: ${request.method}`);
      }
    } catch (error) {
      const structured = mapToolError(error);
      return errorResponse(id, -32000, structured.message, structured);
    }
  }

  return {
    handleRequest,
  };
}

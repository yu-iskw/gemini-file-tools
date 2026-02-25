import { describe, expect, it, vi } from 'vitest';

import { createMcpServer } from './server';

describe('gemini-files-mcp', () => {
  it('lists tools with annotations', async () => {
    const server = createMcpServer({
      safetyMode: 'unsafe',
      client: {
        uploadFile: vi.fn(),
        listFiles: vi.fn(),
        getFile: vi.fn(),
        deleteFile: vi.fn(),
        downloadFile: vi.fn(),
      },
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    });

    expect(response?.error).toBeUndefined();
    const result = response?.result as {
      tools: Array<{ name: string; annotations?: { readOnlyHint: boolean } }>;
    };
    const listTool = result.tools.find((tool) => tool.name === 'files_list');
    expect(listTool?.annotations?.readOnlyHint).toBe(true);
  });

  it('returns structured output for files_list', async () => {
    const server = createMcpServer({
      safetyMode: 'unsafe',
      client: {
        uploadFile: vi.fn(),
        listFiles: vi
          .fn()
          .mockResolvedValue({ files: [{ name: 'files/1' }], nextPageToken: 'next' }),
        getFile: vi.fn(),
        deleteFile: vi.fn(),
        downloadFile: vi.fn(),
      },
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'files_list',
        arguments: {},
      },
    });

    expect(response?.error).toBeUndefined();
    const result = response?.result as { structuredContent: { files: Array<{ name: string }> } };
    expect(result.structuredContent.files[0]?.name).toBe('files/1');
  });

  it('requires confirm=true for write tools in balanced mode', async () => {
    const server = createMcpServer({
      safetyMode: 'balanced',
      client: {
        uploadFile: vi.fn(),
        listFiles: vi.fn(),
        getFile: vi.fn(),
        deleteFile: vi.fn(),
        downloadFile: vi.fn(),
      },
    });

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'files_delete',
        arguments: { name: 'files/1' },
      },
    });

    expect(response?.error?.data).toMatchObject({
      code: 'VALIDATION_ERROR',
      retryable: false,
    });
  });
});

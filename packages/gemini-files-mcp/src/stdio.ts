import type { Readable, Writable } from 'node:stream';

import type { McpJsonRpcRequest, McpJsonRpcResponse } from './types';

function encodeFrame(payload: McpJsonRpcResponse): string {
  const body = JSON.stringify(payload);
  return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
}

function decodeFrames(buffer: string): { requests: McpJsonRpcRequest[]; rest: string } {
  const requests: McpJsonRpcRequest[] = [];
  let rest = buffer;

  while (true) {
    const headerEnd = rest.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      break;
    }

    const headers = rest.slice(0, headerEnd).split('\r\n');
    const contentLengthHeader = headers.find((header) =>
      header.toLowerCase().startsWith('content-length:'),
    );
    if (!contentLengthHeader) {
      break;
    }

    const contentLength = Number(contentLengthHeader.split(':')[1]?.trim());
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      break;
    }

    const start = headerEnd + 4;
    const end = start + contentLength;
    if (rest.length < end) {
      break;
    }

    const body = rest.slice(start, end);
    const parsed = JSON.parse(body) as McpJsonRpcRequest;
    requests.push(parsed);
    rest = rest.slice(end);
  }

  return { requests, rest };
}

export async function runStdioServer(
  input: Readable,
  output: Writable,
  onRequest: (request: McpJsonRpcRequest) => Promise<McpJsonRpcResponse | undefined>,
): Promise<void> {
  let buffer = '';

  input.setEncoding('utf8');
  input.on('data', async (chunk: string) => {
    buffer += chunk;
    const decoded = decodeFrames(buffer);
    buffer = decoded.rest;

    for (const request of decoded.requests) {
      const response = await onRequest(request);
      if (response) {
        output.write(encodeFrame(response));
      }
    }
  });

  await new Promise<void>((resolve) => {
    input.on('end', () => resolve());
  });
}

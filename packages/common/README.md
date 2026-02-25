# @typescript-template/common

Shared runtime for the Gemini File Tools monorepo: Gemini Files API client, error normalization, types, and safety policy. Used by the CLI and MCP server packages.

## Contents

- **Files client**: `createGeminiFilesClient(config)` — wrapper around `@google/genai` for upload, list, get, download, and delete.
- **Errors**: `GeminiFilesError`, `GeminiFilesValidationError`, `normalizeGeminiFilesError` — stable error codes and messages.
- **Safety**: `SafetyMode` (`read-only` | `balanced` | `unsafe`), `resolveSafetyMode`, `enforceCliSafety`, `enforceMcpSafety` — consistent safety behavior across CLI and MCP.

## Installation

This package is consumed as a workspace dependency by other packages in the monorepo. From the repo root:

```bash
pnpm install
pnpm build
```

## Usage

### Client

```ts
import { createGeminiFilesClient } from '@typescript-template/common';

const client = createGeminiFilesClient({
  apiKey: process.env.GOOGLE_API_KEY!,
  timeoutMs: 30_000,
});

const file = await client.uploadFile({ path: './doc.pdf', displayName: 'doc.pdf' });
const { files, nextPageToken } = await client.listFiles({ pageSize: 10 });
const meta = await client.getFile({ name: file.name });
const bytes = await client.downloadFile({ name: file.name });
await client.deleteFile({ name: file.name });
```

### Error handling

All client methods throw `GeminiFilesError` (or `GeminiFilesValidationError` for bad input). Use `normalizeGeminiFilesError(error)` to wrap unknown errors from the SDK.

- **Error codes**: `VALIDATION_ERROR`, `AUTH_ERROR`, `API_ERROR`, `NETWORK_ERROR`, `INTERNAL_ERROR`
- **Properties**: `code`, `message`, `retryable`, `status`, `details`, `cause`

### Safety modes

- **read-only**: Only list and get; upload, delete, and download are blocked.
- **balanced**: Write operations require an explicit confirmation (CLI: `--force`, MCP: `confirm: true`).
- **unsafe**: All operations allowed without confirmation.

Resolution order: CLI/flag → env (`GEMINI_FILES_SAFETY_MODE`) → default (`read-only`).

## API

See TypeScript types in `src/files-types.ts`, `src/errors.ts`, and `src/safety.ts`. Main exports from `src/index.ts`.

## License

Apache-2.0

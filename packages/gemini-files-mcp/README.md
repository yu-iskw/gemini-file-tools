# @gemini-file-tools/gemini-files-mcp

MCP (Model Context Protocol) stdio server that exposes Gemini Files operations as tools. Intended for use by MCP hosts (e.g. Cursor, Claude Code) so that AI assistants can upload, list, get, download, and delete files via the Gemini Files API with a shared safety policy.

## Prerequisites

- Node.js (see root [.node-version](../../.node-version))
- API key: set `GEMINI_API_KEY` or `GOOGLE_API_KEY`, or pass `--api-key <key>`

## Installation

From the monorepo root:

```bash
pnpm install
pnpm build
```

Run the server (stdio; no interactive args after startup):

```bash
pnpm --filter @gemini-file-tools/gemini-files-mcp exec -- gemini-files-mcp
```

Or with options:

```bash
gemini-files-mcp --api-key <key> --safety-mode balanced
```

## Configuration

| Option / Env           | Description                                                                               |
| :--------------------- | :---------------------------------------------------------------------------------------- |
| `--api-key <key>`      | API key (default: `GEMINI_API_KEY` or `GOOGLE_API_KEY`).                                  |
| `--base-url <url>`     | API base URL (default: `GEMINI_BASE_URL` or `https://generativelanguage.googleapis.com`). |
| `--timeout-ms <ms>`    | Request timeout in milliseconds (default: `GEMINI_TIMEOUT_MS` if set).                    |
| `--safety-mode <mode>` | `read-only` (default), `balanced`, or `unsafe`. Env: `GEMINI_FILES_SAFETY_MODE`.          |

## Tools

The server implements JSON-RPC over stdio and exposes these tools:

| Tool             | Description                                                                   | Write? | Balanced: needs `confirm` |
| :--------------- | :---------------------------------------------------------------------------- | :----- | :------------------------ |
| `files_upload`   | Upload a file. Args: `path` (required), `displayName`, `mimeType`, `confirm`. | Yes    | Yes                       |
| `files_list`     | List files. Args: `pageSize`, `pageToken`.                                    | No     | —                         |
| `files_get`      | Get file metadata. Args: `name` (required).                                   | No     | —                         |
| `files_delete`   | Delete a file. Args: `name` (required), `confirm`.                            | Yes    | Yes                       |
| `files_download` | Download to a path. Args: `name`, `outputPath` (required), `confirm`.         | Yes    | Yes                       |

Tool results are returned as MCP content (e.g. `content` + `structuredContent`). Errors use a structured payload with `code`, `message`, `retryable`, and `details` (see [ADR 0004](../../docs/adr/0004-mcp-stdio-tools-contract.md)).

## Safety modes

- **read-only** (default): Only `files_list` and `files_get`; upload, delete, and download are blocked.
- **balanced**: Write tools require `confirm: true` in the tool arguments.
- **unsafe**: All tools allowed without confirmation.

## Host integration

Configure your MCP host to run this server as a stdio transport, for example:

- **Command**: `gemini-files-mcp` (or `node /path/to/dist/bin.js`).
- **Env**: Set `GEMINI_API_KEY` or `GOOGLE_API_KEY` (and optionally `GEMINI_FILES_SAFETY_MODE`, `GEMINI_BASE_URL`, `GEMINI_TIMEOUT_MS`).

The server speaks the MCP protocol (e.g. `initialize`, `tools/list`, `tools/call`, `notifications/initialized`). No TCP/HTTP; all I/O is stdin/stdout.

## License

Apache-2.0

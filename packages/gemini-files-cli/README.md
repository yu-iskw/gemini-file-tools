# @gemini-file-tools/gemini-files-cli

Command-line interface for the Gemini Files API: upload, list, get, download, and delete. Uses the shared client and safety policy from `@typescript-template/common`.

## Prerequisites

- Node.js (see root [.node-version](../../.node-version))
- API key: set `GOOGLE_API_KEY` or pass `--api-key <key>`

## Installation

From the monorepo root:

```bash
pnpm install
pnpm build
```

Run the CLI:

```bash
pnpm --filter @gemini-file-tools/gemini-files-cli exec -- gemini-files --help
```

Or from the package directory after build:

```bash
node dist/bin.js files list
```

## Commands

All actions live under the `files` subcommand.

| Command                 | Description                                                                              |
| :---------------------- | :--------------------------------------------------------------------------------------- |
| `files upload <path>`   | Upload a file. Optional: `--display-name`, `--mime-type`, `--force` (for balanced mode). |
| `files list`            | List files. Optional: `--page-size <n>`, `--page-token <token>`.                         |
| `files get <name>`      | Get file metadata by name.                                                               |
| `files delete <name>`   | Delete a file. **Requires** `--force`.                                                   |
| `files download <name>` | Download to a path. **Requires** `--output <path>`; optional `--force` in balanced mode. |

## Global options

| Option                 | Description                                     |
| :--------------------- | :---------------------------------------------- |
| `--api-key <key>`      | Gemini API key (default: `GOOGLE_API_KEY`).     |
| `--base-url <url>`     | Override API base URL.                          |
| `--timeout-ms <ms>`    | Request timeout in milliseconds.                |
| `--safety-mode <mode>` | `read-only` (default), `balanced`, or `unsafe`. |
| `--json`               | Emit JSON to stdout for scripting.              |

## Safety modes

- **read-only** (default): Only `list` and `get`; upload, delete, and download are blocked.
- **balanced**: Write operations require `--force` (e.g. `files upload ./x.pdf --force`, `files delete files/abc --force`).
- **unsafe**: All operations allowed without `--force`.

You can set the default via environment: `GEMINI_FILES_SAFETY_MODE=balanced`.

## Exit codes

| Code | Meaning                                    |
| :--- | :----------------------------------------- |
| 0    | Success.                                   |
| 1    | Unhandled / internal error.                |
| 2    | Validation error (bad args, safety block). |
| 3    | Authentication error (401/403).            |
| 4    | API error (4xx/5xx from API).              |
| 5    | Network error.                             |

## Examples

```bash
# List files (read-only)
gemini-files files list

# Upload with JSON output
gemini-files --json files upload ./report.pdf --display-name report.pdf

# Get metadata
gemini-files files get files/abc123

# Download (requires --output; use --force in balanced mode)
gemini-files files download files/abc123 --output ./out.pdf --force

# Delete (always requires --force)
gemini-files files delete files/abc123 --force
```

## License

Apache-2.0

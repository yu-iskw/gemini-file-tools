# Gemini File Tools

A production-ready toolkit for managing Gemini Files, providing both a CLI and a Model Context Protocol (MCP) server.

## Overview

This monorepo contains a suite of tools built on top of the official `@google/genai` SDK to interact with the Gemini Files API. It provides a consistent error model, shared safety policies, and multiple interfaces for both human and AI consumption.

## Packages

| Package                                                              | Description                                                                                                                                |
| :------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| [`@gemini-file-tools/gemini-files-cli`](./packages/gemini-files-cli) | Command-line interface for Gemini Files CRUD operations. See [packages/gemini-files-cli/README.md](./packages/gemini-files-cli/README.md). |
| [`@gemini-file-tools/gemini-files-mcp`](./packages/gemini-files-mcp) | MCP stdio server for LLMs (via MCP hosts). See [packages/gemini-files-mcp/README.md](./packages/gemini-files-mcp/README.md).               |
| [`@typescript-template/common`](./packages/common)                   | Shared runtime: SDK client, error normalization, safety utilities. See [packages/common/README.md](./packages/common/README.md).           |

## Key Features

- **Unified SDK Wrapper**: Consistent implementation of `upload`, `list`, `get`, `download`, and `delete` using `@google/genai`.
- **Hierarchical Safety Modes**: Built-in safety levels (`read-only`, `balanced`, `unsafe`) to prevent accidental data loss.
- **Normalized Errors**: Stable error categories and exit codes across all interfaces.
- **MCP Integration**: Full support for the Model Context Protocol, enabling AI assistants to interact with Gemini Files securely.

## Getting Started

### Prerequisites

- Node.js (>= 24.13.0)
- pnpm (>= 10.28.1)
- A Google Gemini API key (`GOOGLE_API_KEY` or `GEMINI_API_KEY`)

### Installation

```bash
pnpm install
pnpm build
```

### Quick usage

- **CLI**: `pnpm --filter @gemini-file-tools/gemini-files-cli exec -- gemini-files files list` (see [gemini-files-cli](./packages/gemini-files-cli/README.md) for all commands and options).
- **MCP**: Run `gemini-files-mcp` as a stdio MCP server and configure your MCP host to use it (see [gemini-files-mcp](./packages/gemini-files-mcp/README.md)).

### Running tests

```bash
pnpm test
```

Integration tests (live API, read-only) are in a separate lane and run only when
`GEMINI_API_KEY` is set:

```bash
pnpm test:integration
```

### Linting and Formatting

This project uses [Trunk](https://trunk.io/) to manage linting and formatting.

```bash
pnpm lint
pnpm format
```

## Architecture

Architectural decisions are documented in [docs/adr](./docs/adr):

- [0001 - Monorepo Package Boundaries](./docs/adr/0001-monorepo-package-boundaries.md)
- [0002 - HTTP Core and Error Model](./docs/adr/0002-http-core-and-error-model.md)
- [0003 - CLI Contract and Exit Codes](./docs/adr/0003-cli-contract-and-exit-codes.md)
- [0004 - MCP Stdio Tools Contract](./docs/adr/0004-mcp-stdio-tools-contract.md)
- [0005 - Migrate Files Client to @google/genai](./docs/adr/0005-migrate-files-client-to-google-genai.md)
- [0006 - Tool Annotations, Safety Modes, and Package Consolidation](./docs/adr/0006-tool-annotations-safety-modes-and-package-consolidation.md)
- [0007 - Standardize CLI Command Parsing with Commander](./docs/adr/0007-standardize-cli-command-parsing-with-commander.md)
- [0008 - Standardize MCP Startup Configuration Parsing with Commander](./docs/adr/0008-standardize-mcp-startup-configuration-parsing-with-commander.md)

## License

Apache-2.0

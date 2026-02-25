# 0004 - MCP Stdio Tools Contract

## Status

Accepted

Amended by [0005 - Migrate Files Client to @google/genai](0005-migrate-files-client-to-google-genai.md)

Amended by [0006 - Tool Annotations, Safety Modes, and Package Consolidation](0006-tool-annotations-safety-modes-and-package-consolidation.md)

## Context

Agent integrations require MCP-compatible tool calls with structured outputs/errors.

## Decision

Ship stdio MCP server with tools:

- `files_upload`
- `files_list`
- `files_get`
- `files_delete`
- `files_download`

Use JSON-RPC framing over stdio with structured error payloads:

- `code`
- `message`
- `retryable`
- `details`

## Consequences

- Easy local integration in MCP-capable clients
- Clear extension path for future tools

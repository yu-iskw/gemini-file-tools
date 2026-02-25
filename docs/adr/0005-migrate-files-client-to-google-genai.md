# 0005 - Migrate Files Client to @google/genai

## Status

Accepted

Amends [0002 - HTTP Core and Error Model](0002-http-core-and-error-model.md)

Amends [0004 - MCP Stdio Tools Contract](0004-mcp-stdio-tools-contract.md)

Amended by [0006 - Tool Annotations, Safety Modes, and Package Consolidation](0006-tool-annotations-safety-modes-and-package-consolidation.md)

## Context

The toolkit initially implemented Gemini Files operations using a custom HTTP layer. This created protocol drift risk against the official Gemini SDK behavior and increased maintenance burden across client, CLI, and MCP surfaces.

A new hard requirement was introduced to use the official `@google/genai` SDK.

## Decision

- Use `@google/genai` as the primary transport and API surface for all Gemini Files CRUD operations (`upload`, `list`, `get`, `delete`).
- Keep the existing toolkit interface (`GeminiFilesClient`) unchanged for compatibility with CLI and MCP.
- Implement `downloadFile` via the SDK `files.download` API and return bytes from a temporary local file.
- Introduce client-local normalized error types (`GeminiFilesError`) and map SDK errors to stable categories used by CLI exit codes and MCP structured errors.
- Remove runtime dependency on `@gemini-file-tools/http-core` from `gemini-files-client`, `gemini-files-cli`, and `gemini-files-mcp`.
- Keep `http-core` in the workspace as deprecated during transition, then remove in a later cleanup ADR.

## Consequences

- Lower long-term maintenance cost and reduced drift from upstream Gemini Files API behavior.
- CLI and MCP contracts remain stable for users.
- Error handling becomes SDK-oriented, requiring explicit normalization logic.
- `downloadFile` remains supported without exposing temporary file handling to callers.

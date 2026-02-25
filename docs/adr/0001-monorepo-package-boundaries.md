# 0001 - Monorepo Package Boundaries

## Status

Accepted

Amended by [0006 - Tool Annotations, Safety Modes, and Package Consolidation](0006-tool-annotations-safety-modes-and-package-consolidation.md)

## Context

Gemini file tooling must support multiple interfaces (library, CLI, MCP) without duplicating API logic.

## Decision

Use four packages:

- `@gemini-file-tools/http-core`
- `@gemini-file-tools/gemini-files-client`
- `@gemini-file-tools/gemini-files-cli`
- `@gemini-file-tools/gemini-files-mcp`

CLI and MCP are thin adapters over the shared domain client.

## Consequences

- Better maintainability and testability
- Slightly higher initial workspace setup cost

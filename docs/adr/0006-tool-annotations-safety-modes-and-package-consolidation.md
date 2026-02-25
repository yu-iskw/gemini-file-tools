# 0006 - Tool Annotations, Safety Modes, and Package Consolidation

Date: 2026-02-24

## Status

Accepted

Amends [0001 - Monorepo Package Boundaries](0001-monorepo-package-boundaries.md)

Amends [0004 - MCP Stdio Tools Contract](0004-mcp-stdio-tools-contract.md)

Amends [0005 - Migrate Files Client to @google/genai](0005-migrate-files-client-to-google-genai.md)

## Context

The project needed three coordinated changes:

1. MCP tools lacked explicit annotations for client-side safety/UX hints.
2. Runtime safety policy needed to be explicit and shared across CLI and MCP.
3. Package topology still contained transitional packages (`http-core` and `gemini-files-client`) that were no longer necessary after migration to `@google/genai`.

These gaps increased maintenance cost and made safe-default behavior inconsistent across interfaces.

## Decision

- Add MCP tool annotations for all tools using legacy MCP annotation hints:
  - `readOnlyHint`
  - `destructiveHint`
  - `idempotentHint`
  - `openWorldHint`
- Introduce hierarchical safety modes shared by CLI and MCP:
  - `read-only` (default)
  - `balanced`
  - `unsafe`
- In `balanced` mode:
  - CLI write operations require `--force`
  - MCP write operations require `confirm: true`
- Consolidate shared runtime into `@typescript-template/common`:
  - Gemini Files SDK client
  - normalized error model
  - safety utilities
- Remove `packages/http-core` and `packages/gemini-files-client`.

## Consequences

- Safer default behavior (`read-only`) with explicit escalation paths.
- Better MCP discoverability and safer host integration via annotations.
- Simpler package graph and reduced duplication risk.
- Slightly stricter operation flow for write actions in safe modes.

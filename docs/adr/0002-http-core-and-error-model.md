# 0002 - HTTP Core and Error Model

## Status

Accepted

Amended by [0005 - Migrate Files Client to @google/genai](0005-migrate-files-client-to-google-genai.md)

## Context

Consumers need consistent behavior for request construction, authentication, and error mapping.

## Decision

Implement a shared HTTP client with:

- URL/query construction
- `key` auth injection
- timeout and abort support
- typed response parsing (`json`, `text`, `arrayBuffer`, `raw`)
- error hierarchy:
  - `ValidationError`
  - `NetworkError`
  - `ApiError`
  - `AuthError`

## Consequences

- Unified error handling across CLI and MCP
- Clear contract for future Gemini endpoint clients

# 0003 - CLI Contract and Exit Codes

## Status

Accepted

## Context

CLI should be script-friendly and predictable for automation.

## Decision

Provide `gemini-files` with `files` subcommands and path-based UX.

Exit codes:

- `0`: success
- `2`: usage/validation
- `3`: auth
- `4`: API-level failure
- `5`: network

`--json` provides machine-readable outputs.

## Consequences

- Stable automation behavior
- Human-readable and machine-readable modes from the same command set

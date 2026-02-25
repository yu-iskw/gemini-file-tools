import { describe, expect, it } from 'vitest';

import {
  GeminiFilesValidationError,
  enforceCliSafety,
  enforceMcpSafety,
  resolveSafetyMode,
} from './index';

describe('safety', () => {
  it('resolves default mode to read-only', () => {
    expect(resolveSafetyMode({})).toBe('read-only');
  });

  it('validates mode values', () => {
    expect(() => resolveSafetyMode({ cliFlag: 'nope' })).toThrow(GeminiFilesValidationError);
  });

  it('blocks write operations in read-only mode', () => {
    expect(() =>
      enforceCliSafety({ mode: 'read-only', operation: 'upload', forceFlag: true }),
    ).toThrow(GeminiFilesValidationError);
  });

  it('requires force/confirm in balanced mode', () => {
    expect(() =>
      enforceCliSafety({ mode: 'balanced', operation: 'delete', forceFlag: false }),
    ).toThrow(GeminiFilesValidationError);

    expect(() =>
      enforceMcpSafety({ mode: 'balanced', operation: 'download', confirm: false }),
    ).toThrow(GeminiFilesValidationError);
  });

  it('allows writes in unsafe mode', () => {
    expect(() =>
      enforceCliSafety({ mode: 'unsafe', operation: 'upload', forceFlag: false }),
    ).not.toThrow();
  });
});

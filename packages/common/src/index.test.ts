import { describe, expect, it } from 'vitest';

import { resolveSafetyMode } from './index';

describe('common exports', () => {
  it('exposes shared runtime', () => {
    expect(resolveSafetyMode({})).toBe('read-only');
  });
});

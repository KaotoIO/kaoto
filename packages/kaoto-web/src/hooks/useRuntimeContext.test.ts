import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { errorMessage, useRuntimeContext } from './useRuntimeContext';

describe('useRuntimeContext', () => {
  it('throws when used outside RuntimeProvider', () => {
    expect(() => renderHook(() => useRuntimeContext())).toThrow(errorMessage);
  });
});

import { renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ProjectContext } from '../context/ProjectContext';
import { useProjectContext } from './useProjectContext';

describe('useProjectContext', () => {
  it('returns the value of the closest ProjectContext provider', () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <ProjectContext.Provider value={{ projectId: 'my-project' }}>{children}</ProjectContext.Provider>
    );

    const { result } = renderHook(() => useProjectContext(), { wrapper });

    expect(result.current).toEqual({ projectId: 'my-project' });
  });

  it('throws when used outside of a ProjectContext provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useProjectContext())).toThrow(
      'useProjectContext must be used within a ProjectContext.Provider',
    );
  });
});

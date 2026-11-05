import { renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { KaotoResourceProvider } from '../../providers/kaoto-resource.provider';
import { inMemorySourceCodeAdapter, SourceCodeProvider } from '../../providers/source-code.provider';
import { errorMessage, useKaotoResourceContext } from './useKaotoResourceContext';

const wrapper = ({ children }: PropsWithChildren) => (
  <SourceCodeProvider adapter={inMemorySourceCodeAdapter()}>
    <KaotoResourceProvider>{children}</KaotoResourceProvider>
  </SourceCodeProvider>
);

describe('useKaotoResourceContext', () => {
  it('should be throw when use hook without provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => null);
    expect(() => renderHook(() => useKaotoResourceContext())).toThrow(errorMessage);
    (console.error as Mock).mockRestore();
  });

  it('should return EntityContext', () => {
    const { result } = renderHook(() => useKaotoResourceContext(), { wrapper });

    expect(result.current).not.toBeNull();
  });
});

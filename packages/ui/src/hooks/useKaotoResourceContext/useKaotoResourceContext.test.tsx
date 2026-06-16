import { renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { KaotoResourceProvider } from '../../providers/kaoto-resource.provider';
import { SourceCodeSync } from '../../providers/source-code-sync';
import { errorMessage, useKaotoResourceContext } from './useKaotoResourceContext';

const wrapper = ({ children }: PropsWithChildren) => (
  <SourceCodeSync>
    <KaotoResourceProvider>{children}</KaotoResourceProvider>
  </SourceCodeSync>
);

describe('useKaotoResourceContext', () => {
  it('should be throw when use hook without provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => null);
    expect(() => renderHook(() => useKaotoResourceContext())).toThrow(errorMessage);
    (console.error as jest.Mock).mockRestore();
  });

  it('should return EntityContext', () => {
    const { result } = renderHook(() => useKaotoResourceContext(), { wrapper });

    expect(result.current).not.toBe(null);
  });
});

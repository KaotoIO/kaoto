import { renderHook, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { EntitiesProvider } from '../../providers/entities.provider';
import { KaotoResourceProvider } from '../../providers/kaoto-resource.provider';
import { SourceCodeSync } from '../../providers/source-code-sync';
import { errorMessage, useEntityContext } from './useEntityContext';

const wrapper = ({ children }: PropsWithChildren) => (
  <SourceCodeSync>
    <KaotoResourceProvider>
      <EntitiesProvider>{children}</EntitiesProvider>
    </KaotoResourceProvider>
  </SourceCodeSync>
);

describe('useEntityContext', () => {
  it('should be throw when use hook without provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => null);
    expect(() => renderHook(() => useEntityContext())).toThrow(errorMessage);
    (console.error as Mock).mockRestore();
  });

  it('should return EntityContext', async () => {
    const { result } = renderHook(() => useEntityContext(), { wrapper });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
  });
});

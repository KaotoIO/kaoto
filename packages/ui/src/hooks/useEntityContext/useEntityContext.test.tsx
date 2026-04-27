import { renderHook, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { EntitiesProvider } from '../../providers/entities.provider';
import { errorMessage, useEntityContext } from './useEntityContext';

const wrapper = ({ children }: PropsWithChildren) => <EntitiesProvider>{children}</EntitiesProvider>;

describe('useEntityContext', () => {
  it('should be throw when use hook without provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => null);
    expect(() => renderHook(() => useEntityContext())).toThrow(errorMessage);
    (console.error as jest.Mock).mockRestore();
  });

  it('should return EntityContext', async () => {
    const { result } = renderHook(() => useEntityContext(), { wrapper });

    await waitFor(() => {
      expect(result.current).not.toBe(null);
    });
  });
});

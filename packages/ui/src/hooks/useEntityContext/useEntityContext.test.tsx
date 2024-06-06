import { renderHook } from '@testing-library/react';
import { useEntityContext, errorMessage } from './useEntityContext';
import { EntitiesProvider } from '../../providers/entities.provider';
import { PropsWithChildren } from 'react';

const wrapper = ({ children }: PropsWithChildren) => <EntitiesProvider>{children}</EntitiesProvider>;

describe('useEntityContext', () => {
  it('should be throw when use hook without provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => null);
    expect(() => renderHook(() => useEntityContext())).toThrow(errorMessage);
    (console.error as jest.Mock).mockRestore();
  });

  it('should return EntityContext', () => {
    const { result } = renderHook(() => useEntityContext(), { wrapper });

    expect(result.current).not.toBe(null);
  });
});

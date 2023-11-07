import { renderHook } from '@testing-library/react';
import useEntityContext, { errorMessage } from './useEntityContext';
import { EntitiesProvider } from '../../providers/entities.provider';
import { PropsWithChildren } from 'react';

const wrapper = ({ children }: PropsWithChildren) => <EntitiesProvider>{children}</EntitiesProvider>;

describe('useEntityContext', () => {
  it('should be throw when use hook without provider', () => {
    expect(() => renderHook(() => useEntityContext())).toThrow(errorMessage);
  });

  it('should be return EntityContext', () => {
    const { result } = renderHook(() => useEntityContext(), { wrapper });

    expect(result.current).not.toBe(null);
  });
});

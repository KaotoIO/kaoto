import { renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { ReloadContext } from '../../providers';
import { errorMessage, useReloadContext } from './useReloadContext';

const wrapper = ({ children }: PropsWithChildren) => (
  <ReloadContext.Provider value={{ lastRender: -1, reloadPage: () => {} }}>{children}</ReloadContext.Provider>
);

describe('useReloadContext', () => {
  it('should be throw when use hook without provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => null);
    expect(() => renderHook(() => useReloadContext())).toThrow(errorMessage);
    (console.error as jest.Mock).mockRestore();
  });

  it('should return EntityContext', () => {
    const { result } = renderHook(() => useReloadContext(), { wrapper });

    expect(result.current).not.toBe(null);
  });
});

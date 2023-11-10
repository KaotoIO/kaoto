import { renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { SourceCodeProvider } from '../../providers/source-code.provider';
import { errorMessage, useSourceCodeContext } from './useSourceCodeContext';

const wrapper = ({ children }: PropsWithChildren) => <SourceCodeProvider>{children}</SourceCodeProvider>;

describe('useSourceCodeContext', () => {
  it('should be throw when use hook without provider', () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => null);
    expect(() => renderHook(() => useSourceCodeContext())).toThrow(errorMessage);
  });

  it('should be return SourceCodeContext', () => {
    const { result } = renderHook(() => useSourceCodeContext(), { wrapper });

    expect(result.current).not.toBe(null);
  });
});

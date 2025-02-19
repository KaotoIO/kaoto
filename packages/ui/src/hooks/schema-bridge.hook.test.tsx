import { renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { SchemaBridgeProvider } from '../providers/schema-bridge.provider';
import { useSchemaBridgeContext } from './schema-bridge.hook';

describe('useSchemaBridgeContext', () => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <SchemaBridgeProvider schema={{}}>{children}</SchemaBridgeProvider>
  );

  it('should throw an error if used outside of SchemaBridgeProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useSchemaBridgeContext());
    }).toThrow('useSchemaBridgeContext needs to be called inside `SchemaBridgeProvider`');

    (console.error as jest.Mock).mockRestore();
  });

  it('should return SchemaBridgeContext', () => {
    const { result } = renderHook(() => useSchemaBridgeContext(), { wrapper });

    expect(result.current).not.toBe(null);
  });
});

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRuntimeContext } from '../hooks/useRuntimeContext';
import { RuntimeProvider } from './RuntimeProvider';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <RuntimeProvider catalogUrl="" runtimeCatalogName="" testingCatalogName="">
    {children}
  </RuntimeProvider>
);

describe('RuntimeContext', () => {
  it.each([
    ['catalogLibrary', undefined],
    ['basePath', ''],
  ] as const)('provides default value for %s', (field, expected) => {
    const { result } = renderHook(() => useRuntimeContext(), { wrapper });
    expect(result.current[field]).toBe(expected);
  });

  it('provides a placeholder selectedCatalog until catalog fetching is implemented', () => {
    const { result } = renderHook(() => useRuntimeContext(), { wrapper });
    expect(result.current.selectedCatalog).toMatchObject({
      name: 'Camel Main',
      runtime: 'main',
    });
  });

  it('derives basePath from catalogUrl', () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider catalogUrl="/catalog/index.json" runtimeCatalogName="" testingCatalogName="">
        {children}
      </RuntimeProvider>
    );
    const { result } = renderHook(() => useRuntimeContext(), { wrapper: customWrapper });
    expect(result.current.basePath).toBe('/catalog');
  });
});

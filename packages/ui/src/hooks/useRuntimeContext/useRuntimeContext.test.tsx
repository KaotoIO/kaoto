import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { act, renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { Mock, vi } from 'vitest';

import { SourceSchemaType } from '../../models/camel';
import { KaotoResource } from '../../models/kaoto-resource';
import { KaotoResourceContext } from '../../providers/kaoto-resource.provider';
import { RuntimeProvider } from '../../providers/runtime.provider';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { errorMessage, useRuntimeContext } from './useRuntimeContext';

const kaotoResource = { getType: () => SourceSchemaType.Integration } as unknown as KaotoResource;

const wrapper = ({ children }: PropsWithChildren) => (
  <KaotoResourceContext.Provider value={{ kaotoResource }}>
    <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH} runtimeCatalogName="" testingCatalogName="">
      {children}
    </RuntimeProvider>
  </KaotoResourceContext.Provider>
);

describe('useRuntimeContext', () => {
  let fetchResolve: () => void;

  beforeEach(() => {
    const fetchMock = vi.spyOn(window, 'fetch');
    fetchMock.mockImplementationOnce((file) => {
      return new Promise((resolve) => {
        fetchResolve = () => {
          resolve({
            json: () => catalogLibrary,
            url: `http://localhost/${file}`,
          } as unknown as Response);
        };
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be throw when use hook without provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => null);
    expect(() => renderHook(() => useRuntimeContext())).toThrow(errorMessage);
    (console.error as Mock).mockRestore();
  });

  it('should return RuntimeContext', async () => {
    const { result } = renderHook(() => useRuntimeContext(), { wrapper });

    await act(async () => {
      fetchResolve();
    });

    expect(result.current).not.toBe(null);
  });
});

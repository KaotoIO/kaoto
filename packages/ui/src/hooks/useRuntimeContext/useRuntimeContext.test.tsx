import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { act, renderHook, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { IntegrationResource } from '../../models/camel/integration-resource';
import { KaotoResourceContext } from '../../providers/kaoto-resource.provider';
import { RuntimeProvider } from '../../providers/runtime.provider';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { errorMessage, useRuntimeContext } from './useRuntimeContext';

const kaotoResource = new IntegrationResource();

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
    /*
     * The catalog library index is resolved by each test, while the XSLT XPath functions catalog requested
     * afterwards by the real fetchXsltXPathFunctions is unavailable, which RuntimeProvider treats as non-fatal
     */
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    /* Drop the pending one-off implementation of a previous test that never fetched */
    fetchSpy.mockReset();
    fetchSpy.mockRejectedValue(new Error('XSLT catalog not available'));
    fetchSpy.mockImplementationOnce(() => {
      return new Promise((resolve) => {
        fetchResolve = () => {
          resolve(new Response(JSON.stringify(catalogLibrary), { status: 200 }));
        };
      });
    });
  });

  it('should be throw when use hook without provider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => null);
    expect(() => renderHook(() => useRuntimeContext())).toThrow(errorMessage);
    consoleErrorSpy.mockRestore();
  });

  it('should return RuntimeContext', async () => {
    const { result } = renderHook(() => useRuntimeContext(), { wrapper });

    await act(async () => {
      fetchResolve();
    });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    expect(result.current.catalogLibrary).toEqual(catalogLibrary);
  });
});

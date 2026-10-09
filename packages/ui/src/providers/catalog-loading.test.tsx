import type { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import { CatalogLoaderProvider } from '../dynamic-catalog/catalog.provider';
import * as camelCatalog from '../dynamic-catalog/support/fetch-camel-catalog';
import * as xpathCatalog from '../dynamic-catalog/support/fetch-xslt-xpath-functions';
import { SourceSchemaType } from '../models/camel';
import type { KaotoResource } from '../models/kaoto-resource';
import { CatalogSchemaLoader } from '../utils';
import { KaotoResourceContext } from './kaoto-resource.provider';
import { RuntimeContext, RuntimeProvider } from './runtime.provider';
import { SchemasLoaderProvider } from './schemas.provider';

const library: CatalogLibrary = {
  name: 'library',
  version: 1,
  definitions: [{ name: 'Main', runtime: 'Main', version: '1.0.0', fileName: 'main.json' }],
  starterTemplates: '',
  xsltCatalogs: '',
};
const kaotoResource = { getType: () => SourceSchemaType.RouteYaml } as unknown as KaotoResource;

const providers = [
  {
    name: 'runtime',
    loadingTestId: 'loading-library',
    response: library,
    wrap: (version: number, children: ReactNode) => (
      <KaotoResourceContext.Provider value={{ kaotoResource }}>
        <RuntimeProvider catalogUrl={`/${version}/index.json`} runtimeCatalogName="Main" testingCatalogName="">
          {children}
        </RuntimeProvider>
      </KaotoResourceContext.Provider>
    ),
  },
  ...[
    { name: 'schemas', loadingTestId: 'loading-schemas', Loader: SchemasLoaderProvider },
    { name: 'catalog', loadingTestId: 'loading-catalogs', Loader: CatalogLoaderProvider },
  ].map(({ name, loadingTestId, Loader }) => ({
    name,
    loadingTestId,
    response: { runtime: 'Main', schemas: [] },
    wrap: (version: number, children: ReactNode) => (
      <RuntimeContext.Provider
        value={{
          basePath: `/${version}`,
          catalogLibrary: library,
          selectedCatalog: library.definitions[0],
          setSelectedCatalog: vi.fn(),
        }}
      >
        <Loader>{children}</Loader>
      </RuntimeContext.Provider>
    ),
  })),
];

describe.each(providers)('$name loading transitions', ({ wrap, response, loadingTestId }) => {
  it('hides interactive children on the first reload render and ignores an older response', async () => {
    vi.spyOn(camelCatalog, 'fetchCamelCatalog').mockResolvedValue(undefined);
    vi.spyOn(xpathCatalog, 'fetchXsltXPathFunctions').mockResolvedValue(undefined);
    const pending: Array<(response: Response) => void> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>((resolve) => pending.push(resolve)));
    vi.spyOn(CatalogSchemaLoader, 'getSchemasFiles').mockReturnValue([]);
    const childRender = vi.fn();
    const Child = () => {
      childRender();
      return <button>Ready</button>;
    };
    const finish = async (index: number) => {
      await act(async () => {
        pending[index]({ json: async () => response } as Response);
      });
    };

    const view = render(wrap(0, <Child />));
    await finish(0);
    expect(screen.getByRole('button', { name: 'Ready' })).toBeInTheDocument();
    childRender.mockClear();

    view.rerender(wrap(1, <Child />));
    expect(childRender).not.toHaveBeenCalled();
    expect(screen.getByTestId(loadingTestId)).toBeInTheDocument();

    view.rerender(wrap(2, <Child />));
    await finish(1);
    expect(screen.getByTestId(loadingTestId)).toBeInTheDocument();
    expect(childRender).not.toHaveBeenCalled();

    await finish(2);
    expect(screen.getByRole('button', { name: 'Ready' })).toBeInTheDocument();
  });
});

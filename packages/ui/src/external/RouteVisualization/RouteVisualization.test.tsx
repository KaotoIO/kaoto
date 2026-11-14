import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogDefinition, CatalogLibrary } from '@kaoto/camel-catalog/types';
import { useSuggestionRegistry } from '@kaoto/forms';
import { act, render, screen } from '@testing-library/react';
import { FunctionComponent, useContext, useEffect, useState } from 'react';
import type { Mock } from 'vitest';

import * as VisualizationModule from '../../components/Visualization';
import { CatalogModalContext } from '../../dynamic-catalog/catalog-modal.provider';
import { camelRouteYaml } from '../../stubs/camel-route';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { EventNotifier } from '../../utils';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { RouteVisualization } from './RouteVisualization';

describe('RouteVisualization', () => {
  let fetchResolve: () => void;
  let catalogDefinition: CatalogDefinition;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    catalogDefinition = catalogsMap.catalogDefinition;
  });

  beforeEach(() => {
    const fetchMock = vi.spyOn(window, 'fetch');

    // The first fetch (RuntimeProvider) loads the catalog library index, while
    // the subsequent fetches (Schemas/Catalog loaders) load the catalog
    // definition.
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
    fetchMock.mockImplementation((file) => {
      return new Promise((resolve) => {
        fetchResolve = () => {
          resolve({
            json: () => catalogDefinition,
            url: `http://localhost/${file}`,
          } as unknown as Response);
        };
      });
    });

    vi.spyOn(CatalogSchemaLoader, 'fetchFile').mockImplementation((uri: string) => {
      return Promise.resolve({ uri, body: { [uri]: 'dummy-data' } });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderRouteVisualization = () =>
    render(
      <RouteVisualization
        catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
        runtimeCatalogName=""
        testingCatalogName=""
        code={camelRouteYaml}
        codeChange={vi.fn()}
      />,
    );

  it('renders the canvas from the code prop without throwing', async () => {
    renderRouteVisualization();

    // The SchemasLoaderProvider and CatalogLoaderProvider each perform a
    // sequential fetch of the index file, so resolve the pending fetch until
    // the canvas surface is mounted.
    for (let i = 0; i < 5 && !document.querySelector('.canvas-surface'); i++) {
      await act(async () => {
        fetchResolve();
      });
    }

    expect(document.querySelector('.canvas-surface')).toBeInTheDocument();
  });

  /** Renders the component with DesignerVisualization replaced by `probe` and waits until the probe is mounted */
  const renderWithProbe = async (probe: () => void) => {
    vi.spyOn(VisualizationModule, 'DesignerVisualization').mockImplementation(() => {
      probe();
      return <div data-testid="designer-visualization" />;
    });

    renderRouteVisualization();

    for (let i = 0; i < 5 && !screen.queryByTestId('designer-visualization'); i++) {
      await act(async () => {
        fetchResolve();
      });
    }

    expect(screen.getByTestId('designer-visualization')).toBeInTheDocument();
  };

  it('provides the suggestion registry that the forms of the side panel require', async () => {
    // The side panel forms register their suggestion providers through useSuggestionRegistry(),
    // which throws without a SuggestionRegistryProvider above the canvas.
    let hasSuggestionRegistry = false;

    await renderWithProbe(() => {
      hasSuggestionRegistry = useSuggestionRegistry() !== undefined;
    });

    expect(hasSuggestionRegistry).toBe(true);
  });

  it('provides the catalog modal that adding, replacing and duplicating steps require', async () => {
    let hasCatalogModal = false;

    await renderWithProbe(() => {
      hasCatalogModal = useContext(CatalogModalContext) !== undefined;
    });

    expect(hasCatalogModal).toBe(true);
  });

  describe('code round trip', () => {
    /** A host that stores every change of the canvas and feeds it back as `code`, like a controlled input */
    const ControlledHost: FunctionComponent<{
      initialCode: string;
      onReady: (setCode: (code: string) => void) => void;
    }> = ({ initialCode, onReady }) => {
      const [code, setCode] = useState(initialCode);
      useEffect(() => {
        onReady(setCode);
      }, [onReady]);
      return (
        <RouteVisualization
          catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
          runtimeCatalogName=""
          testingCatalogName=""
          code={code}
          codeChange={setCode}
        />
      );
    };

    let setHostCode: (code: string) => void;
    let codeUpdatedSpy: Mock<(payload: { code: string; path?: string }) => void>;
    let unsubscribe: () => void;

    beforeEach(() => {
      codeUpdatedSpy = vi.fn<(payload: { code: string; path?: string }) => void>();
      unsubscribe = EventNotifier.getInstance().subscribe('code:updated', codeUpdatedSpy);
      render(<ControlledHost initialCode={camelRouteYaml} onReady={(setCode) => (setHostCode = setCode)} />);
      codeUpdatedSpy.mockClear();
    });

    afterEach(() => {
      unsubscribe();
    });

    it('does not feed the code produced by the canvas back into it, so the model and the selection survive an edit', () => {
      act(() => {
        EventNotifier.getInstance().next('entities:updated', `${camelRouteYaml}# edited on the canvas\n`);
      });

      expect(codeUpdatedSpy).not.toHaveBeenCalled();
    });

    it('still forwards code that the host changes on its own', () => {
      act(() => {
        setHostCode(`${camelRouteYaml}# changed by the host\n`);
      });

      expect(codeUpdatedSpy).toHaveBeenCalledWith({ code: `${camelRouteYaml}# changed by the host\n` });
    });

    it('forwards the code again when the host restores a version the canvas produced earlier', () => {
      const canvasCode = `${camelRouteYaml}# edited on the canvas\n`;
      act(() => {
        EventNotifier.getInstance().next('entities:updated', canvasCode);
      });
      act(() => {
        setHostCode(camelRouteYaml);
      });
      codeUpdatedSpy.mockClear();

      act(() => {
        setHostCode(canvasCode);
      });

      expect(codeUpdatedSpy).toHaveBeenCalledWith({ code: canvasCode });
    });
  });
});

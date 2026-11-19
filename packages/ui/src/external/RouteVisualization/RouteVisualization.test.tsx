import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogDefinition, CatalogLibrary } from '@kaoto/camel-catalog/types';
import { useSuggestionRegistry } from '@kaoto/forms';
import { act, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, useContext, useEffect, useState } from 'react';
import type { Mock } from 'vitest';

import { Anchors } from '../../components/registers/anchors';
import { IInteractionType } from '../../components/registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../components/registers/interactions/node-interaction-addon.provider';
import { componentModeRegistration, groupAutoStartupRegistration } from '../../components/registers/RegisterComponents';
import { RenderingAnchorContext } from '../../components/RenderingAnchor/rendering.provider';
import { IRegisteredValidatedComponent } from '../../components/RenderingAnchor/rendering.provider.model';
import * as VisualizationModule from '../../components/Visualization';
import { CatalogModalContext } from '../../dynamic-catalog/catalog-modal.provider';
import { IVisualizationNode } from '../../models';
import { ActionConfirmationModalContext } from '../../providers/action-confirmation-modal.provider';
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

  it('shows the broken-file state while the code does not parse, without writing to it, and the canvas again once it does', async () => {
    const codeChange = vi.fn();
    const renderWithCode = (code: string) => (
      <RouteVisualization
        catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
        runtimeCatalogName=""
        testingCatalogName=""
        code={code}
        codeChange={codeChange}
      />
    );
    const { rerender } = render(renderWithCode(camelRouteYaml));
    for (let i = 0; i < 5 && !document.querySelector('.canvas-surface'); i++) {
      await act(async () => {
        fetchResolve();
      });
    }
    const graph = document.querySelector('[data-kind="graph"]');
    expect(graph).toBeInTheDocument();
    codeChange.mockClear();

    rerender(renderWithCode('- route:\n    from:\n      uri: timer:tick\n     steps: [\n'));

    expect(await screen.findByTestId('broken-file-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('broken-file-parse-error')).toHaveTextContent('line 4');
    expect(codeChange).not.toHaveBeenCalled();

    rerender(renderWithCode(camelRouteYaml));

    await waitFor(() => {
      expect(screen.queryByTestId('broken-file-empty-state')).not.toBeInTheDocument();
    });
    /* The canvas stayed mounted throughout */
    expect(document.querySelector('[data-kind="graph"]')).toBe(graph);
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

  it('provides the confirmation modal that deleting a step with children requires', async () => {
    let hasConfirmationModal = false;

    await renderWithProbe(() => {
      hasConfirmationModal = useContext(ActionConfirmationModalContext) !== undefined;
    });

    expect(hasConfirmationModal).toBe(true);
  });

  it('registers the component mode selector and the auto startup switch, but not the DataMapper launcher', async () => {
    // A `to` step that is also a Kaoto DataMapper step activates both form header registrations
    const dataMapperToNode = {
      data: {
        primaryNodeId: { name: 'to' },
        definition: { id: 'kaoto-datamapper-1234', steps: [{ to: 'xslt-saxon:mapping.xsl' }] },
      },
    } as unknown as IVisualizationNode;
    const routeGroupNode = {
      data: { isGroup: true, entity: { getRootPath: () => 'route' } },
    } as unknown as IVisualizationNode;
    let formHeaderComponents: IRegisteredValidatedComponent[] = [];
    let groupTitlebarComponents: IRegisteredValidatedComponent[] = [];

    await renderWithProbe(() => {
      const { getRegisteredComponents } = useContext(RenderingAnchorContext);
      formHeaderComponents = getRegisteredComponents(Anchors.CanvasFormHeader, dataMapperToNode);
      groupTitlebarComponents = getRegisteredComponents(Anchors.CanvasGroupTitlebar, routeGroupNode);
    });

    // The DataMapper launcher navigates to a DataMapper page that hosts of this component do not have
    expect(formHeaderComponents.map(({ Component }) => Component)).toEqual([componentModeRegistration.component]);
    expect(groupTitlebarComponents.map(({ Component }) => Component)).toEqual([groupAutoStartupRegistration.component]);
  });

  it('registers the node interaction addons of the DataMapper and Citrus steps', async () => {
    let getRegisteredInteractionAddons: ((interaction: IInteractionType) => unknown[]) | undefined;

    await renderWithProbe(() => {
      ({ getRegisteredInteractionAddons } = useContext(NodeInteractionAddonContext));
    });

    // The addons are registered in an effect, so they are read once the render has settled
    expect(getRegisteredInteractionAddons?.(IInteractionType.ON_DELETE)).toHaveLength(1);
    expect(getRegisteredInteractionAddons?.(IInteractionType.ON_DUPLICATE)).toHaveLength(1);
    expect(getRegisteredInteractionAddons?.(IInteractionType.ON_UPDATE)).toHaveLength(1);
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

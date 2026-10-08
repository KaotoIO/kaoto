import { VisualizationProvider } from '@patternfly/react-topology';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { AddStepMode, IVisualizationNode } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { ClipboardService } from '../../../../services/visualization/clipboard.service';
import { camelRouteJson, TestProvidersWrapper } from '../../../../stubs';
import { createRouteVisualizationController } from '../../../../stubs/route-visualization-controller';
import { ItemPasteStep } from './ItemPasteStep';

describe('ItemPasteStep', () => {
  const clipboardContent = { name: 'log', definition: { message: 'hello' } };
  const mockCatalogModalContext = {
    setIsModalOpen: vi.fn(),
    getNewComponent: vi.fn(),
    checkCompatibility: vi.fn(),
  };

  /** jsdom has no Permissions API: install one granting the clipboard access, and restore the original afterwards */
  let originalPermissions: PropertyDescriptor | undefined;
  let vizNode: IVisualizationNode;
  let updateEntitiesFromCamelResourceSpy: Mock;
  let wrapper: FunctionComponent<PropsWithChildren>;

  beforeEach(async () => {
    originalPermissions = Object.getOwnPropertyDescriptor(navigator, 'permissions');
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn().mockResolvedValue({ state: 'granted' }) },
    });
    vi.spyOn(ClipboardService, 'paste').mockResolvedValue(clipboardContent);
    mockCatalogModalContext.checkCompatibility.mockReset();

    const camelResource = new CamelRouteResource([cloneDeep(camelRouteJson)]);
    const { Provider, updateEntitiesFromCamelResourceSpy: updateSpy } = await TestProvidersWrapper({ camelResource });
    updateEntitiesFromCamelResourceSpy = updateSpy;

    const { controller, getVizNode } = await createRouteVisualizationController(camelResource);
    vizNode = getVizNode('route.from');

    wrapper = ({ children }) => (
      <Provider>
        <VisualizationProvider controller={controller}>
          <CatalogModalContext.Provider value={mockCatalogModalContext}>{children}</CatalogModalContext.Provider>
        </VisualizationProvider>
      </Provider>
    );
  });

  afterEach(() => {
    if (originalPermissions) {
      Object.defineProperty(navigator, 'permissions', originalPermissions);
    } else {
      Reflect.deleteProperty(navigator, 'permissions');
    }
  });

  it('should render Paste ContextMenuItem', async () => {
    mockCatalogModalContext.checkCompatibility.mockReturnValue(true);

    const { container, findByText } = render(
      <ItemPasteStep vizNode={vizNode} mode={AddStepMode.AppendStep} text="Paste as child" />,
      { wrapper },
    );
    await findByText('Paste as child');

    expect(container).toMatchSnapshot();
  });

  it('should not render Paste ContextMenuItem', async () => {
    mockCatalogModalContext.checkCompatibility.mockReturnValue(false);

    const { container } = render(
      <ItemPasteStep vizNode={vizNode} mode={AddStepMode.AppendStep} text="Paste as child" />,
      { wrapper },
    );
    await waitFor(() => {
      expect(mockCatalogModalContext.checkCompatibility).toHaveBeenCalled();
    });

    expect(container).toMatchSnapshot();
  });

  it('should call onPasteStep when the context menu item is clicked', async () => {
    mockCatalogModalContext.checkCompatibility.mockReturnValue(true);
    const pasteBaseEntityStepSpy = vi.spyOn(vizNode, 'pasteBaseEntityStep');

    const wrapperResult = render(
      <ItemPasteStep vizNode={vizNode} mode={AddStepMode.InsertChildStep} text="Paste as child" />,
      { wrapper },
    );
    fireEvent.click(await wrapperResult.findByText('Paste as child'));

    /* The real `usePasteStep` pastes the clipboard content into the node and refreshes the entities */
    await waitFor(() => {
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
    });
    expect(pasteBaseEntityStepSpy).toHaveBeenCalledWith(clipboardContent, AddStepMode.InsertChildStep);
  });
});

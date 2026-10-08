import { BaseEdge, NodeModel } from '@patternfly/react-topology';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import type { Mock, MockInstance } from 'vitest';

import { CatalogModalContext, CatalogModalContextValue } from '../../../../dynamic-catalog/catalog-modal.provider';
import {
  AddStepMode,
  createVisualizationNode,
  DefinedComponent,
  IVisualizationNode,
  IVisualizationNodeData,
} from '../../../../models';
import { CatalogKind } from '../../../../models/catalog-kind';
import { PlaceholderType } from '../../../../models/placeholder.constants';
import { TestProvidersWrapper } from '../../../../stubs';
import { TopologyElementWrapper } from '../../../../stubs/topology-element-wrapper';
import { ControllerService } from '../../Canvas/controller.service';
import { PlaceholderNode, PlaceholderNodeObserver } from './PlaceholderNode';

/** The component picked from the catalog modal when replacing / inserting a step */
const pickedComponent: DefinedComponent = { name: 'log', type: CatalogKind.Processor, definition: {} };

describe('PlaceholderNode', () => {
  let catalogModalContext: CatalogModalContextValue;
  let updateEntitiesFromCamelResource: Mock;

  beforeEach(() => {
    catalogModalContext = {
      getNewComponent: vi.fn().mockResolvedValue(pickedComponent),
      checkCompatibility: vi.fn(() => false),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Renders the placeholder from a real controller holding a node with the given data */
  const renderPlaceholder = async (data: NodeModel['data'], Component = PlaceholderNodeObserver) => {
    const controller = ControllerService.createController();
    controller.fromModel(
      {
        graph: { id: 'g1', type: 'graph' },
        nodes: [{ id: 'node-placeholder', type: 'node-placeholder', x: 0, y: 0, width: 90, height: 75, data }],
      },
      false,
    );
    const element = controller.getNodeById('node-placeholder')!;

    const { Provider, updateEntitiesFromCamelResourceSpy } = await TestProvidersWrapper();
    updateEntitiesFromCamelResource = updateEntitiesFromCamelResourceSpy;
    const Wrapper = ({ children }: PropsWithChildren) => (
      <Provider>
        <CatalogModalContext.Provider value={catalogModalContext}>
          <TopologyElementWrapper controller={controller} element={element}>
            {children}
          </TopologyElementWrapper>
        </CatalogModalContext.Provider>
      </Provider>
    );

    return render(<Component element={element} />, { wrapper: Wrapper });
  };

  it('should throw an error if not used on Node elements', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      render(<PlaceholderNodeObserver element={edgeElement} />);
    }).toThrow('PlaceholderNode must be used only on Node elements');
  });

  it('should return null when element has no vizNode in data', async () => {
    const wrapper = await renderPlaceholder({});

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it('should render placeholder container with data-testid when vizNode is provided', async () => {
    const vizNode = createVisualizationNode('route.from.steps.1.placeholder', {
      name: PlaceholderType.Placeholder,
      path: 'route.from.steps.1.placeholder',
      isPlaceholder: true,
      isGroup: false,
      title: '',
      description: '',
      iconUrl: '',
    }) as IVisualizationNode;
    vi.spyOn(vizNode, 'getNodeLabel').mockReturnValue(PlaceholderType.Placeholder);
    vi.spyOn(vizNode, 'getId').mockReturnValue('route-1234');

    await renderPlaceholder({ vizNode }, PlaceholderNode);

    const placeholderNode = screen.getByTestId('placeholder-node__route.from.steps.1.placeholder');
    expect(placeholderNode).toBeInTheDocument();
  });

  describe('isSpecialChildPlaceholder', () => {
    let addBaseEntityStepSpy: MockInstance<IVisualizationNode['addBaseEntityStep']>;

    const createPlaceholderVizNode = (vizNodeData: Partial<IVisualizationNodeData>) => {
      const vizNode = createVisualizationNode('test-placeholder', {
        path: 'test.placeholder',
        isPlaceholder: true,
        ...vizNodeData,
      } as IVisualizationNodeData);
      addBaseEntityStepSpy = vi.spyOn(vizNode, 'addBaseEntityStep').mockReturnValue(undefined);

      return vizNode;
    };

    const setupWithVizNode = async (vizNodeData: Partial<IVisualizationNodeData>) => {
      const vizNode = createPlaceholderVizNode(vizNodeData);

      return renderPlaceholder({ vizNode });
    };

    /** The placeholder inserted a step (`useInsertStep`) */
    const expectInsertStep = async (component: DefinedComponent, insertAtStart?: boolean) => {
      await waitFor(() => {
        expect(updateEntitiesFromCamelResource).toHaveBeenCalledTimes(1);
      });
      expect(addBaseEntityStepSpy).toHaveBeenCalledTimes(1);
      expect(addBaseEntityStepSpy).toHaveBeenCalledWith(
        component,
        AddStepMode.InsertSpecialChildStep,
        undefined,
        insertAtStart,
      );
    };

    /** The placeholder replaced itself (`useReplaceStep`) */
    const expectReplaceNode = async () => {
      await waitFor(() => {
        expect(updateEntitiesFromCamelResource).toHaveBeenCalledTimes(1);
      });
      expect(catalogModalContext.getNewComponent).toHaveBeenCalledTimes(1);
      expect(addBaseEntityStepSpy).toHaveBeenCalledTimes(1);
      expect(addBaseEntityStepSpy).toHaveBeenCalledWith(pickedComponent, AddStepMode.ReplaceStep);
    };

    it.each([
      ['PlusCircleIcon for special child placeholder', PlaceholderType.PlaceholderSpecialChild],
      ['PlusCircleIcon for regular placeholder', PlaceholderType.Placeholder],
      ['CodeBranchIcon for other placeholders', 'when'],
    ])('should render %s', async (_label, name) => {
      const wrapper = await setupWithVizNode({ name, primaryNodeId: { name, catalogKind: CatalogKind.Pattern } });

      const svgIcon = wrapper.container.querySelector('.placeholder-node__container__image svg');
      expect(svgIcon).toBeInTheDocument();
      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it('should call onInsertStep when clicking on special child placeholder', async () => {
      await setupWithVizNode({
        name: PlaceholderType.PlaceholderSpecialChild,
        primaryNodeId: { name: PlaceholderType.PlaceholderSpecialChild, catalogKind: CatalogKind.Pattern },
      });

      const placeholderNode = screen.getByTestId('placeholder-node__test-placeholder');
      fireEvent.click(placeholderNode);

      /* The special child is picked from the catalog and inserted into the placeholder node */
      expect(catalogModalContext.getNewComponent).toHaveBeenCalledTimes(1);
      await expectInsertStep(pickedComponent);
    });

    it('should call onReplaceNode when clicking on regular placeholder', async () => {
      await setupWithVizNode({
        name: PlaceholderType.Placeholder,
        primaryNodeId: { name: PlaceholderType.Placeholder, catalogKind: CatalogKind.Pattern },
      });

      const placeholderNode = screen.getByTestId('placeholder-node__test-placeholder');
      fireEvent.click(placeholderNode);

      await expectReplaceNode();
    });

    it('should call onReplaceNode when Enter is pressed on a regular placeholder', async () => {
      await setupWithVizNode({
        name: PlaceholderType.Placeholder,
        primaryNodeId: { name: PlaceholderType.Placeholder, catalogKind: CatalogKind.Pattern },
      });

      const placeholderNode = screen.getByTestId('placeholder-node__test-placeholder');
      fireEvent.keyDown(placeholderNode, { key: 'Enter' });

      await expectReplaceNode();
    });

    it('should have role="button" and aria-label containing "Add step" for a regular placeholder', async () => {
      const vizNode = createPlaceholderVizNode({
        name: PlaceholderType.Placeholder,
        primaryNodeId: { name: PlaceholderType.Placeholder, catalogKind: CatalogKind.Pattern },
      });
      vi.spyOn(vizNode, 'getNodeLabel').mockReturnValue(PlaceholderType.Placeholder);

      await renderPlaceholder({ vizNode });

      const placeholderNode = screen.getByTestId('placeholder-node__test-placeholder');
      expect(placeholderNode).toHaveAttribute('role', 'button');
      expect(placeholderNode).toHaveAttribute('aria-label', expect.stringContaining('Add step'));
    });

    it('should call onInsertStep when clicking on otherwise placeholder', async () => {
      await setupWithVizNode({
        name: 'otherwise',
        isPlaceholder: true,
        primaryNodeId: { name: 'otherwise', catalogKind: CatalogKind.Pattern },
      });

      const placeholderNode = screen.getByTestId('placeholder-node__test-placeholder');
      fireEvent.click(placeholderNode);

      /* The `otherwise` branch is inserted directly, without opening the catalog */
      await expectInsertStep({ name: 'otherwise', type: CatalogKind.Processor }, true);
      expect(catalogModalContext.getNewComponent).not.toHaveBeenCalled();
    });

    it('should call onInsertStep when clicking on when placeholder', async () => {
      await setupWithVizNode({
        name: 'when',
        isPlaceholder: true,
        primaryNodeId: { name: 'when', catalogKind: CatalogKind.Pattern },
      });

      const placeholderNode = screen.getByTestId('placeholder-node__test-placeholder');
      fireEvent.click(placeholderNode);

      /* The `when` branch is inserted directly, without opening the catalog */
      await expectInsertStep({ name: 'when', type: CatalogKind.Processor }, true);
      expect(catalogModalContext.getNewComponent).not.toHaveBeenCalled();
    });
  });
});

import { NodeToolbarTrigger } from '@kaoto/editor-api';
import { BaseEdge, DndManager, DndManagerImpl, DndStore, NodeModel, Visualization } from '@patternfly/react-topology';
import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { CatalogModalContext, CatalogModalContextValue } from '../../../../dynamic-catalog/catalog-modal.provider';
import { createVisualizationNode, IVisualizationNode } from '../../../../models';
import { SettingsModel } from '../../../../models/settings/settings.model';
import { SettingsProvider } from '../../../../providers/settings.provider';
import { TestProvidersWrapper } from '../../../../stubs';
import { TopologyElementWrapper } from '../../../../stubs/topology-element-wrapper';
import { ControllerService } from '../../Canvas/controller.service';
import { NODE_DRAG_TYPE } from '../customComponentUtils';
import { CustomGroupExpanded } from './CustomGroupExpanded';

const GROUP_ID = 'node-choice-1';

describe('CustomGroupExpanded', () => {
  let controller: Visualization;

  /** Builds a real controller holding the expanded group (and any extra node) */
  const createController = (groupData?: NodeModel['data'], extraNodes: NodeModel[] = []) => {
    controller = ControllerService.createController();
    controller.fromModel(
      {
        graph: { id: 'g1', type: 'graph' },
        nodes: [
          { id: GROUP_ID, type: 'group', group: true, x: 0, y: 0, width: 100, height: 50, data: groupData },
          ...extraNodes,
        ],
      },
      false,
    );
  };

  beforeEach(() => {
    createController();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function renderInContext(children: React.ReactNode) {
    const { Provider } = await TestProvidersWrapper();
    const element = controller.getNodeById(GROUP_ID)!;
    const result = render(
      <Provider>
        <TopologyElementWrapper controller={controller} element={element}>
          {children}
        </TopologyElementWrapper>
      </Provider>,
    );
    // Wait for async icon loading to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    return result;
  }

  const createChoiceVizNode = (overrides: Partial<IVisualizationNode['data']> = {}) => {
    const vizNode = createVisualizationNode('choice-1', {
      name: 'choice',
      path: 'route.from.steps.0.choice',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      ...overrides,
    }) as IVisualizationNode;
    vi.spyOn(vizNode, 'getNodeLabel').mockReturnValue('Choice');
    vi.spyOn(vizNode, 'getNodeValidationText').mockResolvedValue(undefined);

    return vizNode;
  };

  it('should throw when element is not a Node', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      render(<CustomGroupExpanded element={edgeElement} />);
    }).toThrow('CustomGroupExpanded must be used only on Node elements');
  });

  it('should return null when element has no vizNode in data', async () => {
    createController({});
    const element = controller.getNodeById(GROUP_ID)!;

    const { container } = await renderInContext(<CustomGroupExpanded element={element} />);

    expect(container).toMatchSnapshot();
  });

  it('should render group container with data-testid when vizNode is provided', async () => {
    const vizNode = createChoiceVizNode();
    createController({ vizNode });
    const element = controller.getNodeById(GROUP_ID)!;

    await renderInContext(<CustomGroupExpanded element={element} />);

    const group = await screen.findByTestId('custom-group__choice-1');
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('data-grouplabel', 'Choice');
  });

  it('should fall back to iconAlt for the image alt text when description is empty', async () => {
    // The <img> only renders when iconUrl is truthy, and its `alt` uses
    // `description || iconAlt`. So to reach the iconAlt fallback (CustomGroupExpanded.tsx:236)
    // we need: iconUrl set, description empty, and iconAlt as a string.
    const vizNode = createChoiceVizNode({ iconUrl: 'data:image/svg+xml;base64,icon', iconAlt: 'Choice icon' });
    createController({ vizNode });
    const element = controller.getNodeById(GROUP_ID)!;

    await renderInContext(<CustomGroupExpanded element={element} />);

    expect(await screen.findByRole('img')).toHaveAttribute('alt', 'Choice icon');
  });

  it('should render icon placeholder when group has validation warnings', async () => {
    const vizNode = createChoiceVizNode();
    vi.spyOn(vizNode, 'getNodeValidationText').mockResolvedValue('Some validation warning');
    createController({ vizNode });
    const element = controller.getNodeById(GROUP_ID)!;

    await renderInContext(<CustomGroupExpanded element={element} />);

    expect(document.querySelector('.custom-group__container__icon-placeholder')).toBeInTheDocument();
  });

  it('should show toolbar when nodeToolbarTrigger is onSelection and group is selected (covers shouldShowToolbar branch)', async () => {
    const vizNode = createVisualizationNode('when-0', {
      name: 'when',
      path: 'route.from.steps.0.choice.when.0',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;
    vi.spyOn(vizNode, 'getNodeLabel').mockReturnValue('when-setHeader');
    vi.spyOn(vizNode, 'getNodeValidationText').mockResolvedValue(undefined);
    createController({ vizNode });
    const element = controller.getNodeById(GROUP_ID)!;

    const onSelectionAdapter = {
      getSettings: () => new SettingsModel({ nodeToolbarTrigger: NodeToolbarTrigger.onSelection }),
      saveSettings: vi.fn(),
    };

    await renderInContext(
      <SettingsProvider adapter={onSelectionAdapter}>
        <CustomGroupExpanded element={element} selected />
      </SettingsProvider>,
    );

    expect(await screen.findByTestId('step-toolbar')).toBeInTheDocument();
  });

  it('calls getNodeDragAndDropDirection when droppable, canDrop and hover are true (line 162)', async () => {
    /** The group parent accepts special children, so the dragged `when` can be dropped into the `choice` group */
    const parentVizNode = createVisualizationNode('route', {
      name: 'route',
      path: 'route',
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;
    vi.spyOn(parentVizNode, 'getNodeInteraction').mockReturnValue({
      canHavePreviousStep: false,
      canHaveNextStep: false,
      canHaveChildren: true,
      canHaveSpecialChildren: true,
      canReplaceStep: false,
      canRemoveStep: false,
      canRemoveFlow: false,
      canBeDisabled: false,
    });

    const groupVizNode = createChoiceVizNode();
    parentVizNode.addChild(groupVizNode);
    vi.spyOn(groupVizNode, 'getCopiedContent').mockReturnValue({
      name: 'choice',
      definition: {},
    });

    const draggedVizNode = createVisualizationNode('when-0', {
      name: 'when',
      path: 'route.from.steps.0.choice.when.0',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;
    vi.spyOn(draggedVizNode, 'getCopiedContent').mockReturnValue({
      name: 'choice',
      definition: {},
    });

    createController({ vizNode: groupVizNode }, [
      { id: 'node-when-0', type: 'node', x: 200, y: 0, width: 50, height: 50, data: { vizNode: draggedVizNode } },
    ]);
    const element = controller.getNodeById(GROUP_ID)!;
    const draggedElement = controller.getNodeById('node-when-0')!;

    /* Capture the id of the group drop target registered on the real drag and drop manager */
    const registerTargetSpy = vi.spyOn(DndManagerImpl.prototype, 'registerTarget');
    const catalogModalContext: CatalogModalContextValue = {
      getNewComponent: vi.fn(),
      checkCompatibility: vi.fn(() => true),
    };

    await renderInContext(
      <CatalogModalContext.Provider value={catalogModalContext}>
        <CustomGroupExpanded element={element} />
      </CatalogModalContext.Provider>,
    );

    const dndManager: DndManager = controller.getStore<DndStore>().dndManager;
    const [groupTargetId] = registerTargetSpy.mock.results[0].value;
    const [draggedSourceId] = dndManager.registerSource({
      type: NODE_DRAG_TYPE,
      canDrag: () => true,
      beginDrag: () => draggedElement,
      drag: () => {},
      endDrag: () => {},
      canCancel: () => true,
    });

    /* Drag the `when` node over the group */
    act(() => {
      dndManager.beginDrag(draggedSourceId, undefined, 10, 10, 10, 10);
      dndManager.hover([groupTargetId]);
    });

    expect(catalogModalContext.checkCompatibility).toHaveBeenCalled();
    /* getNodeDragAndDropDirection resolves a forward drop, highlighted on the right while hovering */
    expect(screen.getByTestId(`${groupVizNode.getId()}|choice-1`)).toHaveClass(
      'custom-group__container__dropTarget-right',
    );
  });
});

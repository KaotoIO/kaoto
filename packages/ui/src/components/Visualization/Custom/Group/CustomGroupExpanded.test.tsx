import * as ReactTopology from '@patternfly/react-topology';
import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { CatalogKind, createVisualizationNode, IVisualizationNode } from '../../../../models';
import { NodeToolbarTrigger, SettingsModel } from '../../../../models/settings/settings.model';
import { SettingsProvider } from '../../../../providers/settings.provider';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { getNodeDragAndDropDirection } from '../Node/CustomNodeUtils';
import { CustomGroupExpanded } from './CustomGroupExpanded';

const mockRef = { current: null };

jest.mock('@patternfly/react-topology', () => {
  const actual = jest.requireActual('@patternfly/react-topology');
  return {
    ...actual,
    Layer: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useDragNode: jest.fn(() => [{ node: undefined, dragEvent: undefined }, mockRef]),
    useDndDrop: jest.fn(() => [
      {
        droppable: false,
        hover: false,
        canDrop: false,
        dragItemType: undefined,
        dragItem: undefined,
      },
      mockRef,
    ]),
    useAnchor: () => {},
    useHover: () => [false, mockRef],
  };
});

jest.mock('../../../../hooks/processor-icon.hook', () => ({
  useProcessorIcon: () => ({ Icon: null, description: '' }),
}));

jest.mock('../../../IconResolver/node-icon-resolver', () => ({
  NodeIconResolver: {
    getIcon: jest.fn(() => Promise.resolve('data:image/svg+xml;base64,test')),
    getDefaultCamelIcon: jest.fn(() => 'data:image/svg+xml;base64,default'),
  },
}));

jest.mock('../Node/CustomNodeUtils', () => {
  const actual = jest.requireActual('../Node/CustomNodeUtils');
  return {
    ...actual,
    getNodeDragAndDropDirection: jest.fn(() => null),
  };
});

describe('CustomGroupExpanded', () => {
  let controller: ReturnType<typeof ControllerService.createController>;
  let element: BaseNode;
  let parentElement: BaseGraph;

  beforeEach(() => {
    parentElement = new BaseGraph();
    element = new BaseNode();
    controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function renderInContext(children: React.ReactNode) {
    const { Provider } = TestProvidersWrapper();
    const result = render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>{children}</ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );
    // Wait for async icon loading to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    return result;
  }

  it('should throw when element is not a Node', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      act(() => {
        render(<CustomGroupExpanded element={edgeElement} />);
      });
    }).toThrow('CustomGroupExpanded must be used only on Node elements');
  });

  it('should return null when element has no vizNode in data', async () => {
    jest.spyOn(element, 'getData').mockReturnValue({});

    const { container } = await renderInContext(<CustomGroupExpanded element={element} />);

    expect(container).toMatchSnapshot();
  });

  it('should render group container with data-testid when vizNode is provided', async () => {
    const vizNode = createVisualizationNode('choice-1', {
      catalogKind: CatalogKind.Processor,
      name: 'choice',
      path: 'route.from.steps.0.choice',
    }) as IVisualizationNode;
    jest.spyOn(vizNode, 'getNodeLabel').mockReturnValue('Choice');
    jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(undefined);
    jest.spyOn(vizNode, 'getNodeValidationText').mockReturnValue(undefined);
    jest.spyOn(vizNode, 'getTooltipContent').mockReturnValue('Choice');

    jest.spyOn(element, 'getData').mockReturnValue({ vizNode });
    jest.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    jest.spyOn(element, 'getId').mockReturnValue('node-choice-1');

    await renderInContext(<CustomGroupExpanded element={element} />);

    const group = screen.getByTestId('custom-group__choice-1');
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('data-grouplabel', 'Choice');
  });

  it('should render icon placeholder when group has validation warnings', async () => {
    const vizNode = createVisualizationNode('choice-1', {
      catalogKind: CatalogKind.Processor,
      name: 'choice',
      path: 'route.from.steps.0.choice',
    }) as IVisualizationNode;
    jest.spyOn(vizNode, 'getNodeLabel').mockReturnValue('Choice');
    jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(undefined);
    jest.spyOn(vizNode, 'getNodeValidationText').mockReturnValue('Some validation warning');
    jest.spyOn(vizNode, 'getTooltipContent').mockReturnValue('Choice');

    jest.spyOn(element, 'getData').mockReturnValue({ vizNode });
    jest.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    jest.spyOn(element, 'getId').mockReturnValue('node-choice-1');

    await renderInContext(<CustomGroupExpanded element={element} />);

    expect(document.querySelector('.custom-group__container__icon-placeholder')).toBeInTheDocument();
  });

  it('should show toolbar when nodeToolbarTrigger is onSelection and group is selected (covers shouldShowToolbar branch)', async () => {
    const vizNode = createVisualizationNode('when-0', {
      catalogKind: CatalogKind.Processor,
      name: 'when',
      path: 'route.from.steps.0.choice.when.0',
    }) as IVisualizationNode;
    jest.spyOn(vizNode, 'getNodeLabel').mockReturnValue('when-setHeader');
    jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(undefined);
    jest.spyOn(vizNode, 'getNodeValidationText').mockReturnValue(undefined);
    jest.spyOn(vizNode, 'getTooltipContent').mockReturnValue('When setHeader');

    jest.spyOn(element, 'getData').mockReturnValue({ vizNode });
    jest.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    jest.spyOn(element, 'getId').mockReturnValue('node-when-0');

    const onSelectionAdapter = {
      getSettings: () => new SettingsModel({ nodeToolbarTrigger: NodeToolbarTrigger.onSelection }),
      saveSettings: jest.fn(),
    };

    await renderInContext(
      <SettingsProvider adapter={onSelectionAdapter}>
        <CustomGroupExpanded element={element} selected={true} />
      </SettingsProvider>,
    );

    expect(screen.getByTestId('step-toolbar')).toBeInTheDocument();
  });

  it('calls getNodeDragAndDropDirection when droppable, canDrop and hover are true (line 162)', async () => {
    const groupVizNode = createVisualizationNode('choice-1', {
      catalogKind: CatalogKind.Processor,
      name: 'choice',
      path: 'route.from.steps.0.choice',
    }) as IVisualizationNode;
    jest.spyOn(groupVizNode, 'getNodeLabel').mockReturnValue('Choice');
    jest.spyOn(groupVizNode, 'getNodeDefinition').mockReturnValue(undefined);
    jest.spyOn(groupVizNode, 'getNodeValidationText').mockReturnValue(undefined);
    jest.spyOn(groupVizNode, 'getTooltipContent').mockReturnValue('Choice');

    const draggedVizNode = createVisualizationNode('when-0', {
      catalogKind: CatalogKind.Processor,
      name: 'when',
      path: 'route.from.steps.0.choice.when.0',
    }) as IVisualizationNode;

    const mockDraggedNode = {
      getData: () => ({ vizNode: draggedVizNode }),
      getId: () => 'node-when-0',
    };

    (ReactTopology.useDragNode as jest.Mock).mockReturnValueOnce([
      { node: mockDraggedNode, dragEvent: undefined },
      mockRef,
    ]);
    (ReactTopology.useDndDrop as jest.Mock).mockReturnValueOnce([
      { droppable: true, canDrop: true, hover: true, dragItemType: undefined, dragItem: undefined },
      mockRef,
    ]);

    jest.spyOn(element, 'getData').mockReturnValue({ vizNode: groupVizNode });
    jest.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    jest.spyOn(element, 'getId').mockReturnValue('node-choice-1');
    jest.spyOn(element, 'getBounds').mockReturnValue({ x: 0, y: 0, width: 100, height: 50 } as never);

    await renderInContext(<CustomGroupExpanded element={element} />);

    expect(getNodeDragAndDropDirection).toHaveBeenCalledWith(draggedVizNode, groupVizNode, false);
  });
});

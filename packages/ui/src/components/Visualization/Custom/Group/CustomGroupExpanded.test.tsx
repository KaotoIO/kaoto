import * as ReactTopology from '@patternfly/react-topology';
import { BaseEdge, BaseGraph, BaseNode, ElementContext, Rect, VisualizationProvider } from '@patternfly/react-topology';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import type { Mock } from 'vitest';

import { createVisualizationNode, IVisualizationNode } from '../../../../models';
import { NodeToolbarTrigger, SettingsModel } from '../../../../models/settings/settings.model';
import { SettingsProvider } from '../../../../providers/settings.provider';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { getNodeDragAndDropDirection } from '../Node/CustomNodeUtils';
import { CustomGroupExpanded } from './CustomGroupExpanded';

const mockRef = { current: null };

vi.mock('@patternfly/react-topology', async () => {
  const actual = await vi.importActual('@patternfly/react-topology');
  return {
    ...actual,
    Layer: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useDragNode: vi.fn(() => [{ node: undefined, dragEvent: undefined }, mockRef]),
    useDndDrop: vi.fn(() => [
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

vi.mock('../../../../utils/processor-icon', async () => ({
  getProcessorIcon: () => null,
}));

vi.mock('../../../../models/visualization/flows/nodes/resolvers/icon-resolver/node-icon-resolver', async () => ({
  NodeIconResolver: {
    getIcon: vi.fn(() => Promise.resolve('data:image/svg+xml;base64,test')),
    getDefaultCamelIcon: vi.fn(() => 'data:image/svg+xml;base64,default'),
  },
}));

vi.mock('../Node/CustomNodeUtils', async () => {
  const actual = await vi.importActual('../Node/CustomNodeUtils');
  return {
    ...actual,
    getNodeDragAndDropDirection: vi.fn(() => null),
  };
});

describe('CustomGroupExpanded', () => {
  let controller: ReturnType<typeof ControllerService.createController>;
  let element: BaseNode;
  let parentElement: BaseGraph;

  beforeEach(async () => {
    parentElement = new BaseGraph();
    element = new BaseNode();
    controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function renderInContext(children: React.ReactNode) {
    const { Provider } = await TestProvidersWrapper();
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
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      act(() => {
        render(<CustomGroupExpanded element={edgeElement} />);
      });
    }).toThrow('CustomGroupExpanded must be used only on Node elements');
  });

  it('should return null when element has no vizNode in data', async () => {
    vi.spyOn(element, 'getData').mockReturnValue({});

    const { container } = await renderInContext(<CustomGroupExpanded element={element} />);

    expect(container).toMatchSnapshot();
  });

  it('should render group container with data-testid when vizNode is provided', async () => {
    const vizNode = createVisualizationNode('choice-1', {
      name: 'choice',
      path: 'route.from.steps.0.choice',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;
    vi.spyOn(vizNode, 'getNodeLabel').mockReturnValue('Choice');
    vi.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(undefined);
    vi.spyOn(vizNode, 'getNodeValidationText').mockReturnValue(undefined);

    vi.spyOn(element, 'getData').mockReturnValue({ vizNode });
    vi.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    vi.spyOn(element, 'getId').mockReturnValue('node-choice-1');

    await renderInContext(<CustomGroupExpanded element={element} />);

    const group = screen.getByTestId('custom-group__choice-1');
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('data-grouplabel', 'Choice');
  });

  it('should fall back to iconAlt for the image alt text when description is empty', async () => {
    // The <img> only renders when iconUrl is truthy, and its `alt` uses
    // `description || iconAlt`. So to reach the iconAlt fallback (CustomGroupExpanded.tsx:236)
    // we need: iconUrl set, description empty, and iconAlt as a string.
    const vizNode = createVisualizationNode('choice-1', {
      name: 'choice',
      path: 'route.from.steps.0.choice',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: 'data:image/svg+xml;base64,icon',
      title: '',
      description: '',
      iconAlt: 'Choice icon',
    }) as IVisualizationNode;
    vi.spyOn(vizNode, 'getNodeLabel').mockReturnValue('Choice');
    vi.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(undefined);
    vi.spyOn(vizNode, 'getNodeValidationText').mockReturnValue(undefined);

    vi.spyOn(element, 'getData').mockReturnValue({ vizNode });
    vi.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    vi.spyOn(element, 'getId').mockReturnValue('node-choice-1');

    await renderInContext(<CustomGroupExpanded element={element} />);

    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Choice icon');
  });

  it('should render icon placeholder when group has validation warnings', async () => {
    const vizNode = createVisualizationNode('choice-1', {
      name: 'choice',
      path: 'route.from.steps.0.choice',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;
    vi.spyOn(vizNode, 'getNodeLabel').mockReturnValue('Choice');
    vi.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(undefined);
    vi.spyOn(vizNode, 'getNodeValidationText').mockReturnValue('Some validation warning');

    vi.spyOn(element, 'getData').mockReturnValue({ vizNode });
    vi.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    vi.spyOn(element, 'getId').mockReturnValue('node-choice-1');

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
    vi.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(undefined);
    vi.spyOn(vizNode, 'getNodeValidationText').mockReturnValue(undefined);

    vi.spyOn(element, 'getData').mockReturnValue({ vizNode });
    vi.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    vi.spyOn(element, 'getId').mockReturnValue('node-when-0');

    const onSelectionAdapter = {
      getSettings: () => new SettingsModel({ nodeToolbarTrigger: NodeToolbarTrigger.onSelection }),
      saveSettings: vi.fn(),
    };

    await renderInContext(
      <SettingsProvider adapter={onSelectionAdapter}>
        <CustomGroupExpanded element={element} selected />
      </SettingsProvider>,
    );

    expect(screen.getByTestId('step-toolbar')).toBeInTheDocument();
  });

  it('calls getNodeDragAndDropDirection when droppable, canDrop and hover are true (line 162)', async () => {
    const groupVizNode = createVisualizationNode('choice-1', {
      name: 'choice',
      path: 'route.from.steps.0.choice',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;
    vi.spyOn(groupVizNode, 'getNodeLabel').mockReturnValue('Choice');
    vi.spyOn(groupVizNode, 'getNodeDefinition').mockReturnValue(undefined);
    vi.spyOn(groupVizNode, 'getNodeValidationText').mockReturnValue(undefined);

    const draggedVizNode = createVisualizationNode('when-0', {
      name: 'when',
      path: 'route.from.steps.0.choice.when.0',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;

    const mockDraggedNode = {
      getData: () => ({ vizNode: draggedVizNode }),
      getId: () => 'node-when-0',
    };

    (ReactTopology.useDragNode as Mock).mockReturnValueOnce([{ node: mockDraggedNode, dragEvent: undefined }, mockRef]);
    (ReactTopology.useDndDrop as Mock).mockReturnValueOnce([
      { droppable: true, canDrop: true, hover: true, dragItemType: undefined, dragItem: undefined },
      mockRef,
    ]);

    vi.spyOn(element, 'getData').mockReturnValue({ vizNode: groupVizNode });
    vi.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    vi.spyOn(element, 'getId').mockReturnValue('node-choice-1');
    vi.spyOn(element, 'getBounds').mockReturnValue(new Rect(0, 0, 100, 50));

    await renderInContext(<CustomGroupExpanded element={element} />);

    expect(getNodeDragAndDropDirection).toHaveBeenCalledWith(draggedVizNode, groupVizNode, false);
  });
});

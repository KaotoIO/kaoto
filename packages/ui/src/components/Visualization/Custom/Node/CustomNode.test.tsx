import { BaseEdge, NodeModel } from '@patternfly/react-topology';
import { fireEvent, render, screen } from '@testing-library/react';

import { createVisualizationNode, IVisualizationNode } from '../../../../models';
import { TestProvidersWrapper } from '../../../../stubs';
import { TopologyElementWrapper } from '../../../../stubs/topology-element-wrapper';
import { ControllerService } from '../../Canvas/controller.service';
import { CustomNodeObserver } from './CustomNode';

/** Creates a real controller holding a single node built from the given data */
const createNodeInController = (data?: NodeModel['data']) => {
  const controller = ControllerService.createController();
  controller.fromModel(
    {
      graph: { id: 'g1', type: 'graph' },
      nodes: [{ id: 'node-log', type: 'node', x: 0, y: 0, width: 90, height: 75, data }],
    },
    false,
  );
  const element = controller.getNodeById('node-log')!;

  return { controller, element };
};

describe('CustomNode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderCustomNode = async (props?: {
    selected?: boolean;
    onSelect?: () => void;
    onContextMenu?: () => void;
    description?: string;
  }) => {
    const vizNode = createVisualizationNode('route.from.steps.0.log', {
      name: 'log',
      path: 'route.from.steps.0.log',
      isPlaceholder: false,
      isGroup: false,
      title: '',
      description: props?.description ?? '',
      iconUrl: '',
    }) as IVisualizationNode;
    vi.spyOn(vizNode, 'getNodeLabel').mockReturnValue('log');
    vi.spyOn(vizNode, 'getNodeValidationText').mockResolvedValue(undefined);
    vi.spyOn(vizNode, 'canDragNode').mockReturnValue(false);
    vi.spyOn(vizNode, 'canDropOnNode').mockReturnValue(false);

    const { controller, element } = createNodeInController({ vizNode });

    const { Provider } = await TestProvidersWrapper();

    const result = render(
      <Provider>
        <TopologyElementWrapper controller={controller} element={element}>
          <CustomNodeObserver
            element={element}
            selected={props?.selected}
            onSelect={props?.onSelect}
            onContextMenu={props?.onContextMenu}
          />
        </TopologyElementWrapper>
      </Provider>,
    );

    return { ...result, vizNode, element, controller };
  };

  it('should throw when element is not a Node', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      render(<CustomNodeObserver element={edgeElement} />);
    }).toThrow('CustomNode must be used only on Node elements');
  });

  it('should return null when element has no vizNode in data', async () => {
    const { controller, element } = createNodeInController({});

    const { Provider } = await TestProvidersWrapper();

    const { container } = render(
      <Provider>
        <TopologyElementWrapper controller={controller} element={element}>
          <CustomNodeObserver element={element} />
        </TopologyElementWrapper>
      </Provider>,
    );

    expect(container.querySelector('[data-testid^="custom-node__"]')).not.toBeInTheDocument();
  });

  it('should render node container with label from vizNode', async () => {
    await renderCustomNode();

    const node = screen.getByTestId('custom-node__route.from.steps.0.log');
    expect(node).toBeInTheDocument();
    expect(node).toHaveAttribute('data-nodelabel', 'log');
  });

  it('should return null when vizNode is undefined', async () => {
    const { controller, element } = createNodeInController();
    // Do NOT set vizNode in element data - it will be undefined

    const { Provider } = await TestProvidersWrapper();

    const { container } = render(
      <Provider>
        <TopologyElementWrapper controller={controller} element={element}>
          <CustomNodeObserver element={element} />
        </TopologyElementWrapper>
      </Provider>,
    );

    // The component should return null, resulting in empty render
    expect(container.querySelector('.custom-node')).toBeNull();
  });

  it('should have tabIndex=-1 when not selected', async () => {
    await renderCustomNode({ selected: false, description: 'Log step' });

    const nodeG = screen.getByTestId('custom-node__route.from.steps.0.log').closest('g')!;
    expect(nodeG).toHaveAttribute('tabindex', '-1');
    expect(nodeG).toHaveAttribute('role', 'button');
    expect(nodeG).toHaveAttribute('aria-label', 'log');
    expect(nodeG).toHaveAttribute('aria-pressed', 'false');
  });

  it('should have tabIndex=0 and aria-pressed=true when selected', async () => {
    await renderCustomNode({ selected: true, description: 'Log step' });

    const nodeG = screen.getByTestId('custom-node__route.from.steps.0.log').closest('g')!;
    expect(nodeG).toHaveAttribute('tabindex', '0');
    expect(nodeG).toHaveAttribute('aria-pressed', 'true');
  });

  it('should call onSelect when Enter is pressed', async () => {
    const onSelect = vi.fn();
    await renderCustomNode({ onSelect, description: 'Log step' });

    const nodeG = screen.getByTestId('custom-node__route.from.steps.0.log').closest('g')!;
    fireEvent.keyDown(nodeG, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should call onContextMenu when Shift+F10 is pressed', async () => {
    const onContextMenu = vi.fn();
    await renderCustomNode({ onContextMenu, description: 'Log step' });

    const nodeG = screen.getByTestId('custom-node__route.from.steps.0.log').closest('g')!;
    fireEvent.keyDown(nodeG, { key: 'F10', shiftKey: true });
    expect(onContextMenu).toHaveBeenCalledTimes(1);
  });
});

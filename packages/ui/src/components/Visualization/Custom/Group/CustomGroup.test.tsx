import { BaseEdge, NodeModel } from '@patternfly/react-topology';
import { render, screen } from '@testing-library/react';

import { createVisualizationNode, IVisualizationNode } from '../../../../models';
import { TestProvidersWrapper } from '../../../../stubs';
import { TopologyElementWrapper } from '../../../../stubs/topology-element-wrapper';
import { ControllerService } from '../../Canvas/controller.service';
import { CustomGroup } from './CustomGroup';

describe('CustomGroup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Renders the group from a real controller, holding a `choice` vizNode */
  const renderGroup = async (collapsed: boolean) => {
    const vizNode = createVisualizationNode('choice-1', {
      name: 'choice',
      path: 'route.from.steps.0.choice',
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: '',
    }) as IVisualizationNode;
    vi.spyOn(vizNode, 'getNodeLabel').mockReturnValue('Choice');
    vi.spyOn(vizNode, 'getNodeValidationText').mockResolvedValue(undefined);

    const groupModel: NodeModel = {
      id: 'group-choice-1',
      type: 'group',
      group: true,
      collapsed,
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      data: { vizNode },
    };
    const controller = ControllerService.createController();
    controller.fromModel({ graph: { id: 'g1', type: 'graph' }, nodes: [groupModel] }, false);
    const element = controller.getNodeById('group-choice-1')!;

    const { Provider } = await TestProvidersWrapper();

    render(
      <Provider>
        <TopologyElementWrapper controller={controller} element={element}>
          <CustomGroup element={element} />
        </TopologyElementWrapper>
      </Provider>,
    );
  };

  it('should throw when element is not a Node', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      render(<CustomGroup element={edgeElement} />);
    }).toThrow('CustomGroup must be used only on Node elements');
  });

  it('should render CustomNodeWithSelection when group is collapsed', async () => {
    await renderGroup(true);

    expect(screen.getByTestId('custom-node__choice-1')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-group__choice-1')).not.toBeInTheDocument();
  });

  it('should render CustomGroupExpanded when group is expanded', async () => {
    await renderGroup(false);

    expect(screen.getByTestId('custom-group__choice-1')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-node__choice-1')).not.toBeInTheDocument();
  });
});

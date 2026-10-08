import {
  BaseNode,
  ComponentFactory,
  DefaultNode,
  GraphComponent,
  integralShapePath,
  ModelKind,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
} from '@patternfly/react-topology';
import { render } from '@testing-library/react';

import TopologyEdge from './TopologyEdge';

const componentFactory: ComponentFactory = (kind: ModelKind) => {
  switch (kind) {
    case ModelKind.graph:
      return GraphComponent;
    case ModelKind.node:
      return DefaultNode;
    case ModelKind.edge:
      return TopologyEdge;
    default:
      return undefined;
  }
};

describe('TopologyEdge', () => {
  it('should throw when element is not an Edge', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const nodeElement = new BaseNode();

    expect(() => {
      render(<TopologyEdge element={nodeElement} />);
    }).toThrow('TopologyEdge must be used only on Edge elements');
  });

  it('should render TaskEdge with directional terminal and topology node separation', () => {
    const controller = new Visualization();
    controller.registerComponentFactory(componentFactory);
    controller.fromModel({
      graph: { id: 'graph', type: 'graph' },
      nodes: [
        { id: 'node-1', type: 'node', x: 0, y: 0, width: 50, height: 50 },
        { id: 'node-2', type: 'node', x: 200, y: 150, width: 50, height: 50 },
      ],
      edges: [{ id: 'edge-1', type: 'edge', source: 'node-1', target: 'node-2' }],
    });

    const { container } = render(
      <VisualizationProvider controller={controller}>
        <VisualizationSurface />
      </VisualizationProvider>,
    );

    const edge = container.querySelector('[data-id="edge-1"]');
    expect(edge).toBeInTheDocument();
    expect(edge?.querySelector('[data-test-id="task-handler"]')).toBeInTheDocument();

    /* The edge path is drawn with the topology node separation */
    const element = controller.getEdgeById('edge-1')!;
    const expectedPath = integralShapePath(element.getStartPoint(), element.getEndPoint(), 0, 20, false);
    expect(expectedPath).not.toBe(
      integralShapePath(element.getStartPoint(), element.getEndPoint(), 0, undefined, false),
    );
    const path = edge?.querySelector(`path[d="${expectedPath}"]`);
    expect(path).toBeInTheDocument();

    /* Only the end terminal is directional, so a single connector arrow is rendered */
    expect(edge?.querySelectorAll('.pf-topology-connector-arrow')).toHaveLength(1);
  });
});

import { CamelRouteResource } from '../models/camel';
import { FlowService } from '../components/Visualization/Canvas/flow.service';
import { camelRouteBranch } from '../stubs/camel-route-branch';

describe('Nodes and Edges', () => {
  beforeEach(() => {
    FlowService.nodes = [];
    FlowService.edges = [];
  });

  it('should generate edges for steps with branches', () => {
    const camelResource = new CamelRouteResource(camelRouteBranch);
    const [camelRoute] = camelResource.getVisualEntities();

    const rootVizNode = camelRoute.toVizNode();
    const { nodes, edges } = FlowService.getFlowDiagram(rootVizNode);

    expect(nodes).toMatchSnapshot();
    expect(edges).toMatchSnapshot();
  });
});

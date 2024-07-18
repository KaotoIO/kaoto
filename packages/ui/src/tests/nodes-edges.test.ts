import { CamelRouteResource } from '../models/camel';
import { CanvasService } from '../components/Visualization/Canvas/canvas.service';
import { camelRouteBranch } from '../stubs/camel-route-branch';

describe('Nodes and Edges', () => {
  beforeEach(() => {
    CanvasService.nodes = [];
    CanvasService.edges = [];
  });

  it('should generate edges for steps with branches', () => {
    const camelResource = new CamelRouteResource(camelRouteBranch);
    const [camelRoute] = camelResource.getVisualEntities();

    const rootVizNode = camelRoute.toVizNode();
    const { nodes, edges } = CanvasService.getFlowDiagram(rootVizNode);

    expect(nodes).toMatchSnapshot();
    expect(edges).toMatchSnapshot();
  });
});

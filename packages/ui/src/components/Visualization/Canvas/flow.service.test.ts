import { CamelRouteVisualEntity, createVisualizationNode } from '../../../models/visualization';
import { FlowService } from './flow.service';

describe('FlowService', () => {
  beforeEach(() => {
    FlowService.nodes = [];
    FlowService.edges = [];
  });

  it('should start with an empty nodes array', () => {
    expect(FlowService.nodes).toEqual([]);
  });

  it('should start with an empty edges array', () => {
    expect(FlowService.edges).toEqual([]);
  });

  describe('getFlowDiagram', () => {
    it('should return nodes and edges for a simple VisualizationNode', () => {
      const vizNodeWithEdges = { nodes: [createVisualizationNode('node', {})], edges: [] };

      const { nodes, edges } = FlowService.getFlowDiagram('test', vizNodeWithEdges);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a group with children', () => {
      const groupVizNode = createVisualizationNode('group', { isGroup: true });
      const child1VizNode = createVisualizationNode('child1', {});
      const child2VizNode = createVisualizationNode('child2', {});
      groupVizNode.addChild(child1VizNode);
      groupVizNode.addChild(child2VizNode);

      const { nodes, edges } = FlowService.getFlowDiagram('test', { nodes: [groupVizNode], edges: [] });

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a two-nodes VisualizationNode', () => {
      const vizNode = createVisualizationNode('node', {});
      const childNode = createVisualizationNode('child', {});
      vizNode.addChild(childNode);

      const { nodes, edges } = FlowService.getFlowDiagram('test', { nodes: [vizNode], edges: [] });

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a multiple nodes VisualizationNode', () => {
      const vizNode = createVisualizationNode('node', {});

      const setHeaderNode = createVisualizationNode('set-header', {});
      vizNode.setNextNode(setHeaderNode);
      setHeaderNode.setPreviousNode(vizNode);

      const choiceNode = createVisualizationNode('choice', {});
      setHeaderNode.setNextNode(choiceNode);
      choiceNode.setPreviousNode(setHeaderNode);

      const directNode = createVisualizationNode('direct', {});
      choiceNode.setNextNode(directNode);
      directNode.setPreviousNode(choiceNode);

      const whenNode = createVisualizationNode('when', {});
      choiceNode.addChild(whenNode);

      const otherwiseNode = createVisualizationNode('otherwise', {});
      choiceNode.addChild(otherwiseNode);

      const whenLeafNode = createVisualizationNode('when-leaf', {});
      whenNode.addChild(whenLeafNode);

      const processNode = createVisualizationNode('process', {});
      otherwiseNode.addChild(processNode);
      const logNode = createVisualizationNode('log', {});
      processNode.addChild(logNode);

      const { nodes, edges } = FlowService.getFlowDiagram('test', { nodes: [vizNode], edges: [] });

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return a group node for a multiple nodes VisualizationNode with a group', () => {
      const routeNode = new CamelRouteVisualEntity({ from: { uri: 'timer:clock', steps: [] } }).toVizNode();

      const { nodes, edges } = FlowService.getFlowDiagram('test', routeNode);

      expect(nodes).toHaveLength(3);
      expect(nodes[0].data?.vizNode?.data.path).toEqual('route.from');
      expect(nodes[1].data?.vizNode?.data.path).toEqual('route.from.steps.0.placeholder');
      expect(nodes[2].data?.vizNode?.data.path).toEqual('route');

      expect(edges).toHaveLength(1);
      expect(edges[0].source).toEqual('test|route.from');
      expect(edges[0].target).toEqual('test|route.from.steps.0.placeholder');

      const group = nodes[nodes.length - 1];
      expect(group.children).toEqual(['test|route.from', 'test|route.from.steps.0.placeholder']);
      expect(group.group).toBeTruthy();
    });

    it('should scope nodes & edges IDs', () => {
      const routeNode = new CamelRouteVisualEntity({
        route: { id: 'route-8888', from: { uri: 'timer:clock', steps: [{ to: { uri: 'log' } }] } },
      }).toVizNode();

      const { nodes, edges } = FlowService.getFlowDiagram('test', routeNode);

      expect(nodes).toHaveLength(3);
      expect(nodes[0].id).toEqual('test|route.from');
      expect(nodes[1].id).toEqual('test|route.from.steps.0.to');
      expect(nodes[2].id).toEqual('test|route');

      expect(edges).toHaveLength(1);
      expect(edges[0].id).toEqual('test|route.from >>> route.from.steps.0.to');
      expect(edges[0].source).toEqual('test|route.from');
      expect(edges[0].target).toEqual('test|route.from.steps.0.to');
    });
  });
});

import { EntityType } from '../../../models/entities';
import { CamelRouteVisualEntity, createVisualizationNode } from '../../../models/visualization';
import { camelRouteJson } from '../../../stubs/camel-route';
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
      const vizNode = createVisualizationNode('node', {
        name: EntityType.Route,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });

      const { nodes, edges } = FlowService.getFlowDiagram('test', vizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a group with children', () => {
      const groupVizNode = createVisualizationNode('group', {
        name: EntityType.Route,
        isGroup: true,
        isPlaceholder: false,
        iconUrl: '',
        title: '',
        description: '',
      });
      const child1VizNode = createVisualizationNode('child1', {
        name: EntityType.Route,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });
      const child2VizNode = createVisualizationNode('child2', {
        name: EntityType.Route,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });
      groupVizNode.addChild(child1VizNode);
      groupVizNode.addChild(child2VizNode);

      const { nodes, edges } = FlowService.getFlowDiagram('test', groupVizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a two-nodes VisualizationNode', () => {
      const vizNode = createVisualizationNode('node', {
        name: EntityType.Route,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });
      const childNode = createVisualizationNode('child', {
        name: EntityType.Route,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });
      vizNode.addChild(childNode);

      const { nodes, edges } = FlowService.getFlowDiagram('test', vizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a multiple nodes VisualizationNode', () => {
      const baseData = {
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      };
      const vizNode = createVisualizationNode('node', { name: EntityType.Route, ...baseData });

      const setHeaderNode = createVisualizationNode('set-header', {
        name: EntityType.Route,
        ...baseData,
      });
      vizNode.setNextNode(setHeaderNode);
      setHeaderNode.setPreviousNode(vizNode);

      const choiceNode = createVisualizationNode('choice', { name: EntityType.Route, ...baseData });
      setHeaderNode.setNextNode(choiceNode);
      choiceNode.setPreviousNode(setHeaderNode);

      const directNode = createVisualizationNode('direct', { name: EntityType.Route, ...baseData });
      choiceNode.setNextNode(directNode);
      directNode.setPreviousNode(choiceNode);

      const whenNode = createVisualizationNode('when', { name: EntityType.Route, ...baseData });
      choiceNode.addChild(whenNode);

      const otherwiseNode = createVisualizationNode('otherwise', {
        name: EntityType.Route,
        ...baseData,
      });
      choiceNode.addChild(otherwiseNode);

      const whenLeafNode = createVisualizationNode('when-leaf', {
        name: EntityType.Route,
        ...baseData,
      });
      whenNode.addChild(whenLeafNode);

      const processNode = createVisualizationNode('process', {
        name: EntityType.Route,
        ...baseData,
      });
      otherwiseNode.addChild(processNode);
      const logNode = createVisualizationNode('log', { name: EntityType.Route, ...baseData });
      processNode.addChild(logNode);

      const { nodes, edges } = FlowService.getFlowDiagram('test', vizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return a group node for a multiple nodes VisualizationNode with a group', async () => {
      const routeNode = await new CamelRouteVisualEntity({ from: { uri: 'timer:clock', steps: [] } }).toVizNode();

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

    it('should remove placeholders', async () => {
      const routeNode = await new CamelRouteVisualEntity(camelRouteJson).toVizNode();

      const { nodes, edges } = FlowService.getFlowDiagram('test', routeNode, { removePlaceholder: true });
      nodes.forEach((node) => {
        delete node.data!.vizNode;
      });

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should scope nodes & edges IDs', async () => {
      const routeNode = await new CamelRouteVisualEntity({
        route: { id: 'route-8888', from: { uri: 'timer:clock', steps: [{ to: { uri: 'log' } }] } },
      }).toVizNode();

      const { nodes, edges } = FlowService.getFlowDiagram('test', routeNode);

      expect(nodes).toHaveLength(4);
      expect(nodes[0].id).toEqual('test|route.from');
      expect(nodes[1].id).toEqual('test|route.from.steps.0.to');
      expect(nodes[2].id).toEqual('test|route.from.steps.1.placeholder');
      expect(nodes[3].id).toEqual('test|route');

      expect(edges).toHaveLength(2);
      expect(edges[0].id).toEqual('test|route.from >>> route.from.steps.0.to');
      expect(edges[0].source).toEqual('test|route.from');
      expect(edges[0].target).toEqual('test|route.from.steps.0.to');

      expect(edges[1].id).toEqual('test|route.from.steps.0.to >>> route.from.steps.1.placeholder');
      expect(edges[1].source).toEqual('test|route.from.steps.0.to');
      expect(edges[1].target).toEqual('test|route.from.steps.1.placeholder');
    });
  });
});

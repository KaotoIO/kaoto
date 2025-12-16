import { CatalogKind } from '../../../models';
import { EntityType } from '../../../models/camel/entities';
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
      const vizNode = createVisualizationNode('node', { catalogKind: CatalogKind.Entity, name: EntityType.Route });

      const { nodes, edges } = FlowService.getFlowDiagram('test', vizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a group with children', () => {
      const groupVizNode = createVisualizationNode('group', {
        catalogKind: CatalogKind.Entity,
        name: EntityType.Route,
        isGroup: true,
      });
      const child1VizNode = createVisualizationNode('child1', {
        catalogKind: CatalogKind.Entity,
        name: EntityType.Route,
      });
      const child2VizNode = createVisualizationNode('child2', {
        catalogKind: CatalogKind.Entity,
        name: EntityType.Route,
      });
      groupVizNode.addChild(child1VizNode);
      groupVizNode.addChild(child2VizNode);

      const { nodes, edges } = FlowService.getFlowDiagram('test', groupVizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a two-nodes VisualizationNode', () => {
      const vizNode = createVisualizationNode('node', { catalogKind: CatalogKind.Entity, name: EntityType.Route });
      const childNode = createVisualizationNode('child', { catalogKind: CatalogKind.Entity, name: EntityType.Route });
      vizNode.addChild(childNode);

      const { nodes, edges } = FlowService.getFlowDiagram('test', vizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a multiple nodes VisualizationNode', () => {
      const vizNode = createVisualizationNode('node', { catalogKind: CatalogKind.Entity, name: EntityType.Route });

      const setHeaderNode = createVisualizationNode('set-header', {
        catalogKind: CatalogKind.Entity,
        name: EntityType.Route,
      });
      vizNode.setNextNode(setHeaderNode);
      setHeaderNode.setPreviousNode(vizNode);

      const choiceNode = createVisualizationNode('choice', { catalogKind: CatalogKind.Entity, name: EntityType.Route });
      setHeaderNode.setNextNode(choiceNode);
      choiceNode.setPreviousNode(setHeaderNode);

      const directNode = createVisualizationNode('direct', { catalogKind: CatalogKind.Entity, name: EntityType.Route });
      choiceNode.setNextNode(directNode);
      directNode.setPreviousNode(choiceNode);

      const whenNode = createVisualizationNode('when', { catalogKind: CatalogKind.Entity, name: EntityType.Route });
      choiceNode.addChild(whenNode);

      const otherwiseNode = createVisualizationNode('otherwise', {
        catalogKind: CatalogKind.Entity,
        name: EntityType.Route,
      });
      choiceNode.addChild(otherwiseNode);

      const whenLeafNode = createVisualizationNode('when-leaf', {
        catalogKind: CatalogKind.Entity,
        name: EntityType.Route,
      });
      whenNode.addChild(whenLeafNode);

      const processNode = createVisualizationNode('process', {
        catalogKind: CatalogKind.Entity,
        name: EntityType.Route,
      });
      otherwiseNode.addChild(processNode);
      const logNode = createVisualizationNode('log', { catalogKind: CatalogKind.Entity, name: EntityType.Route });
      processNode.addChild(logNode);

      const { nodes, edges } = FlowService.getFlowDiagram('test', vizNode);

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

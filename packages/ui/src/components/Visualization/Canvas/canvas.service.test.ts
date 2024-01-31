import {
  BreadthFirstLayout,
  ColaLayout,
  ConcentricLayout,
  DagreLayout,
  DefaultEdge,
  EdgeAnimationSpeed,
  EdgeStyle,
  ForceLayout,
  GridLayout,
  ModelKind,
  Visualization,
} from '@patternfly/react-topology';
import { createVisualizationNode } from '../../../models/visualization';
import { CustomGroupWithSelection } from '../Custom';
import { CanvasDefaults } from './canvas.defaults';
import { LayoutType } from './canvas.models';
import { CanvasService } from './canvas.service';
import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';

describe('CanvasService', () => {
  const DEFAULT_NODE_PROPS = {
    type: 'node',
    data: undefined,
    shape: CanvasDefaults.DEFAULT_NODE_SHAPE,
    width: CanvasDefaults.DEFAULT_NODE_DIAMETER,
    height: CanvasDefaults.DEFAULT_NODE_DIAMETER,
  };

  const DEFAULT_EDGE_PROPS = {
    type: 'edge',
    edgeStyle: EdgeStyle.dashed,
    animationSpeed: EdgeAnimationSpeed.medium,
  };

  beforeEach(() => {
    CanvasService.nodes = [];
    CanvasService.edges = [];
  });

  it('should start with an empty nodes array', () => {
    expect(CanvasService.nodes).toEqual([]);
  });

  it('should start with an empty edges array', () => {
    expect(CanvasService.edges).toEqual([]);
  });

  it('should allow consumers to create a new controller and register its factories', () => {
    const layoutFactorySpy = jest.spyOn(Visualization.prototype, 'registerLayoutFactory');
    const componentFactorySpy = jest.spyOn(Visualization.prototype, 'registerComponentFactory');

    const controller = CanvasService.createController();

    expect(controller).toBeInstanceOf(Visualization);
    expect(layoutFactorySpy).toHaveBeenCalledWith(CanvasService.baselineLayoutFactory);
    expect(componentFactorySpy).toHaveBeenCalledWith(CanvasService.baselineComponentFactory);
  });

  describe('baselineComponentFactory', () => {
    it('should return the correct component for a group', () => {
      const component = CanvasService.baselineComponentFactory({} as ModelKind, 'group');

      expect(component).toBe(CustomGroupWithSelection);
    });

    it('should return the correct component for a graph', () => {
      const component = CanvasService.baselineComponentFactory(ModelKind.graph, 'graph');

      expect(component).toBeDefined();
    });

    it('should return the correct component for a node', () => {
      const component = CanvasService.baselineComponentFactory(ModelKind.node, 'node');

      expect(component).toBeDefined();
    });

    it('should return the correct component for an edge', () => {
      const component = CanvasService.baselineComponentFactory(ModelKind.edge, 'edge');

      expect(component).toBe(DefaultEdge);
    });

    it('should return undefined for an unknown type', () => {
      const component = CanvasService.baselineComponentFactory({} as ModelKind, 'unknown');

      expect(component).toBeUndefined();
    });
  });

  it.each([
    [LayoutType.BreadthFirst, BreadthFirstLayout],
    [LayoutType.Cola, ColaLayout],
    [LayoutType.ColaNoForce, ColaLayout],
    [LayoutType.ColaGroups, ColaLayout],
    [LayoutType.Concentric, ConcentricLayout],
    [LayoutType.DagreVertical, DagreLayout],
    [LayoutType.Force, ForceLayout],
    [LayoutType.Grid, GridLayout],
    ['unknown' as LayoutType, ColaLayout],
  ] as const)('baselineLayoutFactory [%s]', (type, layout) => {
    const newController = CanvasService.createController();
    newController.fromModel(
      {
        nodes: [],
        edges: [],
        graph: {
          id: 'g1',
          type: 'graph',
          layout: CanvasDefaults.DEFAULT_LAYOUT,
        },
      },
      false,
    );
    const layoutFactory = CanvasService.baselineLayoutFactory(type, newController.getGraph());

    expect(layoutFactory).toBeInstanceOf(layout);
  });

  describe('getFlowDiagram', () => {
    it('should return nodes and edges for a simple VisualizationNode', () => {
      const vizNode = createVisualizationNode('node', {});

      const { nodes, edges } = CanvasService.getFlowDiagram(vizNode);

      expect(nodes).toEqual([
        {
          ...DEFAULT_NODE_PROPS,
          id: 'node-1234',
          parentNode: undefined,
          data: { vizNode },
        },
      ]);
      expect(edges).toEqual([]);
    });

    it('should return nodes and edges for a two-nodes VisualizationNode', () => {
      const vizNode = createVisualizationNode('node', {});
      const childNode = createVisualizationNode('child', {});
      vizNode.addChild(childNode);

      const { nodes, edges } = CanvasService.getFlowDiagram(vizNode);

      expect(nodes).toEqual([
        {
          ...DEFAULT_NODE_PROPS,
          id: 'node-1234',
          parentNode: undefined,
          data: { vizNode },
        },
        {
          ...DEFAULT_NODE_PROPS,
          id: 'child-1234',
          parentNode: 'node-1234',
          data: { vizNode: childNode },
        },
      ]);
      expect(edges).toEqual([
        {
          id: 'node-1234-to-child-1234',
          source: 'node-1234',
          target: 'child-1234',
          ...DEFAULT_EDGE_PROPS,
        },
      ]);
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

      const { nodes, edges } = CanvasService.getFlowDiagram(vizNode);

      expect(nodes).toEqual([
        {
          ...DEFAULT_NODE_PROPS,
          id: 'node-1234',
          parentNode: undefined,
          data: { vizNode },
        },
        {
          ...DEFAULT_NODE_PROPS,
          id: 'set-header-1234',
          parentNode: undefined,
          data: { vizNode: setHeaderNode },
        },
        {
          ...DEFAULT_NODE_PROPS,
          id: 'choice-1234',
          parentNode: undefined,
          data: { vizNode: choiceNode },
        },
        {
          ...DEFAULT_NODE_PROPS,
          id: 'when-1234',
          parentNode: 'choice-1234',
          data: { vizNode: whenNode },
        },
        {
          ...DEFAULT_NODE_PROPS,
          id: 'when-leaf-1234',
          parentNode: 'when-1234',
          data: { vizNode: whenLeafNode },
        },
        {
          ...DEFAULT_NODE_PROPS,
          id: 'otherwise-1234',
          parentNode: 'choice-1234',
          data: { vizNode: otherwiseNode },
        },
        {
          ...DEFAULT_NODE_PROPS,
          id: 'process-1234',
          parentNode: 'otherwise-1234',
          data: { vizNode: processNode },
        },
        {
          ...DEFAULT_NODE_PROPS,
          id: 'log-1234',
          parentNode: 'process-1234',
          data: { vizNode: logNode },
        },
        {
          ...DEFAULT_NODE_PROPS,
          id: 'direct-1234',
          parentNode: undefined,
          data: { vizNode: directNode },
        },
      ]);
      expect(edges).toEqual([
        {
          id: 'node-1234-to-set-header-1234',
          source: 'node-1234',
          target: 'set-header-1234',
          ...DEFAULT_EDGE_PROPS,
        },
        {
          id: 'set-header-1234-to-choice-1234',
          source: 'set-header-1234',
          target: 'choice-1234',
          ...DEFAULT_EDGE_PROPS,
        },
        {
          id: 'choice-1234-to-when-1234',
          source: 'choice-1234',
          target: 'when-1234',
          ...DEFAULT_EDGE_PROPS,
        },
        {
          id: 'when-1234-to-when-leaf-1234',
          source: 'when-1234',
          target: 'when-leaf-1234',
          ...DEFAULT_EDGE_PROPS,
        },
        {
          id: 'choice-1234-to-otherwise-1234',
          source: 'choice-1234',
          target: 'otherwise-1234',
          ...DEFAULT_EDGE_PROPS,
        },
        {
          id: 'otherwise-1234-to-process-1234',
          source: 'otherwise-1234',
          target: 'process-1234',
          ...DEFAULT_EDGE_PROPS,
        },
        {
          id: 'process-1234-to-log-1234',
          source: 'process-1234',
          target: 'log-1234',
          ...DEFAULT_EDGE_PROPS,
        },
        {
          id: 'when-leaf-1234-to-direct-1234',
          source: 'when-leaf-1234',
          target: 'direct-1234',
          ...DEFAULT_EDGE_PROPS,
        },
        {
          id: 'log-1234-to-direct-1234',
          source: 'log-1234',
          target: 'direct-1234',
          ...DEFAULT_EDGE_PROPS,
        },
      ]);
    });

    it('should return a group node for a multiple nodes VisualizationNode with a group', () => {
      const routeNode = createVisualizationNode('route', {
        entity: { getId: () => 'myId' } as BaseVisualCamelEntity,
        isGroup: true,
      });

      const fromNode = createVisualizationNode('timer', {
        path: 'from',
        icon: undefined,
        processorName: 'from',
        componentName: 'timer',
      });
      routeNode.addChild(fromNode);

      const { nodes, edges } = CanvasService.getFlowDiagram(routeNode);

      expect(nodes).toHaveLength(2);
      expect(edges).toHaveLength(0);

      const group = nodes[nodes.length - 1];
      expect(group.children).toEqual(['timer-1234']);
      expect(group.group).toBeTruthy();
    });
  });
});

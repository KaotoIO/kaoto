import {
  BreadthFirstLayout,
  ColaLayout,
  ConcentricLayout,
  DefaultEdge,
  ForceLayout,
  GridLayout,
  ModelKind,
  Visualization,
} from '@patternfly/react-topology';
import { createVisualizationNode } from '../../../models/visualization';
import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { CustomGroupWithSelection } from '../Custom';
import { DagreGroupsExtendedLayout } from '../Custom/Layout/DagreGroupsExtendedLayout';
import { CanvasDefaults } from './canvas.defaults';
import { LayoutType } from './canvas.models';
import { CanvasService } from './canvas.service';

describe('CanvasService', () => {
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
    const baselineElementFactorySpy = jest.spyOn(Visualization.prototype, 'registerElementFactory');

    const controller = CanvasService.createController();

    expect(controller).toBeInstanceOf(Visualization);
    expect(layoutFactorySpy).toHaveBeenCalledWith(CanvasService.baselineLayoutFactory);
    expect(componentFactorySpy).toHaveBeenCalledWith(CanvasService.baselineComponentFactory);
    expect(baselineElementFactorySpy).toHaveBeenCalledWith(CanvasService.baselineElementFactory);
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
    [LayoutType.DagreVertical, DagreGroupsExtendedLayout],
    [LayoutType.DagreHorizontal, DagreGroupsExtendedLayout],
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

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a group with children', () => {
      const groupVizNode = createVisualizationNode('group', { isGroup: true });
      const child1VizNode = createVisualizationNode('child1', {});
      const child2VizNode = createVisualizationNode('child2', {});
      groupVizNode.addChild(child1VizNode);
      groupVizNode.addChild(child2VizNode);

      const { nodes, edges } = CanvasService.getFlowDiagram(groupVizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
    });

    it('should return nodes and edges for a two-nodes VisualizationNode', () => {
      const vizNode = createVisualizationNode('node', {});
      const childNode = createVisualizationNode('child', {});
      vizNode.addChild(childNode);

      const { nodes, edges } = CanvasService.getFlowDiagram(vizNode);

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

      const { nodes, edges } = CanvasService.getFlowDiagram(vizNode);

      expect(nodes).toMatchSnapshot();
      expect(edges).toMatchSnapshot();
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

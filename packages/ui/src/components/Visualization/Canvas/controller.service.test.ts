import { DagreGroupsLayout, ModelKind, Visualization } from '@patternfly/react-topology';
import { CustomGroupWithSelection } from '../Custom';
import { CustomEdge } from '../Custom/Edge/CustomEdge';
import { CanvasDefaults } from './canvas.defaults';
import { LayoutType } from './canvas.models';
import { ControllerService } from './controller.service';

describe('ControllerService', () => {
  it('should allow consumers to create a new controller and register its factories', () => {
    const layoutFactorySpy = jest.spyOn(Visualization.prototype, 'registerLayoutFactory');
    const componentFactorySpy = jest.spyOn(Visualization.prototype, 'registerComponentFactory');
    const baselineElementFactorySpy = jest.spyOn(Visualization.prototype, 'registerElementFactory');

    const controller = ControllerService.createController();

    expect(controller).toBeInstanceOf(Visualization);
    expect(layoutFactorySpy).toHaveBeenCalledWith(ControllerService.baselineLayoutFactory);
    expect(componentFactorySpy).toHaveBeenCalledWith(ControllerService.baselineComponentFactory);
    expect(baselineElementFactorySpy).toHaveBeenCalledWith(ControllerService.baselineElementFactory);
  });

  it('should generate an empty graph when creating a controller to force computing dimensions right away', () => {
    const fromModelSpy = jest.spyOn(Visualization.prototype, 'fromModel');

    const controller = ControllerService.createController();

    expect(controller).toBeInstanceOf(Visualization);
    expect(fromModelSpy).toHaveBeenCalledWith({
      graph: {
        id: 'g1',
        type: 'graph',
      },
    });
  });

  describe('baselineComponentFactory', () => {
    it('should return the correct component for a group', () => {
      const component = ControllerService.baselineComponentFactory({} as ModelKind, 'group');

      expect(component).toBe(CustomGroupWithSelection);
    });

    it('should return the correct component for a graph', () => {
      const component = ControllerService.baselineComponentFactory(ModelKind.graph, 'graph');

      expect(component).toBeDefined();
    });

    it('should return the correct component for a node', () => {
      const component = ControllerService.baselineComponentFactory(ModelKind.node, 'node');

      expect(component).toBeDefined();
    });

    it('should return the correct component for an edge', () => {
      const component = ControllerService.baselineComponentFactory(ModelKind.edge, 'edge');

      expect(component).toBe(CustomEdge);
    });

    it('should return undefined for an unknown type', () => {
      const component = ControllerService.baselineComponentFactory({} as ModelKind, 'unknown');

      expect(component).toBeUndefined();
    });
  });

  it.each([
    [LayoutType.DagreVertical, DagreGroupsLayout],
    [LayoutType.DagreHorizontal, DagreGroupsLayout],
    ['unknown' as LayoutType, DagreGroupsLayout],
  ] as const)('baselineLayoutFactory [%s]', (type, layout) => {
    const newController = ControllerService.createController();
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
    const layoutFactory = ControllerService.baselineLayoutFactory(type, newController.getGraph());

    expect(layoutFactory).toBeInstanceOf(layout);
  });
});

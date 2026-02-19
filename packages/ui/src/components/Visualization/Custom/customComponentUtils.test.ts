import { Edge, EdgeModel } from '@patternfly/react-topology';

import { CatalogModalContextValue } from '../../../dynamic-catalog/catalog-modal.provider';
import { AddStepMode, IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CamelComponentSchemaService } from '../../../models/visualization/flows/support/camel-component-schema.service';
import { CamelRouteVisualEntityData } from '../../../models/visualization/flows/support/camel-component-types';
import { EntitiesContextResult } from '../../../providers';
import { canDragGroup, canDropOnEdge } from './customComponentUtils';

describe('canDropOnEdge', () => {
  const getMockVizNode = (id: string): IVisualizationNode => {
    return {
      id,
      data: { path: `route.from.steps.${id}` },
      getNextNode: jest.fn(),
      getPreviousNode: jest.fn(),
      getCopiedContent: jest.fn().mockReturnValue({ name: 'test-component' }),
      getNodeDefinition: jest.fn().mockReturnValue({}),
    } as unknown as IVisualizationNode;
  };

  const createMockEdge = (
    sourceVizNode: IVisualizationNode,
    targetVizNode: IVisualizationNode,
  ): Edge<EdgeModel, unknown> => {
    const mockSource = {
      getData: jest.fn().mockReturnValue({ vizNode: sourceVizNode }),
    };
    const mockTarget = {
      getData: jest.fn().mockReturnValue({ vizNode: targetVizNode }),
    };

    return {
      getSource: jest.fn().mockReturnValue(mockSource),
      getTarget: jest.fn().mockReturnValue(mockTarget),
    } as unknown as Edge<EdgeModel, unknown>;
  };

  const createMockCamelResource = (): EntitiesContextResult['camelResource'] => {
    return {
      getCompatibleComponents: jest.fn().mockReturnValue([]),
    } as unknown as EntitiesContextResult['camelResource'];
  };

  const createMockCatalogModalContext = (): CatalogModalContextValue => {
    return {
      checkCompatibility: jest.fn().mockReturnValue(true),
      setIsModalOpen: jest.fn(),
      getNewComponent: jest.fn(),
    } as unknown as CatalogModalContextValue;
  };

  let draggedVizNode: IVisualizationNode;
  let sourceVizNode: IVisualizationNode;
  let targetVizNode: IVisualizationNode;
  let edge: Edge<EdgeModel, unknown>;
  let camelResource: EntitiesContextResult['camelResource'];
  let catalogModalContext: CatalogModalContextValue;

  beforeEach(() => {
    draggedVizNode = getMockVizNode('dragged');
    sourceVizNode = getMockVizNode('source');
    targetVizNode = getMockVizNode('target');
    edge = createMockEdge(sourceVizNode, targetVizNode);
    camelResource = createMockCamelResource();
    catalogModalContext = createMockCatalogModalContext();
  });

  it("should return false when dragged node's next node is the following node", () => {
    (draggedVizNode.getNextNode as jest.Mock).mockReturnValue(targetVizNode);

    const result = canDropOnEdge(draggedVizNode, edge, camelResource, catalogModalContext);

    expect(result).toBe(false);
    expect(camelResource.getCompatibleComponents).not.toHaveBeenCalled();
    expect(catalogModalContext.checkCompatibility).not.toHaveBeenCalled();
  });

  it("should return false when dragged node's previous node is the preceding node", () => {
    (draggedVizNode.getPreviousNode as jest.Mock).mockReturnValue(sourceVizNode);

    const result = canDropOnEdge(draggedVizNode, edge, camelResource, catalogModalContext);

    expect(result).toBe(false);
    expect(camelResource.getCompatibleComponents).not.toHaveBeenCalled();
    expect(catalogModalContext.checkCompatibility).not.toHaveBeenCalled();
  });

  it('should return false when following node is a placeholder', () => {
    targetVizNode.data.isPlaceholder = true;

    const result = canDropOnEdge(draggedVizNode, edge, camelResource, catalogModalContext);

    expect(result).toBe(false);
    expect(camelResource.getCompatibleComponents).not.toHaveBeenCalled();
    expect(catalogModalContext.checkCompatibility).not.toHaveBeenCalled();
  });

  it('should return false when both following and preceding nodes path has the dragged node path', () => {
    const draggedMockVizNode = getMockVizNode('0.choice');
    const sourceMockVizNode = getMockVizNode('0.choice.when.0.steps.0.to');
    const targetMockVizNode = getMockVizNode('0.choice.when.0.steps.1.log');

    draggedMockVizNode.getId = jest.fn().mockReturnValue('test-id');
    targetMockVizNode.getId = jest.fn().mockReturnValue('test-id');

    const mockEdge = createMockEdge(sourceMockVizNode, targetMockVizNode);

    const result = canDropOnEdge(draggedMockVizNode, mockEdge, camelResource, catalogModalContext);

    expect(result).toBe(false);
    expect(camelResource.getCompatibleComponents).not.toHaveBeenCalled();
    expect(catalogModalContext.checkCompatibility).not.toHaveBeenCalled();
  });

  it('should return true when both following and preceding nodes path has the dragged node path but different root', () => {
    const draggedMockVizNode = getMockVizNode('0.choice');
    const sourceMockVizNode = getMockVizNode('0.choice.when.0.steps.0.to');
    const targetMockVizNode = getMockVizNode('0.choice.when.0.steps.1.log');

    draggedMockVizNode.getId = jest.fn().mockReturnValue('test-id1');
    targetMockVizNode.getId = jest.fn().mockReturnValue('test-id2');

    const mockEdge = createMockEdge(sourceMockVizNode, targetMockVizNode);

    const result = canDropOnEdge(draggedMockVizNode, mockEdge, camelResource, catalogModalContext);

    expect(result).toBe(true);
    expect(camelResource.getCompatibleComponents).toHaveBeenCalled();
    expect(catalogModalContext.checkCompatibility).toHaveBeenCalled();
  });

  it('should return false when checkCompatibility returns false', () => {
    const mockFilter = ['filter1', 'filter2'];
    (camelResource.getCompatibleComponents as jest.Mock).mockReturnValue(mockFilter);
    (catalogModalContext.checkCompatibility as jest.Mock).mockReturnValue(false);

    const result = canDropOnEdge(draggedVizNode, edge, camelResource, catalogModalContext);

    expect(result).toBe(false);
    expect(camelResource.getCompatibleComponents).toHaveBeenCalledWith(
      AddStepMode.PrependStep,
      targetVizNode.data,
      targetVizNode.getNodeDefinition(),
    );
    expect(catalogModalContext.checkCompatibility).toHaveBeenCalledWith('test-component', mockFilter);
  });

  it('should return true when all conditions pass and checkCompatibility returns true', () => {
    const mockFilter = ['filter1', 'filter2'];
    (camelResource.getCompatibleComponents as jest.Mock).mockReturnValue(mockFilter);
    (catalogModalContext.checkCompatibility as jest.Mock).mockReturnValue(true);

    const result = canDropOnEdge(draggedVizNode, edge, camelResource, catalogModalContext);

    expect(result).toBe(true);
    expect(camelResource.getCompatibleComponents).toHaveBeenCalledWith(
      AddStepMode.PrependStep,
      targetVizNode.data,
      targetVizNode.getNodeDefinition(),
    );
    expect(catalogModalContext.checkCompatibility).toHaveBeenCalledWith('test-component', mockFilter);
  });

  it('should return false when checkCompatibility returns undefined', () => {
    const mockFilter = ['filter1'];
    (camelResource.getCompatibleComponents as jest.Mock).mockReturnValue(mockFilter);
    (catalogModalContext.checkCompatibility as jest.Mock).mockReturnValue(undefined);

    const result = canDropOnEdge(draggedVizNode, edge, camelResource, catalogModalContext);

    expect(result).toBe(false);
  });
});

describe('canDragGroup', () => {
  const getMockGroupVizNode = (path: string, name: string, parentProcessorName?: string): IVisualizationNode => {
    const parentData = parentProcessorName
      ? ({ processorName: parentProcessorName } as CamelRouteVisualEntityData)
      : undefined;
    return {
      id: 'group-1',
      data: { path, name },
      getParentNode: jest.fn().mockReturnValue(parentData ? { data: parentData } : undefined),
    } as unknown as IVisualizationNode;
  };

  beforeEach(() => {
    jest.spyOn(CamelComponentSchemaService, 'getProcessorStepsProperties').mockReturnValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return false when groupVizNode is undefined', () => {
    expect(canDragGroup()).toBe(false);
    expect(CamelComponentSchemaService.getProcessorStepsProperties).not.toHaveBeenCalled();
  });

  it('should return false when path is top-level (single segment)', () => {
    const groupVizNode = getMockGroupVizNode('Route', 'route');

    expect(canDragGroup(groupVizNode)).toBe(false);
    expect(CamelComponentSchemaService.getProcessorStepsProperties).not.toHaveBeenCalled();
  });

  it('should return false when group matches single-clause property', () => {
    (CamelComponentSchemaService.getProcessorStepsProperties as jest.Mock).mockReturnValue([
      { name: 'otherwise', type: 'single-clause' },
      { name: 'when', type: 'array-clause' },
    ]);
    const groupVizNode = getMockGroupVizNode('route.from.steps.0.choice.otherwise', 'otherwise', 'choice');

    expect(canDragGroup(groupVizNode)).toBe(false);
  });

  it('should return true when group does not match single-clause property', () => {
    (CamelComponentSchemaService.getProcessorStepsProperties as jest.Mock).mockReturnValue([
      { name: 'otherwise', type: 'single-clause' },
      { name: 'when', type: 'array-clause' },
    ]);
    const groupVizNode = getMockGroupVizNode('route.from.steps.0.choice.when', 'when', 'choice');

    expect(canDragGroup(groupVizNode)).toBe(true);
  });
});

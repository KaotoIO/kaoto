import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { AddStepMode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows/camel-route-visual-entity';
import { camelRouteJson } from '../../../../stubs/camel-route';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { useDuplicateStep } from './duplicate-step.hook';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { updateIds } from '../../../../utils/update-ids';

// Mock the `updateIds` function
jest.mock('../../../../utils/update-ids', () => ({
  updateIds: jest.fn((node) => node),
}));

describe('useDuplicateStep', () => {
  const visualEntity = new CamelRouteVisualEntity(camelRouteJson);
  const vizNode = createVisualizationNode('test', {
    path: 'route.from.steps.2.to',
    entity: visualEntity,
    processorName: 'to',
  });
  const whenVizNode = createVisualizationNode('when', {
    path: 'route.from.steps.1.choice.when.0',
    entity: visualEntity,
    processorName: 'when',
  });
  const choiceVizNode = createVisualizationNode('choice', {
    path: 'route.from.steps.1.choice',
    entity: visualEntity,
    processorName: 'choice',
  });
  // Set parent of when node to choice node
  whenVizNode.setParentNode(choiceVizNode);
  const routeVizNode = createVisualizationNode('route', {
    path: 'route',
    entity: visualEntity,
    processorName: 'route',
  });
  // Set parent of viznode to route node
  vizNode.setParentNode(routeVizNode);

  const camelResource = new CamelRouteResource();
  const mockEntitiesContext = {
    camelResource,
    entities: camelResource.getEntities(),
    visualEntities: camelResource.getVisualEntities(),
    currentSchemaType: camelResource.getType(),
    updateSourceCodeFromEntities: jest.fn(),
    updateEntitiesFromCamelResource: jest.fn(),
  };

  // Mock CatalogModalContext
  const mockCatalogModalContext = {
    setIsModalOpen: jest.fn(),
    getNewComponent: jest.fn(),
    checkCompatibility: jest.fn(),
  };

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>
      <CatalogModalContext.Provider value={mockCatalogModalContext}>{children}</CatalogModalContext.Provider>
    </EntitiesContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canDuplicate logic', () => {
    it('should return false when viznode has no content', () => {
      // Mock the getCopiedContent method to return undefined
      jest.spyOn(vizNode, 'getCopiedContent').mockReturnValueOnce(undefined);
      const { result } = renderHook(() => useDuplicateStep(vizNode), { wrapper });

      expect(result.current.canDuplicate).toBe(false);
    });

    it('should return true when current node can have a next node', () => {
      // Mock the compatibility check to return true
      jest.spyOn(mockCatalogModalContext, 'checkCompatibility').mockReturnValue(true);
      const { result } = renderHook(() => useDuplicateStep(vizNode), { wrapper });

      expect(result.current.canDuplicate).toBe(true);
    });

    it('should return true when current node parent can have special children', () => {
      // Mock the compatibility check to return true
      jest.spyOn(mockCatalogModalContext, 'checkCompatibility').mockReturnValue(true);
      const { result } = renderHook(() => useDuplicateStep(whenVizNode), { wrapper });

      expect(result.current.canDuplicate).toBe(true);
    });

    it('should return true when current node is root container and is route entity type', () => {
      const { result } = renderHook(() => useDuplicateStep(routeVizNode), { wrapper });

      expect(result.current.canDuplicate).toBe(true);
    });

    it('should return false when no previous conditions match', () => {
      // set up the vizNode so that it does not have next step capability
      /* eslint-disable @typescript-eslint/no-explicit-any */
      jest.spyOn(vizNode, 'getNodeInteraction').mockReturnValueOnce({ canHaveNextStep: false } as any);

      const { result } = renderHook(() => useDuplicateStep(vizNode), { wrapper });

      expect(result.current.canDuplicate).toBe(false);
    });
  });

  describe('onDuplicate functionality', () => {
    it('should return without calling pasteBaseEntityStep() and updateEntitiesFromCamelResource()', () => {
      const VizNodeGetCopiedContentSpy = jest.spyOn(vizNode, 'getCopiedContent').mockReturnValueOnce(undefined);
      const VizNodePasteBaseEntityStepSpy = jest.spyOn(vizNode, 'pasteBaseEntityStep');

      const { result } = renderHook(() => useDuplicateStep(vizNode), { wrapper });
      result.current.onDuplicate();

      expect(VizNodeGetCopiedContentSpy).toHaveBeenCalledTimes(1);
      expect(VizNodePasteBaseEntityStepSpy).not.toHaveBeenCalled();
      expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).not.toHaveBeenCalled();
    });

    it('should call pasteBaseEntityStep() and finally updateEntitiesFromCamelResource()', () => {
      const VizNodePasteBaseEntityStepSpy = jest.spyOn(vizNode, 'pasteBaseEntityStep');

      const { result } = renderHook(() => useDuplicateStep(vizNode), { wrapper });
      result.current.onDuplicate();

      expect(VizNodePasteBaseEntityStepSpy).toHaveBeenCalledTimes(1);
      expect(VizNodePasteBaseEntityStepSpy).toHaveBeenCalledWith(
        updateIds(vizNode.getCopiedContent()!),
        AddStepMode.AppendStep,
      );
      expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('should call entitiesContext.camelResource.addNewEntity() and finally updateEntitiesFromCamelResource()', () => {
      const camelResourceAddNewEntitySpy = jest.spyOn(camelResource, 'addNewEntity');
      const routeVizNodeContent = updateIds(routeVizNode.getCopiedContent()!);
      const { result } = renderHook(() => useDuplicateStep(routeVizNode), { wrapper });
      result.current.onDuplicate();

      expect(camelResourceAddNewEntitySpy).toHaveBeenCalledTimes(1);
      expect(camelResourceAddNewEntitySpy).toHaveBeenCalledWith(routeVizNodeContent.name as string, {
        [routeVizNodeContent.name]: routeVizNodeContent.definition,
      });
      expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });
});

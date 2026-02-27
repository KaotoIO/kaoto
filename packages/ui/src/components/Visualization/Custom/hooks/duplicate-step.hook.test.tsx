import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { CatalogKind } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { AddStepMode } from '../../../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows/camel-route-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { camelRouteJson } from '../../../../stubs/camel-route';
import { updateIds } from '../../../../utils/update-ids';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { useDuplicateStep } from './duplicate-step.hook';

const mockController = {
  fromModel: jest.fn(),
};

jest.mock('@patternfly/react-topology', () => ({
  useVisualizationController: () => mockController,
}));

// Mock the `updateIds` function
jest.mock('../../../../utils/update-ids', () => ({
  updateIds: jest.fn((node) => node),
}));

describe('useDuplicateStep', () => {
  const visualEntity = new CamelRouteVisualEntity(camelRouteJson);
  const vizNode = createVisualizationNode('test', {
    catalogKind: CatalogKind.Processor,
    name: 'to',
    path: 'route.from.steps.2.to',
    entity: visualEntity,
    processorName: 'to',
  });
  const whenVizNode = createVisualizationNode('when', {
    catalogKind: CatalogKind.Processor,
    name: 'when',
    path: 'route.from.steps.1.choice.when.0',
    entity: visualEntity,
    processorName: 'when',
  });
  const choiceVizNode = createVisualizationNode('choice', {
    catalogKind: CatalogKind.Processor,
    name: 'choice',
    path: 'route.from.steps.1.choice',
    entity: visualEntity,
    processorName: 'choice',
  });

  // Set parent of when node to choice node and vice versa
  whenVizNode.setParentNode(choiceVizNode);
  choiceVizNode.addChild(whenVizNode);

  const routeVizNode = createVisualizationNode('route', {
    catalogKind: CatalogKind.Processor,
    name: 'route',
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

  // Mock NodeInteractionAddonContext
  const mockNodeInteractionAddonContext = {
    registerInteractionAddon: jest.fn(),
    getRegisteredInteractionAddons: jest.fn().mockReturnValue([]),
  };

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>
      <CatalogModalContext.Provider value={mockCatalogModalContext}>
        <NodeInteractionAddonContext.Provider value={mockNodeInteractionAddonContext}>
          {children}
        </NodeInteractionAddonContext.Provider>
      </CatalogModalContext.Provider>
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
    it('should return without calling pasteBaseEntityStep() and updateEntitiesFromCamelResource()', async () => {
      const VizNodeGetCopiedContentSpy = jest.spyOn(vizNode, 'getCopiedContent').mockReturnValueOnce(undefined);
      const VizNodePasteBaseEntityStepSpy = jest.spyOn(vizNode, 'pasteBaseEntityStep');

      const { result } = renderHook(() => useDuplicateStep(vizNode), { wrapper });
      await result.current.onDuplicate();

      expect(VizNodeGetCopiedContentSpy).toHaveBeenCalledTimes(1);
      expect(VizNodePasteBaseEntityStepSpy).not.toHaveBeenCalled();
      expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).not.toHaveBeenCalled();
    });

    it('should call pasteBaseEntityStep() and finally updateEntitiesFromCamelResource()', async () => {
      const VizNodePasteBaseEntityStepSpy = jest.spyOn(vizNode, 'pasteBaseEntityStep');

      const { result } = renderHook(() => useDuplicateStep(vizNode), { wrapper });
      await result.current.onDuplicate();

      expect(VizNodePasteBaseEntityStepSpy).toHaveBeenCalledTimes(1);
      expect(VizNodePasteBaseEntityStepSpy).toHaveBeenCalledWith(
        updateIds(vizNode.getCopiedContent()!),
        AddStepMode.AppendStep,
      );
      expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('should call controller.fromModel() when parent node can have special children and conditions are met', async () => {
      const VizNodePasteBaseEntityStepSpy = jest.spyOn(whenVizNode, 'pasteBaseEntityStep');

      const { result } = renderHook(() => useDuplicateStep(whenVizNode), { wrapper });
      await result.current.onDuplicate();

      expect(VizNodePasteBaseEntityStepSpy).toHaveBeenCalledTimes(1);
      expect(VizNodePasteBaseEntityStepSpy).toHaveBeenCalledWith(
        updateIds(whenVizNode.getCopiedContent()!),
        AddStepMode.AppendStep,
      );
      expect(mockController.fromModel).toHaveBeenCalledWith({
        nodes: [],
        edges: [],
      });
      expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('should call entitiesContext.camelResource.addNewEntity() with original entity ID and finally updateEntitiesFromCamelResource()', async () => {
      const camelResourceAddNewEntitySpy = jest.spyOn(camelResource, 'addNewEntity');
      const routeVizNodeContent = updateIds(routeVizNode.getCopiedContent()!);
      const { result } = renderHook(() => useDuplicateStep(routeVizNode), { wrapper });
      await result.current.onDuplicate();

      expect(camelResourceAddNewEntitySpy).toHaveBeenCalledTimes(1);
      expect(camelResourceAddNewEntitySpy).toHaveBeenCalledWith(
        routeVizNodeContent.name as string,
        { [routeVizNodeContent.name]: routeVizNodeContent.definition },
        routeVizNode.getId(),
      );
      expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });
});

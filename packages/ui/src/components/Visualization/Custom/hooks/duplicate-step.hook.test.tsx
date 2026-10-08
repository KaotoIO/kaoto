import { Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { renderHook } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { CatalogKind } from '../../../../models/catalog-kind';
import { AddStepMode, DISABLED_NODE_INTERACTION } from '../../../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows/camel-route-visual-entity';
import { VisualFlowsApi } from '../../../../models/visualization/flows/support/flows-visibility';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { VisibleFlowsContext, VisibleFlowsContextResult } from '../../../../providers';
import { EntitiesContext, EntitiesContextResult } from '../../../../providers/entities.provider';
import { camelRouteJson, createMockEntitiesContext, mockRandomValues } from '../../../../stubs';
import { updateIds } from '../../../../utils/update-ids';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { useDuplicateStep } from './duplicate-step.hook';

/** The real `updateIds` regenerates the ids; expected contents are computed the same way */
const getUpdatedContent = (content: object) => updateIds(cloneDeep(content));

describe('useDuplicateStep', () => {
  const visualEntity = new CamelRouteVisualEntity(cloneDeep(camelRouteJson));
  const vizNode = createVisualizationNode('test', {
    name: 'to',
    path: 'route.from.steps.2.to',
    entity: visualEntity,
    processorName: 'to',
    isPlaceholder: false,
    isGroup: false,
    iconUrl: '',
    title: '',
    description: '',
    primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern },
  });
  const whenVizNode = createVisualizationNode('when', {
    name: 'when',
    path: 'route.from.steps.1.choice.when.0',
    entity: visualEntity,
    processorName: 'when',
    isPlaceholder: false,
    isGroup: false,
    iconUrl: '',
    title: '',
    description: '',
    primaryNodeId: { name: 'when', catalogKind: CatalogKind.Pattern },
  });
  const choiceVizNode = createVisualizationNode('choice', {
    name: 'choice',
    path: 'route.from.steps.1.choice',
    entity: visualEntity,
    processorName: 'choice',
    isPlaceholder: false,
    isGroup: false,
    iconUrl: '',
    title: '',
    description: '',
    primaryNodeId: { name: 'choice', catalogKind: CatalogKind.Pattern },
  });

  // Set parent of when node to choice node and vice versa
  whenVizNode.setParentNode(choiceVizNode);
  choiceVizNode.addChild(whenVizNode);

  const routeVizNode = createVisualizationNode('route', {
    name: 'route',
    path: 'route',
    entity: visualEntity,
    processorName: 'route',
    isPlaceholder: false,
    isGroup: false,
    iconUrl: '',
    title: '',
    description: '',
    primaryNodeId: { name: 'route', catalogKind: CatalogKind.Entity },
  });
  // Set parent of viznode to route node
  vizNode.setParentNode(routeVizNode);

  const camelResource = new CamelRouteResource();
  let mockEntitiesContext: EntitiesContextResult;

  beforeAll(async () => {
    mockEntitiesContext = await createMockEntitiesContext(camelResource);
  });

  // Mock CatalogModalContext
  const mockCatalogModalContext = {
    setIsModalOpen: vi.fn(),
    getNewComponent: vi.fn(),
    checkCompatibility: vi.fn(),
  };

  // Mock NodeInteractionAddonContext
  const mockNodeInteractionAddonContext = {
    registerInteractionAddon: vi.fn(),
    getRegisteredInteractionAddons: vi.fn().mockReturnValue([]),
  };

  const mockVisibleFlowsContext: VisibleFlowsContextResult = {
    visibleFlows: { route: true },
    allFlowsVisible: true,
    visualFlowsApi: new VisualFlowsApi(vi.fn()),
  };

  let controller: Visualization;

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <VisualizationProvider controller={controller}>
      <EntitiesContext.Provider value={mockEntitiesContext}>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>
          <VisibleFlowsContext.Provider value={mockVisibleFlowsContext}>
            <NodeInteractionAddonContext.Provider value={mockNodeInteractionAddonContext}>
              {children}
            </NodeInteractionAddonContext.Provider>
          </VisibleFlowsContext.Provider>
        </CatalogModalContext.Provider>
      </EntitiesContext.Provider>
    </VisualizationProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockRandomValues([1234]);
    controller = new Visualization();
    controller.fromModel({ graph: { id: 'graph', type: 'graph' } });
    vi.spyOn(controller, 'fromModel');
    vi.spyOn(mockVisibleFlowsContext.visualFlowsApi, 'toggleFlowVisible');
  });

  describe('canDuplicate logic', () => {
    it('should return false when viznode has no content', () => {
      // Mock the getCopiedContent method to return undefined
      vi.spyOn(vizNode, 'getCopiedContent').mockReturnValueOnce(undefined);
      const { result } = renderHook(() => useDuplicateStep(vizNode), { wrapper });

      expect(result.current.canDuplicate).toBe(false);
    });

    it('should return true when current node can have a next node', () => {
      // Mock the compatibility check to return true
      vi.spyOn(mockCatalogModalContext, 'checkCompatibility').mockReturnValue(true);
      const { result } = renderHook(() => useDuplicateStep(vizNode), { wrapper });

      expect(result.current.canDuplicate).toBe(true);
    });

    it('should return true when current node parent can have special children', () => {
      // Mock the compatibility check to return true
      vi.spyOn(mockCatalogModalContext, 'checkCompatibility').mockReturnValue(true);
      const { result } = renderHook(() => useDuplicateStep(whenVizNode), { wrapper });

      expect(result.current.canDuplicate).toBe(true);
    });

    it('should return true when current node is root container and is route entity type', () => {
      const { result } = renderHook(() => useDuplicateStep(routeVizNode), { wrapper });

      expect(result.current.canDuplicate).toBe(true);
    });

    it('should return false when no previous conditions match', () => {
      // set up the vizNode so that it does not have next step capability
      vi.spyOn(vizNode, 'getNodeInteraction').mockReturnValueOnce({
        ...DISABLED_NODE_INTERACTION,
        canHaveNextStep: false,
      });

      const { result } = renderHook(() => useDuplicateStep(vizNode), { wrapper });

      expect(result.current.canDuplicate).toBe(false);
    });
  });

  describe('onDuplicate functionality', () => {
    it('should return without calling pasteBaseEntityStep() and updateEntitiesFromCamelResource()', async () => {
      const VizNodeGetCopiedContentSpy = vi.spyOn(vizNode, 'getCopiedContent').mockReturnValueOnce(undefined);
      const VizNodePasteBaseEntityStepSpy = vi.spyOn(vizNode, 'pasteBaseEntityStep');

      const { result } = renderHook(() => useDuplicateStep(vizNode), { wrapper });
      await result.current.onDuplicate();

      expect(VizNodeGetCopiedContentSpy).toHaveBeenCalledTimes(1);
      expect(VizNodePasteBaseEntityStepSpy).not.toHaveBeenCalled();
      expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
    });

    it('should call pasteBaseEntityStep() and finally updateEntitiesFromCamelResource()', async () => {
      const VizNodePasteBaseEntityStepSpy = vi.spyOn(vizNode, 'pasteBaseEntityStep');

      const { result } = renderHook(() => useDuplicateStep(vizNode), { wrapper });
      await result.current.onDuplicate();

      expect(VizNodePasteBaseEntityStepSpy).toHaveBeenCalledTimes(1);
      expect(VizNodePasteBaseEntityStepSpy).toHaveBeenCalledWith(
        getUpdatedContent(vizNode.getCopiedContent()!),
        AddStepMode.AppendStep,
      );
      expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalledTimes(1);
    });

    it('should call controller.fromModel() when parent node can have special children and conditions are met', async () => {
      const VizNodePasteBaseEntityStepSpy = vi.spyOn(whenVizNode, 'pasteBaseEntityStep');

      const { result } = renderHook(() => useDuplicateStep(whenVizNode), { wrapper });
      await result.current.onDuplicate();

      expect(VizNodePasteBaseEntityStepSpy).toHaveBeenCalledTimes(1);
      expect(VizNodePasteBaseEntityStepSpy).toHaveBeenCalledWith(
        getUpdatedContent(whenVizNode.getCopiedContent()!),
        AddStepMode.AppendStep,
      );
      expect(controller.fromModel).toHaveBeenCalledWith({
        nodes: [],
        edges: [],
      });
      expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalledTimes(1);
    });

    it('should call entitiesContext.camelResource.addNewEntity() with original entity ID and finally updateEntitiesFromCamelResource()', async () => {
      const camelResourceAddNewEntitySpy = vi.spyOn(camelResource, 'addNewEntity');
      const routeVizNodeContent = getUpdatedContent(routeVizNode.getCopiedContent()!);
      const { result } = renderHook(() => useDuplicateStep(routeVizNode), { wrapper });
      await result.current.onDuplicate();

      expect(camelResourceAddNewEntitySpy).toHaveBeenCalledTimes(1);
      expect(camelResourceAddNewEntitySpy).toHaveBeenCalledWith(
        routeVizNodeContent.name as string,
        { [routeVizNodeContent.name]: routeVizNodeContent.definition },
        routeVizNode.getId(),
      );
      expect(mockVisibleFlowsContext.visualFlowsApi.toggleFlowVisible).toHaveBeenCalledTimes(1);
      expect(controller.fromModel).toHaveBeenCalledWith({
        nodes: [],
        edges: [],
      });
      expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalledTimes(1);
    });
  });
});

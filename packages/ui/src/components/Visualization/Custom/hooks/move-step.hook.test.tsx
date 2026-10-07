import { CatalogKind } from '@kaoto/editor-api';
import { Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { renderHook } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import {
  AddStepMode,
  IVisualizationNode,
  IVisualizationNodeData,
} from '../../../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows/camel-route-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { EntitiesContext, EntitiesContextResult } from '../../../../providers/entities.provider';
import { camelRouteJson, camelRouteJsonWithDM, createMockEntitiesContext } from '../../../../stubs';
import { NodeInteractionAddonProvider } from '../../../registers/interactions/node-interaction-addon.provider';
import { RegisterNodeInteractionAddons } from '../../../registers/RegisterNodeInteractionAddons';
import { useMoveStep } from './move-step.hook';

describe('useMoveStep', () => {
  const visualEntity = new CamelRouteVisualEntity(cloneDeep(camelRouteJson));

  /** Creates a node of the given entity, so it shares the entity id with the node being moved */
  const createEntityNode = (
    id: string,
    data: Partial<IVisualizationNodeData> & Pick<IVisualizationNodeData, 'path'>,
    entity: CamelRouteVisualEntity = visualEntity,
  ) =>
    createVisualizationNode(id, {
      name: id,
      entity,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      ...data,
    });

  /** Creates a target node whose copy / paste methods are spied, so the shared entity isn't modified */
  const createTargetNode = (
    path: string,
    copiedContent: ReturnType<IVisualizationNode['getCopiedContent']>,
    entity: CamelRouteVisualEntity = visualEntity,
  ) => {
    const targetVizNode = createEntityNode('target', { path, definition: { id: 'test' } }, entity);
    vi.spyOn(targetVizNode, 'getCopiedContent').mockReturnValue(copiedContent);
    vi.spyOn(targetVizNode, 'pasteBaseEntityStep').mockImplementation(() => {});

    return targetVizNode;
  };
  const vizNode = createVisualizationNode('test', {
    name: 'to',
    path: 'route.from.steps.1.to',
    entity: visualEntity,
    isPlaceholder: false,
    isGroup: false,
    iconUrl: '',
    title: '',
    description: '',
  });

  const camelResource = new CamelRouteResource();
  let mockEntitiesContext: EntitiesContextResult;

  let controller: Visualization;

  beforeAll(async () => {
    mockEntitiesContext = await createMockEntitiesContext(camelResource);
  });

  /** Fills the real topology controller graph with the given visualization nodes */
  const setGraphNodes = (vizNodes: IVisualizationNode[]) => {
    controller.fromModel({
      graph: { id: 'graph', type: 'graph' },
      nodes: vizNodes.map((node, index) => ({ id: `node-${index}`, type: 'node', data: { vizNode: node } })),
    });
  };

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <VisualizationProvider controller={controller}>
      <NodeInteractionAddonProvider>
        <RegisterNodeInteractionAddons>
          <EntitiesContext.Provider value={mockEntitiesContext}>{children}</EntitiesContext.Provider>
        </RegisterNodeInteractionAddons>
      </NodeInteractionAddonProvider>
    </VisualizationProvider>
  );

  const vizNodeCopiedContent = {
    name: 'exampleVizNode',
    definition: { id: 'vizNode', Parameters: 'testParameters' },
  };

  const targetVizNodeCopiedContent = {
    name: 'exampleTargetVizNode',
    definition: { id: 'targetVizNode', type: 'testExampleType' },
  };

  beforeEach(() => {
    (vizNode as IVisualizationNode).data.definition = { id: 'testSchema' };
    vi.clearAllMocks();
    controller = new Visualization();
    setGraphNodes([]);
  });

  it('should maintain stable reference when dependencies do not change', () => {
    const { result, rerender } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), {
      wrapper,
    });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  describe('canBeMoved logic', () => {
    it('should return true when target node is found for append mode', () => {
      /* The previous step is a placeholder, so only the forward lookup ('route.from.steps.2') can find a target */
      setGraphNodes([
        createEntityNode('target', { path: 'route.from.steps.2' }),
        createEntityNode('previous', { path: 'route.from.steps.0', isPlaceholder: true }),
      ]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });

      expect(result.current.canBeMoved).toBe(true);
    });

    it('should return false when target node is found for append mode but is a placeholder node', () => {
      /* The previous step is a regular step, so only the forward lookup ('route.from.steps.2') finds the placeholder */
      setGraphNodes([
        createEntityNode('target', { path: 'route.from.steps.2', isPlaceholder: true }),
        createEntityNode('previous', { path: 'route.from.steps.0' }),
      ]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });

      expect(result.current.canBeMoved).toBe(false);
    });

    it('should return true when target node is found for prepend mode', () => {
      /* The next step is a placeholder, so only the backward lookup ('route.from.steps.0') can find a target */
      setGraphNodes([
        createEntityNode('target', { path: 'route.from.steps.0' }),
        createEntityNode('next', { path: 'route.from.steps.2', isPlaceholder: true }),
      ]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.PrependStep), { wrapper });

      expect(result.current.canBeMoved).toBe(true);
    });

    it('should return false when no potential path is found', () => {
      /* 'route.from' has no array index, so there is no potential path to move to */
      const fromVizNode = createEntityNode('from', { path: 'route.from' });
      setGraphNodes([createEntityNode('route', { path: 'route' }), fromVizNode]);

      const { result } = renderHook(() => useMoveStep(fromVizNode, AddStepMode.AppendStep), { wrapper });

      expect(result.current.canBeMoved).toBe(false);
    });

    it('should return false when no matching nodes are found', () => {
      /* Same path, but it belongs to another entity */
      const otherEntity = new CamelRouteVisualEntity(cloneDeep(camelRouteJsonWithDM));
      setGraphNodes([createEntityNode('target', { path: 'route.from.steps.2' }, otherEntity)]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });

      expect(result.current.canBeMoved).toBe(false);
    });

    it('should find shortest path when multiple nodes match', async () => {
      const longPathVizNode = createTargetNode('route.from.steps.2.choice.when', undefined);
      const shortPathVizNode = createTargetNode('route.from.steps.2.choice', undefined);
      const longPathVizNodeSpy = vi.mocked(longPathVizNode.getCopiedContent);
      const shortPathVizNodeSpy = vi.mocked(shortPathVizNode.getCopiedContent);

      setGraphNodes([longPathVizNode, shortPathVizNode]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });
      await result.current.onMoveStep();

      // shortPathVizNode.getCopiedContent() call indicates that it was chosen as the target node
      expect(shortPathVizNodeSpy).toHaveBeenCalled();
      expect(longPathVizNodeSpy).not.toHaveBeenCalled();
    });
  });

  describe('onMoveStep functionality', () => {
    it('should return without calling pasteBaseEntityStep() and updateEntitiesFromCamelResource()', async () => {
      const VizNodeGetCopiedContentSpy = vi
        .spyOn(vizNode, 'getCopiedContent')
        .mockReturnValueOnce(vizNodeCopiedContent);
      const VizNodePasteBaseEntityStepSpy = vi.spyOn(vizNode, 'pasteBaseEntityStep');

      const targetVizNode = createTargetNode('route.from.steps.2.log', undefined);
      setGraphNodes([targetVizNode]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });
      await result.current.onMoveStep();

      expect(VizNodeGetCopiedContentSpy).toHaveBeenCalledTimes(1);
      expect(targetVizNode.getCopiedContent).toHaveBeenCalledTimes(1);

      expect(VizNodePasteBaseEntityStepSpy).not.toHaveBeenCalled();
      expect(targetVizNode.pasteBaseEntityStep).not.toHaveBeenCalled();

      expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
    });

    it('should call getCopiedContent(), processOnCopyAddon(), pasteBaseEntityStep() and finally updateEntitiesFromCamelResource() in case of datamapper step', async () => {
      const visualEntity = new CamelRouteVisualEntity(cloneDeep(camelRouteJsonWithDM));
      const dataMapperVizNode = createVisualizationNode('test-DM', {
        name: 'step',
        path: 'route.from.steps.0.step',
        entity: visualEntity,
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
        primaryNodeId: { name: 'kaoto-datamapper', catalogKind: CatalogKind.Processor },
      });
      (dataMapperVizNode as IVisualizationNode).data.definition = {
        id: 'kaoto-datamapper-657b6637',
        steps: [{ to: { uri: 'xslt-saxon' } }],
      };

      const dataMapperVizNodeCopiedContent = {
        name: 'kaoto-datamapper',
        definition: {
          id: 'kaoto-datamapper-657b6637',
          steps: [
            {
              setBody: {
                id: 'kaoto-datamapper-set-body-0000',
                expression: {
                  simple: {
                    expression: '${null}',
                  },
                },
              },
            },
            {
              to: {
                id: 'kaoto-datamapper-xslt-3158',
                uri: 'xslt-saxon',
                parameters: {
                  failOnNullBody: false,
                },
              },
            },
          ],
        },
      };

      const dataMapperUpdatedVizNodeCopiedContent = {
        name: 'step',
        definition: {
          id: 'kaoto-datamapper-657b6637',
          steps: [
            {
              setBody: {
                id: 'kaoto-datamapper-set-body-0000',
                expression: {
                  simple: {
                    expression: '${null}',
                  },
                },
              },
            },
            {
              to: {
                id: 'kaoto-datamapper-xslt-3158',
                uri: 'xslt-saxon',
                parameters: {
                  failOnNullBody: false,
                },
              },
            },
          ],
        },
      };

      const dataMapperVizNodeGetCopiedContentSpy = vi.spyOn(dataMapperVizNode, 'getCopiedContent');
      const dataMapperVizNodePasteBaseEntityStepSpy = vi.spyOn(dataMapperVizNode, 'pasteBaseEntityStep');

      const targetVizNode = createTargetNode('route.from.steps.1.to', targetVizNodeCopiedContent, visualEntity);
      setGraphNodes([targetVizNode]);

      const { result } = renderHook(() => useMoveStep(dataMapperVizNode, AddStepMode.AppendStep), { wrapper });
      await result.current.onMoveStep();

      expect(dataMapperVizNodeGetCopiedContentSpy).toHaveBeenCalledTimes(1);
      expect(dataMapperVizNodeGetCopiedContentSpy).toHaveReturnedWith(dataMapperVizNodeCopiedContent);
      expect(targetVizNode.getCopiedContent).toHaveBeenCalledTimes(1);

      expect(dataMapperVizNodePasteBaseEntityStepSpy).toHaveBeenCalledTimes(1);
      expect(targetVizNode.pasteBaseEntityStep).toHaveBeenCalledWith(
        dataMapperUpdatedVizNodeCopiedContent,
        AddStepMode.ReplaceStep,
      );

      expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalledTimes(1);
    });

    it('should call getCopiedContent(), pasteBaseEntityStep() and finally updateEntitiesFromCamelResource()', async () => {
      const VizNodeGetCopiedContentSpy = vi
        .spyOn(vizNode, 'getCopiedContent')
        .mockReturnValueOnce(vizNodeCopiedContent);
      const VizNodePasteBaseEntityStepSpy = vi.spyOn(vizNode, 'pasteBaseEntityStep');

      const targetVizNode = createTargetNode('route.from.steps.2.log', targetVizNodeCopiedContent);
      setGraphNodes([targetVizNode]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });
      await result.current.onMoveStep();

      expect(VizNodeGetCopiedContentSpy).toHaveBeenCalledTimes(1);
      expect(targetVizNode.getCopiedContent).toHaveBeenCalledTimes(1);

      expect(VizNodePasteBaseEntityStepSpy).toHaveBeenCalledTimes(1);
      expect(targetVizNode.pasteBaseEntityStep).toHaveBeenCalledTimes(1);

      expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalledTimes(1);
    });
  });
});

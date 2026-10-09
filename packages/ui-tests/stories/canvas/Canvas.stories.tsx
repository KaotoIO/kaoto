import { SuggestionRegistryProvider } from '@kaoto/forms';
import {
  BaseVisualEntity,
  buildDesignerCanvasModel,
  buildDesignerOverlayTargetSnapshot,
  CamelRouteVisualEntity,
  Canvas,
  CanvasOverlaySource,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  CatalogTilesProvider,
  ControllerService,
  createOverlayStore,
  EntitiesProvider,
  kameletJson,
  KameletVisualEntity,
  KaotoResourceProvider,
  OverlayEntry,
  pipeJson,
  PipeVisualEntity,
  RuntimeProvider,
  SchemasLoaderProvider,
  SourceCodeSync,
  useVisibleVizNodes,
  VisibleFlowsProvider,
} from '@kaoto/kaoto/testing';
import { VisualizationProvider } from '@patternfly/react-topology';
import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { useEffect, useMemo, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import complexRouteMock from '../../cypress/fixtures/complexRouteMock.json';
import iconsRouteMock from '../../cypress/fixtures/iconsRouteMock.json';

const emptyPipeJson = {
  apiVersion: 'camel.apache.org/v1',
  kind: 'Pipe',
  metadata: {
    name: 'new-pipe-template',
  },
  spec: {
    source: {},
    sink: {},
  },
};

const emptyCamelRouteJson = {
  route: {
    id: 'route-8888',
    from: {
      uri: '',
      steps: [],
    },
  },
};

const camelRouteEntity = new CamelRouteVisualEntity(complexRouteMock);
const emptyCamelRouteEntity = new CamelRouteVisualEntity(emptyCamelRouteJson);
const pipeEntity = new PipeVisualEntity(pipeJson);
const kameletEntity = new KameletVisualEntity(kameletJson);
const emptyPipeEntity = new PipeVisualEntity(emptyPipeJson);
const iconsRoute = new CamelRouteVisualEntity(iconsRouteMock);

interface CanvasStoryArgs {
  entity: BaseVisualEntity;
}

/**
 * Resolves viz nodes inside the catalog provider tree (same as production Visualization).
 */
const CanvasFromEntity: StoryFn<CanvasStoryArgs> = ({ entity }) => {
  const entities = useMemo(() => [entity], [entity]);
  const visibleFlows = useMemo(() => ({ [entity.id]: true }), [entity.id]);
  const { vizNodes, isResolving } = useVisibleVizNodes(entities, visibleFlows);
  const { nodes, edges } = useMemo(() => buildDesignerCanvasModel(vizNodes), [vizNodes]);

  return (
    <Canvas
      nodes={nodes}
      edges={edges}
      entitiesCount={1}
      visibleEntitiesCount={vizNodes.length}
      isModelResolving={isResolving}
      applyCollapseOnUpdate
    />
  );
};

const ContextDecorator = (Story: StoryFn) => {
  const controller = useMemo(() => ControllerService.createController(), []);

  return (
    <SourceCodeSync>
      <KaotoResourceProvider>
        <RuntimeProvider
          catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
          runtimeCatalogName=""
          testingCatalogName=""
        >
          <SchemasLoaderProvider>
            <CatalogLoaderProvider>
              <EntitiesProvider>
                <CatalogTilesProvider>
                  <VisibleFlowsProvider>
                    <SuggestionRegistryProvider>
                      <VisualizationProvider controller={controller}>
                        <Story />
                      </VisualizationProvider>
                    </SuggestionRegistryProvider>
                  </VisibleFlowsProvider>
                </CatalogTilesProvider>
              </EntitiesProvider>
            </CatalogLoaderProvider>
          </SchemasLoaderProvider>
        </RuntimeProvider>
      </KaotoResourceProvider>
    </SourceCodeSync>
  );
};

export default {
  title: 'Canvas/Canvas',
  component: Canvas,
  decorators: [ContextDecorator],
} as Meta<typeof Canvas>;

export const CamelRouteVisualization: StoryObj<CanvasStoryArgs> = {
  render: CanvasFromEntity,
  args: { entity: camelRouteEntity },
};

export const PipeVisualization: StoryObj<CanvasStoryArgs> = {
  render: CanvasFromEntity,
  args: { entity: pipeEntity },
};

export const KameletVisualization: StoryObj<CanvasStoryArgs> = {
  render: CanvasFromEntity,
  args: { entity: kameletEntity },
};

export const EmptyPipeVisualization: StoryObj<CanvasStoryArgs> = {
  render: CanvasFromEntity,
  args: { entity: emptyPipeEntity },
};

export const EmptyCamelRouteVisualization: StoryObj<CanvasStoryArgs> = {
  render: CanvasFromEntity,
  args: { entity: emptyCamelRouteEntity },
};

/** reproducer for https://github.com/KaotoIO/kaoto/issues/2215 */
export const IconsRouteVisualization: StoryObj<CanvasStoryArgs> = {
  render: CanvasFromEntity,
  args: { entity: iconsRoute },
};

/** Real canvas objects and renderers; no fixed geometry or external SVG decorations. */
const CanvasWithOverlays: StoryFn<CanvasStoryArgs> = ({ entity }) => {
  const entities = useMemo(() => [entity], [entity]);
  const visibleFlows = useMemo(() => ({ [entity.id]: true }), [entity.id]);
  const { vizNodes, isResolving } = useVisibleVizNodes(entities, visibleFlows);
  const model = useMemo(() => buildDesignerCanvasModel(vizNodes), [vizNodes]);
  const [demo, setDemo] = useState<{ source: CanvasOverlaySource; update(): void; clear(): void }>();
  useEffect(() => {
    if (isResolving || model.nodes.length === 0) return;
    const scope = { canvasId: 'story', documentId: entity.id, modelRevision: 'story-model' };
    const store = createOverlayStore(buildDesignerOverlayTargetSnapshot(scope, model, [{ id: entity.id }]));
    const owner = store.getState().createOwner()!;
    const step = model.nodes.find((node) => node.data?.vizNode?.data.path === 'route.from');
    const edge = model.edges.find((candidate) => candidate.source === step?.id);
    if (!step || !edge)
      return () => {
        store.getState().dispose();
      };
    let value = 42;
    const write = () => {
      const note = (id: string, target: OverlayEntry['target']): OverlayEntry => ({
        id,
        kind: 'annotation',
        target,
        text: id,
        value,
        interaction: { accessibleLabel: id, tooltip: 'Metrics from the scoped Zustand store' },
      });
      owner.replaceLayer(scope, 'trace', [
        note('Messages', { kind: 'node', id: step.id }),
        note('Traversals', { kind: 'edge', id: edge.id }),
        note('Route total', { kind: 'route', id: entity.id }),
        { id: 'visited-step', kind: 'highlight', target: { kind: 'node', id: step.id }, emphasis: 'strong' },
        { id: 'visited-edge', kind: 'highlight', target: { kind: 'edge', id: edge.id }, emphasis: 'strong' },
      ]);
    };
    write();
    setDemo({
      source: { model, store },
      update: () => {
        value++;
        write();
      },
      clear: () => {
        owner.clearLayer(scope, 'trace');
      },
    });
    return () => {
      store.getState().dispose();
    };
  }, [entity.id, isResolving, model]);
  return (
    <>
      <div style={{ display: 'flex', gap: 12, padding: 12 }}>
        <button type="button" onClick={() => demo?.update()}>
          Update metrics
        </button>
        <button type="button" onClick={() => demo?.clear()}>
          Clear overlays
        </button>
      </div>
      <Canvas {...model} isModelResolving={isResolving} overlaySource={demo?.source} />
    </>
  );
};

const overlayRoute = new CamelRouteVisualEntity({
  route: {
    id: 'overlay-route',
    from: {
      uri: 'timer',
      parameters: { timerName: 'inbox' },
      steps: [{ log: { message: 'Message received' } }, { to: { uri: 'direct:outbox' } }],
    },
  },
});
export const CanvasOverlays: StoryObj<CanvasStoryArgs> = {
  render: CanvasWithOverlays,
  args: { entity: overlayRoute },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('button', { name: 'Messages: Messages 42' });
    await expect(canvas.getByRole('button', { name: 'Traversals: Traversals 42' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Route total: Route total 42' })).toBeVisible();
    await Promise.all(
      Array.from(canvasElement.querySelectorAll('.step-icon'), async (badge) => {
        await expect(getComputedStyle(badge.closest('foreignObject')!).overflow).toBe('visible');
      }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Update metrics' }));
    await canvas.findByRole('button', { name: 'Messages: Messages 43' });
    await userEvent.click(canvas.getByRole('button', { name: 'Clear overlays' }));
    await expect(canvas.queryByRole('button', { name: /Messages: Messages/ })).not.toBeInTheDocument();
    await expect(canvasElement.querySelector('.kaoto-canvas-overlays')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Update metrics' }));
    await canvas.findByRole('button', { name: 'Messages: Messages 44' });
  },
};

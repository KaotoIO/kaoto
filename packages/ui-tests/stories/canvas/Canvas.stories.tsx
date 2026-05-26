import {
  BaseVisualEntity,
  CamelRouteVisualEntity,
  Canvas,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  CatalogTilesProvider,
  ControllerService,
  EntitiesProvider,
  kameletJson,
  KameletVisualEntity,
  KaotoResourceProvider,
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
import { useMemo } from 'react';

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

  return <Canvas vizNodes={vizNodes} entitiesCount={1} isVizNodesResolving={isResolving} />;
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
                    <VisualizationProvider controller={controller}>
                      <Story />
                    </VisualizationProvider>
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

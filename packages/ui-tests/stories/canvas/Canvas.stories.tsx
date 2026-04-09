import {
  CamelRouteVisualEntity,
  Canvas,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  CatalogTilesProvider,
  ControllerService,
  EntitiesProvider,
  kameletJson,
  KameletVisualEntity,
  pipeJson,
  PipeVisualEntity,
  RuntimeProvider,
  SchemasLoaderProvider,
  SourceCodeProvider,
  VisibleFlowsProvider,
} from '@kaoto/kaoto/testing';
import { VisualizationProvider } from '@patternfly/react-topology';
import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { ComponentProps, useMemo } from 'react';

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

type CanvasProps = ComponentProps<typeof Canvas>;

const ContextDecorator = (Story: StoryFn) => {
  const controller = useMemo(() => ControllerService.createController(), []);

  return (
    <SourceCodeProvider>
      <EntitiesProvider>
        <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <SchemasLoaderProvider>
            <CatalogLoaderProvider>
              <CatalogTilesProvider>
                <VisibleFlowsProvider>
                  <VisualizationProvider controller={controller}>
                    <Story />
                  </VisualizationProvider>
                </VisibleFlowsProvider>
              </CatalogTilesProvider>
            </CatalogLoaderProvider>
          </SchemasLoaderProvider>
        </RuntimeProvider>
      </EntitiesProvider>
    </SourceCodeProvider>
  );
};

export default {
  title: 'Canvas/Canvas',
  component: Canvas,
  decorators: [ContextDecorator],
  render: (args, { loaded }) => <Canvas {...args} {...((loaded ?? {}) as Partial<CanvasProps>)} />,
} as Meta<typeof Canvas>;

export const CamelRouteVisualization: StoryObj<typeof Canvas> = {
  loaders: [
    async (): Promise<Pick<CanvasProps, 'vizNodes' | 'entitiesCount'>> => ({
      vizNodes: [await camelRouteEntity.toVizNode()],
      entitiesCount: 1,
    }),
  ],
};

export const PipeVisualization: StoryObj<typeof Canvas> = {
  loaders: [
    async (): Promise<Pick<CanvasProps, 'vizNodes' | 'entitiesCount'>> => ({
      vizNodes: [await pipeEntity.toVizNode()],
      entitiesCount: 1,
    }),
  ],
};

export const KameletVisualization: StoryObj<typeof Canvas> = {
  loaders: [
    async (): Promise<Pick<CanvasProps, 'vizNodes' | 'entitiesCount'>> => ({
      vizNodes: [await kameletEntity.toVizNode()],
      entitiesCount: 1,
    }),
  ],
};

export const EmptyPipeVisualization: StoryObj<typeof Canvas> = {
  loaders: [
    async (): Promise<Pick<CanvasProps, 'vizNodes' | 'entitiesCount'>> => ({
      vizNodes: [await emptyPipeEntity.toVizNode()],
      entitiesCount: 1,
    }),
  ],
};

export const EmptyCamelRouteVisualization: StoryObj<typeof Canvas> = {
  loaders: [
    async (): Promise<Pick<CanvasProps, 'vizNodes' | 'entitiesCount'>> => ({
      vizNodes: [await emptyCamelRouteEntity.toVizNode()],
      entitiesCount: 1,
    }),
  ],
};

/** reproducer for https://github.com/KaotoIO/kaoto/issues/2215 */
export const IconsRouteVisualization: StoryObj<typeof Canvas> = {
  loaders: [
    async (): Promise<Pick<CanvasProps, 'vizNodes' | 'entitiesCount'>> => ({
      vizNodes: [await iconsRoute.toVizNode()],
      entitiesCount: 1,
    }),
  ],
};

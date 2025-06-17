import {
  CamelRouteVisualEntity,
  Canvas,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  CatalogTilesProvider,
  ControllerService,
  EntitiesProvider,
  KameletVisualEntity,
  PipeVisualEntity,
  RuntimeProvider,
  SchemasLoaderProvider,
  SourceCodeProvider,
  VisibleFlowsContext,
  VisibleFlowsContextResult,
  kameletJson,
  pipeJson,
} from '@kaoto/kaoto/testing';
import { VisualizationProvider } from '@patternfly/react-topology';
import { Meta, StoryFn } from '@storybook/react';
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

const ContextDecorator = (Story: StoryFn) => {
  const controller = useMemo(() => ControllerService.createController(), []);

  return (
    <SourceCodeProvider>
      <EntitiesProvider>
        <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <SchemasLoaderProvider>
            <CatalogLoaderProvider>
              <CatalogTilesProvider>
                <VisualizationProvider controller={controller}>
                  <Story />
                </VisualizationProvider>
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
} as Meta<typeof Canvas>;

const Template: StoryFn<typeof Canvas> = (args) => {
  const visibleId = args.entities[0].getId();
  const firstVisibleEntity: unknown = { visibleFlows: { [visibleId]: true } };

  return (
    <VisibleFlowsContext.Provider value={firstVisibleEntity as VisibleFlowsContextResult}>
      <Canvas {...args} />
    </VisibleFlowsContext.Provider>
  );
};

export const CamelRouteVisualization = Template.bind({});
CamelRouteVisualization.args = {
  entities: [camelRouteEntity],
};

export const PipeVisualization = Template.bind({});
PipeVisualization.args = {
  entities: [pipeEntity],
};

export const KameletVisualization = Template.bind({});
KameletVisualization.args = {
  entities: [kameletEntity],
};

export const EmptyPipeVisualization = Template.bind({});
EmptyPipeVisualization.args = {
  entities: [emptyPipeEntity],
};

export const EmptyCamelRouteVisualization = Template.bind({});
EmptyCamelRouteVisualization.args = {
  entities: [emptyCamelRouteEntity],
};

// reproducer for https://github.com/KaotoIO/kaoto/issues/2215
export const IconsRouteVisualization = Template.bind({});
IconsRouteVisualization.args = {
  entities: [iconsRoute],
};

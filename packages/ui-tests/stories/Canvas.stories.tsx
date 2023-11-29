import {
  CamelRouteVisualEntity,
  Canvas,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  CatalogTilesProvider,
  EntitiesProvider,
  PipeVisualEntity,
  SchemasLoaderProvider,
  SourceCodeProvider,
  VisibleFLowsContextResult,
  VisibleFlowsContext,
  kameletJson,
  pipeJson,
} from '@kaoto-next/ui/testing';
import { Meta, StoryFn } from '@storybook/react';
import complexRouteMock from '../cypress/fixtures/complexRouteMock.json';

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

const camelRouteEntity = new CamelRouteVisualEntity(complexRouteMock.route);
const emptyCamelRouteEntity = new CamelRouteVisualEntity(emptyCamelRouteJson.route);
const pipeEntity = new PipeVisualEntity(pipeJson.spec!);
const kameletEntity = new CamelRouteVisualEntity(kameletJson.spec.template);
const emptyPipeEntity = new PipeVisualEntity(emptyPipeJson.spec!);

const ContextDecorator = (Story: StoryFn) => (
  <SourceCodeProvider>
    <EntitiesProvider>
      <SchemasLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
        <CatalogLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <CatalogTilesProvider>
            <Story />
          </CatalogTilesProvider>
        </CatalogLoaderProvider>
      </SchemasLoaderProvider>
    </EntitiesProvider>
  </SourceCodeProvider>
);

export default {
  title: 'Canvas/Canvas',
  component: Canvas,
  decorators: [ContextDecorator],
} as Meta<typeof Canvas>;

const Template: StoryFn<typeof Canvas> = (args) => {
  const visibleId = args.entities[0].getId();
  const firstVisibleEntity: unknown = { visibleFlows: { [visibleId]: true } };

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <VisibleFlowsContext.Provider value={firstVisibleEntity as VisibleFLowsContextResult}>
        <Canvas {...args} />
      </VisibleFlowsContext.Provider>
    </div>
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

import { CanvasFormTabsContext, SuggestionRegistryProvider } from '@kaoto/forms';
import {
  CanvasNode,
  CanvasSideBar,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  createVisualizationNode,
  NodeIconResolver,
  NodeIconType,
  RuntimeProvider,
  SchemasLoaderProvider,
  VisibleFlowsProvider,
} from '@kaoto/kaoto/testing';
import { NodeShape } from '@patternfly/react-topology';
import { Meta, StoryFn } from '@storybook/react';
import { storybookCamelRouteEntity } from './canvas.stub';

export default {
  title: 'Canvas/Form',
  component: CanvasSideBar,
  decorators: [
    (Story: StoryFn) => (
      <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
        <SchemasLoaderProvider>
          <CatalogLoaderProvider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                setSelectedTab: () => {},
              }}
            >
              <VisibleFlowsProvider>
                <SuggestionRegistryProvider>
                  <Story />
                </SuggestionRegistryProvider>
              </VisibleFlowsProvider>
            </CanvasFormTabsContext.Provider>
          </CatalogLoaderProvider>
        </SchemasLoaderProvider>
      </RuntimeProvider>
    ),
  ],
} as Meta<typeof CanvasSideBar>;

const Template: StoryFn<typeof CanvasSideBar> = (args) => {
  return <CanvasSideBar {...args} onClose={() => {}} />;
};

const aggregateCanvasNode: CanvasNode = {
  id: 'aggregate-1234',
  label: 'aggregate',
  parentNode: undefined,
  shape: NodeShape.rect,
  type: 'node',
  data: {
    vizNode: createVisualizationNode('aggregate', {
      path: 'route.from.steps.0.aggregate',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      icon: NodeIconResolver.getIcon('aggregate', NodeIconType.EIP),
      entity: storybookCamelRouteEntity,
      processorName: 'aggregate',
    }),
  },
};

export const AggregateNode = Template.bind({});
AggregateNode.args = {
  selectedNode: aggregateCanvasNode,
};

const marshalCanvasNode: CanvasNode = {
  id: 'marshal-1234',
  label: 'marshal',
  parentNode: undefined,
  shape: NodeShape.rect,
  type: 'node',
  data: {
    vizNode: createVisualizationNode('marshal', {
      path: 'route.from.steps.1.marshal',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      icon: NodeIconResolver.getIcon('marshal', NodeIconType.EIP),
      entity: storybookCamelRouteEntity,
      processorName: 'marshal',
    }),
  },
};

export const MarshalNode = Template.bind({});
MarshalNode.args = {
  selectedNode: marshalCanvasNode,
};

const resequenceCanvasNode: CanvasNode = {
  id: 'resequence-1234',
  label: 'resequence',
  parentNode: undefined,
  shape: NodeShape.rect,
  type: 'node',
  data: {
    vizNode: createVisualizationNode('resequence', {
      path: 'route.from.steps.2.resequence',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      icon: NodeIconResolver.getIcon('resequence', NodeIconType.EIP),
      entity: storybookCamelRouteEntity,
      processorName: 'resequence',
    }),
  },
};

export const ResequenceNode = Template.bind({});
ResequenceNode.args = {
  selectedNode: resequenceCanvasNode,
};

const sagaCanvasNode: CanvasNode = {
  id: 'saga-1234',
  label: 'saga',
  parentNode: undefined,
  shape: NodeShape.rect,
  type: 'node',
  data: {
    vizNode: createVisualizationNode('saga', {
      path: 'route.from.steps.3.saga',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      icon: NodeIconResolver.getIcon('saga', NodeIconType.EIP),
      entity: storybookCamelRouteEntity,
      processorName: 'saga',
    }),
  },
};

export const SagaNode = Template.bind({});
SagaNode.args = {
  selectedNode: sagaCanvasNode,
};

const setHeaderCanvasNode: CanvasNode = {
  id: 'setHeader-1234',
  label: 'setHeader',
  parentNode: undefined,
  shape: NodeShape.rect,
  type: 'node',
  data: {
    vizNode: createVisualizationNode('setHeader', {
      path: 'route.from.steps.4.setHeader',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      icon: NodeIconResolver.getIcon('setHeader', NodeIconType.EIP),
      entity: storybookCamelRouteEntity,
      processorName: 'setHeader',
    }),
  },
};

export const SetHeaderNode = Template.bind({});
SetHeaderNode.args = {
  selectedNode: setHeaderCanvasNode,
};

const tokenizerCanvasNode: CanvasNode = {
  id: 'tokenizer-1234',
  label: 'tokenizer',
  parentNode: undefined,
  shape: NodeShape.rect,
  type: 'node',
  data: {
    vizNode: createVisualizationNode('tokenizer', {
      path: 'route.from.steps.5.tokenizer',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      icon: NodeIconResolver.getIcon('tokenizer', NodeIconType.EIP),
      entity: storybookCamelRouteEntity,
      processorName: 'tokenizer',
    }),
  },
};

export const TokenizerNode = Template.bind({});
TokenizerNode.args = {
  selectedNode: tokenizerCanvasNode,
};

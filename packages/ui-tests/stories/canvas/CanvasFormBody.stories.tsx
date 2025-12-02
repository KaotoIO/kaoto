import { CanvasFormTabsContext, SuggestionRegistryProvider } from '@kaoto/forms';
import {
  CanvasFormBody,
  CatalogKind,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  createVisualizationNode,
  RuntimeProvider,
  SchemasLoaderProvider,
  VisibleFlowsProvider,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';

import { storybookCamelRouteEntity } from './canvas.stub';

export default {
  title: 'Canvas/CanvasFormBody',
  component: CanvasFormBody,
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
} as Meta<typeof CanvasFormBody>;

const Template: StoryFn<typeof CanvasFormBody> = (args) => {
  return <CanvasFormBody {...args} />;
};

export const AggregateNode = Template.bind({});
AggregateNode.args = {
  vizNode: createVisualizationNode('aggregate', {
    path: 'route.from.steps.0.aggregate',
    // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
    catalogKind: CatalogKind.Processor,
    name: 'aggregate',
    entity: storybookCamelRouteEntity,
    processorName: 'aggregate',
  }),
};

export const MarshalNode = Template.bind({});
MarshalNode.args = {
  vizNode: createVisualizationNode('marshal', {
    path: 'route.from.steps.1.marshal',
    // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
    catalogKind: CatalogKind.Processor,
    name: 'marshal',
    entity: storybookCamelRouteEntity,
    processorName: 'marshal',
  }),
};

export const ResequenceNode = Template.bind({});
ResequenceNode.args = {
  vizNode: createVisualizationNode('resequence', {
    path: 'route.from.steps.2.resequence',
    // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
    catalogKind: CatalogKind.Processor,
    name: 'resequence',
    entity: storybookCamelRouteEntity,
    processorName: 'resequence',
  }),
};

export const SagaNode = Template.bind({});
SagaNode.args = {
  vizNode: createVisualizationNode('saga', {
    path: 'route.from.steps.3.saga',
    // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
    catalogKind: CatalogKind.Processor,
    name: 'saga',
    entity: storybookCamelRouteEntity,
    processorName: 'saga',
  }),
};

export const SetHeaderNode = Template.bind({});
SetHeaderNode.args = {
  vizNode: createVisualizationNode('setHeader', {
    path: 'route.from.steps.4.setHeader',
    // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
    catalogKind: CatalogKind.Processor,
    name: 'setHeader',
    entity: storybookCamelRouteEntity,
    processorName: 'setHeader',
  }),
};

export const TokenizerNode = Template.bind({});
TokenizerNode.args = {
  vizNode: createVisualizationNode('tokenizer', {
    path: 'route.from.steps.5.tokenizer',
    // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
    catalogKind: CatalogKind.Processor,
    name: 'tokenizer',
    entity: storybookCamelRouteEntity,
    processorName: 'tokenizer',
  }),
};

import { CanvasFormTabsContext, SuggestionRegistryProvider } from '@kaoto/forms';
import {
  CanvasFormBody,
  CatalogKind,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  createVisualizationNode,
  KaotoResourceProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  SourceCodeSync,
  VisibleFlowsProvider,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { ComponentProps } from 'react';

import { storybookCamelRoute, storybookCamelRouteEntity } from './canvas.stub';

export default {
  title: 'Canvas/CanvasFormBody',
  component: CanvasFormBody,
  decorators: [
    (Story: StoryFn) => (
      <SourceCodeSync initialSourceCode={storybookCamelRoute}>
        <KaotoResourceProvider>
          <RuntimeProvider
            catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
            runtimeCatalogName=""
            testingCatalogName=""
          >
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
        </KaotoResourceProvider>
      </SourceCodeSync>
    ),
  ],
} as Meta<typeof CanvasFormBody>;

type CanvasFormBodyProps = ComponentProps<typeof CanvasFormBody>;

const Template: StoryFn<CanvasFormBodyProps> = (args) => {
  return <CanvasFormBody {...args} />;
};

export const AggregateNode: StoryObj<CanvasFormBodyProps> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('aggregate', {
      path: 'route.from.steps.0.aggregate',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      catalogKind: CatalogKind.Processor,
      name: 'aggregate',
      entity: storybookCamelRouteEntity,
      processorName: 'aggregate',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }),
  },
};

export const MarshalNode: StoryObj<CanvasFormBodyProps> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('marshal', {
      path: 'route.from.steps.1.marshal',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      catalogKind: CatalogKind.Processor,
      name: 'marshal',
      entity: storybookCamelRouteEntity,
      processorName: 'marshal',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }),
  },
};

export const ResequenceNode: StoryObj<CanvasFormBodyProps> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('resequence', {
      path: 'route.from.steps.2.resequence',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      catalogKind: CatalogKind.Processor,
      name: 'resequence',
      entity: storybookCamelRouteEntity,
      processorName: 'resequence',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }),
  },
};

export const SagaNode: StoryObj<CanvasFormBodyProps> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('saga', {
      path: 'route.from.steps.3.saga',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      catalogKind: CatalogKind.Processor,
      name: 'saga',
      entity: storybookCamelRouteEntity,
      processorName: 'saga',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }),
  },
};

export const SetHeaderNode: StoryObj<CanvasFormBodyProps> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('setHeader', {
      path: 'route.from.steps.4.setHeader',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      catalogKind: CatalogKind.Processor,
      name: 'setHeader',
      entity: storybookCamelRouteEntity,
      processorName: 'setHeader',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }),
  },
};

export const TokenizerNode: StoryObj<CanvasFormBodyProps> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('tokenizer', {
      path: 'route.from.steps.5.tokenizer',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      catalogKind: CatalogKind.Processor,
      name: 'tokenizer',
      entity: storybookCamelRouteEntity,
      processorName: 'tokenizer',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }),
  },
};

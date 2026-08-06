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
import { ComponentProps, useEffect, useState } from 'react';

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
  const [isSchemaLoaded, setIsSchemaLoaded] = useState(false);

  useEffect(() => {
    // Reset loading state when vizNode changes
    setIsSchemaLoaded(false);

    let isCancelled = false;

    const fetchSchema = async () => {
      try {
        await args.vizNode.fetchSchema();

        // Only update state if this request is still current
        if (!isCancelled) {
          setIsSchemaLoaded(true);
        }
      } catch (error) {
        // Ignore errors from stale requests
        if (!isCancelled) {
          console.error('[CanvasFormBody Story] Failed to fetch schema:', error);
          setIsSchemaLoaded(true); // Still render to show the error
        }
      }
    };

    void fetchSchema();

    // Cleanup: mark this request as stale when vizNode changes
    return () => {
      isCancelled = true;
    };
  }, [args.vizNode]);

  if (!isSchemaLoaded) {
    return <div>Loading schema...</div>;
  }

  return <CanvasFormBody {...args} />;
};

export const AggregateNode: StoryObj<CanvasFormBodyProps> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('aggregate', {
      path: 'route.from.steps.0.aggregate',
      name: 'aggregate',
      entity: storybookCamelRouteEntity,
      processorName: 'aggregate',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      primaryNodeId: { name: 'aggregate', catalogKind: CatalogKind.Pattern },
    }),
  },
};

export const MarshalNode: StoryObj<CanvasFormBodyProps> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('marshal', {
      path: 'route.from.steps.1.marshal',
      name: 'marshal',
      entity: storybookCamelRouteEntity,
      processorName: 'marshal',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      primaryNodeId: { name: 'marshal', catalogKind: CatalogKind.Pattern },
    }),
  },
};

export const ResequenceNode: StoryObj<CanvasFormBodyProps> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('resequence', {
      path: 'route.from.steps.2.resequence',
      name: 'resequence',
      entity: storybookCamelRouteEntity,
      processorName: 'resequence',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      primaryNodeId: { name: 'resequence', catalogKind: CatalogKind.Pattern },
    }),
  },
};

export const SagaNode: StoryObj<CanvasFormBodyProps> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('saga', {
      path: 'route.from.steps.3.saga',
      name: 'saga',
      entity: storybookCamelRouteEntity,
      processorName: 'saga',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      primaryNodeId: { name: 'saga', catalogKind: CatalogKind.Pattern },
    }),
  },
};

export const SetHeaderNode: StoryObj<CanvasFormBodyProps> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('setHeader', {
      path: 'route.from.steps.4.setHeader',
      name: 'setHeader',
      entity: storybookCamelRouteEntity,
      processorName: 'setHeader',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      primaryNodeId: { name: 'setHeader', catalogKind: CatalogKind.Pattern },
    }),
  },
};

export const TokenizerNode: StoryObj<CanvasFormBodyProps> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('tokenizer', {
      path: 'route.from.steps.5.tokenizer',
      name: 'tokenizer',
      entity: storybookCamelRouteEntity,
      processorName: 'tokenizer',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      primaryNodeId: { name: 'tokenizer', catalogKind: CatalogKind.Pattern },
    }),
  },
};

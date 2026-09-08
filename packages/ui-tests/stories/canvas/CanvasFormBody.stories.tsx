import { CanvasFormTabsContext, SuggestionRegistryProvider } from '@kaoto/forms';
import {
  CanvasFormBody,
  CatalogKind,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  createVisualizationNode,
  IVisualizationNode,
  KaotoResourceProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  SourceCodeSync,
  VisibleFlowsProvider,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { FunctionComponent, useEffect, useState } from 'react';

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

/**
 * Wrapper that creates a vizNode and hydrates its schema + definition inside
 * the provider tree (after CatalogLoaderProvider has populated DynamicCatalogRegistry).
 */
const HydratedCanvasFormBody: FunctionComponent<{ vizNode: IVisualizationNode }> = ({ vizNode }) => {
  const [hydrated, setHydrated] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    setFailed(false);

    Promise.all([vizNode.fetchSchema(), vizNode.fetchNodeDefinition()])
      .then(() => {
        if (!cancelled) setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [vizNode]);

  if (failed) return <div>Failed to load form data.</div>;
  if (!hydrated) {
    return <div>Loading…</div>;
  }

  return <CanvasFormBody vizNode={vizNode} />;
};

const Template: StoryFn<{ vizNode: IVisualizationNode }> = ({ vizNode }) => (
  <HydratedCanvasFormBody vizNode={vizNode} />
);

export const AggregateNode: StoryObj<{ vizNode: IVisualizationNode }> = {
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

export const MarshalNode: StoryObj<{ vizNode: IVisualizationNode }> = {
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

export const ResequenceNode: StoryObj<{ vizNode: IVisualizationNode }> = {
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

export const SagaNode: StoryObj<{ vizNode: IVisualizationNode }> = {
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

export const SetHeaderNode: StoryObj<{ vizNode: IVisualizationNode }> = {
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

export const TokenizerNode: StoryObj<{ vizNode: IVisualizationNode }> = {
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

export const LoadBalanceNode: StoryObj<{ vizNode: IVisualizationNode }> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('loadBalance', {
      path: 'route.from.steps.6.loadBalance',
      name: 'loadBalance',
      entity: storybookCamelRouteEntity,
      processorName: 'loadBalance',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      primaryNodeId: { name: 'loadBalance', catalogKind: CatalogKind.Pattern },
    }),
  },
};

export const TimerNode: StoryObj<{ vizNode: IVisualizationNode }> = {
  render: Template,
  args: {
    vizNode: createVisualizationNode('from', {
      path: 'route.from',
      name: 'timer',
      entity: storybookCamelRouteEntity,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      primaryNodeId: { name: 'from', catalogKind: CatalogKind.Entity },
      // @ts-expect-error Cannot access ambient const enums when 'isolatedModules' is enabled
      secondaryNodeId: { name: 'timer', catalogKind: CatalogKind.Component },
    }),
  },
};

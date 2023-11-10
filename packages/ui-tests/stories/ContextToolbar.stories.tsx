import {
  CatalogLoaderProvider,
  CatalogTilesProvider,
  ContextToolbar,
  EntitiesContext,
  SchemasLoaderProvider,
  SourceCodeContext,
  VisibleFlowsProvider,
} from '@kaoto-next/ui/testing';
import { Divider, Toolbar, ToolbarContent, ToolbarGroup } from '@patternfly/react-core';
import { Meta, StoryFn } from '@storybook/react';
import camelRouteMock from '../cypress/fixtures/camelRouteMock.json';

const EntitiesContextDecorator = (Story: StoryFn) => (
  <SourceCodeContext.Provider value={{ sourceCode: '', setCodeAndNotify: () => {} }}>
    <EntitiesContext.Provider value={camelRouteMock}>
      <SchemasLoaderProvider>
        <CatalogLoaderProvider>
          <CatalogTilesProvider>
            <VisibleFlowsProvider>
              <Story />
            </VisibleFlowsProvider>
          </CatalogTilesProvider>
        </CatalogLoaderProvider>
      </SchemasLoaderProvider>
    </EntitiesContext.Provider>
  </SourceCodeContext.Provider>
);

export default {
  title: 'Components/ContextToolbar',
  component: ContextToolbar,
  decorators: [EntitiesContextDecorator],
  parameters: {
    layout: 'fullscreen',
  },
} as Meta<typeof ContextToolbar>;

const Template: StoryFn<typeof ContextToolbar> = () => {
  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarGroup className="pf-topology-view__project-toolbar">
          <ContextToolbar />
        </ToolbarGroup>
      </ToolbarContent>
      <Divider />
    </Toolbar>
  );
};
export const Default = Template.bind({});

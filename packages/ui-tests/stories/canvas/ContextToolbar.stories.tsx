import {
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  CatalogTilesProvider,
  ContextToolbar,
  EntitiesProvider,
  SchemasLoaderProvider,
  SourceCodeApiContext,
  SourceCodeProvider,
  VisibleFlowsProvider,
  camelRouteYaml,
  kameletYaml,
  pipeYaml,
} from '@kaoto/kaoto/testing';
import { Divider, Toolbar, ToolbarContent, ToolbarGroup } from '@patternfly/react-core';
import { Meta, StoryFn } from '@storybook/react';
import { useContext } from 'react';

const EntitiesContextDecorator = (Story: StoryFn) => {
  return (
    <SourceCodeProvider>
      <EntitiesProvider>
        <SchemasLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
          <CatalogLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
            <CatalogTilesProvider>
              <VisibleFlowsProvider>
                <Story />
              </VisibleFlowsProvider>
            </CatalogTilesProvider>
          </CatalogLoaderProvider>
        </SchemasLoaderProvider>
      </EntitiesProvider>
    </SourceCodeProvider>
  );
};

export default {
  title: 'Canvas/ContextToolbar',
  component: ContextToolbar,
  decorators: [EntitiesContextDecorator],
  parameters: {
    layout: 'fullscreen',
  },
} as Meta<typeof ContextToolbar>;

const Template: StoryFn<{ sourceCode: string }> = (props: { sourceCode: string }) => {
  const sourceCodeApi = useContext(SourceCodeApiContext);
  sourceCodeApi.setCodeAndNotify(props.sourceCode);

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
Default.args = {
  sourceCode: camelRouteYaml,
};

export const Kamelet = Template.bind({});
Kamelet.args = {
  sourceCode: kameletYaml,
};

export const Pipe = Template.bind({});
Pipe.args = {
  sourceCode: pipeYaml,
};

export const Empty = Template.bind({});
Empty.args = {
  sourceCode: '',
};

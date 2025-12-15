import {
  camelRouteYaml,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  CatalogTilesProvider,
  ContextToolbar,
  ControllerService,
  EntitiesProvider,
  IntegrationTypeSelector,
  kameletYaml,
  pipeYaml,
  RuntimeProvider,
  SchemasLoaderProvider,
  SerializerSelector,
  SourceCodeApiContext,
  SourceCodeProvider,
  VisibleFlowsProvider,
} from '@kaoto/kaoto/testing';
import { Divider, Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { VisualizationProvider } from '@patternfly/react-topology';
import { Meta, StoryFn } from '@storybook/react';
import { useContext, useMemo } from 'react';

const EntitiesContextDecorator = (Story: StoryFn) => {
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
  const additionalControls = [
    <ToolbarItem key="toolbar-integration-type-selector">
      <IntegrationTypeSelector />
    </ToolbarItem>,
    <SerializerSelector key="toolbar-serializer-selector" />,
  ];

  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarGroup className="pf-topology-view__project-toolbar">
          <ContextToolbar additionalControls={additionalControls} />
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

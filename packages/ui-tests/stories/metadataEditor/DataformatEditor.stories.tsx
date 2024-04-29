import { DataFormatEditor, MetadataEditor } from '@kaoto/kaoto';
import {
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  IVisualizationNode,
  KaotoSchemaDefinition,
  SchemasLoaderProvider,
  VisualComponentSchema,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { CanvasNode } from './../canvas.models';

const visualComponentSchema: VisualComponentSchema = {
  title: 'My Node',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
    },
  } as unknown as KaotoSchemaDefinition['schema'],
  definition: {
    name: 'my node',
  },
};

const mockNode: CanvasNode = {
  id: '1',
  type: 'node',
  data: {
    vizNode: {
      getComponentSchema: () => visualComponentSchema,
      updateModel: (_value: unknown) => {},
    } as IVisualizationNode,
  },
};

const EntitiesContextDecorator = (Story: StoryFn) => (
  <SchemasLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
    <CatalogLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
      <Story />
    </CatalogLoaderProvider>
  </SchemasLoaderProvider>
);

export default {
  title: 'MetadataEditor/DataFormatEditor',
  component: DataFormatEditor,
  decorators: [EntitiesContextDecorator],
  parameters: {
    layout: 'fullscreen',
  },
} as Meta<typeof DataFormatEditor>;

const Template: StoryFn<typeof MetadataEditor> = (args: CanvasNode) => {
  return <DataFormatEditor {...args} />;
};

export const Default = Template.bind({});
Default.args = {
  selectedNode: mockNode,
};

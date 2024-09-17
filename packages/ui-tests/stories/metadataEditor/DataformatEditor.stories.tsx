import { DataFormatEditor, MetadataEditor } from '@kaoto/kaoto';
import {
  CanvasNode,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  IVisualizationNode,
  KaotoSchemaDefinition,
  RuntimeProvider,
  SchemasLoaderProvider,
  VisualComponentSchema,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';

const visualComponentSchema: VisualComponentSchema = {
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
    csv: {
      commentMarker: 'test',
      delimiter: 'test',
      escape: 'test',
      id: 'test',
    },
  },
};

const mockNode: CanvasNode = {
  id: '1',
  type: 'node',
  data: {
    vizNode: {
      getTitle: () => 'My Node',
      getComponentSchema: () => visualComponentSchema,
      updateModel: (_value: unknown) => {},
    } as IVisualizationNode,
  },
};

const EntitiesContextDecorator = (Story: StoryFn) => (
  <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
    <SchemasLoaderProvider>
      <CatalogLoaderProvider>
        <Story />
      </CatalogLoaderProvider>
    </SchemasLoaderProvider>
  </RuntimeProvider>
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
  formMode: 'All',
};

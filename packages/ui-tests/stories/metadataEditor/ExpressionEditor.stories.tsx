import { ExpressionEditor, MetadataEditor } from '@kaoto-next/ui';
import {
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  IVisualizationNode,
  SchemasLoaderProvider,
  VisualComponentSchema,
} from '@kaoto-next/ui/testing';
import { Meta, StoryFn } from '@storybook/react';
import { JSONSchemaType } from 'ajv';
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
  } as unknown as JSONSchemaType<unknown>,
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
  title: 'MetadataEditor/ExpressionEditor',
  component: ExpressionEditor,
  decorators: [EntitiesContextDecorator],
  parameters: {
    layout: 'fullscreen',
  },
} as Meta<typeof ExpressionEditor>;

const Template: StoryFn<typeof MetadataEditor> = (args: CanvasNode) => {
  return <ExpressionEditor {...args} />;
};

export const Default = Template.bind({});
Default.args = {
  selectedNode: mockNode,
};

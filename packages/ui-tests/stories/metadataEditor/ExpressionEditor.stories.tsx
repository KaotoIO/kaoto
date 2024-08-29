import {
  CanvasNode,
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  IVisualizationNode,
  KaotoSchemaDefinition,
  MetadataEditor,
  RuntimeProvider,
  SchemasLoaderProvider,
  StepExpressionEditor,
  VisualComponentSchema,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';

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
    expression: {
      csimple: {
        expression: 'test',
        id: 'test',
        resultType: 'java.lang.String',
      },
    },
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
  <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
    <SchemasLoaderProvider>
      <CatalogLoaderProvider>
        <Story />
      </CatalogLoaderProvider>
    </SchemasLoaderProvider>
  </RuntimeProvider>
);

export default {
  title: 'MetadataEditor/ExpressionEditor',
  component: StepExpressionEditor,
  decorators: [EntitiesContextDecorator],
  parameters: {
    layout: 'fullscreen',
  },
} as Meta<typeof StepExpressionEditor>;

const Template: StoryFn<typeof MetadataEditor> = (args: CanvasNode) => {
  return <StepExpressionEditor {...args} />;
};

export const Default = Template.bind({});
Default.args = {
  selectedNode: mockNode,
  formMode: 'All',
};

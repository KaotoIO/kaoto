import { KaotoForm, KaotoFormProps, MetadataPage } from '@kaoto/kaoto';
import { Meta, StoryFn } from '@storybook/react';

import mockSchema from '../../cypress/fixtures/metadata/metadataSchema.json';
import mockModel from '../../cypress/fixtures/metadata/metadataModel.json';
import { CanvasFormTabsContext, CanvasFormTabsContextResult, KaotoSchemaDefinition } from '@kaoto/kaoto/testing';

export default {
  title: 'KaotoForm/MetadataEditor',
  component: MetadataPage,
} as Meta<typeof MetadataPage>;

const formTabsValue: CanvasFormTabsContextResult = {} as CanvasFormTabsContextResult;
const getMetadataModel = () => {
  return mockModel.metadata;
};
const onChangeModel = () => {};

const Template: StoryFn<typeof KaotoForm> = (args) => {
  return (
    <CanvasFormTabsContext.Provider value={formTabsValue}>
      <KaotoForm
        {...args}
        data-testid="metadata-form"
        schema={mockSchema as KaotoSchemaDefinition['schema']}
        onChange={onChangeModel as KaotoFormProps['onChange']}
      />
    </CanvasFormTabsContext.Provider>
  );
};

export const MetadataEmpty = Template.bind({});
MetadataEmpty.args = {
  model: {},
};

export const MetadataWithValues = Template.bind({});
MetadataWithValues.args = {
  model: getMetadataModel(),
};

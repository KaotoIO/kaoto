import { MetadataEditor } from '@kaoto-next/ui';
import { Meta, StoryFn } from '@storybook/react';
import beans from '../cypress/fixtures/metadata/beans.json';
import mockModel from '../cypress/fixtures/metadata/mockModel.json';
import mockSchema from '../cypress/fixtures/metadata/mockSchema.json';

export default {
  title: 'Components/MetadataEditor',
  component: MetadataEditor,
} as Meta<typeof MetadataEditor>;

const Template: StoryFn<typeof MetadataEditor> = (args) => {
  return <MetadataEditor {...args} />;
};

export const MetadataBeansSimple = Template.bind({});
MetadataBeansSimple.args = {
  name: 'Beans',
  schema: mockSchema.beans,
  onChangeModel: () => {},
};

export const MetadataBeansSimpleWithData = Template.bind({});
MetadataBeansSimpleWithData.args = {
  name: 'Beans',
  schema: mockSchema.beans,
  metadata: mockModel.beansNoProp,
  onChangeModel: () => {},
};

export const MetadataBeansCustomProperties = Template.bind({});
MetadataBeansCustomProperties.args = {
  name: 'Beans',
  schema: beans,
  onChangeModel: () => {},
};

export const MetadataBeansCustomPropertiesWithData = Template.bind({});
MetadataBeansCustomPropertiesWithData.args = {
  name: 'Beans',
  schema: beans,
  metadata: mockModel.beans,
  onChangeModel: () => {},
};

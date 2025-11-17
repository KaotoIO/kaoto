import { MetadataEditor } from '@kaoto/kaoto';
import { Meta, StoryFn } from '@storybook/react';

import mockModel from '../../cypress/fixtures/metadata/beansModel.json';
import mockSchema from '../../cypress/fixtures/metadata/beansSchema.json';

export default {
  title: 'MetadataEditor/BeanEditor',
  component: MetadataEditor,
} as Meta<typeof MetadataEditor>;

const Template: StoryFn<typeof MetadataEditor> = (args) => {
  return <MetadataEditor {...args} />;
};

export const BeansCustomProperties = Template.bind({});
BeansCustomProperties.args = {
  name: 'Beans',
  schema: mockSchema,
  onChangeModel: () => {},
};

export const BeansSimpleWithData = Template.bind({});
BeansSimpleWithData.args = {
  name: 'Beans',
  schema: mockSchema,
  metadata: mockModel.beansNoProp,
  onChangeModel: () => {},
};

export const BeansWithDataCustomProperties = Template.bind({});
BeansWithDataCustomProperties.args = {
  name: 'Beans',
  schema: mockSchema,
  metadata: mockModel.beans,
  onChangeModel: () => {},
};

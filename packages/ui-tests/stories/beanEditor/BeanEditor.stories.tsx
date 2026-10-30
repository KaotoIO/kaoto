import { BeanEditor } from '@kaoto/kaoto';
import { Meta, StoryFn } from '@storybook/react';

import mockModel from '../../cypress/fixtures/metadata/beansModel.json';
import mockSchema from '../../cypress/fixtures/metadata/beansSchema.json';

export default {
  title: 'BeanEditor/BeanEditor',
  component: BeanEditor,
} as Meta<typeof BeanEditor>;

const Template: StoryFn<typeof BeanEditor> = (args) => {
  return <BeanEditor {...args} />;
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

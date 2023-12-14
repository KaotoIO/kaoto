import { MetadataEditor } from '@kaoto-next/ui';
import { Meta, StoryFn } from '@storybook/react';

import mockSchema from '../../cypress/fixtures/metadata/metadataSchema.json';
import mockModel from '../../cypress/fixtures/metadata/metadataModel.json';

export default {
  title: 'MetadataEditor/MetadataEditor',
  component: MetadataEditor,
} as Meta<typeof MetadataEditor>;

const Template: StoryFn<typeof MetadataEditor> = (args) => {
  return <MetadataEditor {...args} />;
};

export const MetadataEmpty = Template.bind({});
MetadataEmpty.args = {
  name: 'Metadata',
  schema: mockSchema,
  onChangeModel: () => {},
};

export const MetadataWithValues = Template.bind({});
MetadataWithValues.args = {
  name: 'Metadata',
  metadata: mockModel.metadata,
  schema: mockSchema,
  onChangeModel: () => {},
};

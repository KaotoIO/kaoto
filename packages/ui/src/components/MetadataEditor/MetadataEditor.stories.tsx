import { MetadataEditor } from './MetadataEditor';
import { mockSchema } from './TestUtil';
import { useArgs } from '@storybook/client-api';
import { StoryFn, Meta } from '@storybook/react';

export default {
  title: 'Metadata/metadata-editor-modal',
  component: MetadataEditor,
  excludeStories: ['schemaMock'],
  decorators: [
    (Story) => (
      <div style={{ margin: '3em' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: { handleCloseModal: { action: 'clicked' } },
} as Meta<typeof MetadataEditor>;

const Template: StoryFn<typeof MetadataEditor> = (args) => {
  const [{ isModalOpen }, updateArgs] = useArgs();
  return (
    <>
      <button onClick={() => updateArgs({ isModalOpen: !isModalOpen })}>Open Metadata Editor Modal</button>
      <MetadataEditor {...args} />
    </>
  );
};

export const BeansArray = Template.bind({});
BeansArray.args = {
  name: 'beans',
  schema: mockSchema.beans,
};

export const SingleObject = Template.bind({});
SingleObject.args = {
  name: 'singleObject',
  schema: mockSchema.single,
};

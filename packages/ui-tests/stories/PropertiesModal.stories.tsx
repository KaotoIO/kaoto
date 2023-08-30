import { ITile, PropertiesModal } from '@kaoto-next/ui';
import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';
import aggregate from '../cypress/fixtures/aggregate.json';
import cronSource from '../cypress/fixtures/cronSource.json';
import activeMq from '../cypress/fixtures/activeMq.json';

export default {
  title: 'Components/PropertiesModal',
  component: PropertiesModal,
} as Meta<typeof PropertiesModal>;

const Template: StoryFn<typeof PropertiesModal> = (args) => {
  console.log(args);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleClose = () => setIsModalOpen(!isModalOpen);
  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>Open Properties Modal</button>
      <PropertiesModal {...args} onClose={handleClose} isModalOpen={isModalOpen} />
    </>
  );
};

export const ProcessorPropertiesModal = Template.bind({});
ProcessorPropertiesModal.args = {
  tile: aggregate as ITile,
};

export const SmallKameletPropertiesModal = Template.bind({});
SmallKameletPropertiesModal.args = {
  tile: cronSource as ITile,
};

export const LargeComponentPropertiesModal = Template.bind({});
LargeComponentPropertiesModal.args = {
  tile: activeMq as ITile,
};

import { KaotoAboutModal } from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';

export default {
  title: 'Settings/KaotoAboutModal',
  component: KaotoAboutModal,
} as Meta<typeof KaotoAboutModal>;

const Template: StoryFn<typeof KaotoAboutModal> = (args) => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleClose = () => setIsModalOpen(!isModalOpen);
  return <KaotoAboutModal {...args} handleCloseModal={handleClose} isModalOpen={isModalOpen} />;
};

export const AboutModal = Template.bind({});
AboutModal.args = {};

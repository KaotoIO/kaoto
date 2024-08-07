import { KaotoSchemaDefinition, NewBeanModal } from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';

const beanSchema: KaotoSchemaDefinition['schema'] = {
  title: 'Bean Factory',
  description: 'Define custom beans that can be used in your Camel routes and in general.',
  type: 'object',
  additionalProperties: false,
  properties: {
    builderClass: {
      type: 'string',
      title: 'Builder Class',
      description:
        'Fully qualified class name of builder class to use for creating and configuring the bean. The builder will use the properties values to configure the bean.',
    },
    name: {
      type: 'string',
      title: 'Name',
      description: 'The name of the bean (bean id)',
    },
    type: {
      type: 'string',
      title: 'Type',
      description: 'The class name (fully qualified) of the bean',
    },
  },
  required: ['name', 'type'],
};

export default {
  title: 'Canvas/NewBeanModal',
  component: NewBeanModal,
  decorators: [(Story: StoryFn) => <Story />],
} as Meta<typeof NewBeanModal>;

const Template: StoryFn<typeof NewBeanModal> = (args) => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const handleClose = () => setIsModalOpen(!isModalOpen);
  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>Open New Bean Modal</button>
      <NewBeanModal {...args} onCancelCreateBean={handleClose} isOpen={isModalOpen} />
    </>
  );
};

export const Default = Template.bind({});
Default.args = {
  beanSchema: beanSchema,
  onCreateBean: () => {},
  propertyTitle: 'Bean Factory',
  javaType: 'org.apache.camel.spi.ExceptionHandler',
};

import { DataMapperDebugger } from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { fn } from '@storybook/test';

export default {
  title: 'DataMapper/Debugger',
  component: DataMapperDebugger,
} as Meta<typeof DataMapperDebugger>;

const Template: StoryFn<typeof DataMapperDebugger> = (args) => {
  return <DataMapperDebugger {...args} />;
};

export const Debugger = Template.bind({});
Debugger.args = {
  onUpdateDocument: fn(),
  onUpdateMappings: fn(),
};

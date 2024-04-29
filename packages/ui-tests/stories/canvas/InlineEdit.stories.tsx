import { InlineEdit } from '@kaoto/kaoto';
import { Card, CardBody, CardFooter, CardTitle } from '@patternfly/react-core';
import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';

export default {
  title: 'Canvas/InlineEdit',
  component: InlineEdit,
  decorators: [
    (Story: StoryFn) => (
      <div style={{ margin: '3em' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {},
} as Meta<typeof InlineEdit>;

const Template: StoryFn<typeof InlineEdit> = (args) => {
  const [localValue, setLocalValue] = useState(args.value);

  return (
    <Card>
      <CardTitle>Inline Edit</CardTitle>
      <CardBody>
        <InlineEdit {...args} value={args.value ?? localValue} onChange={args.onChange ?? setLocalValue} />
      </CardBody>
      <CardFooter></CardFooter>
    </Card>
  );
};
export const Default = Template.bind({});
Default.args = {
  value: 'This is an editable text',
};

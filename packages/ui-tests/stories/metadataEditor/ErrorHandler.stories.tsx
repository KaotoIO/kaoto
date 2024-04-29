import { MetadataEditor } from '@kaoto/kaoto';
import { Meta, StoryFn } from '@storybook/react';

import errorHandler from '../../cypress/fixtures/metadata/errorHandlerSchema.json';

export default {
  title: 'MetadataEditor/ErrorHandler',
  component: MetadataEditor,
} as Meta<typeof MetadataEditor>;

const Template: StoryFn<typeof MetadataEditor> = (args) => {
  return <MetadataEditor {...args} />;
};

export const ErrorHandlerLog = Template.bind({});
ErrorHandlerLog.args = {
  name: 'Log Pipe ErrorHandler',
  schema: errorHandler.logErrorHandler,
  onChangeModel: () => {},
};

export const ErrorHandlerSink = Template.bind({});
ErrorHandlerSink.args = {
  name: 'Sink Pipe ErrorHandler',
  schema: errorHandler.sinkErrorHandler,
  onChangeModel: () => {},
};

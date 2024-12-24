import { SettingsForm } from '@kaoto/kaoto';
import { SettingsProvider, ReloadContext, DefaultSettingsAdapter } from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { reactRouterOutlet, reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';

export default {
  title: 'Settings/SettingsForm',
  decorators: [withRouter],
  parameters: {
    reactRouter: reactRouterParameters({
      routing: reactRouterOutlet({
        path: '*',
      }),
    }),
  },
  component: SettingsForm,
} as Meta<typeof SettingsForm>;

const Template: StoryFn<typeof SettingsForm> = (args) => {
  const reloadPage = () => {};
  const settingsAdapter = new DefaultSettingsAdapter();
  return (
    <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
      <SettingsProvider adapter={settingsAdapter}>
        <SettingsForm {...args} />
      </SettingsProvider>
    </ReloadContext.Provider>
  );
};

export const SettingsEmptyForm = Template.bind({});
SettingsEmptyForm.args = {
  name: 'Metadata',
  onChangeModel: () => {},
};

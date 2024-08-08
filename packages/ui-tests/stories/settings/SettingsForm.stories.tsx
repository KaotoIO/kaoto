import { SettingsForm } from '@kaoto/kaoto';
import { SettingsProvider, ReloadContext, DefaultSettingsAdapter } from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';

export default {
  title: 'Settings/SettingsForm',
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

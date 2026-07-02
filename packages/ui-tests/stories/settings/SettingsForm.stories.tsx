import { SettingsForm } from '@kaoto/kaoto';
import {
  CatalogSchemaLoader,
  DefaultSettingsAdapter,
  KaotoResourceProvider,
  ReloadContext,
  RuntimeProvider,
  SettingsProvider,
  SourceCodeSync,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';

export default {
  title: 'Settings/SettingsForm',
  decorators: [],
  component: SettingsForm,
} as Meta<typeof SettingsForm>;

const Template: StoryFn<typeof SettingsForm> = (args) => {
  const reloadPage = () => {};
  const settingsAdapter = new DefaultSettingsAdapter();
  return (
    <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
      <SourceCodeSync initialSourceCode="">
        <KaotoResourceProvider>
          <RuntimeProvider
            catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
            runtimeCatalogName=""
            testingCatalogName=""
          >
            <SettingsProvider adapter={settingsAdapter}>
              <SettingsForm {...args} />
            </SettingsProvider>
          </RuntimeProvider>
        </KaotoResourceProvider>
      </SourceCodeSync>
    </ReloadContext.Provider>
  );
};

export const SettingsEmptyForm = Template.bind({});
SettingsEmptyForm.args = {
  name: 'Metadata',
  onChangeModel: () => {},
};

import { SettingsForm } from '@kaoto/kaoto';
import {
  CatalogSchemaLoader,
  DefaultSettingsAdapter,
  inMemorySourceCodeAdapter,
  KaotoResourceProvider,
  ReloadContext,
  RuntimeProvider,
  SettingsProvider,
  SourceCodeProvider,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { useMemo } from 'react';

export default {
  title: 'Settings/SettingsForm',
  decorators: [],
  component: SettingsForm,
} as Meta<typeof SettingsForm>;

const Template: StoryFn<typeof SettingsForm> = (args) => {
  const settingsAdapter = new DefaultSettingsAdapter();
  const reloadContextValue = useMemo(() => ({ reloadPage: () => {}, lastRender: 0 }), []);
  return (
    <ReloadContext.Provider value={reloadContextValue}>
      <SourceCodeProvider adapter={inMemorySourceCodeAdapter('')}>
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
      </SourceCodeProvider>
    </ReloadContext.Provider>
  );
};

export const SettingsEmptyForm = Template.bind({});
SettingsEmptyForm.args = {
  name: 'Metadata',
  onChangeModel: () => {},
};

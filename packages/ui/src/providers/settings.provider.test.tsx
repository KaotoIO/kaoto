import { act, render } from '@testing-library/react';
import { useContext, useEffect, useState } from 'react';
import { DefaultSettingsAdapter, SettingsModel } from '../models/settings';
import { SettingsContext, SettingsProvider } from './settings.provider';

describe('SettingsProvider', () => {
  it('should render', () => {
    const settingsAdapter = new DefaultSettingsAdapter();

    const wrapper = render(
      <SettingsProvider adapter={settingsAdapter}>
        <TestProvider />
      </SettingsProvider>,
    );

    act(() => {
      expect(wrapper.getByTestId('settings')).toMatchSnapshot();
    });
  });
});

function TestProvider() {
  const settingsContext = useContext(SettingsContext);
  const [settings, setSettings] = useState<SettingsModel | null>(null);

  useEffect(() => {
    setSettings(settingsContext.getSettings());
  }, [settingsContext]);

  return <p data-testid="settings">{JSON.stringify(settings)}</p>;
}

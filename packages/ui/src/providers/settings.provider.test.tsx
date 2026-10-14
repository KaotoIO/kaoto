import { act, render } from '@testing-library/react';
import { useContext } from 'react';

import { DefaultSettingsAdapter } from '../models/settings';
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

const TestProvider = () => {
  const settingsContext = useContext(SettingsContext);
  const settings = settingsContext.getSettings();

  return <p data-testid="settings">{JSON.stringify(settings)}</p>;
};

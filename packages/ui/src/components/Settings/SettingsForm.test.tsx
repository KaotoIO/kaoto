import { act, fireEvent, render } from '@testing-library/react';
import { AbstractSettingsAdapter, DefaultSettingsAdapter } from '../../models/settings';
import { ReloadContext, SettingsProvider } from '../../providers';
import { SettingsForm } from './SettingsForm';

describe('SettingsForm', () => {
  let reloadPage: jest.Mock;
  let settingsAdapter: AbstractSettingsAdapter;

  beforeEach(() => {
    reloadPage = jest.fn();
    settingsAdapter = new DefaultSettingsAdapter();
  });

  it('should render', () => {
    const wrapper = render(
      <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
        <SettingsProvider adapter={settingsAdapter}>
          <SettingsForm />
        </SettingsProvider>
      </ReloadContext.Provider>,
    );

    expect(wrapper.getByTestId('settings-form')).toMatchSnapshot();
  });

  it('should update settings upon clicking save', () => {
    const wrapper = render(
      <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
        <SettingsProvider adapter={settingsAdapter}>
          <SettingsForm />
        </SettingsProvider>
      </ReloadContext.Provider>,
    );

    act(() => {
      const input = wrapper.getByLabelText('Camel Catalog URL');
      fireEvent.change(input, { target: { value: 'http://localhost:8080' } });
    });

    act(() => {
      const button = wrapper.getByTestId('settings-form-save-btn');
      fireEvent.click(button);
    });

    expect(settingsAdapter.getSettings().catalogUrl).toBe('http://localhost:8080');
  });

  it('should not update settings if the save button was clicked', () => {
    const wrapper = render(
      <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
        <SettingsProvider adapter={settingsAdapter}>
          <SettingsForm />
        </SettingsProvider>
      </ReloadContext.Provider>,
    );

    act(() => {
      const input = wrapper.getByLabelText('Camel Catalog URL');
      fireEvent.change(input, { target: { value: 'http://localhost:8080' } });
    });

    expect(settingsAdapter.getSettings().catalogUrl).not.toBe('http://localhost:8080');
  });

  it('should reload the page upon clicking save', () => {
    const wrapper = render(
      <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
        <SettingsProvider adapter={settingsAdapter}>
          <SettingsForm />
        </SettingsProvider>
      </ReloadContext.Provider>,
    );

    act(() => {
      const button = wrapper.getByTestId('settings-form-save-btn');
      fireEvent.click(button);
    });

    expect(reloadPage).toHaveBeenCalledTimes(1);
  });
});

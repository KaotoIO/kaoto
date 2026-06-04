import { SuggestionRegistryProvider } from '@kaoto/forms';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AbstractSettingsAdapter, DefaultSettingsAdapter } from '../../models/settings';
import { ReloadContext, SettingsProvider } from '../../providers';
import { TestRuntimeProviderWrapper } from '../../stubs/TestRuntimeProviderWrapper';
import { SettingsForm } from './SettingsForm';

describe('SettingsForm', () => {
  let reloadPage: jest.Mock;
  let settingsAdapter: AbstractSettingsAdapter;
  const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <MemoryRouter>
        <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
          <RuntimeProvider>
            <SettingsProvider adapter={settingsAdapter}>
              <SuggestionRegistryProvider>{children}</SuggestionRegistryProvider>
            </SettingsProvider>
          </RuntimeProvider>
        </ReloadContext.Provider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    reloadPage = jest.fn();
    settingsAdapter = new DefaultSettingsAdapter();
    render(<SettingsForm />, { wrapper });
  });

  it('should render', () => {
    expect(screen.getByTestId('settings-form')).toMatchSnapshot();
  });

  it('should update settings upon clicking save', () => {
    act(() => {
      const input = screen.getByLabelText('Camel Catalog URL');
      fireEvent.change(input, { target: { value: 'http://localhost:8080' } });
    });

    act(() => {
      const button = screen.getByTestId('settings-form-save-btn');
      fireEvent.click(button);
    });

    expect(settingsAdapter.getSettings().catalogUrl).toBe('http://localhost:8080');
  });

  it('should not update settings if the save button was not clicked', () => {
    act(() => {
      const input = screen.getByLabelText('Camel Catalog URL');
      fireEvent.change(input, { target: { value: 'http://localhost:8080' } });
    });

    expect(settingsAdapter.getSettings().catalogUrl).not.toBe('http://localhost:8080');
  });

  it('should reload the page upon clicking save', async () => {
    await act(async () => {
      const button = screen.getByTestId('settings-form-save-btn');
      fireEvent.click(button);
    });

    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('should display error alert when save fails', async () => {
    // Mock saveSettings to throw an error
    const errorMessage = 'Failed to save settings to storage';
    settingsAdapter.saveSettings = jest.fn().mockRejectedValue(new Error(errorMessage));

    await act(async () => {
      const button = screen.getByTestId('settings-form-save-btn');
      fireEvent.click(button);
    });

    // Wait for error alert to appear
    const errorAlert = await screen.findByText('Failed to save settings.');
    expect(errorAlert).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(reloadPage).not.toHaveBeenCalled();
  });
});

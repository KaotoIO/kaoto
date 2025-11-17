import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AbstractSettingsAdapter, DefaultSettingsAdapter } from '../../models/settings';
import { ReloadContext, SettingsProvider } from '../../providers';
import { SettingsForm } from './SettingsForm';

describe('SettingsForm', () => {
  let reloadPage: jest.Mock;
  let settingsAdapter: AbstractSettingsAdapter;

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <MemoryRouter>
        <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
          <SettingsProvider adapter={settingsAdapter}>{children}</SettingsProvider>
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

  it('should reload the page upon clicking save', () => {
    act(() => {
      const button = screen.getByTestId('settings-form-save-btn');
      fireEvent.click(button);
    });

    expect(reloadPage).toHaveBeenCalledTimes(1);
  });
});

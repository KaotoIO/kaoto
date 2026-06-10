import { render } from '@testing-library/react';
import { Mock, vi } from 'vitest';

import { AbstractSettingsAdapter, DefaultSettingsAdapter } from '../../models/settings';
import { ReloadContext, SettingsProvider } from '../../providers';
import { LoadDefaultCatalog } from './LoadDefaultCatalog';

describe('LoadDefaultCatalog', () => {
  let reloadPage: Mock;
  let settingsAdapter: AbstractSettingsAdapter;

  beforeEach(() => {
    reloadPage = vi.fn();
    settingsAdapter = new DefaultSettingsAdapter();
  });

  it('should render correctly', () => {
    const wrapper = render(
      <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
        <SettingsProvider adapter={settingsAdapter}>
          <LoadDefaultCatalog errorMessage="Test error message" />
        </SettingsProvider>
      </ReloadContext.Provider>,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('should render child components', () => {
    const wrapper = render(
      <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
        <SettingsProvider adapter={settingsAdapter}>
          <LoadDefaultCatalog errorMessage="Test error message">
            <div>Test children</div>
          </LoadDefaultCatalog>
        </SettingsProvider>
      </ReloadContext.Provider>,
    );

    const child = wrapper.getByText('Test children');

    expect(child).toBeInTheDocument();
  });

  it('should call reloadCatalog on button click', () => {
    const wrapper = render(
      <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
        <SettingsProvider adapter={settingsAdapter}>
          <LoadDefaultCatalog errorMessage="Test error message">
            <div>Test children</div>
          </LoadDefaultCatalog>
        </SettingsProvider>
      </ReloadContext.Provider>,
    );

    const button = wrapper.getByText('Reload with default Catalog');
    button.click();

    expect(reloadPage).toHaveBeenCalledTimes(1);
  });
});

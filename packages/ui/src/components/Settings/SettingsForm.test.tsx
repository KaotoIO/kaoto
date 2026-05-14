import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AbstractSettingsAdapter, DefaultSettingsAdapter } from '../../models/settings';
import { ReloadContext, RuntimeProvider, SettingsProvider } from '../../providers';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { SettingsForm } from './SettingsForm';

describe('SettingsForm', () => {
  const mockCatalogLibrary: CatalogLibrary = {
    definitions: [
      { name: 'Camel Main 4.18.0', version: '4.18.0', runtime: 'Main', catalogs: {} },
      { name: 'Citrus 4.10.1', version: '4.10.1', runtime: 'Citrus', catalogs: {} },
    ] as unknown as CatalogLibraryEntry[],
    version: 0,
    name: 'test-catalog-library',
  };

  const renderSettingsForm = async () => {
    const reloadPage = jest.fn();
    const settingsAdapter: AbstractSettingsAdapter = new DefaultSettingsAdapter();

    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => mockCatalogLibrary,
      url: `http://localhost/${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}`,
    } as unknown as Response);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
          <SettingsProvider adapter={settingsAdapter}>
            <RuntimeProvider
              catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
              camelCatalog={{ version: '4.18.0', runtime: 'Main' }}
              citrusCatalog={{ version: '4.10.1', runtime: 'Citrus' }}
            >
              {children}
            </RuntimeProvider>
          </SettingsProvider>
        </ReloadContext.Provider>
      </MemoryRouter>
    );

    render(<SettingsForm />, { wrapper });
    await screen.findByTestId('settings-form');

    return {
      reloadPage,
      settingsAdapter,
      user: userEvent.setup(),
    };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the settings form', async () => {
    await renderSettingsForm();

    expect(screen.getByTestId('settings-form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('should update settings upon clicking save', async () => {
    const { settingsAdapter, user } = await renderSettingsForm();

    const input = screen.getByLabelText('Camel Catalog URL');
    await user.clear(input);
    await user.type(input, 'http://localhost:8080');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(settingsAdapter.getSettings().catalogUrl).toBe('http://localhost:8080');
  });

  it('should not update settings if the save button was not clicked', async () => {
    const { settingsAdapter, user } = await renderSettingsForm();

    const input = screen.getByLabelText('Camel Catalog URL');
    await user.clear(input);
    await user.type(input, 'http://localhost:8080');

    expect(settingsAdapter.getSettings().catalogUrl).not.toBe('http://localhost:8080');
  });

  it('should reload the page upon clicking save', async () => {
    const { reloadPage, user } = await renderSettingsForm();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(reloadPage).toHaveBeenCalledTimes(1);
  });
});

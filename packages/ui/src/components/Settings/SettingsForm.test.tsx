import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

import { AbstractSettingsAdapter } from '../../models/settings';
import { DefaultSettingsAdapter } from '../../models/settings/default-settings-adapter';
import {
  CanvasLayoutDirection,
  ColorScheme,
  NodeLabelType,
  NodeToolbarTrigger,
  SettingsModel,
} from '../../models/settings/settings.model';
import { ReloadContext, RuntimeProvider, SettingsProvider } from '../../providers';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { SettingsForm } from './SettingsForm';

describe('SettingsForm', () => {
  const mockCatalogLibrary: CatalogLibrary = {
    definitions: [
      { name: 'Camel Main 4.18.1', version: '4.18.1', runtime: 'Main' },
      { name: 'Citrus 4.10.1', version: '4.10.1', runtime: 'Citrus' },
    ] as CatalogLibrary['definitions'],
    version: 0,
    name: 'test-catalog-library',
  };

  const createSettings = (): SettingsModel => ({
    catalogUrl: CatalogSchemaLoader.DEFAULT_CATALOG_PATH,
    camelCatalog: { version: '4.18.1', runtime: 'Main' },
    testingCatalog: { version: '4.10.1', runtime: 'Citrus' },
    nodeLabel: NodeLabelType.Description,
    nodeToolbarTrigger: NodeToolbarTrigger.onHover,
    colorScheme: ColorScheme.Auto,
    rest: {
      apicurioRegistryUrl: '',
      customMediaTypes: [],
    },
    canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
  });

  const mockFetchCatalogLibrary = () =>
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => mockCatalogLibrary,
      url: `http://localhost/${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}`,
    } as unknown as Response);

  const renderSettingsForm = async ({
    settingsAdapter = new DefaultSettingsAdapter(),
    reloadPage = jest.fn(),
  }: {
    settingsAdapter?: AbstractSettingsAdapter;
    reloadPage?: jest.MockedFunction<() => void>;
  } = {}) => {
    mockFetchCatalogLibrary();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <ReloadContext.Provider value={{ reloadPage, lastRender: 0 }}>
          <SettingsProvider adapter={settingsAdapter}>
            <RuntimeProvider
              catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
              camelCatalog={{ version: '4.18.1', runtime: 'Main' }}
              testingCatalog={{ version: '4.10.1', runtime: 'Citrus' }}
            >
              {children}
            </RuntimeProvider>
          </SettingsProvider>
        </ReloadContext.Provider>
      </MemoryRouter>
    );

    render(<SettingsForm />, { wrapper });
    await screen.findByRole('button', { name: 'Save' });

    return {
      reloadPage,
      settingsAdapter,
      user: userEvent.setup(),
    };
  };

  afterEach(() => {
    jest.restoreAllMocks();
    mockNavigate.mockReset();
  });

  it('should save the updated catalog URL when clicking save', async () => {
    const settingsAdapter: AbstractSettingsAdapter = new DefaultSettingsAdapter();
    const saveSpy = jest.spyOn(settingsAdapter, 'saveSettings');
    const { user, reloadPage } = await renderSettingsForm({ settingsAdapter });

    const input = screen.getByLabelText('Camel Catalog URL');
    await user.clear(input);
    await user.type(input, 'http://localhost:8080');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should show an info warning when the catalog URL changes before save', async () => {
    const { user } = await renderSettingsForm();

    const input = screen.getByLabelText('Camel Catalog URL');
    await user.clear(input);
    await user.type(input, 'http://localhost:8080');

    expect(screen.getByText('Catalog versions will be recomputed after saving a custom catalog.')).toBeInTheDocument();
    expect(
      screen.getByText(/Runtime selector versions still reflect the currently saved catalog URL\./),
    ).toBeInTheDocument();
  });

  it('should reload and navigate home when catalog URL did not change', async () => {
    mockFetchCatalogLibrary();
    const { reloadPage, user } = await renderSettingsForm();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
  });

  it('should reload and stay on settings page when catalog URL changed', async () => {
    const { reloadPage, user } = await renderSettingsForm();

    const input = screen.getByLabelText('Camel Catalog URL');
    await user.clear(input);
    await user.type(input, 'http://localhost:8080');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should show an error and avoid reload when save fails', async () => {
    const reloadPage = jest.fn();
    const settingsAdapter: AbstractSettingsAdapter = {
      getSettings: jest.fn(() => createSettings()),
      saveSettings: jest.fn().mockRejectedValue(new Error('Broken custom catalog')),
    };

    const { user } = await renderSettingsForm({ settingsAdapter, reloadPage });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Failed to save settings.')).toBeInTheDocument();
    expect(screen.getByText('Broken custom catalog')).toBeInTheDocument();
    expect(reloadPage).not.toHaveBeenCalled();
  });
});

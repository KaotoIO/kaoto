import { fireEvent, render, screen } from '@testing-library/react';
import { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { DefaultSettingsAdapter } from '../../models/settings';
import { SettingsContext } from '../../providers';
import { Links } from '../../router/links.models';
import { TestProvidersWrapper } from '../../stubs/TestProvidersWrapper';
import { RestDslImportPage } from './RestDslImportPage';

const GET_PET_SPEC = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: { '/pet': { get: { operationId: 'getPet', responses: { '200': { description: 'ok' } } } } },
});

describe('RestDslImportPage', () => {
  /** Renders the page with real entities and imports a specification, landing on the Result step */
  const renderImportedPage = async (routes: ReactElement) => {
    const { Provider } = await TestProvidersWrapper();
    render(
      <SettingsContext.Provider value={new DefaultSettingsAdapter()}>
        <Provider>
          <MemoryRouter initialEntries={[Links.RestImport]}>
            <Routes>
              {routes}
              <Route path={Links.RestImport} element={<RestDslImportPage />} />
            </Routes>
          </MemoryRouter>
        </Provider>
      </SettingsContext.Provider>,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([GET_PET_SPEC], 'spec.json')] } });
    await screen.findByText('Schema loaded successfully');
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    await screen.findByText('Specification parsed successfully.');
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^Import$/i }));
  };

  it('renders the page title', () => {
    render(
      <MemoryRouter>
        <RestDslImportPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Import OpenAPI')).toBeInTheDocument();
  });

  it('renders the import wizard', () => {
    render(
      <MemoryRouter>
        <RestDslImportPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Upload file')).toBeInTheDocument();
  });

  it('navigates to the Rest Editor page when clicking Go to Rest Editor', async () => {
    await renderImportedPage(<Route path={Links.RestEditor} element={<p>Rest Editor</p>} />);

    const goToRestEditorButton = await screen.findByRole('button', { name: 'Go to Rest Editor' });
    fireEvent.click(goToRestEditorButton);

    expect(screen.getByText('Rest Editor')).toBeInTheDocument();
  });

  it('navigates back to the Home page when closing the wizard', async () => {
    await renderImportedPage(<Route path={Links.Home} element={<p>Home page</p>} />);

    const goToDesignerButton = await screen.findByRole('button', { name: 'Go to Designer' });
    fireEvent.click(goToDesignerButton);

    expect(screen.getByText('Home page')).toBeInTheDocument();
  });

  it('navigates to the Settings page when Open Settings is selected', () => {
    render(
      <MemoryRouter initialEntries={[Links.RestImport]}>
        <Routes>
          <Route path={Links.Settings} element={<p>Settings page</p>} />
          <Route path={Links.RestImport} element={<RestDslImportPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText('Import from Apicurio'));
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));

    expect(screen.getByText('Settings page')).toBeInTheDocument();
  });
});

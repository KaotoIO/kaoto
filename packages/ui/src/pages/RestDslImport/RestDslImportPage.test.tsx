import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { Links } from '../../router/links.models';
import { RestDslImportPage } from './RestDslImportPage';

describe('RestDslImportPage', () => {
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

  it('navigates back to the Rest editor page when closing the wizard', async () => {
    render(
      <MemoryRouter initialEntries={[Links.RestImport]}>
        <Routes>
          <Route path={Links.Rest} element={<p>Rest editor</p>} />
          <Route path={Links.RestImport} element={<RestDslImportPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const resultsButton = screen.getByRole('button', { name: 'Result' });
    act(() => {
      fireEvent.click(resultsButton);
    });

    const goToRestEditorButton = screen.getByRole('button', { name: 'Go to Rest Editor' });
    act(() => {
      fireEvent.click(goToRestEditorButton);
    });

    expect(screen.getByText('Rest editor')).toBeInTheDocument();
  });

  it('navigates back to the Home page when closing the wizard', async () => {
    render(
      <MemoryRouter initialEntries={[Links.RestImport]}>
        <Routes>
          <Route path={Links.Home} element={<p>Home page</p>} />
          <Route path={Links.RestImport} element={<RestDslImportPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const resultsButton = screen.getByRole('button', { name: 'Result' });
    act(() => {
      fireEvent.click(resultsButton);
    });

    const goToDesignerButton = screen.getByRole('button', { name: 'Go to Designer' });
    act(() => {
      fireEvent.click(goToDesignerButton);
    });

    expect(screen.getByText('Home page')).toBeInTheDocument();
  });
});

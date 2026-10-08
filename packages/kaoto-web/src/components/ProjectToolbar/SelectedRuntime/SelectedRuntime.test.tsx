import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectContext } from '../../../context/ProjectContext';
import { IRuntimeContext, RuntimeContext } from '../../../context/RuntimeContext';
import { SelectedRuntime } from './SelectedRuntime';

const selectedCatalog: CatalogLibraryEntry = {
  name: 'Camel Main',
  version: '4.20.0',
  runtime: 'main',
  fileName: 'camel-catalog.json',
};

const mockContext: IRuntimeContext = {
  basePath: '',
  catalogLibrary: undefined,
  selectedCatalog,
  setSelectedCatalog: vi.fn(),
};

const renderComponent = (runtimeContext: IRuntimeContext = mockContext) =>
  render(
    <MemoryRouter>
      <ProjectContext.Provider value={{ projectId: 'my-project' }}>
        <RuntimeContext.Provider value={runtimeContext}>
          <SelectedRuntime />
        </RuntimeContext.Provider>
      </ProjectContext.Provider>
    </MemoryRouter>,
  );

describe('SelectedRuntime', () => {
  it('renders a placeholder when selectedCatalog is undefined', () => {
    renderComponent({ ...mockContext, selectedCatalog: undefined });
    expect(screen.getByTestId('runtime-selector-display')).toBeInTheDocument();
    expect(screen.getByText('No runtime selected')).toBeInTheDocument();
  });

  it('displays catalog name and version', () => {
    renderComponent();
    expect(screen.getByText('Camel Main 4.20.0')).toBeInTheDocument();
  });

  describe('info button', () => {
    beforeEach(async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: 'Show information' }));
    });

    it('shows toggletip content on click', () => {
      expect(screen.getByText('Catalog and version are read-only here. Change them in Settings.')).toBeInTheDocument();
    });

    it('toggletip contains a link to the project settings page', () => {
      expect(screen.getByRole('link', { name: 'Go to Settings' })).toHaveAttribute(
        'href',
        '/projects/my-project/config',
      );
    });
  });
});

import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjectContext } from '../../../hooks/useProjectContext';
import { useRuntimeContext } from '../../../hooks/useRuntimeContext';
import { SelectedRuntime } from './SelectedRuntime';

vi.mock('../../../hooks/useRuntimeContext');
vi.mock('../../../hooks/useProjectContext');
const mockUseRuntimeContext = useRuntimeContext as Mock<typeof useRuntimeContext>;
const mockUseProjectContext = useProjectContext as Mock<typeof useProjectContext>;

const selectedCatalog: CatalogLibraryEntry = {
  name: 'Camel Main',
  version: '4.20.0',
  runtime: 'main',
  fileName: 'camel-catalog.json',
};

const mockContext = {
  basePath: '',
  catalogLibrary: undefined,
  selectedCatalog,
  setSelectedCatalog: vi.fn(),
};

const renderComponent = () =>
  render(
    <MemoryRouter>
      <SelectedRuntime />
    </MemoryRouter>,
  );

describe('SelectedRuntime', () => {
  beforeEach(() => {
    mockUseProjectContext.mockReturnValue({ projectId: 'my-project' });
  });

  it('renders a placeholder when selectedCatalog is undefined', () => {
    mockUseRuntimeContext.mockReturnValue({ ...mockContext, selectedCatalog: undefined });
    renderComponent();
    expect(screen.getByTestId('runtime-selector-display')).toBeInTheDocument();
    expect(screen.getByText('No runtime selected')).toBeInTheDocument();
  });

  it('displays catalog name and version', () => {
    mockUseRuntimeContext.mockReturnValue(mockContext);
    renderComponent();
    expect(screen.getByText('Camel Main 4.20.0')).toBeInTheDocument();
  });

  describe('info button', () => {
    beforeEach(async () => {
      mockUseRuntimeContext.mockReturnValue(mockContext);
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

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Mock } from 'vitest';

import { useRuntimeContext } from '../../../../hooks/useRuntimeContext/useRuntimeContext';
import { Links } from '../../../../router/links.models';
import * as RuntimeIconModule from '../../../Icons/RuntimeIcon';
import { SelectedRuntime } from './SelectedRuntime';

// Mock the useRuntimeContext hook
vi.mock('../../../../hooks/useRuntimeContext/useRuntimeContext');

// Mock the getRuntimeIcon function
vi.mock('../../../Icons/RuntimeIcon', () => ({
  getRuntimeIcon: vi.fn(),
}));

const mockUseRuntimeContext = useRuntimeContext as Mock<typeof useRuntimeContext>;
const mockGetRuntimeIcon = RuntimeIconModule.getRuntimeIcon as Mock<typeof RuntimeIconModule.getRuntimeIcon>;

describe('SelectedRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntimeIcon.mockReturnValue(<span data-testid="runtime-icon">Icon</span>);
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <SelectedRuntime />
      </MemoryRouter>,
    );
  };

  describe('Component Rendering', () => {
    it('should render the runtime selector display', () => {
      mockUseRuntimeContext.mockReturnValue({
        basePath: '/catalogs',
        catalogLibrary: undefined,
        selectedCatalog: {
          name: 'Camel Main',
          version: '4.0.0',
          runtime: 'Main',
          fileName: 'camel-main-4.0.0.json',
        },
        setSelectedCatalog: vi.fn(),
      });

      renderComponent();

      const display = screen.getByTestId('runtime-selector-display');
      expect(display).toBeInTheDocument();
      expect(display).toHaveAttribute('aria-label', 'Runtime Selector');
    });

    it('should display the selected catalog name', () => {
      mockUseRuntimeContext.mockReturnValue({
        basePath: '/catalogs',
        catalogLibrary: undefined,
        selectedCatalog: {
          name: 'Camel Quarkus',
          version: '3.8.0',
          runtime: 'Quarkus',
          fileName: 'camel-quarkus-3.8.0.json',
        },
        setSelectedCatalog: vi.fn(),
      });

      renderComponent();

      expect(screen.getByText('Camel Quarkus')).toBeInTheDocument();
    });

    it('should call getRuntimeIcon with the catalog name', () => {
      const catalogName = 'Camel Spring Boot';
      mockUseRuntimeContext.mockReturnValue({
        basePath: '/catalogs',
        catalogLibrary: undefined,
        selectedCatalog: {
          name: catalogName,
          version: '4.0.0',
          runtime: 'Spring Boot',
          fileName: 'camel-springboot-4.0.0.json',
        },
        setSelectedCatalog: vi.fn(),
      });

      renderComponent();

      expect(mockGetRuntimeIcon).toHaveBeenCalledWith(catalogName);
    });

    it('should render the runtime icon', () => {
      mockUseRuntimeContext.mockReturnValue({
        basePath: '/catalogs',
        catalogLibrary: undefined,
        selectedCatalog: {
          name: 'Camel Main',
          version: '4.0.0',
          runtime: 'Main',
          fileName: 'camel-main-4.0.0.json',
        },
        setSelectedCatalog: vi.fn(),
      });

      renderComponent();

      expect(screen.getByTestId('runtime-icon')).toBeInTheDocument();
    });
  });

  describe('Toggletip Functionality', () => {
    it('should render the information button', () => {
      mockUseRuntimeContext.mockReturnValue({
        basePath: '/catalogs',
        catalogLibrary: undefined,
        selectedCatalog: {
          name: 'Camel Main',
          version: '4.0.0',
          runtime: 'Main',
          fileName: 'camel-main-4.0.0.json',
        },
        setSelectedCatalog: vi.fn(),
      });

      renderComponent();

      const infoButton = screen.getByLabelText('Show information');
      expect(infoButton).toBeInTheDocument();
    });

    it('should display toggletip content when information button is clicked', async () => {
      const user = userEvent.setup();
      mockUseRuntimeContext.mockReturnValue({
        basePath: '/catalogs',
        catalogLibrary: undefined,
        selectedCatalog: {
          name: 'Camel Main',
          version: '4.0.0',
          runtime: 'Main',
          fileName: 'camel-main-4.0.0.json',
        },
        setSelectedCatalog: vi.fn(),
      });

      renderComponent();

      const infoButton = screen.getByLabelText('Show information');
      await user.click(infoButton);

      expect(screen.getByText('Catalog and version are read-only here. Change them in Settings.')).toBeInTheDocument();
    });

    it('should render a link to Settings page in toggletip', async () => {
      const user = userEvent.setup();
      mockUseRuntimeContext.mockReturnValue({
        basePath: '/catalogs',
        catalogLibrary: undefined,
        selectedCatalog: {
          name: 'Camel Main',
          version: '4.0.0',
          runtime: 'Main',
          fileName: 'camel-main-4.0.0.json',
        },
        setSelectedCatalog: vi.fn(),
      });

      renderComponent();

      const infoButton = screen.getByLabelText('Show information');
      await user.click(infoButton);

      const settingsLink = screen.getByText('Go to Settings');
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink.closest('a')).toHaveAttribute('href', Links.Settings);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined selectedCatalog gracefully', () => {
      mockUseRuntimeContext.mockReturnValue({
        basePath: '/catalogs',
        catalogLibrary: undefined,
        selectedCatalog: undefined,
        setSelectedCatalog: vi.fn(),
      });

      renderComponent();

      const display = screen.getByTestId('runtime-selector-display');
      expect(display).toBeInTheDocument();
      expect(mockGetRuntimeIcon).toHaveBeenCalledWith(undefined);
    });

    it('should handle catalog with empty name', () => {
      mockUseRuntimeContext.mockReturnValue({
        basePath: '/catalogs',
        catalogLibrary: undefined,
        selectedCatalog: {
          name: '',
          version: '4.0.0',
          runtime: 'Main',
          fileName: 'camel-main-4.0.0.json',
        },
        setSelectedCatalog: vi.fn(),
      });

      renderComponent();

      expect(mockGetRuntimeIcon).toHaveBeenCalledWith('');
      const display = screen.getByTestId('runtime-selector-display');
      expect(display).toBeInTheDocument();
    });
  });

  describe('Different Runtime Types', () => {
    it.each([
      ['Camel Main', 'Main'],
      ['Camel Quarkus', 'Quarkus'],
      ['Camel Spring Boot', 'Spring Boot'],
      ['Camel Main 4.0.0.redhat-00001', 'Main'],
      ['Citrus', 'Citrus'],
    ])('should render correctly for %s catalog', (catalogName, runtime) => {
      mockUseRuntimeContext.mockReturnValue({
        basePath: '/catalogs',
        catalogLibrary: undefined,
        selectedCatalog: {
          name: catalogName,
          version: '4.0.0',
          runtime,
          fileName: `${runtime.toLowerCase()}.json`,
        },
        setSelectedCatalog: vi.fn(),
      });

      renderComponent();

      expect(screen.getByText(catalogName)).toBeInTheDocument();
      expect(mockGetRuntimeIcon).toHaveBeenCalledWith(catalogName);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on the container', () => {
      mockUseRuntimeContext.mockReturnValue({
        basePath: '/catalogs',
        catalogLibrary: undefined,
        selectedCatalog: {
          name: 'Camel Main',
          version: '4.0.0',
          runtime: 'Main',
          fileName: 'camel-main-4.0.0.json',
        },
        setSelectedCatalog: vi.fn(),
      });

      renderComponent();

      const display = screen.getByLabelText('Runtime Selector');
      expect(display).toBeInTheDocument();
    });

    it('should have accessible information button label', () => {
      mockUseRuntimeContext.mockReturnValue({
        basePath: '/catalogs',
        catalogLibrary: undefined,
        selectedCatalog: {
          name: 'Camel Main',
          version: '4.0.0',
          runtime: 'Main',
          fileName: 'camel-main-4.0.0.json',
        },
        setSelectedCatalog: vi.fn(),
      });

      renderComponent();

      const infoButton = screen.getByLabelText('Show information');
      expect(infoButton).toBeInTheDocument();
    });
  });
});

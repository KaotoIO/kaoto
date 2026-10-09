import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { IRuntimeContext, RuntimeContext } from '../../../../providers/runtime.provider';
import { Links } from '../../../../router/links.models';
import { SelectedRuntime } from './SelectedRuntime';

describe('SelectedRuntime', () => {
  let runtimeContext: IRuntimeContext;

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <RuntimeContext.Provider value={runtimeContext}>
          <SelectedRuntime />
        </RuntimeContext.Provider>
      </MemoryRouter>,
    );
  };

  /** Provides the given catalog as the selected one */
  const selectCatalog = (selectedCatalog: CatalogLibraryEntry | undefined) => {
    runtimeContext = {
      basePath: '/catalogs',
      catalogLibrary: undefined,
      selectedCatalog,
      setSelectedCatalog: vi.fn(),
    };
  };

  describe('Component Rendering', () => {
    it('should render the runtime selector display', () => {
      selectCatalog({
        name: 'Camel Main',
        version: '4.0.0',
        runtime: 'Main',
        fileName: 'camel-main-4.0.0.json',
      });

      renderComponent();

      const display = screen.getByTestId('runtime-selector-display');
      expect(display).toBeInTheDocument();
      expect(display).toHaveAttribute('aria-label', 'Runtime Selector');
    });

    it('should display the selected catalog name', () => {
      selectCatalog({
        name: 'Camel Quarkus',
        version: '3.8.0',
        runtime: 'Quarkus',
        fileName: 'camel-quarkus-3.8.0.json',
      });

      renderComponent();

      expect(screen.getByText('Camel Quarkus')).toBeInTheDocument();
    });

    it('should call getRuntimeIcon with the catalog name', () => {
      const catalogName = 'Camel Spring Boot';
      selectCatalog({
        name: catalogName,
        version: '4.0.0',
        runtime: 'Spring Boot',
        fileName: 'camel-springboot-4.0.0.json',
      });

      renderComponent();

      expect(screen.getByAltText('Spring Boot logo')).toBeInTheDocument();
    });

    it('should render the runtime icon', () => {
      selectCatalog({
        name: 'Camel Main',
        version: '4.0.0',
        runtime: 'Main',
        fileName: 'camel-main-4.0.0.json',
      });

      renderComponent();

      expect(screen.getByAltText('Apache Camel logo')).toBeInTheDocument();
    });
  });

  describe('Toggletip Functionality', () => {
    it('should render the information button', () => {
      selectCatalog({
        name: 'Camel Main',
        version: '4.0.0',
        runtime: 'Main',
        fileName: 'camel-main-4.0.0.json',
      });

      renderComponent();

      const infoButton = screen.getByLabelText('Show information');
      expect(infoButton).toBeInTheDocument();
    });

    it('should display toggletip content when information button is clicked', async () => {
      const user = userEvent.setup();
      selectCatalog({
        name: 'Camel Main',
        version: '4.0.0',
        runtime: 'Main',
        fileName: 'camel-main-4.0.0.json',
      });

      renderComponent();

      const infoButton = screen.getByLabelText('Show information');
      await user.click(infoButton);

      expect(screen.getByText('Catalog and version are read-only here. Change them in Settings.')).toBeInTheDocument();
    });

    it('should render a link to Settings page in toggletip', async () => {
      const user = userEvent.setup();
      selectCatalog({
        name: 'Camel Main',
        version: '4.0.0',
        runtime: 'Main',
        fileName: 'camel-main-4.0.0.json',
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
      selectCatalog(undefined);

      renderComponent();

      const display = screen.getByTestId('runtime-selector-display');
      expect(display).toBeInTheDocument();
      /* Falls back to the Apache Camel icon */
      expect(screen.getByAltText('Apache Camel logo')).toBeInTheDocument();
    });

    it('should handle catalog with empty name', () => {
      selectCatalog({
        name: '',
        version: '4.0.0',
        runtime: 'Main',
        fileName: 'camel-main-4.0.0.json',
      });

      renderComponent();

      expect(screen.getByAltText('Apache Camel logo')).toBeInTheDocument();
      const display = screen.getByTestId('runtime-selector-display');
      expect(display).toBeInTheDocument();
    });
  });

  describe('Different Runtime Types', () => {
    it.each([
      ['Camel Main', 'Main', 'Apache Camel logo'],
      ['Camel Quarkus', 'Quarkus', 'Quarkus logo'],
      ['Camel Spring Boot', 'Spring Boot', 'Spring Boot logo'],
      ['Camel Main 4.0.0.redhat-00001', 'Main', 'Red Hat logo'],
      ['Citrus', 'Citrus', 'Citrus logo'],
    ])('should render correctly for %s catalog', (catalogName, runtime, iconAlt) => {
      selectCatalog({
        name: catalogName,
        version: '4.0.0',
        runtime,
        fileName: `${runtime.toLowerCase()}.json`,
      });

      renderComponent();

      expect(screen.getByText(catalogName)).toBeInTheDocument();
      expect(screen.getByAltText(iconAlt)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on the container', () => {
      selectCatalog({
        name: 'Camel Main',
        version: '4.0.0',
        runtime: 'Main',
        fileName: 'camel-main-4.0.0.json',
      });

      renderComponent();

      const display = screen.getByLabelText('Runtime Selector');
      expect(display).toBeInTheDocument();
    });

    it('should have accessible information button label', () => {
      selectCatalog({
        name: 'Camel Main',
        version: '4.0.0',
        runtime: 'Main',
        fileName: 'camel-main-4.0.0.json',
      });

      renderComponent();

      const infoButton = screen.getByLabelText('Show information');
      expect(infoButton).toBeInTheDocument();
    });
  });
});

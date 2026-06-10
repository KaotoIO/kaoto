import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { KaotoSchemaDefinition } from '../../../../../../models';
import { RuntimeContext } from '../../../../../../providers/runtime.provider';
import { RuntimeCatalogNameField, TestingCatalogNameField } from './CatalogSelectorField';

describe('CatalogSelectorField', () => {
  const mockCatalogLibrary: CatalogLibrary = {
    definitions: [
      {
        name: 'Camel Main 4.14.5',
        version: '4.14.5',
        runtime: 'Main',
        catalogs: {},
      },
      {
        name: 'Camel Quarkus 3.8.0',
        version: '3.8.0',
        runtime: 'Quarkus',
        catalogs: {},
      },
      {
        name: 'Camel Spring Boot 4.10.0',
        version: '4.10.0',
        runtime: 'Spring Boot',
        catalogs: {},
      },
      {
        name: 'Citrus 4.10.1',
        version: '4.10.1',
        runtime: 'Citrus',
        catalogs: {},
      },
    ] as unknown as CatalogLibraryEntry[],
    version: 0,
    name: '',
  };

  const mockSchema: KaotoSchemaDefinition['schema'] = {
    title: 'Catalog Name',
    description: 'Select a catalog',
    type: 'string',
  };

  const createRuntimeContext = (catalogLibrary?: CatalogLibrary, selectedCatalog?: CatalogLibraryEntry) => ({
    basePath: '/catalogs',
    catalogLibrary,
    selectedCatalog,
    setSelectedCatalog: vi.fn(),
  });

  const renderWithProviders = (
    component: React.ReactElement,
    model = {},
    onPropertyChange = vi.fn(),
    runtimeContext = createRuntimeContext(mockCatalogLibrary),
  ) => {
    return render(
      <RuntimeContext.Provider value={runtimeContext}>
        <ModelContextProvider model={model} onPropertyChange={onPropertyChange}>
          <SchemaProvider schema={mockSchema}>{component}</SchemaProvider>
        </ModelContextProvider>
      </RuntimeContext.Provider>,
    );
  };

  describe('RuntimeCatalogNameField', () => {
    describe('Rendering', () => {
      it('should render loading state when catalog library is not available', () => {
        renderWithProviders(
          <RuntimeCatalogNameField propName="runtimeCatalogName" />,
          {},
          vi.fn(),
          createRuntimeContext(),
        );

        expect(screen.getByText('Loading catalogs...')).toBeInTheDocument();
      });

      it('should render with default catalog value', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        expect(toggle).toBeInTheDocument();
        expect(toggle).toHaveTextContent('Camel Main 4.14.5');
      });

      it('should render with stored value from model', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />, {
          runtimeCatalogName: 'Camel Quarkus 3.8.0',
        });

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        expect(toggle).toHaveTextContent('Camel Quarkus 3.8.0');
      });

      it('should render schema title and description', () => {
        const { container } = renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        expect(container.querySelector('label')).toHaveTextContent('Catalog Name');
      });

      it('should filter to only show integration runtimes', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        // Should show Main, Quarkus, Spring Boot
        expect(screen.getByText('Main')).toBeInTheDocument();
        expect(screen.getByText('Quarkus')).toBeInTheDocument();
        expect(screen.getByText('Spring Boot')).toBeInTheDocument();

        // Should NOT show Citrus (testing runtime)
        expect(screen.queryByText('Citrus')).not.toBeInTheDocument();
      });
    });

    describe('Menu Interactions', () => {
      it('should open menu when clicking toggle', async () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        await waitFor(() => {
          expect(screen.getByText('Camel Quarkus 3.8.0')).toBeInTheDocument();
        });
        expect(screen.getByText('Camel Spring Boot 4.10.0')).toBeInTheDocument();
      });

      it('should close menu when clicking toggle again', async () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');

        // Open menu
        fireEvent.click(toggle);
        await waitFor(() => {
          expect(screen.getByText('Camel Quarkus 3.8.0')).toBeInTheDocument();
        });

        // Close menu
        fireEvent.click(toggle);
        await waitFor(() => {
          expect(screen.queryByText('Camel Quarkus 3.8.0')).not.toBeInTheDocument();
        });
      });

      it('should select catalog when clicking menu item', () => {
        const onPropertyChange = vi.fn();
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />, {}, onPropertyChange);

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        const quarkusOption = screen.getByText('Camel Quarkus 3.8.0');
        fireEvent.click(quarkusOption);

        expect(onPropertyChange).toHaveBeenCalledWith('runtimeCatalogName', 'Camel Quarkus 3.8.0');
      });

      it('should close menu after selecting an item', async () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        const quarkusOption = screen.getByText('Camel Quarkus 3.8.0');
        fireEvent.click(quarkusOption);

        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
      });

      it('should mark selected catalog in menu', async () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />, {
          runtimeCatalogName: 'Camel Quarkus 3.8.0',
        });

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        await waitFor(() => {
          const menuItems = screen.getAllByRole('menuitem');
          expect(menuItems.length).toBeGreaterThan(0);
        });

        const menuItems = screen.getAllByRole('menuitem');
        const quarkusOption = menuItems.find((item) => item.textContent === 'Camel Quarkus 3.8.0');
        expect(quarkusOption).toBeDefined();
        expect(quarkusOption).toHaveClass('pf-m-selected');

        // Verify CheckIcon is present for selected item
        const selectIcon = quarkusOption?.querySelector('.pf-v6-c-menu__item-select-icon svg');
        expect(selectIcon).toBeInTheDocument();
      });
    });

    describe('Runtime Grouping', () => {
      it('should group catalogs by runtime', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        // Check that runtime headers are present
        expect(screen.getByText('Main')).toBeInTheDocument();
        expect(screen.getByText('Quarkus')).toBeInTheDocument();
        expect(screen.getByText('Spring Boot')).toBeInTheDocument();
      });

      it('should display catalogs under their runtime group', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        // Verify catalog items are present
        expect(screen.getAllByText('Camel Main 4.14.5').length).toBeGreaterThan(0);
        expect(screen.getByText('Camel Quarkus 3.8.0')).toBeInTheDocument();
        expect(screen.getByText('Camel Spring Boot 4.10.0')).toBeInTheDocument();
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty catalog library', () => {
        const emptyCatalogLibrary: CatalogLibrary = {
          definitions: [],
          version: 0,
          name: '',
        };

        renderWithProviders(
          <RuntimeCatalogNameField propName="runtimeCatalogName" />,
          {},
          vi.fn(),
          createRuntimeContext(emptyCatalogLibrary),
        );

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        // Menu should be empty
        expect(screen.queryByText('Main')).not.toBeInTheDocument();
        expect(screen.queryByText('Quarkus')).not.toBeInTheDocument();
      });

      it('should handle catalog library with no matching runtimes', () => {
        const nonMatchingCatalogLibrary: CatalogLibrary = {
          definitions: [
            {
              name: 'Other Runtime 1.0.0',
              version: '1.0.0',
              runtime: 'Other',
              catalogs: {},
            } as unknown as CatalogLibraryEntry,
          ],
          version: 0,
          name: '',
        };

        renderWithProviders(
          <RuntimeCatalogNameField propName="runtimeCatalogName" />,
          {},
          vi.fn(),
          createRuntimeContext(nonMatchingCatalogLibrary),
        );

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        // Should not show the non-matching runtime
        expect(screen.queryByText('Other')).not.toBeInTheDocument();
      });

      it('should not call onChange when selecting invalid catalog', async () => {
        const onPropertyChange = vi.fn();
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />, {}, onPropertyChange);

        const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        await waitFor(() => {
          expect(screen.getByText('Camel Quarkus 3.8.0')).toBeInTheDocument();
        });

        // Click on the toggle again to close without selecting
        fireEvent.click(toggle);

        expect(onPropertyChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('TestingCatalogNameField', () => {
    describe('Rendering', () => {
      it('should render loading state when catalog library is not available', () => {
        renderWithProviders(
          <TestingCatalogNameField propName="testingCatalogName" />,
          {},
          vi.fn(),
          createRuntimeContext(),
        );

        expect(screen.getByText('Loading catalogs...')).toBeInTheDocument();
      });

      it('should render with default catalog value', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />);

        const toggle = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        expect(toggle).toBeInTheDocument();
        expect(toggle).toHaveTextContent('Citrus 4.10.1');
      });

      it('should render with stored value from model', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />, {
          testingCatalogName: 'Citrus 4.10.1',
        });

        const toggle = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        expect(toggle).toHaveTextContent('Citrus 4.10.1');
      });

      it('should filter to only show testing runtimes', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />);

        const toggle = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        // Should show Citrus
        expect(screen.getByText('Citrus')).toBeInTheDocument();

        // Should NOT show integration runtimes
        expect(screen.queryByText('Main')).not.toBeInTheDocument();
        expect(screen.queryByText('Quarkus')).not.toBeInTheDocument();
        expect(screen.queryByText('Spring Boot')).not.toBeInTheDocument();
      });
    });

    describe('Menu Interactions', () => {
      it('should open menu when clicking toggle', async () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />);

        const toggle = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        await waitFor(() => {
          expect(screen.getAllByText('Citrus 4.10.1').length).toBeGreaterThan(0);
        });
      });

      it('should select catalog when clicking menu item', () => {
        const onPropertyChange = vi.fn();
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />, {}, onPropertyChange);

        const toggle = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        const [citrusOption] = screen.getAllByRole('menuitem', { name: 'Citrus 4.10.1' });
        fireEvent.click(citrusOption);

        expect(onPropertyChange).toHaveBeenCalledWith('testingCatalogName', 'Citrus 4.10.1');
      });

      it('should mark selected catalog in menu', async () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />, {
          testingCatalogName: 'Citrus 4.10.1',
        });

        const toggle = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        await waitFor(() => {
          expect(screen.getAllByText('Citrus 4.10.1').length).toBeGreaterThan(0);
        });

        const menuItems = screen.getAllByRole('menuitem');
        const citrusOption = menuItems.find((item) => item.textContent === 'Citrus 4.10.1');
        expect(citrusOption).toBeDefined();
        expect(citrusOption).toHaveClass('pf-m-selected');

        // Verify CheckIcon is present for selected item
        const selectIcon = citrusOption?.querySelector('.pf-v6-c-menu__item-select-icon svg');
        expect(selectIcon).toBeInTheDocument();
      });
    });

    describe('Runtime Grouping', () => {
      it('should group catalogs by runtime', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />);

        const toggle = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        // Check that Citrus runtime header is present
        expect(screen.getByText('Citrus')).toBeInTheDocument();
      });

      it('should display catalogs under their runtime group', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />);

        const toggle = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        // Verify catalog item is present
        expect(screen.getAllByText('Citrus 4.10.1').length).toBeGreaterThan(0);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty catalog library', () => {
        const emptyCatalogLibrary: CatalogLibrary = {
          definitions: [],
          version: 0,
          name: '',
        };

        renderWithProviders(
          <TestingCatalogNameField propName="testingCatalogName" />,
          {},
          vi.fn(),
          createRuntimeContext(emptyCatalogLibrary),
        );

        const toggle = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        // Menu should be empty
        expect(screen.queryByText('Citrus')).not.toBeInTheDocument();
      });

      it('should handle catalog library with no matching runtimes', () => {
        const nonMatchingCatalogLibrary: CatalogLibrary = {
          definitions: [
            {
              name: 'Camel Main 4.14.5',
              version: '4.14.5',
              runtime: 'Main',
              catalogs: {},
            } as unknown as CatalogLibraryEntry,
          ],
          version: 0,
          name: '',
        };

        renderWithProviders(
          <TestingCatalogNameField propName="testingCatalogName" />,
          {},
          vi.fn(),
          createRuntimeContext(nonMatchingCatalogLibrary),
        );

        const toggle = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        fireEvent.click(toggle);

        // Should not show the non-matching runtime
        expect(screen.queryByText('Main')).not.toBeInTheDocument();
      });
    });
  });

  describe('Multiple Catalogs per Runtime', () => {
    it('should display multiple catalogs for the same runtime', () => {
      const multiCatalogLibrary: CatalogLibrary = {
        definitions: [
          {
            name: 'Camel Main 4.14.5',
            version: '4.14.5',
            runtime: 'Main',
            catalogs: {},
          },
          {
            name: 'Camel Main 4.13.0',
            version: '4.13.0',
            runtime: 'Main',
            catalogs: {},
          },
          {
            name: 'Camel Main 4.12.0',
            version: '4.12.0',
            runtime: 'Main',
            catalogs: {},
          },
        ] as unknown as CatalogLibraryEntry[],
        version: 0,
        name: '',
      };

      renderWithProviders(
        <RuntimeCatalogNameField propName="runtimeCatalogName" />,
        {},
        vi.fn(),
        createRuntimeContext(multiCatalogLibrary),
      );

      const toggle = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
      fireEvent.click(toggle);

      // All three versions should be displayed under Main runtime
      expect(screen.getAllByText('Camel Main 4.14.5').length).toBeGreaterThan(0);
      expect(screen.getByText('Camel Main 4.13.0')).toBeInTheDocument();
      expect(screen.getByText('Camel Main 4.12.0')).toBeInTheDocument();
    });
  });
});

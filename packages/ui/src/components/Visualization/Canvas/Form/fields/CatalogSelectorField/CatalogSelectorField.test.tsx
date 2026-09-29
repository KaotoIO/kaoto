import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { fireEvent, render, screen } from '@testing-library/react';

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
    starterTemplates: '',
    xsltCatalogs: '',
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

        const select = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        expect(select).toBeInTheDocument();
        expect((select as HTMLSelectElement).value).toBe('Camel Main 4.14.5');
      });

      it('should render with stored value from model', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />, {
          runtimeCatalogName: 'Camel Quarkus 3.8.0',
        });

        const select = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        expect((select as HTMLSelectElement).value).toBe('Camel Quarkus 3.8.0');
      });

      it('should render schema title and description', () => {
        const { container } = renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        expect(container.querySelector('label')).toHaveTextContent('Catalog Name');
      });

      it('should filter to only show integration runtimes', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        // Should show Main, Quarkus, Spring Boot option groups
        expect(screen.getByRole('group', { name: 'Main' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Quarkus' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Spring Boot' })).toBeInTheDocument();

        // Should NOT show Citrus (testing runtime)
        expect(screen.queryByRole('group', { name: 'Citrus' })).not.toBeInTheDocument();
      });
    });

    describe('Select Interactions', () => {
      it('should display all catalog options in the select', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        expect(screen.getByRole('option', { name: 'Camel Quarkus 3.8.0' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Camel Spring Boot 4.10.0' })).toBeInTheDocument();
      });

      it('should select catalog when changing value', () => {
        const onPropertyChange = vi.fn();
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />, {}, onPropertyChange);

        const select = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        fireEvent.change(select, { target: { value: 'Camel Quarkus 3.8.0' } });

        expect(onPropertyChange).toHaveBeenCalledWith('runtimeCatalogName', 'Camel Quarkus 3.8.0');
      });

      it('should reflect the selected catalog value', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />, {
          runtimeCatalogName: 'Camel Quarkus 3.8.0',
        });

        const select = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        expect((select as HTMLSelectElement).value).toBe('Camel Quarkus 3.8.0');
      });
    });

    describe('Runtime Grouping', () => {
      it('should group catalogs by runtime', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        // Check that runtime option groups are present
        expect(screen.getByRole('group', { name: 'Main' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Quarkus' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Spring Boot' })).toBeInTheDocument();
      });

      it('should display catalogs under their runtime group', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        // Verify catalog items are present as options
        expect(screen.getAllByRole('option', { name: 'Camel Main 4.14.5' }).length).toBeGreaterThan(0);
        expect(screen.getByRole('option', { name: 'Camel Quarkus 3.8.0' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Camel Spring Boot 4.10.0' })).toBeInTheDocument();
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty catalog library', () => {
        const emptyCatalogLibrary: CatalogLibrary = {
          definitions: [],
          version: 0,
          name: '',
          starterTemplates: '',
          xsltCatalogs: '',
        };

        renderWithProviders(
          <RuntimeCatalogNameField propName="runtimeCatalogName" />,
          {},
          vi.fn(),
          createRuntimeContext(emptyCatalogLibrary),
        );

        // Select should have no option groups
        expect(screen.queryByRole('group', { name: 'Main' })).not.toBeInTheDocument();
        expect(screen.queryByRole('group', { name: 'Quarkus' })).not.toBeInTheDocument();
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
          starterTemplates: '',
          xsltCatalogs: '',
        };

        renderWithProviders(
          <RuntimeCatalogNameField propName="runtimeCatalogName" />,
          {},
          vi.fn(),
          createRuntimeContext(nonMatchingCatalogLibrary),
        );

        // Should not show the non-matching runtime
        expect(screen.queryByRole('group', { name: 'Main' })).not.toBeInTheDocument();
      });

      it('should not call onChange when no new value is selected', () => {
        const onPropertyChange = vi.fn();
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />, {}, onPropertyChange);

        // No interaction — onChange should not be called
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

        const select = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        expect(select).toBeInTheDocument();
        expect((select as HTMLSelectElement).value).toBe('Citrus 4.10.1');
      });

      it('should render with stored value from model', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />, {
          testingCatalogName: 'Citrus 4.10.1',
        });

        const select = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        expect((select as HTMLSelectElement).value).toBe('Citrus 4.10.1');
      });

      it('should filter to only show testing runtimes', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />);

        // Should show Citrus option group
        expect(screen.getByRole('group', { name: 'Citrus' })).toBeInTheDocument();

        // Should NOT show integration runtimes
        expect(screen.queryByRole('group', { name: 'Main' })).not.toBeInTheDocument();
        expect(screen.queryByRole('group', { name: 'Quarkus' })).not.toBeInTheDocument();
        expect(screen.queryByRole('group', { name: 'Spring Boot' })).not.toBeInTheDocument();
      });
    });

    describe('Select Interactions', () => {
      it('should display all catalog options in the select', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />);

        expect(screen.getAllByRole('option', { name: 'Citrus 4.10.1' }).length).toBeGreaterThan(0);
      });

      it('should select catalog when changing value', () => {
        const onPropertyChange = vi.fn();
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />, {}, onPropertyChange);

        const select = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        fireEvent.change(select, { target: { value: 'Citrus 4.10.1' } });

        expect(onPropertyChange).toHaveBeenCalledWith('testingCatalogName', 'Citrus 4.10.1');
      });
    });

    describe('Runtime Grouping', () => {
      it('should group catalogs by runtime', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />);

        // Check that Citrus runtime option group is present
        expect(screen.getByRole('group', { name: 'Citrus' })).toBeInTheDocument();
      });

      it('should display catalogs under their runtime group', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />);

        // Verify catalog item is present as option
        expect(screen.getAllByRole('option', { name: 'Citrus 4.10.1' }).length).toBeGreaterThan(0);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty catalog library', () => {
        const emptyCatalogLibrary: CatalogLibrary = {
          definitions: [],
          version: 0,
          name: '',
          starterTemplates: '',
          xsltCatalogs: '',
        };

        renderWithProviders(
          <TestingCatalogNameField propName="testingCatalogName" />,
          {},
          vi.fn(),
          createRuntimeContext(emptyCatalogLibrary),
        );

        // Select should have no option groups
        expect(screen.queryByRole('group', { name: 'Citrus' })).not.toBeInTheDocument();
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
          starterTemplates: '',
          xsltCatalogs: '',
        };

        renderWithProviders(
          <TestingCatalogNameField propName="testingCatalogName" />,
          {},
          vi.fn(),
          createRuntimeContext(nonMatchingCatalogLibrary),
        );

        // Should not show the non-matching runtime
        expect(screen.queryByRole('group', { name: 'Main' })).not.toBeInTheDocument();
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
        starterTemplates: '',
        xsltCatalogs: '',
      };

      renderWithProviders(
        <RuntimeCatalogNameField propName="runtimeCatalogName" />,
        {},
        vi.fn(),
        createRuntimeContext(multiCatalogLibrary),
      );

      // All three versions should be displayed under Main runtime group
      expect(screen.getAllByRole('option', { name: 'Camel Main 4.14.5' }).length).toBeGreaterThan(0);
      expect(screen.getByRole('option', { name: 'Camel Main 4.13.0' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Camel Main 4.12.0' })).toBeInTheDocument();
    });
  });
});

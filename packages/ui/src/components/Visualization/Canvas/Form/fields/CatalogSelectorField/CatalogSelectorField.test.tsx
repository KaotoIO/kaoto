import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { fireEvent, render, screen, within } from '@testing-library/react';

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

  const openDropdown = (propName: string) => {
    fireEvent.click(within(screen.getByTestId(`${propName}-catalog-selector-toggle`)).getByRole('combobox'));
  };

  /** Group titles are rendered as disabled options so they are visible but not selectable. */
  const getGroupTitle = (name: string) =>
    screen.queryAllByRole('option').find((option) => option.textContent.trim() === name) ?? null;

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

        expect(screen.getByTestId('runtimeCatalogName-catalog-selector-toggle')).toHaveTextContent('Camel Main 4.14.5');
      });

      it('should render with stored value from model', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />, {
          runtimeCatalogName: 'Camel Quarkus 3.8.0',
        });

        const select = screen.getByTestId('runtimeCatalogName-catalog-selector-toggle');
        expect(select).toHaveTextContent('Camel Quarkus 3.8.0');
      });

      it('should render schema title and description', () => {
        const { container } = renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);

        expect(container.querySelector('label')).toHaveTextContent('Catalog Name');
      });

      it('should filter to only show integration runtimes', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);
        openDropdown('runtimeCatalogName');

        // Should show Main, Quarkus, Spring Boot group titles, which are not selectable
        ['Main', 'Quarkus', 'Spring Boot'].forEach((runtime) => {
          expect(getGroupTitle(runtime)).toHaveAttribute('aria-disabled', 'true');
        });

        // Should NOT show Citrus (testing runtime)
        expect(getGroupTitle('Citrus')).not.toBeInTheDocument();
      });
    });

    describe('Select Interactions', () => {
      it('should display all catalog options in the select', () => {
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />);
        openDropdown('runtimeCatalogName');

        expect(screen.getByRole('option', { name: 'Camel Main 4.14.5' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Camel Quarkus 3.8.0' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Camel Spring Boot 4.10.0' })).toBeInTheDocument();
      });

      it('should select catalog when changing value', () => {
        const onPropertyChange = vi.fn();
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />, {}, onPropertyChange);

        openDropdown('runtimeCatalogName');
        fireEvent.click(screen.getByRole('option', { name: 'Camel Quarkus 3.8.0' }));

        expect(onPropertyChange).toHaveBeenCalledWith('runtimeCatalogName', 'Camel Quarkus 3.8.0');
      });

      it('should not select a catalog when clicking a runtime group title', () => {
        const onPropertyChange = vi.fn();
        renderWithProviders(<RuntimeCatalogNameField propName="runtimeCatalogName" />, {}, onPropertyChange);

        openDropdown('runtimeCatalogName');
        fireEvent.click(getGroupTitle('Quarkus')!);

        expect(onPropertyChange).not.toHaveBeenCalled();
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

        openDropdown('runtimeCatalogName');

        // Dropdown should have no group titles
        expect(getGroupTitle('Main')).not.toBeInTheDocument();
        expect(getGroupTitle('Quarkus')).not.toBeInTheDocument();
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

        openDropdown('runtimeCatalogName');

        // Should not show the non-matching runtime
        expect(getGroupTitle('Other')).not.toBeInTheDocument();
        expect(getGroupTitle('Main')).not.toBeInTheDocument();
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

        expect(screen.getByTestId('testingCatalogName-catalog-selector-toggle')).toHaveTextContent('Citrus 4.10.1');
      });

      it('should render with stored value from model', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />, {
          testingCatalogName: 'Citrus 4.10.1',
        });

        const select = screen.getByTestId('testingCatalogName-catalog-selector-toggle');
        expect(select).toHaveTextContent('Citrus 4.10.1');
      });

      it('should filter to only show testing runtimes', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />);
        openDropdown('testingCatalogName');

        // Should show the Citrus group title, which is not selectable
        expect(getGroupTitle('Citrus')).toHaveAttribute('aria-disabled', 'true');

        // Should NOT show integration runtimes
        expect(getGroupTitle('Main')).not.toBeInTheDocument();
        expect(getGroupTitle('Quarkus')).not.toBeInTheDocument();
        expect(getGroupTitle('Spring Boot')).not.toBeInTheDocument();
      });
    });

    describe('Select Interactions', () => {
      it('should display all catalog options in the select', () => {
        renderWithProviders(<TestingCatalogNameField propName="testingCatalogName" />);
        openDropdown('testingCatalogName');

        expect(screen.getByRole('option', { name: 'Citrus 4.10.1' })).toBeInTheDocument();
      });

      it('should select catalog when changing value', () => {
        const onPropertyChange = vi.fn();
        const twoCitrusLibrary = {
          ...mockCatalogLibrary,
          definitions: [
            ...mockCatalogLibrary.definitions,
            {
              name: 'Citrus 4.9.0',
              version: '4.9.0',
              runtime: 'Citrus',
              catalogs: {},
            } as unknown as CatalogLibraryEntry,
          ],
        };
        renderWithProviders(
          <TestingCatalogNameField propName="testingCatalogName" />,
          {},
          onPropertyChange,
          createRuntimeContext(twoCitrusLibrary),
        );

        openDropdown('testingCatalogName');
        fireEvent.click(screen.getByRole('option', { name: 'Citrus 4.9.0' }));

        expect(onPropertyChange).toHaveBeenCalledWith('testingCatalogName', 'Citrus 4.9.0');
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

        openDropdown('testingCatalogName');

        // Dropdown should have no group titles
        expect(getGroupTitle('Citrus')).not.toBeInTheDocument();
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

        openDropdown('testingCatalogName');

        // Should not show the non-matching runtime
        expect(getGroupTitle('Main')).not.toBeInTheDocument();
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

      openDropdown('runtimeCatalogName');

      // All three versions should be displayed under Main runtime group
      expect(getGroupTitle('Main')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Camel Main 4.14.5' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Camel Main 4.13.0' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Camel Main 4.12.0' })).toBeInTheDocument();
    });
  });
});

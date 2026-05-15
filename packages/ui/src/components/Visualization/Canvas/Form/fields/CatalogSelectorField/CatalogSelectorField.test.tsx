import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { fireEvent, render, screen } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';

import { CatalogVersion } from '../../../../../../models/settings/settings.model';
import { IRuntimeContext, RuntimeContext } from '../../../../../../providers/runtime.provider';
import { CatalogSelectorField } from './CatalogSelectorField';

describe('CatalogSelectorField', () => {
  const mockCatalogLibrary: CatalogLibrary = {
    definitions: [
      { name: 'Camel Main 4.14.5', version: '4.14.5', runtime: 'Main', catalogs: {} },
      { name: 'Camel Quarkus 3.8.0', version: '3.8.0', runtime: 'Quarkus', catalogs: {} },
      { name: 'Camel Spring Boot 4.10.0', version: '4.10.0', runtime: 'Spring Boot', catalogs: {} },
      { name: 'Citrus 4.10.1', version: '4.10.1', runtime: 'Citrus', catalogs: {} },
    ] as unknown as CatalogLibraryEntry[],
    version: 0,
    name: '',
  };

  const camelCatalogSchema: JSONSchema4 = {
    title: 'Camel Catalog',
    type: 'object',
    description: 'Default catalog for Camel integrations',
  };

  const citrusCatalogSchema: JSONSchema4 = {
    title: 'Test Catalog',
    type: 'object',
    description: 'Default catalog for test integrations',
  };

  const renderField = (
    schema: JSONSchema4,
    catalogValue: CatalogVersion | undefined,
    catalogLibrary?: CatalogLibrary,
  ) => {
    const onPropertyChange = jest.fn();
    const model = catalogValue ? { catalog: catalogValue } : {};
    const runtimeContextValue = {
      catalogLibrary,
      selectedCatalog: undefined,
      setSelectedCatalog: jest.fn(),
    } as unknown as IRuntimeContext;

    render(
      <RuntimeContext.Provider value={runtimeContextValue}>
        <SchemaProvider schema={schema}>
          <ModelContextProvider model={model} onPropertyChange={onPropertyChange}>
            <CatalogSelectorField propName={schema.title === 'Test Catalog' ? 'citrusCatalog' : 'camelCatalog'} />
          </ModelContextProvider>
        </SchemaProvider>
      </RuntimeContext.Provider>,
    );

    return { onPropertyChange };
  };

  it('renders loading state when catalog library is not available', () => {
    renderField(camelCatalogSchema, undefined);
    expect(screen.getByText('Loading catalogs...')).toBeInTheDocument();
  });

  it('renders Camel catalog selector with default catalog when version is empty', () => {
    renderField(camelCatalogSchema, { version: '', runtime: 'Main' }, mockCatalogLibrary);
    const toggle = screen.getByRole('button', { expanded: false });
    expect(toggle.textContent).toContain('Camel Main 4.14.5');

    fireEvent.click(toggle);
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('Quarkus')).toBeInTheDocument();
    expect(screen.getByText('Spring Boot')).toBeInTheDocument();
    expect(screen.queryByText('Citrus')).not.toBeInTheDocument();
  });

  it('renders test catalog selector with default catalog when version is empty', () => {
    renderField(citrusCatalogSchema, { version: '', runtime: 'Citrus' }, mockCatalogLibrary);
    const toggle = screen.getByRole('button', { expanded: false });
    expect(toggle.textContent).toContain('Citrus 4.10.1');

    fireEvent.click(toggle);
    expect(screen.getByText('Citrus')).toBeInTheDocument();
    expect(screen.queryByText('Main')).not.toBeInTheDocument();
  });

  it('displays selected catalog name', () => {
    renderField(camelCatalogSchema, { version: '4.14.5', runtime: 'Main' }, mockCatalogLibrary);
    const toggle = screen.getByRole('button', { expanded: false });
    expect(toggle.textContent).toContain('Camel Main 4.14.5');
  });

  it('handles catalog selection and saves only version and runtime', () => {
    const { onPropertyChange } = renderField(camelCatalogSchema, { version: '', runtime: 'Main' }, mockCatalogLibrary);

    const toggle = screen.getByRole('button', { expanded: false });
    fireEvent.click(toggle);

    const option = screen.getByRole('menuitem', { name: 'Camel Main 4.14.5' });
    fireEvent.click(option);

    expect(onPropertyChange).toHaveBeenCalledWith('camelCatalog', {
      version: '4.14.5',
      runtime: 'Main',
    });
  });

  it('falls back to version + runtime display when catalog not found', () => {
    renderField(camelCatalogSchema, { version: '9.9.9', runtime: 'Main' }, mockCatalogLibrary);
    expect(screen.getByText('Main 9.9.9')).toBeInTheDocument();
  });
});

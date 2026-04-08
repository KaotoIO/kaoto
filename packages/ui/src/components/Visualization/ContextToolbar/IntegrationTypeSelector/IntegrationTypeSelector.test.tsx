import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { KaotoSchemaDefinition } from '../../../../models';
import { CamelRouteResource, sourceSchemaConfig, SourceSchemaType } from '../../../../models/camel';
import { KaotoResource } from '../../../../models/kaoto-resource';
import { RuntimeContext, SourceCodeApiContext } from '../../../../providers';
import { XmlCamelResourceSerializer } from '../../../../serializers';
import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../../../stubs';
import { CatalogSchemaLoader } from '../../../../utils';
import { IntegrationTypeSelector } from './IntegrationTypeSelector';

describe('IntegrationTypeSelector.tsx', () => {
  const config = sourceSchemaConfig;
  config.config[SourceSchemaType.Integration].schema = {
    schema: { name: 'Integration', description: 'desc' } as KaotoSchemaDefinition['schema'],
  } as KaotoSchemaDefinition;
  config.config[SourceSchemaType.Pipe].schema = {
    schema: { name: 'Pipe', description: 'desc' } as KaotoSchemaDefinition['schema'],
  } as KaotoSchemaDefinition;
  config.config[SourceSchemaType.Kamelet].schema = {
    schema: { name: 'Kamelet', description: 'desc' } as KaotoSchemaDefinition['schema'],
  } as KaotoSchemaDefinition;
  config.config[SourceSchemaType.KameletBinding].schema = {
    name: 'kameletBinding',
    schema: { description: 'desc' },
  } as KaotoSchemaDefinition;
  config.config[SourceSchemaType.Route].schema = {
    schema: { name: 'route', description: 'desc' } as KaotoSchemaDefinition['schema'],
  } as KaotoSchemaDefinition;
  config.config[SourceSchemaType.Test].schema = {
    schema: { name: 'Test', description: 'desc' } as KaotoSchemaDefinition['schema'],
  } as KaotoSchemaDefinition;

  const mockCamelCatalog: CatalogLibraryEntry = {
    name: 'Camel Main',
    runtime: 'Main',
    version: '4.0.0',
    fileName: 'camel-catalog-4.0.0.json',
  } as CatalogLibraryEntry;

  const mockCitrusCatalog: CatalogLibraryEntry = {
    name: 'Citrus',
    runtime: 'Citrus',
    version: '4.0.0',
    fileName: 'citrus-catalog-4.0.0.json',
  } as CatalogLibraryEntry;

  const mockCatalogLibrary: CatalogLibrary = {
    definitions: [mockCamelCatalog, mockCitrusCatalog],
  } as CatalogLibrary;

  const renderWithCustomRuntime = (
    selectedCatalog: CatalogLibraryEntry = mockCamelCatalog,
    camelResource?: KaotoResource,
  ) => {
    const mockSetSelectedCatalog = jest.fn();
    const { Provider } = TestProvidersWrapper({ camelResource });

    return {
      ...render(
        <RuntimeContext.Provider
          value={{
            basePath: CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH,
            catalogLibrary: mockCatalogLibrary,
            selectedCatalog,
            setSelectedCatalog: mockSetSelectedCatalog,
          }}
        >
          <SourceCodeApiContext.Provider value={{ setCodeAndNotify: jest.fn() }}>
            <Provider>
              <IntegrationTypeSelector />
            </Provider>
          </SourceCodeApiContext.Provider>
        </RuntimeContext.Provider>,
      ),
      mockSetSelectedCatalog,
    };
  };

  it('should render all of the types', async () => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <RuntimeProvider>
        <Provider>
          <IntegrationTypeSelector />
        </Provider>
      </RuntimeProvider>,
    );

    const trigger = await wrapper.findByTestId('integration-type-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(trigger);
    });

    for (const name of ['Pipe', 'Camel Route', 'Kamelet', 'Test']) {
      const element = await wrapper.findByTestId(`integration-type-${name}`);
      expect(element).toBeInTheDocument();
    }
  });

  it('should render only camel route when XML serializer is used', async () => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = TestProvidersWrapper({
      camelResource: new CamelRouteResource(undefined, new XmlCamelResourceSerializer()),
    });
    const wrapper = render(
      <RuntimeProvider>
        <Provider>
          <IntegrationTypeSelector />
        </Provider>
      </RuntimeProvider>,
    );

    const trigger = await wrapper.findByTestId('integration-type-list-dropdown');

    /** Open Select */
    await act(async () => {
      fireEvent.click(trigger);
    });
    let element = wrapper.queryByText('Camel Route');
    expect(element).toBeInTheDocument();
    element = wrapper.queryByText('Kamelet');
    expect(element).toBeNull();
  });

  it('should warn the user when adding a different type of flow', async () => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <RuntimeProvider>
        <Provider>
          <IntegrationTypeSelector />
        </Provider>
      </RuntimeProvider>,
    );

    const trigger = await wrapper.findByTestId('integration-type-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(trigger);
    });

    /** Select an option */
    act(() => {
      const element = wrapper.getByText('Pipe');
      fireEvent.click(element);
    });

    const modal = await wrapper.findByTestId('confirmation-modal');
    expect(modal).toBeInTheDocument();

    const modalText = await wrapper.findByTestId('confirmation-modal-text');
    expect(modalText).toBeInTheDocument();
    expect(modalText.textContent).not.toContain('This will also change the current selected catalog');
  });

  it('should warn the user when selected flow changes the catalog', async () => {
    const { findByTestId, getByTestId, mockSetSelectedCatalog } = renderWithCustomRuntime(mockCamelCatalog);

    const trigger = await findByTestId('integration-type-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(trigger);
    });

    /** Select an option */
    act(() => {
      const element = getByTestId('integration-type-Test').firstElementChild; // drop down button
      expect(element).toBeTruthy();
      fireEvent.click(element!);
    });

    const modal = await findByTestId('confirmation-modal');
    expect(modal).toBeInTheDocument();

    const modalText = await findByTestId('confirmation-modal-text');
    expect(modalText).toBeInTheDocument();
    expect(modalText.textContent).toContain('This will also change the current selected catalog');

    /** Confirm **/
    const confirmButton = await findByTestId('confirmation-modal-confirm');

    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockSetSelectedCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          runtime: 'Citrus',
        }),
      );
    });
  });
});

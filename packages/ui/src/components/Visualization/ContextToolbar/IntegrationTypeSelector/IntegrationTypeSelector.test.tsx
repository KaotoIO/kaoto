import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { KaotoResource } from '../../../../models/kaoto-resource';
import { RuntimeContext } from '../../../../providers';
import { configureSourceSchemaTypes, TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../../../stubs';
import { CatalogSchemaLoader } from '../../../../utils';
import { IntegrationTypeSelector } from './IntegrationTypeSelector';

describe('IntegrationTypeSelector.tsx', () => {
  beforeAll(() => {
    configureSourceSchemaTypes();
  });

  const mockCamelCatalog: CatalogLibraryEntry = {
    name: 'Camel Main',
    runtime: 'Main',
    version: '4.0.0',
    fileName: 'camel-catalog-4.0.0.json',
  };

  const mockCitrusCatalog: CatalogLibraryEntry = {
    name: 'Citrus',
    runtime: 'Citrus',
    version: '4.0.0',
    fileName: 'citrus-catalog-4.0.0.json',
  };

  const mockCatalogLibrary: CatalogLibrary = {
    definitions: [mockCamelCatalog, mockCitrusCatalog],
  } as CatalogLibrary;

  const renderWithCustomRuntime = (
    selectedCatalog: CatalogLibraryEntry = mockCamelCatalog,
    camelResource?: KaotoResource,
  ) => {
    const mockSetSelectedCatalog = vi.fn();
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
          <Provider>
            <IntegrationTypeSelector />
          </Provider>
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

    for (const testId of [
      'integration-type-route',
      'integration-type-Pipe',
      'integration-type-Kamelet',
      'integration-type-Test',
    ]) {
      const element = await wrapper.findByTestId(testId);
      expect(element).toBeInTheDocument();
    }
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

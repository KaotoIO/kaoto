import { act, fireEvent, render } from '@testing-library/react';

import { KaotoSchemaDefinition } from '../../../../models';
import { CamelRouteResource, sourceSchemaConfig, SourceSchemaType } from '../../../../models/camel';
import { XmlCamelResourceSerializer } from '../../../../serializers';
import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../../../stubs';
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
    const runtimeWrapper = TestRuntimeProviderWrapper();
    const RuntimeProvider = runtimeWrapper.Provider;
    const selectedCatalogMock = runtimeWrapper.setSelectedCatalog as jest.Mock;
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
      const element = wrapper.getByTestId('integration-type-Test').firstElementChild; // drop down button
      expect(element).toBeTruthy();
      fireEvent.click(element!);
    });

    const modal = await wrapper.findByTestId('confirmation-modal');
    expect(modal).toBeInTheDocument();

    const modalText = await wrapper.findByTestId('confirmation-modal-text');
    expect(modalText).toBeInTheDocument();
    expect(modalText.textContent).toContain('This will also change the current selected catalog');

    /** Confirm **/
    const confirmButton = await wrapper.findByTestId('confirmation-modal-confirm');
    fireEvent.click(confirmButton);

    expect(selectedCatalogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: 'Citrus',
      }),
    );
  });
});

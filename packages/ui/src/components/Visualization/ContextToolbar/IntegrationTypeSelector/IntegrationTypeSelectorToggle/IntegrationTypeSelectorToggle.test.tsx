import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { configureSourceSchemaTypes, TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../../../../stubs';
import { IntegrationTypeSelectorToggle } from './IntegrationTypeSelectorToggle';

describe('IntegrationTypeSelectorToggle.tsx', () => {
  beforeAll(() => {
    configureSourceSchemaTypes();
  });

  it('component renders with the integration-type-list-dropdown toggle', () => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <RuntimeProvider>
        <Provider>
          <IntegrationTypeSelectorToggle />
        </Provider>
      </RuntimeProvider>,
    );
    const toggle = wrapper.queryByTestId('integration-type-list-dropdown');
    expect(toggle).toBeInTheDocument();
  });

  it('should call onSelect when clicking on an option', async () => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const onSelectSpy = vi.fn();
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <RuntimeProvider>
        <Provider>
          <IntegrationTypeSelectorToggle onSelect={onSelectSpy} />
        </Provider>
      </RuntimeProvider>,
    );

    /** Click on toggle */
    const toggle = await wrapper.findByTestId('integration-type-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    /** Click on first element */
    const element = await wrapper.findByText('Pipe');
    act(() => {
      fireEvent.click(element);
    });

    await waitFor(() => {
      expect(onSelectSpy).toHaveBeenCalled();
    });
  });

  it('should mark the currently selected integration type as disabled', async () => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <RuntimeProvider>
        <Provider>
          <IntegrationTypeSelectorToggle />
        </Provider>
      </RuntimeProvider>,
    );

    const toggle = await wrapper.findByTestId('integration-type-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    // The default schema type from TestProvidersWrapper is Route — its option should be disabled
    // data-testid is set on the li wrapper which carries the pf-m-disabled class
    const routeOption = await wrapper.findByTestId('integration-type-route');
    expect(routeOption).toHaveClass('pf-m-disabled');
  });

  it('should display "(current integration type)" suffix for the active type', async () => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <RuntimeProvider>
        <Provider>
          <IntegrationTypeSelectorToggle />
        </Provider>
      </RuntimeProvider>,
    );

    const toggle = await wrapper.findByTestId('integration-type-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    const currentLabel = await wrapper.findByText('Camel Route (current integration type)');
    expect(currentLabel).toBeInTheDocument();
  });
});

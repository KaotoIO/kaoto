import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, To } from '@kaoto/camel-catalog/types';
import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';
import { Suspense } from 'react';
import type { Mock } from 'vitest';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { DynamicCatalog } from '../../../dynamic-catalog/dynamic-catalog';
import { CamelComponentsProvider } from '../../../dynamic-catalog/providers/camel-components.provider';
import { CamelRouteResource } from '../../../models/camel/camel-route-resource';
import { CatalogKind } from '../../../models/catalog-kind';
import { TestProvidersWrapper } from '../../../stubs';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { RestRouteEndpointField } from './RestRouteEndpointField';

describe('RestRouteEndpointField', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);

    const componentCatalog = new DynamicCatalog(new CamelComponentsProvider(catalogsMap.componentCatalogMap));

    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Component, componentCatalog);
  });

  const PROP_NAME = 'to';
  const schema: JSONSchema4 = {
    title: 'To',
    type: 'object',
    description: 'The endpoint to route to',
  };

  const renderField = async (
    model: Record<string, unknown>,
    onPropertyChange: Mock = vi.fn(),
    options: { disabled?: boolean; required?: boolean } = {},
  ) => {
    const camelResource = new CamelRouteResource([
      { route: { from: { uri: 'direct:start', steps: [] } } },
      { route: { from: { uri: 'direct:orders', steps: [] } } },
      { route: { from: { uri: 'direct:billing', steps: [] } } },
    ]);
    await camelResource.initialize();
    const { Provider } = await TestProvidersWrapper({ camelResource });

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      render(
        <Provider>
          <SchemaProvider schema={schema}>
            <ModelContextProvider model={model} onPropertyChange={onPropertyChange} disabled={options.disabled}>
              <Suspense fallback={<div>Loading...</div>}>
                <RestRouteEndpointField propName={PROP_NAME} required={options.required} />
              </Suspense>
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );
    });

    // Wait for Suspense to resolve
    await waitFor(
      () => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    return {
      findInput: () => screen.findByRole('combobox', { name: 'Endpoint Name' }),
      findCreateButton: () => screen.findByRole('button', { name: 'Create Route' }),
    };
  };

  describe('rendering', () => {
    it('should render with undefined value', async () => {
      const { findInput } = await renderField({ to: undefined });

      const input = await findInput();
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');
    });

    it('should render with string To value', async () => {
      const { findInput } = await renderField({ to: 'direct:orders' });

      const input = await findInput();
      expect(input).toHaveValue('orders');
    });

    it('should render with object To value containing uri', async () => {
      const toValue: To = {
        uri: 'direct:billing',
      };
      const { findInput } = await renderField({ to: toValue });

      const input = await findInput();
      expect(input).toHaveValue('billing');
    });

    it('should render with object To value containing uri and parameters', async () => {
      const toValue: To = {
        uri: 'direct',
        parameters: {
          name: 'start',
        },
      };
      const { findInput } = await renderField({ to: toValue });

      const input = await findInput();
      expect(input).toHaveValue('start');
    });

    it('should render with complex uri containing query parameters', async () => {
      const toValue: To = 'direct:orders?timeout=5000';
      const { findInput } = await renderField({ to: toValue });

      const input = await findInput();
      expect(input).toHaveValue('orders');
    });
  });

  describe('value changes', () => {
    it('should call onPropertyChange with updated To object when value changes', async () => {
      const onPropertyChange = vi.fn();
      const initialTo: To = {
        uri: 'direct',
        parameters: {
          name: 'orders',
        },
      };
      const { findInput } = await renderField({ to: initialTo }, onPropertyChange);

      const input = await findInput();
      expect(input).toHaveValue('orders');

      // Change the input value
      fireEvent.click(input);
      fireEvent.change(input, { target: { value: 'billing' } });

      const option = await screen.findByRole('option', { name: 'billing' });
      fireEvent.click(option);

      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, {
          uri: 'direct',
          parameters: {
            name: 'billing',
          },
        });
      });
    });

    it('should preserve existing parameters when updating name', async () => {
      const onPropertyChange = vi.fn();
      const initialTo: To = {
        uri: 'direct',
        parameters: {
          name: 'orders',
          timeout: 5000,
          block: true,
        },
      };
      const { findInput } = await renderField({ to: initialTo }, onPropertyChange);

      const input = await findInput();
      expect(input).toHaveValue('orders');

      fireEvent.click(input);
      fireEvent.change(input, { target: { value: 'new-endpoint' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, {
          uri: 'direct',
          parameters: {
            name: 'new-endpoint',
            timeout: 5000,
            block: true,
          },
        });
      });
    });

    it('should handle clearing the input', async () => {
      const onPropertyChange = vi.fn();
      const initialTo: To = 'direct:orders';
      const { findInput } = await renderField({ to: initialTo }, onPropertyChange);

      const input = await findInput();
      expect(input).toHaveValue('orders');

      // Find and click the clear button
      await screen.findByRole('button', { name: /clear/i });
      const clearButton = await screen.findByRole('button', { name: /clear/i });

      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, {
          uri: 'direct',
          parameters: {
            name: undefined,
          },
        });
      });
    });

    it('should update when selecting from dropdown suggestions', async () => {
      const onPropertyChange = vi.fn();
      const { findInput } = await renderField({ to: undefined }, onPropertyChange);

      await findInput(); // Ensure component is loaded

      // Open the dropdown
      await screen.findByRole('button', { name: 'Open' });
      const toggle = await screen.findByRole('button', { name: 'Open' });

      fireEvent.click(toggle);

      // Wait for options to appear and select one
      await screen.findByText('billing');

      const option = await screen.findByRole('option', { name: 'billing' });
      fireEvent.click(option);

      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, {
          uri: '',
          parameters: {
            name: 'billing',
          },
        });
      });

      const input = await findInput();
      expect(input).toHaveValue('billing');
    });
  });

  it('should forward required prop to DirectEndpointNameField', async () => {
    const { findInput } = await renderField({ to: undefined }, vi.fn(), { required: true });

    const input = await findInput();
    // The field should show required indicator when required prop is passed
    const fieldWrapper = input.closest('[data-testid="#__field-wrapper"]');
    expect(fieldWrapper).toBeInTheDocument();

    // Check for the required label indicator
    const requiredLabel = fieldWrapper?.querySelector('.kaoto-field-wrapper__required');
    expect(requiredLabel).toBeInTheDocument();
  });

  describe('Create Route functionality', () => {
    it('should enable Create Route button for new endpoint names', async () => {
      const { findInput, findCreateButton } = await renderField({ to: undefined });

      const button = await findCreateButton();
      expect(button).toBeDisabled();

      const input = await findInput();
      fireEvent.change(input, { target: { value: 'new-endpoint' } });

      await waitFor(() => {
        expect(button).toBeEnabled();
      });
    });

    it('should disable Create Route button for existing endpoint names', async () => {
      const { findInput, findCreateButton } = await renderField({ to: undefined });

      const input = await findInput();
      fireEvent.change(input, { target: { value: 'orders' } });

      const button = await findCreateButton();
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it('should create a new direct route when Create Route is clicked', async () => {
      const onPropertyChange = vi.fn();
      const { findInput, findCreateButton } = await renderField({ to: undefined }, onPropertyChange);

      const input = await findInput();
      fireEvent.change(input, { target: { value: 'new-route' } });

      const button = await findCreateButton();
      await waitFor(() => {
        expect(button).toBeEnabled();
      });

      fireEvent.click(button);

      // Should update the field value with the new route name
      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, {
          uri: '',
          parameters: {
            name: 'new-route',
          },
        });
      });
    });
  });
});

import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, To } from '@kaoto/camel-catalog/types';
import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';
import { Suspense } from 'react';

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
    onPropertyChange: jest.Mock = jest.fn(),
    options: { disabled?: boolean; required?: boolean } = {},
  ) => {
    const camelResource = new CamelRouteResource([
      { route: { from: { uri: 'direct:start', steps: [] } } },
      { route: { from: { uri: 'direct:orders', steps: [] } } },
      { route: { from: { uri: 'direct:billing', steps: [] } } },
    ]);
    const { Provider } = TestProvidersWrapper({ camelResource });

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
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument(), { timeout: 3000 });

    return {
      getInput: () => screen.getByRole('textbox', { name: 'Endpoint Name' }),
      getCreateButton: () => screen.getByRole('button', { name: 'Create Route' }),
    };
  };

  describe('rendering', () => {
    it('should render with undefined value', async () => {
      const { getInput } = await renderField({ to: undefined });

      const input = getInput();
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');
    });

    it('should render with string To value', async () => {
      const { getInput } = await renderField({ to: 'direct:orders' });

      const input = getInput();
      expect(input).toHaveValue('orders');
    });

    it('should render with object To value containing uri', async () => {
      const toValue: To = {
        uri: 'direct:billing',
      };
      const { getInput } = await renderField({ to: toValue });

      const input = getInput();
      expect(input).toHaveValue('billing');
    });

    it('should render with object To value containing uri and parameters', async () => {
      const toValue: To = {
        uri: 'direct',
        parameters: {
          name: 'start',
        },
      };
      const { getInput } = await renderField({ to: toValue });

      const input = getInput();
      expect(input).toHaveValue('start');
    });

    it('should render with complex uri containing query parameters', async () => {
      const toValue: To = 'direct:orders?timeout=5000';
      const { getInput } = await renderField({ to: toValue });

      const input = getInput();
      expect(input).toHaveValue('orders');
    });
  });

  describe('value changes', () => {
    it('should call onPropertyChange with updated To object when value changes', async () => {
      const onPropertyChange = jest.fn();
      const initialTo: To = {
        uri: 'direct',
        parameters: {
          name: 'orders',
        },
      };
      const { getInput } = await renderField({ to: initialTo }, onPropertyChange);

      const input = getInput();
      expect(input).toHaveValue('orders');

      // Change the input value
      await act(async () => {
        fireEvent.click(input);
        fireEvent.change(input, { target: { value: 'billing' } });

        const option = screen.getByRole('option', { name: 'option billing' });
        fireEvent.click(option);
      });

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
      const onPropertyChange = jest.fn();
      const initialTo: To = {
        uri: 'direct',
        parameters: {
          name: 'orders',
          timeout: 5000,
          block: true,
        },
      };
      const { getInput } = await renderField({ to: initialTo }, onPropertyChange);

      const input = getInput();
      expect(input).toHaveValue('orders');

      await act(async () => {
        fireEvent.click(input);
        fireEvent.change(input, { target: { value: 'new-endpoint' } });

        const option = screen.getByRole('option', { name: 'use custom value new-endpoint' });
        fireEvent.click(option);
      });

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
      const onPropertyChange = jest.fn();
      const initialTo: To = 'direct:orders';
      const { getInput } = await renderField({ to: initialTo }, onPropertyChange);

      const input = getInput();
      expect(input).toHaveValue('orders');

      // Find and click the clear button
      await waitFor(() => expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument());
      const clearButton = screen.getByRole('button', { name: /clear/i });

      await act(async () => {
        fireEvent.click(clearButton);
      });

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
      const onPropertyChange = jest.fn();
      const { getInput } = await renderField({ to: undefined }, onPropertyChange);

      getInput(); // Ensure component is loaded

      // Open the dropdown
      await waitFor(() => expect(screen.getByLabelText('Endpoint Name toggle')).toBeInTheDocument());
      const toggle = screen.getByLabelText('Endpoint Name toggle');

      await act(async () => {
        fireEvent.click(toggle);
      });

      // Wait for options to appear and select one
      await waitFor(() => {
        expect(screen.getByText('billing')).toBeInTheDocument();
      });

      await act(async () => {
        const option = screen.getByRole('option', { name: 'option billing' });
        fireEvent.click(option);
      });

      await waitFor(() => {
        expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, {
          uri: '',
          parameters: {
            name: 'billing',
          },
        });
      });

      const input = getInput();
      expect(input).toHaveValue('billing');
    });
  });

  it('should forward required prop to DirectEndpointNameField', async () => {
    const { getInput } = await renderField({ to: undefined }, jest.fn(), { required: true });

    const input = getInput();
    // The field should show required indicator when required prop is passed
    const formGroup = input.closest('.pf-v6-c-form__group');
    expect(formGroup).toBeInTheDocument();

    // Check for the required label indicator
    const requiredLabel = formGroup?.querySelector('.pf-v6-c-form__label-required');
    expect(requiredLabel).toBeInTheDocument();
  });

  describe('Create Route functionality', () => {
    it('should enable Create Route button for new endpoint names', async () => {
      const { getInput, getCreateButton } = await renderField({ to: undefined });

      const button = getCreateButton();
      expect(button).toBeDisabled();

      const input = getInput();
      await act(async () => {
        fireEvent.change(input, { target: { value: 'new-endpoint' } });
      });

      await waitFor(() => {
        expect(button).toBeEnabled();
      });
    });

    it('should disable Create Route button for existing endpoint names', async () => {
      const { getInput, getCreateButton } = await renderField({ to: undefined });

      const input = getInput();
      await act(async () => {
        fireEvent.change(input, { target: { value: 'orders' } });
      });

      const button = getCreateButton();
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it('should create a new direct route when Create Route is clicked', async () => {
      const onPropertyChange = jest.fn();
      const { getInput, getCreateButton } = await renderField({ to: undefined }, onPropertyChange);

      const input = getInput();
      await act(async () => {
        fireEvent.change(input, { target: { value: 'new-route' } });
      });

      const button = getCreateButton();
      await waitFor(() => {
        expect(button).toBeEnabled();
      });

      await act(async () => {
        fireEvent.click(button);
      });

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

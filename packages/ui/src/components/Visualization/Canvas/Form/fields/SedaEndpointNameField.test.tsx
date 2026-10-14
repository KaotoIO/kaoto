import { CamelYamlDsl, RouteDefinition } from '@kaoto/camel-catalog/types';
import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';

import { CamelRouteResource } from '../../../../../models/camel/camel-route-resource';
import { EntityType } from '../../../../../models/entities';
import { TestProvidersWrapper } from '../../../../../stubs';
import { SedaEndpointNameField } from './SedaEndpointNameField';

describe('SedaEndpointNameField', () => {
  const PROP_NAME = 'parameters.name';
  const schema: JSONSchema4 = { title: 'Name', type: 'string', description: 'Name of queue' };

  const renderField = async (routes: RouteDefinition[]) => {
    const camelResource = new CamelRouteResource(routes as unknown as CamelYamlDsl);
    const { Provider, updateEntitiesFromCamelResourceSpy } = await TestProvidersWrapper({ camelResource });

    render(
      <Provider>
        <SchemaProvider schema={schema}>
          <ModelContextProvider model={undefined} onPropertyChange={vi.fn()}>
            <SedaEndpointNameField propName={PROP_NAME} />
          </ModelContextProvider>
        </SchemaProvider>
      </Provider>,
    );

    return { camelResource, updateEntitiesFromCamelResourceSpy };
  };

  it('treats only seda routes as existing', async () => {
    await renderField([{ from: { uri: 'direct:start', steps: [] } }]);

    const input = screen.getByRole('textbox', { name: 'Name' });
    const button = screen.getByRole('button', { name: 'Create Route' });

    fireEvent.change(input, { target: { value: 'start' } });
    await waitFor(() => {
      expect(button).toBeEnabled();
    });
  });

  it('creates a new route with seda from and typed name', async () => {
    const { camelResource, updateEntitiesFromCamelResourceSpy } = await renderField([
      { from: { uri: 'seda:existing', steps: [] } },
    ]);
    const addNewEntitySpy = vi.spyOn(camelResource, 'addNewEntity');

    const input = screen.getByRole('textbox', { name: 'Name' });
    const button = screen.getByRole('button', { name: 'Create Route' });

    fireEvent.change(input, { target: { value: 'existing' } });
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: 'new-queue' } });
    await waitFor(() => {
      expect(button).toBeEnabled();
    });
    fireEvent.click(button);

    expect(addNewEntitySpy).toHaveBeenCalledWith(EntityType.Route, {
      from: { uri: 'seda', parameters: { name: 'new-queue' }, steps: [] },
    });
    expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
  });
});

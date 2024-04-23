import { act, fireEvent, render } from '@testing-library/react';
import { KaotoSchemaDefinition } from '../../../../models';
import { SourceSchemaType, sourceSchemaConfig } from '../../../../models/camel';
import { TestProvidersWrapper } from '../../../../stubs';
import { DSLSelector } from './DSLSelector';

describe('DSLSelector.tsx', () => {
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

  it('should render all of the types', async () => {
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <DSLSelector />
      </Provider>,
    );

    const trigger = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(trigger);
    });

    for (const name of ['Pipe', 'Camel Route']) {
      const element = await wrapper.findByText(name);
      expect(element).toBeInTheDocument();
    }
  });

  it('should warn the user when adding a different type of flow', async () => {
    const { Provider } = TestProvidersWrapper();
    const wrapper = render(
      <Provider>
        <DSLSelector />
      </Provider>,
    );

    const trigger = await wrapper.findByTestId('dsl-list-dropdown');

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
  });
});

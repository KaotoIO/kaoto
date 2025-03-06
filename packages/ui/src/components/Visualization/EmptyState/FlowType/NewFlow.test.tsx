import { act, fireEvent, render } from '@testing-library/react';
import { KaotoSchemaDefinition } from '../../../../models';
import { SourceSchemaType, sourceSchemaConfig, CamelRouteResource } from '../../../../models/camel';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { VisibleFlowsProvider } from '../../../../providers';
import { EntitiesContext, EntitiesContextResult } from '../../../../providers/entities.provider';
import { SourceCodeApiContext } from '../../../../providers/source-code.provider';
import { NewFlow } from './NewFlow';

describe('NewFlow.tsx', () => {
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

  const renderWithContext = () => {
    return render(
      <SourceCodeApiContext.Provider
        value={{
          setCodeAndNotify: jest.fn(),
        }}
      >
        <EntitiesContext.Provider
          value={
            {
              currentSchemaType: SourceSchemaType.Integration,
              visualEntities: visualEntities,
              camelResource: new CamelRouteResource(),
            } as unknown as EntitiesContextResult
          }
        >
          <VisibleFlowsProvider>
            <NewFlow />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>
      </SourceCodeApiContext.Provider>,
    );
  };

  const visualEntities = [{ id: 'entity1' } as CamelRouteVisualEntity, { id: 'entity2' } as CamelRouteVisualEntity];

  it('should render all of the types', async () => {
    const wrapper = renderWithContext();
    const trigger = await wrapper.findByTestId('viz-dsl-list-dropdown');

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
    const wrapper = renderWithContext();
    const trigger = await wrapper.findByTestId('viz-dsl-list-dropdown');

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

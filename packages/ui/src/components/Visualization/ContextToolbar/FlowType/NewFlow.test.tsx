import { act, fireEvent, render } from '@testing-library/react';
import { EntitiesContextResult } from '../../../../hooks';
import { Schema } from '../../../../models';
import { SourceSchemaType, sourceSchemaConfig } from '../../../../models/camel';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { VisibleFlowsProvider } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { SourceCodeContext } from '../../../../providers/source-code.provider';
import { NewFlow } from './NewFlow';

describe('NewFlow.tsx', () => {
  const config = sourceSchemaConfig;
  config.config[SourceSchemaType.Integration].schema = {
    schema: { name: 'Integration', description: 'desc' },
  } as Schema;
  config.config[SourceSchemaType.Pipe].schema = { schema: { name: 'Pipe', description: 'desc' } } as Schema;
  config.config[SourceSchemaType.Kamelet].schema = { schema: { name: 'Kamelet', description: 'desc' } } as Schema;
  config.config[SourceSchemaType.KameletBinding].schema = {
    name: 'kameletBinding',
    schema: { description: 'desc' },
  } as Schema;
  config.config[SourceSchemaType.Route].schema = { schema: { name: 'route', description: 'desc' } } as Schema;

  const renderWithContext = () => {
    return render(
      <SourceCodeContext.Provider
        value={{
          sourceCode: '',
          setCodeAndNotify: jest.fn(),
        }}
      >
        <EntitiesContext.Provider
          value={
            {
              currentSchemaType: SourceSchemaType.Integration,
              visualEntities: visualEntities,
            } as unknown as EntitiesContextResult
          }
        >
          <VisibleFlowsProvider>
            <NewFlow />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>
      </SourceCodeContext.Provider>,
    );
  };

  const visualEntities = [{ id: 'entity1' } as CamelRouteVisualEntity, { id: 'entity2' } as CamelRouteVisualEntity];

  test('should render all of the types', async () => {
    const wrapper = renderWithContext();
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

  test('should warn the user when adding a different type of flow', async () => {
    const wrapper = renderWithContext();
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

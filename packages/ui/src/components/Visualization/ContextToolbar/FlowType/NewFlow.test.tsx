import { NewFlow } from './NewFlow';
import { act, fireEvent, render } from '@testing-library/react';
import { sourceSchemaConfig, SourceSchemaType } from '../../../../models/camel';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { Schema } from '../../../../models';
import { EntitiesContextResult } from '../../../../hooks';

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
      <EntitiesContext.Provider
        value={
          {
            currentSchemaType: SourceSchemaType.Integration,
            visualEntities: visualEntities,
          } as unknown as EntitiesContextResult
        }
      >
        <NewFlow />
      </EntitiesContext.Provider>,
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

    for (const s of sourceSchemaConfig.getAsList()) {
      const element = await wrapper.findByText(s.name);
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
      const element = wrapper.getByText('Kamelet');
      fireEvent.click(element);
    });

    const modal = await wrapper.findByTestId('confirmation-modal');
    expect(modal).toBeInTheDocument();
  });
});

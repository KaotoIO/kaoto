import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CamelRouteResource, sourceSchemaConfig, SourceSchemaType } from '../../../../models/camel';
import { KaotoSchemaDefinition } from '../../../../models/kaoto-schema';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { EntitiesContext, EntitiesContextResult } from '../../../../providers/entities.provider';
import { configureSourceSchemaTypes } from '../../../../stubs';
import { FlowTypeSelector } from './FlowTypeSelector';

const config = sourceSchemaConfig;
config.config[SourceSchemaType.Pipe].schema = {
  name: 'Pipe',
  schema: { name: 'Pipe', description: 'desc' } as KaotoSchemaDefinition['schema'],
} as KaotoSchemaDefinition;
config.config[SourceSchemaType.Kamelet].schema = {
  name: 'Kamelet',
  schema: { name: 'Kamelet', description: 'desc' } as KaotoSchemaDefinition['schema'],
} as KaotoSchemaDefinition;
config.config[SourceSchemaType.Route].schema = {
  name: 'route',
  schema: { name: 'route', description: 'desc' } as KaotoSchemaDefinition['schema'],
} as KaotoSchemaDefinition;

const onSelect = vi.fn();
const FlowTypeSelectorWithContext: React.FunctionComponent<{
  currentSchemaType?: SourceSchemaType;
}> = ({ currentSchemaType }) => {
  return (
    <EntitiesContext.Provider
      value={
        {
          currentSchemaType: currentSchemaType ?? SourceSchemaType.Route,
          visualEntities: [{ id: 'entity1' } as CamelRouteVisualEntity, { id: 'entity2' } as CamelRouteVisualEntity],
          camelResource: new CamelRouteResource(undefined),
        } as unknown as EntitiesContextResult
      }
    >
      <FlowTypeSelector onSelect={onSelect} />
    </EntitiesContext.Provider>
  );
};

describe('FlowTypeSelector.tsx', () => {
  beforeAll(() => {
    configureSourceSchemaTypes();
  });

  it('component renders', async () => {
    await act(async () => {
      render(<FlowTypeSelectorWithContext />);
    });

    waitFor(() => {
      const toggle = screen.queryByTestId('viz-dsl-list-dropdown');
      expect(toggle).toBeInTheDocument();
    });
  });

  it('should call onSelect when clicking on the MenuToggleAction', async () => {
    await act(async () => {
      render(<FlowTypeSelectorWithContext />);
    });

    const toggle = await screen.findByTestId('dsl-list-btn');

    /** Click on button */
    act(() => {
      fireEvent.click(toggle);
    });

    waitFor(() => {
      expect(onSelect).toHaveBeenCalled();
    });
  });

  it('should disable the MenuToggleAction if the current DSL does not support multiple flows and there is an existing flow', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext currentSchemaType={SourceSchemaType.KameletBinding} />);
    const toggle = await wrapper.findByTestId('dsl-list-btn');

    waitFor(() => {
      expect(toggle).toBeDisabled();
    });
  });

  it('should disable a SelectOption if is already selected and does not support multiple flows', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext currentSchemaType={SourceSchemaType.Pipe} />);
    const toggle = await wrapper.findByTestId('viz-dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByText('Pipe (single route only)');
    expect(element).toBeInTheDocument();

    const option = await wrapper.findByTestId('dsl-Pipe');
    expect(option).toHaveClass('pf-m-disabled');
  });
});
